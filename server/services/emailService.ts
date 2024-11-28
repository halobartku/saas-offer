import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import retry from 'retry';
import * as IMAP from 'imap';
import { simpleParser } from 'mailparser';
import { db } from '../../db';
import { emails } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Email validation schema with attachments support
interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.union([z.string(), z.instanceof(Buffer)]),
    contentType: z.string().optional()
  })).optional()
});

export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static imapClient: IMAP;
  private static isInitialized = false;
  private static isImapInitialized = false;
  private static pollingInterval: NodeJS.Timeout | null = null;

  // Rate limiter middleware
  public static rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });

  private static async initialize() {
    if (this.isInitialized) return;

    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP configuration is incomplete');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // Only use secure for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false // For development environment
      }
    });

    this.isInitialized = true;
  }

  public static async verifyConnection() {
    try {
      await this.initialize();
      await this.transporter.verify();
      
      return {
        success: true,
        message: 'SMTP connection verified successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('SMTP verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify SMTP connection',
        timestamp: new Date().toISOString()
      };
    }
  }

  private static async initializeImap() {
    if (this.isImapInitialized) return;

    if (!process.env.IMAP_HOST || !process.env.IMAP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('IMAP configuration is incomplete');
    }

    this.imapClient = new IMAP({
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT),
      tls: true,
      tlsOptions: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    });

    return new Promise<void>((resolve, reject) => {
      this.imapClient.once('ready', () => {
        this.isImapInitialized = true;
        resolve();
      });

      this.imapClient.once('error', (err) => {
        console.error('IMAP connection error:', err);
        this.isImapInitialized = false;
        reject(err);
      });

      this.imapClient.connect();
    });
  }

  private static async fetchEmails(): Promise<void> {
    try {
      if (!this.isImapInitialized) {
        await this.initializeImap();
      }

      return new Promise((resolve, reject) => {
        this.imapClient.openBox('INBOX', false, async (err, box) => {
          if (err) {
            console.error('Error opening mailbox:', err);
            reject(err);
            return;
          }

          const fetchOptions = {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID REFERENCES IN-REPLY-TO)', 'TEXT'],
            struct: true
          };

          this.imapClient.search(['UNSEEN'], async (searchErr, results) => {
            if (searchErr) {
              console.error('Error searching emails:', searchErr);
              reject(searchErr);
              return;
            }

            if (!results || results.length === 0) {
              resolve();
              return;
            }

            const fetch = this.imapClient.fetch(results, fetchOptions);

            fetch.on('message', (msg, seqno) => {
              msg.on('body', async (stream, info) => {
                try {
                  const parsed = await simpleParser(stream);
                  const references = parsed.references || [];
                  const inReplyTo = parsed.inReplyTo;
                  
                  // Determine thread ID based on message references
                  let threadId = parsed.messageId;
                  if (inReplyTo) {
                    const parentEmail = await db.select()
                      .from(emails)
                      .where(eq(emails.threadId, inReplyTo))
                      .limit(1);
                    
                    if (parentEmail.length > 0) {
                      threadId = parentEmail[0].threadId;
                    }
                  } else if (references.length > 0) {
                    const refEmail = await db.select()
                      .from(emails)
                      .where(eq(emails.threadId, references[0]))
                      .limit(1);
                    
                    if (refEmail.length > 0) {
                      threadId = refEmail[0].threadId;
                    }
                  }

                  await db.insert(emails).values({
                    subject: parsed.subject || 'No Subject',
                    body: parsed.text || '',
                    fromEmail: parsed.from?.text || '',
                    toEmail: parsed.to?.text || '',
                    status: 'inbox',
                    isRead: 'false',
                    threadId,
                    parentId: inReplyTo ? inReplyTo : null,
                    createdAt: parsed.date || new Date(),
                    updatedAt: new Date()
                  });
                } catch (error) {
                  console.error('Error processing email:', error);
                }
              });
            });

            fetch.once('error', (fetchErr) => {
              console.error('Error fetching emails:', fetchErr);
              reject(fetchErr);
            });

            fetch.once('end', () => {
              resolve();
            });
          });
        });
      });
    } catch (error) {
      console.error('Error in fetchEmails:', error);
      throw error;
    }
  }

  public static async startPolling(interval: number = 60000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    try {
      await this.fetchEmails();
    } catch (error) {
      console.error('Initial email fetch failed:', error);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.fetchEmails();
      } catch (error) {
        console.error('Email polling failed:', error);
      }
    }, interval);
  }

  public static async stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public static async syncEmails() {
    try {
      await this.fetchEmails();
      return { success: true, message: 'Email sync completed successfully' };
    } catch (error) {
      console.error('Email sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during email sync'
      };
    }
  }

  public static async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: EmailAttachment[],
    threadId?: string,
    parentId?: string
  ) {
    try {
      await this.initialize();

      const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject,
        text: body,
        attachments,
        messageId: `<${Date.now()}@${process.env.SMTP_HOST}>`,
        ...(threadId && { references: threadId }),
        ...(parentId && { inReplyTo: parentId })
      };

      const operation = retry.operation({
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000
      });

      return new Promise((resolve, reject) => {
        operation.attempt(async (currentAttempt) => {
          try {
            const info = await this.transporter.sendMail(mailOptions);
            resolve({
              messageId: info.messageId,
              attempt: currentAttempt
            });
          } catch (error) {
            if (operation.retry(error as Error)) {
              return;
            }
            reject(operation.mainError());
          }
        });
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }
}