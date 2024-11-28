import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import retry from 'retry';

// Email validation schema with attachments support
const emailSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string()
  })).optional(),
});

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
  private static retryOptions = {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000,
  };

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
        console.warn('SMTP connection lost, reinitializing...');
      }
    }

    const config = this.validateSMTPConfig();

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });

    try {
      await this.transporter.verify();
      this.isInitialized = true;
      console.log('SMTP connection established successfully');
    } catch (error) {
      this.isInitialized = false;
      throw new Error(`Failed to establish SMTP connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendEmail(to: string, subject: string, body: string, attachments?: any[]) {
    // Create retry operation
    const operation = retry.operation(this.retryOptions);

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          // Initialize SMTP connection
          await this.initializeTransporter();

          // Validate input
          const validatedData = emailSchema.parse({ 
            to, 
            subject, 
            body,
            attachments 
          });

          // Configure email
          const mailOptions = {
            from: process.env.SMTP_USER,
            to: validatedData.to,
            subject: validatedData.subject,
            text: validatedData.body,
            attachments: validatedData.attachments,
          };

          // Send email
          const info = await this.transporter.sendMail(mailOptions);
          
          // Log success
          console.log('Email sent successfully:', {
            messageId: info.messageId,
            to: validatedData.to,
            subject: validatedData.subject,
            timestamp: new Date().toISOString()
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

          if (operation.retry(error as Error)) {
            return;
          }

          // Format error message based on error type
          let errorMessage = 'Failed to send email';
          if (error instanceof z.ZodError) {
            errorMessage = `Validation error: ${error.errors.map(e => e.message).join(', ')}`;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          reject(new Error(errorMessage));
        }
      });
    });
  }

  static async verifyConnection() {
    try {
      await this.initializeTransporter();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to verify SMTP connection' 
      };
    }
  }
}
