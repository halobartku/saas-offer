import nodemailer from 'nodemailer';
import { type Offer } from '../../db/schema';

// Configure nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Email template types
type EmailTemplate = 'offer-status' | 'document-generated' | 'payment-reminder';

// Template configurations
const templates = {
  'offer-status': {
    draft: {
      subject: 'New Offer Draft Created',
      body: (offer: Offer) => `
        A new offer draft has been created.
        Offer ID: ${offer.id}
        Total Amount: ${offer.totalAmount}
        Created At: ${offer.createdAt}
      `
    },
    sent: {
      subject: 'New Offer Received',
      body: (offer: Offer) => `
        You have received a new offer.
        Offer ID: ${offer.id}
        Total Amount: ${offer.totalAmount}
        Please review the offer and respond at your earliest convenience.
      `
    },
    accepted: {
      subject: 'Offer Accepted',
      body: (offer: Offer) => `
        Your offer has been accepted.
        Offer ID: ${offer.id}
        Total Amount: ${offer.totalAmount}
        Thank you for your business!
      `
    },
    rejected: {
      subject: 'Offer Status Update: Rejected',
      body: (offer: Offer) => `
        The offer has been rejected.
        Offer ID: ${offer.id}
        Total Amount: ${offer.totalAmount}
        Please contact us if you have any questions.
      `
    },
    'Close & Paid': {
      subject: 'Offer Closed and Payment Received',
      body: (offer: Offer) => `
        The offer has been closed and payment has been received.
        Offer ID: ${offer.id}
        Total Amount: ${offer.totalAmount}
        Thank you for your payment!
      `
    },
    'Paid & Delivered': {
      subject: 'Offer Completed: Paid and Delivered',
      body: (offer: Offer) => `
        The offer has been completed and delivered.
        Offer ID: ${offer.id}
        Total Amount: ${offer.totalAmount}
        Thank you for your business!
      `
    }
  },
  'document-generated': {
    subject: 'Document Generated',
    body: (offer: Offer) => `
      A new document has been generated for your offer.
      Offer ID: ${offer.id}
      Generated At: ${new Date().toISOString()}
      Please check your dashboard to view and download the document.
    `
  },
  'payment-reminder': {
    subject: 'Payment Reminder',
    body: (offer: Offer) => `
      This is a friendly reminder about the pending payment for your offer.
      Offer ID: ${offer.id}
      Total Amount: ${offer.totalAmount}
      Due Date: ${offer.updatedAt}
      Please process the payment at your earliest convenience.
    `
  }
};

// Error type for email sending failures
interface EmailError extends Error {
  code?: string;
  command?: string;
}

/**
 * Send an email using the specified template
 */
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

    // Prepare email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: emailConfig.subject,
      text: emailConfig.body(data),
      html: emailConfig.body(data).replace(/\n/g, '<br>')
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
    const emailError = error as EmailError;
    console.error('Failed to send email', {
      error: emailError.message,
      code: emailError.code,
      command: emailError.command,
      template,
      offerId: data.id,
      duration: `${Date.now() - startTime.getTime()}ms`
    });
    throw error;
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
