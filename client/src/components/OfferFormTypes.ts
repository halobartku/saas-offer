import { z } from "zod";
import { insertOfferSchema, type InsertOffer } from "db/schema";

export interface OfferFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertOffer>;
  onClose?: () => void;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  clientType: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export const OFFER_STATUS = ["draft", "sent", "accepted", "rejected"] as const;
export type OfferStatus = typeof OFFER_STATUS[number];

export const offerItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%"),
});

export const enhancedOfferSchema = insertOfferSchema.extend({
  items: z.array(offerItemSchema).min(1, "At least one item is required"),
});

export const calculateTotal = (items: any[]) => {
  return items.reduce((sum, item) => {
    if (!item.quantity || !item.unitPrice) return sum;
    const subtotal = Number(item.quantity) * Number(item.unitPrice);
    const discount = subtotal * (Number(item.discount || 0) / 100);
    return sum + (subtotal - discount);
  }, 0);
};
