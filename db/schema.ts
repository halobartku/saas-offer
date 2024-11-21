import { pgTable, text, integer, decimal, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Products table
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sku: text("sku").unique(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  vatNumber: text("vat_number"),
  clientType: text("client_type").notNull().default('direct'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offer templates table
export const offerTemplates = pgTable("offer_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template items
export const templateItems = pgTable("template_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => offerTemplates.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default('0'),
});

// Offers table
export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  status: text("status", { enum: ['draft', 'sent', 'accepted', 'rejected', 'Close & Paid', 'Paid & Delivered'] })
    .notNull()
    .default('draft'),
  validUntil: timestamp("valid_until"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  lastContact: timestamp("last_contact"),
  nextContact: timestamp("next_contact"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offer items (products in an offer)
export const offerItems = pgTable("offer_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  offerId: uuid("offer_id").references(() => offers.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default('0'),
});

// Zod schemas
export const insertProductSchema = createInsertSchema(products, {
  price: z.number().min(0).transform(val => Number(val.toFixed(2))),
  imageUrl: z.string().url().optional(),
});
export const selectProductSchema = createSelectSchema(products);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = z.infer<typeof selectProductSchema>;

export const insertClientSchema = createInsertSchema(clients, {
  clientType: z.enum(['direct', 'business']),
  vatNumber: z.string().optional(),
});
export const selectClientSchema = createSelectSchema(clients);
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = z.infer<typeof selectClientSchema>;

export const insertOfferSchema = createInsertSchema(offers, {
  validUntil: z.string().datetime().nullable(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'Close & Paid', 'Paid & Delivered']),
  notes: z.string().optional(),
  lastContact: z.string().datetime().nullable(),
  nextContact: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
});
export const selectOfferSchema = createSelectSchema(offers);
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = z.infer<typeof selectOfferSchema>;

export const insertOfferItemSchema = createInsertSchema(offerItems);
export const selectOfferItemSchema = createSelectSchema(offerItems);
export type InsertOfferItem = z.infer<typeof insertOfferItemSchema>;
export type OfferItem = z.infer<typeof selectOfferItemSchema>;

// Template schemas
export const insertTemplateSchema = createInsertSchema(offerTemplates);
export const selectTemplateSchema = createSelectSchema(offerTemplates);
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = z.infer<typeof selectTemplateSchema>;

export const insertTemplateItemSchema = createInsertSchema(templateItems);
export const selectTemplateItemSchema = createSelectSchema(templateItems);
export type InsertTemplateItem = z.infer<typeof insertTemplateItemSchema>;
export type TemplateItem = z.infer<typeof selectTemplateItemSchema>;
