import nodemailer from 'nodemailer';
import { z } from 'zod';

// Email validation schema
const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

// Create transporter with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export class EmailService {
  static async sendEmail(to: string, subject: string, body: string) {
    try {
      // Validate input
      const validatedData = emailSchema.parse({ to, subject, body });

      // Configure email
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: validatedData.to,
        subject: validatedData.subject,
        text: validatedData.body,
      };

      // Verify SMTP connection
      await transporter.verify();

      // Send email
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while sending email');
    }
  }
}
