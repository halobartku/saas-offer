import { Router } from 'express';
import { db } from '../../../db/connection';
import { offers } from '../../../db/schema';
import { sendEmail, generateOfferEmailContent } from '../../services/email';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const {
      title,
      clientId,
      items,
      validUntil,
      notes,
      includeVat = false,
    } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      const itemSubtotal = item.quantity * Number(item.unitPrice);
      const discount = itemSubtotal * (Number(item.discount || 0) / 100);
      return sum + (itemSubtotal - discount);
    }, 0);

    const vat = includeVat ? subtotal * 0.23 : 0;
    const totalAmount = subtotal + vat;

    // Create the offer
    const [offer] = await db.insert(offers).values({
      title,
      clientId,
      status: 'draft',
      validUntil: validUntil ? new Date(validUntil) : null,
      notes,
      subtotal,
      vat,
      totalAmount,
      includeVat: String(includeVat),
      items: items,
      lastContact: new Date(),
      currency: 'EUR',
      exchangeRate: 4.35,
    }).returning();

    // Get client email from the database
    const [client] = await db.select().from('clients').where('id', '=', clientId);

    if (client?.email) {
      // Send email notification
      const { html, text } = generateOfferEmailContent(offer);
      await sendEmail({
        to: client.email,
        subject: `New Offer: ${offer.title}`,
        html,
        text,
      });
    }

    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating public offer:', error);
    res.status(500).json({
      error: 'Failed to create offer',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
