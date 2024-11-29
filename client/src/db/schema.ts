import { z } from 'zod';

// Type definitions for offer items
export const offerItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
  discount: z.number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%')
    .optional(),
});

// Type definitions for offers
export const insertOfferSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  clientId: z.string().min(1, 'Client is required'),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).default('draft'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  lastContact: z.string().optional(),
  nextContact: z.string().optional(),
  items: z.array(offerItemSchema),
});

// Type definitions for clients
export const insertClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Type definitions for settings
export const insertSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  vatNumber: z.string().min(1, 'VAT number is required'),
  address: z.string().min(1, 'Address is required'),
  country: z.string().min(1, 'Country is required'),
  currency: z.enum(['EUR', 'PLN']).default('EUR'),
  vatRate: z.number().min(0).max(100).default(23),
  exchangeRate: z.number().min(0).default(4.35),
});

// Export types
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type OfferItem = z.infer<typeof offerItemSchema>;

export type Client = InsertClient & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
