import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export function generateOfferEmailContent(offer: any) {
  const html = `
    <h2>New Offer Created</h2>
    <p>A new offer has been created with the following details:</p>
    <ul>
      <li><strong>Title:</strong> ${offer.title}</li>
      <li><strong>Total Amount:</strong> €${offer.totalAmount?.toFixed(2)}</li>
      <li><strong>Valid Until:</strong> ${offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : 'Not specified'}</li>
    </ul>
    <p>Please review the offer and we'll get back to you soon.</p>
  `;

  const text = `
    New Offer Created
    
    A new offer has been created with the following details:
    
    Title: ${offer.title}
    Total Amount: €${offer.totalAmount?.toFixed(2)}
    Valid Until: ${offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : 'Not specified'}
    
    Please review the offer and we'll get back to you soon.
  `;

  return { html, text };
}
