import type { Express } from "express";
import { db } from "../db";
import { products, clients, offers, offerItems } from "../db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const [productsCount, clientsCount, activeOffersCount] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(products),
        db.select({ count: sql`count(*)` }).from(clients),
        db.select({ count: sql`count(*)` }).from(offers).where(eq(offers.status, 'active')),
      ]);

      res.json({
        products: productsCount[0].count,
        clients: clientsCount[0].count,
        activeOffers: activeOffersCount[0].count,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.select().from(products);
      res.json(allProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const newProduct = await db.insert(products).values(req.body).returning();
      res.json(newProduct[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const allClients = await db.select().from(clients);
      res.json(allClients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const newClient = await db.insert(clients).values(req.body).returning();
      res.json(newClient[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Offers
  app.get("/api/offers", async (req, res) => {
    try {
      const allOffers = await db.select().from(offers);
      res.json(allOffers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  app.post("/api/offers", async (req, res) => {
    try {
      const { items, ...offerData } = req.body;
      const newOffer = await db.insert(offers).values(offerData).returning();
      
      if (items?.length) {
        await db.insert(offerItems).values(
          items.map((item: any) => ({
            ...item,
            offerId: newOffer[0].id,
          }))
        );
      }

      res.json(newOffer[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create offer" });
    }
  });
}
