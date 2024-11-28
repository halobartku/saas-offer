import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import retry from 'retry';
import IMAP from 'imap';
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
    // Use a semaphore to prevent multiple simultaneous initializations
    if (this.isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return;
    }

    if (this.isInitialized) return;

    this.isInitializing = true;
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        throw new Error('SMTP configuration is incomplete');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Initialize SMTP first
      await this.transporter.verify();
      this.isInitialized = true;

      // Initialize IMAP separately to avoid circular dependency
      try {
        await this.initializeImap();
      } catch (error) {
        console.error('IMAP initialization failed:', error);
        // Don't block SMTP functionality if IMAP fails
      }
    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
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

  private static isInitializing = false;
  private static connectionTimeout = 30000; // 30 seconds timeout

  private static async initializeImap() {
    if (this.isImapInitialized) return;

    if (!process.env.IMAP_HOST || !process.env.IMAP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('IMAP configuration is incomplete');
    }

    // Cleanup any existing connection
    if (this.imapClient) {
      try {
        this.imapClient.end();
      } catch (error) {
        console.error('Error closing existing IMAP connection:', error);
      }
    }

    this.imapClient = new IMAP({
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT),
      tls: true,
      tlsOptions: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
      connTimeout: this.connectionTimeout,
      authTimeout: this.connectionTimeout
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('IMAP connection timeout'));
        this.imapClient.end();
      }, this.connectionTimeout);

      const cleanup = () => {
        clearTimeout(timeout);
        this.imapClient.removeListener('ready', onReady);
        this.imapClient.removeListener('error', onError);
      };

      const onReady = () => {
        cleanup();
        this.isImapInitialized = true;
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        console.error('IMAP connection error:', err);
        this.isImapInitialized = false;
        reject(err);
      };

      this.imapClient.once('ready', onReady);
      this.imapClient.once('error', onError);

      try {
        this.imapClient.connect();
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  private static async fetchEmails(): Promise<{ success: boolean; message?: string }> {
    try {
      // Ensure IMAP is initialized
      if (!this.isImapInitialized) {
        try {
          await this.initializeImap();
        } catch (error) {
          console.error('Failed to initialize IMAP:', error);
          return { 
            success: false, 
            message: `IMAP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      // Wait for any existing operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

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
                  
                  // Generate a new UUID for thread
                  let threadId = crypto.randomUUID();
                  
                  if (inReplyTo) {
                    const parentEmail = await db.query.emails.findFirst({
                      where: eq(emails.id, inReplyTo)
                    });
                    
                    if (parentEmail?.threadId) {
                      threadId = parentEmail.threadId;
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
                    parentId: null, // We'll handle this separately if needed
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