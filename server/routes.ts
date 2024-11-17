import type { Express } from "express";
import { db } from "../db";
import { products, clients, offers, offerItems } from "../db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  secure: true
});

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

  // File Upload
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
      });

      res.json({ url: result.secure_url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
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

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updatedProduct = await db
        .update(products)
        .set(req.body)
        .where(eq(products.id, req.params.id))
        .returning();
      res.json(updatedProduct[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
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

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const updatedClient = await db
        .update(clients)
        .set(req.body)
        .where(eq(clients.id, req.params.id))
        .returning();
      res.json(updatedClient[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update client" });
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

  app.put("/api/offers/:id", async (req, res) => {
    try {
      const { items, ...offerData } = req.body;
      const updatedOffer = await db
        .update(offers)
        .set(offerData)
        .where(eq(offers.id, req.params.id))
        .returning();

      if (items?.length) {
        await db.delete(offerItems).where(eq(offerItems.offerId, req.params.id));
        await db.insert(offerItems).values(
          items.map((item: any) => ({
            ...item,
            offerId: req.params.id,
          }))
        );
      }

      res.json(updatedOffer[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update offer" });
    }
  });
}
