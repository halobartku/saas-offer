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
  countryCode: text("country_code"),
  clientType: text("client_type").notNull().default('direct'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offers table
export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  status: text("status", { enum: ['draft', 'sent', 'accepted', 'rejected', 'Close & Paid', 'Paid & Delivered'] })
    .notNull()
    .default('draft'),
  currency: text("currency", { enum: ['EUR', 'PLN'] })
    .notNull()
    .default('EUR'),
  language: text("language", { enum: ['en', 'pl', 'de', 'fr'] })
    .notNull()
    .default('en'),
  validUntil: timestamp("valid_until"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  lastContact: timestamp("last_contact"),
  nextContact: timestamp("next_contact"),
  archivedAt: timestamp("archived_at"),
  includeVat: text("include_vat", { enum: ['true', 'false'] }).notNull().default('false'),
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
  countryCode: z.string().length(2).optional(),
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


// Settings table
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").notNull(),
  companyEmail: text("company_email").notNull(),
  companyPhone: text("company_phone"),
  companyAddress: text("company_address"),
  companyVatNumber: text("company_vat_number"),
  companyLogo: text("company_logo"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings);
export const selectSettingsSchema = createSelectSchema(settings);
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = z.infer<typeof selectSettingsSchema>;




