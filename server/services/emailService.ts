import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import retry from 'retry';
import IMAP from 'imap';
import { simpleParser } from 'mailparser';
import { db } from '../../db';
import { emails } from '../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Environment validation schema
const envSchema = z.object({
  SMTP_HOST: z.string().min(1, "SMTP host is required"),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string().min(1, "SMTP user is required"),
  SMTP_PASSWORD: z.string().min(1, "SMTP password is required"),
  IMAP_HOST: z.string().min(1, "IMAP host is required"),
  IMAP_PORT: z.string().transform(Number),
});

// Email validation schema
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

interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static imapClient: IMAP;
  private static isInitialized = false;
  private static isImapInitialized = false;
  private static isInitializing = false;
  private static pollingInterval: NodeJS.Timeout | null = null;
  private static connectionTimeout = 15000; // Reduced to 15 seconds
  private static maxReconnectAttempts = 3;
  private static reconnectDelay = 3000; // Reduced to 3 seconds

  // Rate limiter middleware
  public static rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });

  private static validateEnvironment() {
    try {
      const env = envSchema.parse(process.env);
      return { success: true, data: env };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors.map(err => err.path.join('.'));
        return {
          success: false,
          error: `Missing or invalid environment variables: ${missingVars.join(', ')}`
        };
      }
      return {
        success: false,
        error: 'Failed to validate environment variables'
      };
    }
  }

  private static async initialize() {
    if (this.isInitializing) {
      console.log('Email service is already initializing, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return;
    }

    if (this.isInitialized) {
      console.log('Email service is already initialized');
      return;
    }

    this.isInitializing = true;
    console.log('Starting email service initialization');
    
    try {
      const envValidation = this.validateEnvironment();
      if (!envValidation.success) {
        throw new Error(envValidation.error);
      }

      const env = envValidation.data;

      // Initialize SMTP first
      console.log('Initializing SMTP transport');
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify SMTP connection
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Email service initialization failed:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.isInitializing = false;
      console.log('Email service initialization completed');
    }
  }

  private static async initializeImap(attempt = 1) {
    if (this.isImapInitialized) {
      console.log('IMAP is already initialized');
      return;
    }

    console.log(`Initializing IMAP (attempt ${attempt}/${this.maxReconnectAttempts})`);

    const envValidation = this.validateEnvironment();
    if (!envValidation.success) {
      throw new Error(envValidation.error);
    }

    const env = envValidation.data;

    // Cleanup existing connection if any
    if (this.imapClient) {
      try {
        this.imapClient.end();
        console.log('Cleaned up existing IMAP connection');
      } catch (error) {
        console.error('Error closing existing IMAP connection:', error);
      }
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('IMAP connection timeout');
        this.imapClient.end();
        
        if (attempt < this.maxReconnectAttempts) {
          console.log(`Scheduling IMAP reconnection attempt ${attempt + 1}`);
          setTimeout(() => {
            this.initializeImap(attempt + 1)
              .then(resolve)
              .catch(reject);
          }, this.reconnectDelay);
        } else {
          reject(new Error('IMAP connection timeout after max attempts'));
        }
      }, this.connectionTimeout);

      this.imapClient = new IMAP({
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        host: env.IMAP_HOST,
        port: env.IMAP_PORT,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: this.connectionTimeout,
        authTimeout: this.connectionTimeout
      });

      const cleanup = () => {
        clearTimeout(timeout);
        this.imapClient.removeListener('ready', onReady);
        this.imapClient.removeListener('error', onError);
      };

      const onReady = () => {
        cleanup();
        this.isImapInitialized = true;
        console.log('IMAP connection established successfully');
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        console.error('IMAP connection error:', err);
        this.isImapInitialized = false;

        if (attempt < this.maxReconnectAttempts) {
          console.log(`Scheduling IMAP reconnection attempt ${attempt + 1}`);
          setTimeout(() => {
            this.initializeImap(attempt + 1)
              .then(resolve)
              .catch(reject);
          }, this.reconnectDelay);
        } else {
          reject(err);
        }
      };

      this.imapClient.once('ready', onReady);
      this.imapClient.once('error', onError);

      try {
        console.log('Attempting IMAP connection');
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
              resolve({ success: true });
              return;
            }

            const fetch = this.imapClient.fetch(results, fetchOptions);

            fetch.on('message', (msg, seqno) => {
              msg.on('body', async (stream, info) => {
                try {
                  const parsed = await simpleParser(stream);
                  
                  // Thread handling with proper error boundaries
                  let threadId: string;
                  let parentId: string | null = null;

                  try {
                    // Check for existing thread
                    if (parsed.inReplyTo) {
                      const parentEmail = await db.query.emails.findFirst({
                        where: eq(emails.messageId, parsed.inReplyTo)
                      });

                      if (parentEmail) {
                        threadId = parentEmail.threadId || parentEmail.id;
                        parentId = parentEmail.id;
                      } else {
                        threadId = crypto.randomUUID();
                      }
                    } else {
                      threadId = crypto.randomUUID();
                    }

                    await db.insert(emails).values({
                      messageId: parsed.messageId,
                      subject: parsed.subject || 'No Subject',
                      body: parsed.text || '',
                      fromEmail: parsed.from?.text || '',
                      toEmail: parsed.to?.text || '',
                      status: 'inbox',
                      isRead: 'false',
                      threadId,
                      parentId,
                      createdAt: parsed.date || new Date(),
                      updatedAt: new Date()
                    });
                  } catch (dbError) {
                    console.error('Database operation failed:', dbError);
                    // Continue processing other emails
                  }
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
              resolve({ success: true });
            });
          });
        });
      });
    } catch (error) {
      console.error('Error in fetchEmails:', error);
      throw error;
    }
  }

  public static async verifyConnection() {
    try {
      // Validate environment first
      const envValidation = this.validateEnvironment();
      if (!envValidation.success) {
        return {
          success: false,
          message: envValidation.error
        };
      }

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
        // Attempt to reinitialize IMAP on polling failure
        try {
          await this.initializeImap();
        } catch (reconnectError) {
          console.error('Failed to reconnect IMAP:', reconnectError);
        }
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
      const result = await this.fetchEmails();
      return { 
        success: result.success, 
        message: result.success ? 'Email sync completed successfully' : result.message 
      };
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
        messageId: `<${crypto.randomUUID()}@${process.env.SMTP_HOST}>`,
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
            console.error(`Email send attempt ${currentAttempt} failed:`, error);
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