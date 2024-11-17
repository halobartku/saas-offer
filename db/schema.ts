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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offers table
export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  status: text("status").notNull().default('draft'),
  validUntil: timestamp("valid_until"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
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
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = z.infer<typeof selectProductSchema>;

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = z.infer<typeof selectClientSchema>;

export const insertOfferSchema = createInsertSchema(offers);
export const selectOfferSchema = createSelectSchema(offers);
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = z.infer<typeof selectOfferSchema>;

export const insertOfferItemSchema = createInsertSchema(offerItems);
export const selectOfferItemSchema = createSelectSchema(offerItems);
export type InsertOfferItem = z.infer<typeof insertOfferItemSchema>;
export type OfferItem = z.infer<typeof selectOfferItemSchema>;
