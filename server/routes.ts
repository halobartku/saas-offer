import type { Express } from "express";
import { db } from "../db";
import { products, clients, offers, offerItems, offerTemplates } from "../db/schema";
import { eq, and, sql, lt, desc } from "drizzle-orm";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { subDays } from "date-fns";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Background job to archive old closed offers
async function archiveOldOffers() {
  try {
    const thresholdDate = subDays(new Date(), 3);
    
    await db
      .update(offers)
      .set({ 
        status: 'Paid & Delivered',
        archivedAt: new Date()
      })
      .where(
        and(
          eq(offers.status, 'Close & Paid'),
          lt(offers.updatedAt, thresholdDate)
        )
      );
  } catch (error) {
    console.error("Failed to archive old offers:", error);
  }
}

// Run archive job every day
setInterval(archiveOldOffers, 24 * 60 * 60 * 1000);
// Run once at startup
archiveOldOffers();

export function registerRoutes(app: Express) {
  // Statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const [
        productsCount,
        clientsCount,
        activeOffersCount,
        activeOffersTotal,
        bestsellingProduct,
        monthlyRevenue
      ] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(products),
        db.select({ count: sql`count(*)` }).from(clients),
        db.select({ count: sql`count(*)` })
          .from(offers)
          .where(sql`status IN ('Sent', 'Accepted')`),
        db.select({ total: sql`SUM(total_amount)` })
          .from(offers)
          .where(sql`status IN ('Sent', 'Accepted')`),
        db.execute(sql`
          WITH closed_offers AS (
            SELECT id FROM ${offers}
            WHERE status IN ('Close & Paid', 'Paid & Delivered')
          )
          SELECT 
            p.name,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.quantity * oi.unit_price * (1 - COALESCE(oi.discount, 0)/100)) as total_revenue
          FROM ${products} p
          JOIN ${offerItems} oi ON p.id = oi.product_id
          JOIN closed_offers co ON oi.offer_id = co.id
          GROUP BY p.id, p.name
          ORDER BY total_quantity DESC
          LIMIT 1
        `),
        db.execute(sql`
          SELECT 
            DATE_TRUNC('month', o.updated_at) as month,
            SUM(total_amount) as revenue
          FROM ${offers} o
          WHERE status IN ('Close & Paid', 'Paid & Delivered')
          AND updated_at >= NOW() - INTERVAL '6 months'
          GROUP BY month
          ORDER BY month DESC
        `)
      ]);

      res.json({
        products: productsCount[0].count,
        clients: clientsCount[0].count,
        activeOffers: activeOffersCount[0].count,
        activeOffersTotal: activeOffersTotal[0].total || 0,
        bestsellingProduct: bestsellingProduct.rows[0],
        monthlyRevenue: monthlyRevenue.rows
      });
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
      res.status(500).json({ error: "An error occurred while fetching statistics" });
    }
  });

  // Products sold statistics
  app.get("/api/products/sold", async (req, res) => {
    try {
      const { from, to } = req.query;
      
      let dateFilter = sql`TRUE`;
      if (from && to) {
        dateFilter = sql`o.updated_at BETWEEN ${from} AND ${to}`;
      }

      const sales = await db.execute(sql`
        WITH closed_offers AS (
          SELECT id 
          FROM ${offers} o
          WHERE status IN ('Close & Paid', 'Paid & Delivered')
          AND ${dateFilter}
        )
        SELECT 
          p.id as "productId",
          p.name,
          SUM(oi.quantity) as "totalQuantity",
          SUM(oi.quantity * oi.unit_price * (1 - COALESCE(oi.discount, 0)/100)) as "totalRevenue",
          MAX(o.updated_at) as "lastSaleDate"
        FROM ${products} p
        JOIN ${offerItems} oi ON p.id = oi.product_id
        JOIN ${offers} o ON oi.offer_id = o.id
        WHERE o.id IN (SELECT id FROM closed_offers)
        GROUP BY p.id, p.name
        ORDER BY "totalRevenue" DESC
      `);

      res.json(sales.rows);
    } catch (error) {
      console.error("Failed to fetch product sales:", error);
      res.status(500).json({ error: "An error occurred while fetching product sales" });
    }
  });

  // File Upload
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded" });
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
      res.status(500).json({ error: "Failed to upload file to storage" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.select().from(products);
      res.json(allProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      res.status(500).json({ error: "An error occurred while fetching products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const newProduct = await db.insert(products).values(req.body).returning();
      res.json(newProduct[0]);
    } catch (error) {
      console.error("Failed to create product:", error);
      res.status(500).json({ error: "An error occurred while creating the product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updatedProduct = await db
        .update(products)
        .set(req.body)
        .where(eq(products.id, req.params.id))
        .returning();
      
      if (!updatedProduct.length) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(updatedProduct[0]);
    } catch (error) {
      console.error("Failed to update product:", error);
      res.status(500).json({ error: "An error occurred while updating the product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      // Check if product is used in any offers
      const offerWithProduct = await db
        .select()
        .from(offerItems)
        .where(eq(offerItems.productId, req.params.id))
        .limit(1);

      if (offerWithProduct.length > 0) {
        return res.status(400).json({
          error: "Cannot delete product that is used in offers. Please remove it from all offers first."
        });
      }

      const deletedProduct = await db
        .delete(products)
        .where(eq(products.id, req.params.id))
        .returning();

      if (!deletedProduct.length) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(deletedProduct[0]);
    } catch (error) {
      console.error("Failed to delete product:", error);
      res.status(500).json({ error: "An error occurred while deleting the product" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const allClients = await db.select().from(clients);
      res.json(allClients);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      res.status(500).json({ error: "An error occurred while fetching clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, req.params.id));

      if (!client.length) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(client[0]);
    } catch (error) {
      console.error("Failed to fetch client:", error);
      res.status(500).json({ error: "An error occurred while fetching the client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const newClient = await db.insert(clients).values(req.body).returning();
      res.json(newClient[0]);
    } catch (error) {
      console.error("Failed to create client:", error);
      res.status(500).json({ error: "An error occurred while creating the client" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const existingClient = await db
        .select()
        .from(clients)
        .where(eq(clients.id, req.params.id));

      if (!existingClient.length) {
        return res.status(404).json({ error: "Client not found" });
      }

      const updatedClient = await db
        .update(clients)
        .set(req.body)
        .where(eq(clients.id, req.params.id))
        .returning();

      res.json(updatedClient[0]);
    } catch (error) {
      console.error("Failed to update client:", error);
      res.status(500).json({ error: "An error occurred while updating the client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const clientOffers = await db
        .select()
        .from(offers)
        .where(eq(offers.clientId, req.params.id));

      if (clientOffers.length > 0) {
        return res.status(400).json({
          error: "Cannot delete client with associated offers. Please delete the offers first."
        });
      }

      const deletedClient = await db
        .delete(clients)
        .where(eq(clients.id, req.params.id))
        .returning();

      if (!deletedClient.length) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(deletedClient[0]);
    } catch (error) {
      console.error("Failed to delete client:", error);
      res.status(500).json({ error: "An error occurred while deleting the client" });
    }
  });

  // Offers
  app.get("/api/offers", async (req, res) => {
    try {
      const allOffers = await db.select().from(offers);
      res.json(allOffers);
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  app.get("/api/offers/:id/items", async (req, res) => {
    try {
      const items = await db
        .select({
          id: offerItems.id,
          offerId: offerItems.offerId,
          productId: offerItems.productId,
          quantity: offerItems.quantity,
          unitPrice: offerItems.unitPrice,
          discount: offerItems.discount,
          product: products
        })
        .from(offerItems)
        .leftJoin(products, eq(offerItems.productId, products.id))
        .where(eq(offerItems.offerId, req.params.id));
      
      res.json(items);
    } catch (error) {
      console.error("Failed to fetch offer items:", error);
      res.status(500).json({ error: "Failed to fetch offer items" });
    }
  });

  app.post("/api/offers", async (req, res) => {
    try {
      const { items, ...offerData } = req.body;
      
      const data = {
        ...offerData,
        status: offerData.status || 'Draft',
        validUntil: offerData.validUntil ? new Date(offerData.validUntil) : null,
        lastContact: offerData.lastContact ? new Date(offerData.lastContact) : null,
        nextContact: offerData.nextContact ? new Date(offerData.nextContact) : null
      };

      const newOffer = await db.insert(offers).values(data).returning();
      
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
      console.error("Failed to create offer:", error);
      res.status(500).json({ error: "Failed to create offer" });
    }
  });

  app.put("/api/offers/:id", async (req, res) => {
    try {
      const { items, validUntil, ...offerData } = req.body;
      const data = {
        ...offerData,
        validUntil: validUntil ? new Date(validUntil) : null,
        lastContact: offerData.lastContact ? new Date(offerData.lastContact) : null,
        nextContact: offerData.nextContact ? new Date(offerData.nextContact) : null
      };

      const updatedOffer = await db
        .update(offers)
        .set(data)
        .where(eq(offers.id, req.params.id))
        .returning();

      if (items?.length) {
        await db.delete(offerItems)
          .where(eq(offerItems.offerId, req.params.id));
        
        await db.insert(offerItems).values(
          items.map((item: any) => ({
            ...item,
            offerId: req.params.id,
          }))
        );
      }

      res.json(updatedOffer[0]);
    } catch (error) {
      console.error("Failed to update offer:", error);
      res.status(500).json({ error: "Failed to update offer" });
    }
  });

  app.delete("/api/offers/:id", async (req, res) => {
    try {
      // First delete associated items
      await db.delete(offerItems)
        .where(eq(offerItems.offerId, req.params.id));

      const deletedOffer = await db
        .delete(offers)
        .where(eq(offers.id, req.params.id))
        .returning();

      if (!deletedOffer.length) {
        return res.status(404).json({ error: "Offer not found" });
      }

      res.json(deletedOffer[0]);
    } catch (error) {
      console.error("Failed to delete offer:", error);
      res.status(500).json({ error: "Failed to delete offer" });
    }
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const allTemplates = await db.select().from(offerTemplates);
      res.json(allTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      res.status(500).json({ error: "An error occurred while fetching templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const newTemplate = await db.insert(offerTemplates).values(req.body).returning();
      res.json(newTemplate[0]);
    } catch (error) {
      console.error("Failed to create template:", error);
      res.status(500).json({ error: "An error occurred while creating the template" });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const updatedTemplate = await db
        .update(offerTemplates)
        .set(req.body)
        .where(eq(offerTemplates.id, req.params.id))
        .returning();
      
      if (!updatedTemplate.length) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(updatedTemplate[0]);
    } catch (error) {
      console.error("Failed to update template:", error);
      res.status(500).json({ error: "An error occurred while updating the template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const deletedTemplate = await db
        .delete(offerTemplates)
        .where(eq(offerTemplates.id, req.params.id))
        .returning();

      if (!deletedTemplate.length) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(deletedTemplate[0]);
    } catch (error) {
      console.error("Failed to delete template:", error);
      res.status(500).json({ error: "An error occurred while deleting the template" });
    }
  });
}