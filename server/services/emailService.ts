import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import retry from 'retry';
import { ImapFlow } from 'imapflow';
import { db } from "../../db";
import { emails } from "../../db/schema";

// Email validation schema with attachments support
const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(z.any()).optional(),
});

// Rate limiting configuration
export const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static imapClient: ImapFlow;
  private static isInitialized = false;
  private static retryOptions = {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000,
  };

  private static async initialize() {
    if (this.isInitialized) return;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP configuration is incomplete');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    this.isInitialized = true;
  }

  private static async initializeImap() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('IMAP configuration is incomplete');
    }

    this.imapClient = new ImapFlow({
      host: process.env.SMTP_HOST,
      port: 993, // Standard IMAP port
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      logger: false
    });
  }

  static async sendEmail(emailData: z.infer<typeof emailSchema>) {
    try {
      await this.initialize();

      // Validate email data
      const validatedData = emailSchema.parse(emailData);

      // Create operation with retry
      const operation = retry.operation(this.retryOptions);

      return new Promise((resolve, reject) => {
        operation.attempt(async (currentAttempt) => {
          try {
            const info = await this.transporter.sendMail({
              from: process.env.SMTP_USER,
              ...validatedData,
            });

            // Save to database
            const savedEmail = await db.insert(emails).values({
              fromEmail: process.env.SMTP_USER!,
              toEmail: validatedData.to,
              subject: validatedData.subject,
              body: validatedData.body,
              status: 'sent',
              isRead: 'true',
              createdAt: new Date(),
              updatedAt: new Date()
            });

            resolve({
              success: true,
              messageId: info.messageId,
              savedEmail
            });
          } catch (error) {
            if (operation.retry(error as Error)) {
              return;
            }
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  static async fetchEmails() {
    try {
      await this.initializeImap();
      await this.imapClient.connect();
      
      console.log('IMAP Connected, fetching messages...');
      const lock = await this.imapClient.getMailboxLock('INBOX');
      
      try {
        const messages = await this.imapClient.fetch('1:*', { envelope: true, body: true });
        let count = 0;
        
        for await (const message of messages) {
          try {
            // Safely extract email addresses and handle potential undefined values
            const fromEmail = message.envelope?.from?.[0]?.address || process.env.SMTP_USER || 'unknown';
            const toEmail = message.envelope?.to?.[0]?.address || process.env.SMTP_USER || 'unknown';
            
            await db.insert(emails).values({
              subject: message.envelope?.subject || 'No Subject',
              body: typeof message.body === 'string' ? message.body : message.body?.toString() || '',
              fromEmail,
              toEmail,
              status: 'inbox',
              isRead: 'false',
              createdAt: message.envelope?.date || new Date(),
              updatedAt: new Date()
            });
            count++;
          } catch (error) {
            console.error('Failed to save email:', error);
            // Continue with next message
          }
        }
        
        console.log(`Successfully imported ${count} emails`);
      } finally {
        lock.release();
      }
      
      await this.imapClient.logout();
      return { success: true, message: 'Emails fetched successfully' };
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      throw error;
    }
  }

  static async verifyConnection() {
    try {
      await this.initialize();
      await this.transporter.verify();
      return { 
        success: true, 
        message: 'SMTP connection verified successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to verify SMTP connection',
        timestamp: new Date().toISOString()
      };
    }
  }
}