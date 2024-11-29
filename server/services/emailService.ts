import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import retry from 'retry';

// Email validation schema with attachments support
interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  encoding?: string;
  path?: string;
}

const emailAttachmentSchema = z.object({
  filename: z.string(),
  content: z.union([z.string(), z.instanceof(Buffer)]),
  contentType: z.string(),
  encoding: z.string().optional(),
  path: z.string().optional(),
// Email size limits and configurations
const EMAIL_CONFIG = {
  MAX_TOTAL_SIZE: 25 * 1024 * 1024, // 25MB total email size limit
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB per attachment
  MAX_ATTACHMENTS: 10, // Maximum number of attachments
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

});

const emailSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  threadId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  attachments: z.array(emailAttachmentSchema).optional(),
});

type EmailData = z.infer<typeof emailSchema>;

// SMTP credentials validation schema
const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.number().int().positive("SMTP port must be a positive number"),
  user: z.string().email("SMTP user must be a valid email"),
  password: z.string().min(1, "SMTP password is required"),
});

export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static isInitialized = false;
  // Enhanced retry configuration with more granular control
  private static retryOptions = {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 10000,
    randomize: true,
  };

  // Queue for failed emails
  private static failedEmailsQueue: Array<{
    to: string;
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
    attempts: number;
    lastAttempt: Date;
    error: string;
  }> = [];

  // Maximum queue size
  private static readonly MAX_QUEUE_SIZE = 100;

  // Rate limiter setup - 100 emails per hour
  public static rateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: { error: 'Too many email requests, please try again later' }
  });

  private static validateSMTPConfig() {
    try {
      return smtpConfigSchema.parse({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '', 10),
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`SMTP Configuration Error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw new Error('Invalid SMTP configuration');
    }
  }

  private static async initializeTransporter() {
    if (this.isInitialized && this.transporter) {
      try {
        await this.transporter.verify();
        return;
      } catch (error) {
        this.isInitialized = false;
      }
    }

    // Validate SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP configuration is incomplete');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    try {
      await this.transporter.verify();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize SMTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendEmail(to: string, subject: string, body: string, attachments?: EmailAttachment[], threadId?: string, parentId?: string) {
    // Create retry operation with enhanced monitoring
    const operation = retry.operation(this.retryOptions);
    const startTime = Date.now();
    const emailId = crypto.randomUUID();

    console.log('Starting email send process:', {
      emailId,
      to,
      subject,
      hasAttachments: !!attachments?.length,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        // Log attempt information
        console.log('Email send attempt:', {
          emailId,
          attempt: currentAttempt,
          timestamp: new Date().toISOString()
        });
        try {
          // Initialize SMTP connection
          await this.initializeTransporter();

          // Validate input
          const validatedData = emailSchema.parse({ 
            to, 
            subject, 
            body,
            attachments,
            threadId,
            parentId
          });

          // Generate thread ID if this is a new email thread
          const emailThreadId = threadId || crypto.randomUUID();

          // Configure email
          const mailOptions = {
            from: process.env.SMTP_USER,
            to: validatedData.to,
            subject: validatedData.subject,
            text: validatedData.body,
            attachments: validatedData.attachments,
          };

          // Validate attachments
          if (attachments?.length) {
            // Check number of attachments
            if (attachments.length > EMAIL_CONFIG.MAX_ATTACHMENTS) {
              throw new Error(`Maximum ${EMAIL_CONFIG.MAX_ATTACHMENTS} attachments allowed`);
            }

            // Validate each attachment
            for (const attachment of attachments) {
              // Size validation
              const size = attachment.content instanceof Buffer 
                ? attachment.content.length 
                : Buffer.from(attachment.content).length;
              
              if (size > EMAIL_CONFIG.MAX_ATTACHMENT_SIZE) {
                throw new Error(`Attachment '${attachment.filename}' exceeds size limit of ${EMAIL_CONFIG.MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB`);
              }

              // MIME type validation
              if (!EMAIL_CONFIG.ALLOWED_MIME_TYPES.includes(attachment.contentType)) {
                throw new Error(`Unsupported file type for attachment '${attachment.filename}'`);
              }
            }

            // Validate total email size
            const totalSize = attachments.reduce((sum, att) => {
              const size = att.content instanceof Buffer 
                ? att.content.length 
                : Buffer.from(att.content).length;
              return sum + size;
            }, 0);
            
            if (totalSize > EMAIL_CONFIG.MAX_TOTAL_SIZE) {
              throw new Error(`Total email size exceeds ${EMAIL_CONFIG.MAX_TOTAL_SIZE / (1024 * 1024)}MB limit`);
            }
          }

          // Send email with enhanced monitoring
          const info = await this.transporter.sendMail(mailOptions);
          const duration = Date.now() - startTime;
          
          // Enhanced success logging
          console.log('Email sent successfully:', {
            emailId,
            messageId: info.messageId,
            to: validatedData.to,
            subject: validatedData.subject,
            duration: `${duration}ms`,
            attempts: currentAttempt,
            timestamp: new Date().toISOString(),
            attachments: attachments?.map(a => ({
              filename: a.filename,
              size: a.content instanceof Buffer ? a.content.length : Buffer.from(a.content).length
            }))
          });

          resolve({ 
            success: true, 
            messageId: info.messageId,
            attempt: currentAttempt
          });
        } catch (error) {
          console.error('Email sending error:', {
            attempt: currentAttempt,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });

          // Enhanced error handling and retry logic
          const errorDetails = {
            emailId,
            attempt: currentAttempt,
            duration: `${Date.now() - startTime}ms`,
            errorType: error.constructor.name,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          };

          console.error('Email sending error:', errorDetails);

          if (operation.retry(error as Error)) {
            console.log('Retrying email send:', {
              emailId,
              nextAttempt: currentAttempt + 1,
              timestamp: new Date().toISOString()
            });
            return;
          }

          // Add to failed emails queue if all retries exhausted
          if (this.failedEmailsQueue.length < this.MAX_QUEUE_SIZE) {
            this.failedEmailsQueue.push({
              to,
              subject,
              body,
              attachments,
              attempts: currentAttempt,
              lastAttempt: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            console.log('Email added to retry queue:', {
              emailId,
              queueSize: this.failedEmailsQueue.length,
              timestamp: new Date().toISOString()
            });
          }

          // Format detailed error message
          let errorMessage = 'Failed to send email';
          if (error instanceof z.ZodError) {
            errorMessage = `Validation error: ${error.errors.map(e => e.message).join(', ')}`;
          } else if (error instanceof Error) {
            errorMessage = `${error.message} (Attempt ${currentAttempt}/${this.retryOptions.retries})`;
          }

          reject(new Error(errorMessage));
        }
      });
    });
  }

  static async verifyConnection() {
    try {
      await this.initializeTransporter();
      await this.transporter.verify();
      return { 
        success: true, 
        message: 'SMTP connection verified successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("SMTP Connection Error:", {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to verify SMTP connection',
        timestamp: new Date().toISOString()
      };
    }
  }
}
