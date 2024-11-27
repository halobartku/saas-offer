import nodemailer, { Transporter } from 'nodemailer';
import { type Offer } from '../../db/schema';

// Configure nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Email template types
type EmailTemplate = 'offer-status' | 'document-generated' | 'payment-reminder';

// HTML Template configurations
const templates = {
  'offer-status': {
    draft: {
      subject: 'New Offer Draft Created',
      body: (offer: Offer) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Offer Draft Created</h2>
          <p>A new offer draft has been created with the following details:</p>
          <ul>
            <li><strong>Offer ID:</strong> ${offer.id}</li>
            <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
            <li><strong>Created At:</strong> ${offer.createdAt}</li>
          </ul>
        </div>
      `
    },
    sent: {
      subject: 'New Offer Received',
      body: (offer: Offer) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Offer Received</h2>
          <p>You have received a new offer with the following details:</p>
          <ul>
            <li><strong>Offer ID:</strong> ${offer.id}</li>
            <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
          </ul>
          <p>Please review the offer and respond at your earliest convenience.</p>
        </div>
      `
    },
    accepted: {
      subject: 'Offer Accepted',
      body: (offer: Offer) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Offer Accepted</h2>
          <p>Your offer has been accepted:</p>
          <ul>
            <li><strong>Offer ID:</strong> ${offer.id}</li>
            <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
          </ul>
          <p>Thank you for your business!</p>
        </div>
      `
    },
    rejected: {
      subject: 'Offer Status Update: Rejected',
      body: (offer: Offer) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Offer Rejected</h2>
          <p>The offer has been rejected:</p>
          <ul>
            <li><strong>Offer ID:</strong> ${offer.id}</li>
            <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
          </ul>
          <p>Please contact us if you have any questions.</p>
        </div>
      `
    },
    'Close & Paid': {
      subject: 'Offer Closed and Payment Received',
      body: (offer: Offer) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Received</h2>
          <p>The offer has been closed and payment has been received:</p>
          <ul>
            <li><strong>Offer ID:</strong> ${offer.id}</li>
            <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
          </ul>
          <p>Thank you for your payment!</p>
        </div>
      `
    },
    'Paid & Delivered': {
      subject: 'Offer Completed: Paid and Delivered',
      body: (offer: Offer) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Offer Completed</h2>
          <p>The offer has been completed and delivered:</p>
          <ul>
            <li><strong>Offer ID:</strong> ${offer.id}</li>
            <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
          </ul>
          <p>Thank you for your business!</p>
        </div>
      `
    }
  },
  'document-generated': {
    subject: 'Document Generated',
    body: (offer: Offer) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Generated</h2>
        <p>A new document has been generated for your offer:</p>
        <ul>
          <li><strong>Offer ID:</strong> ${offer.id}</li>
          <li><strong>Generated At:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>Please check your dashboard to view and download the document.</p>
      </div>
    `
  },
  'payment-reminder': {
    subject: 'Payment Reminder',
    body: (offer: Offer) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Reminder</h2>
        <p>This is a friendly reminder about the pending payment for your offer:</p>
        <ul>
          <li><strong>Offer ID:</strong> ${offer.id}</li>
          <li><strong>Total Amount:</strong> ${offer.totalAmount}</li>
          <li><strong>Due Date:</strong> ${offer.updatedAt}</li>
        </ul>
        <p>Please process the payment at your earliest convenience.</p>
      </div>
    `
  }
};

// Verify SMTP connection
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error ? (error as any).code : undefined
    });
    return false;
  }
}

/**
 * Send an email using the specified template
 */
interface CustomEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export async function sendCustomEmail(options: CustomEmailOptions) {
  const startTime = new Date();
  console.log(`Starting custom email send process at ${startTime.toISOString()}`, {
    to: options.to,
    subject: options.subject
  });

  try {
    const isConnected = await verifyEmailConnection();
    if (!isConnected) {
      throw new Error('SMTP connection verification failed');
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      ...options
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Custom email sent successfully', {
      messageId: info.messageId,
      duration: `${Date.now() - startTime.getTime()}ms`
    });

    return info;
  } catch (error) {
    let errorMessage = 'Failed to send custom email';
    let errorCode = error instanceof Error ? (error as any).code : undefined;

    if (errorCode === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check SMTP credentials.';
    } else if (errorCode === 'ESOCKET') {
      errorMessage = 'Failed to connect to SMTP server. Please check your network connection.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error('Failed to send custom email', {
      error: errorMessage,
      code: errorCode,
      duration: `${Date.now() - startTime.getTime()}ms`
    });
    
    throw new Error(errorMessage);
  }
}

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Offer,
  templateVariant?: string
) {
  const startTime = new Date();
  console.log(`Starting email send process at ${startTime.toISOString()}`, {
    to,
    template,
    offerId: data.id
  });

  try {
    // Get template configuration
    let emailConfig;
    if (template === 'offer-status' && templateVariant) {
      emailConfig = templates[template][templateVariant as keyof typeof templates['offer-status']];
    } else {
      emailConfig = templates[template];
    }

    if (!emailConfig) {
      throw new Error(`Invalid template or variant: ${template}/${templateVariant}`);
    }

    // Verify connection before sending
    const isConnected = await verifyEmailConnection();
    if (!isConnected) {
      throw new Error('SMTP connection verification failed');
    }

    // Prepare email with HTML content
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: emailConfig.subject,
      html: emailConfig.body(data)
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully', {
      messageId: info.messageId,
      template,
      offerId: data.id,
      duration: `${Date.now() - startTime.getTime()}ms`
    });

    return info;
  } catch (error) {
    // Enhanced error handling with specific authentication error cases
    let errorMessage = 'Failed to send email';
    let errorCode = error instanceof Error ? (error as any).code : undefined;

    if (errorCode === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check SMTP credentials.';
    } else if (errorCode === 'ESOCKET') {
      errorMessage = 'Failed to connect to SMTP server. Please check your network connection.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error('Failed to send email', {
      error: errorMessage,
      code: errorCode,
      template,
      offerId: data.id,
      duration: `${Date.now() - startTime.getTime()}ms`
    });
    
    throw new Error(errorMessage);
  }
}

/**
 * Send offer status change notification
 */
export async function sendOfferStatusNotification(
  offer: Offer,
  status: string,
  recipientEmail: string
) {
  return sendEmail(recipientEmail, 'offer-status', offer, status);
}

/**
 * Send document generation notification
 */
export async function sendDocumentGenerationNotification(
  offer: Offer,
  recipientEmail: string
) {
  return sendEmail(recipientEmail, 'document-generated', offer);
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminder(
  offer: Offer,
  recipientEmail: string
) {
  return sendEmail(recipientEmail, 'payment-reminder', offer);
}
