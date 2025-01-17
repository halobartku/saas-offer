import type { Request, Response, Express } from "express";
import { db } from "../db";
import { EmailService } from './services/emailService';
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { subDays } from "date-fns";

import { validateEnv } from "./types/env";

const env = validateEnv();

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, JPEG and PNG files are allowed.'), false);
    }
  }
});
import { products, clients, offers, offerItems, settings, emails } from "../db/schema";
import { eq, and, sql, lt, desc } from "drizzle-orm";
import { parse } from 'csv-parse';
import { insertProductSchema } from '../db/schema';
import { z } from 'zod';


const OFFER_STATUS = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "Close & Paid",
  "Paid & Delivered",
] as const;
type OfferStatus = (typeof OFFER_STATUS)[number];
// Background job to archive old offers

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
// VAT validation endpoint
app.get("/api/vat/validate/:countryCode/:vatNumber", async (req, res) => {
  const startTime = new Date().toISOString();
  console.log('VAT Validation Request:', {
    countryCode: req.params.countryCode,
    vatNumber: req.params.vatNumber,
    timestamp: startTime
  });

  try {
    res.setHeader('Content-Type', 'application/json');
    const { countryCode, vatNumber } = req.params;

    // Input validation
    if (!countryCode || !vatNumber) {
      throw new Error('Country code and VAT number are required');
    }

    console.log('Making VIES service request:', {
      countryCode,
      vatNumber,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`http://ec.europa.eu/taxation_customs/vies/services/checkVatService`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': ''
      },
      body: `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
          <soapenv:Header/>
          <soapenv:Body>
            <urn:checkVat>
              <urn:countryCode>${countryCode}</urn:countryCode>
              <urn:vatNumber>${vatNumber}</urn:vatNumber>
            </urn:checkVat>
          </soapenv:Body>
        </soapenv:Envelope>
      `
    });

    console.log('VIES Service Response:', {
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      throw new Error(`VIES service error: ${response.statusText}`);
    }

    const xmlText = await response.text();
    // Log XML response once with comprehensive details
    console.log('XML Response:', {
      content: xmlText,
      timestamp: new Date().toISOString(),
      contentLength: xmlText.length,
      hasCheckVatResponse: xmlText.includes('checkVatResponse')
    });

    // Check for valid XML structure
    if (!xmlText.includes('checkVatResponse')) {
      console.error('Invalid XML Response Structure:', {
        content: xmlText,
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid response structure');
    }

    // Extract validation result using proper namespace
    const valid = xmlText.includes('<ns2:valid>true</ns2:valid>');
    const nameMatch = xmlText.match(/<ns2:name>(.*?)<\/ns2:name>/);
    const addressMatch = xmlText.match(/<ns2:address>([\s\S]*?)<\/ns2:address>/);

    // Log parsed data
    console.log('Parsed XML Data:', {
      valid,
      nameFound: !!nameMatch,
      addressFound: !!addressMatch,
      timestamp: new Date().toISOString()
    });

    if (!nameMatch || !addressMatch) {
      console.warn('Company details not complete:', {
        nameFound: !!nameMatch,
        addressFound: !!addressMatch,
        timestamp: new Date().toISOString()
      });
    }

    const result = {
      valid,
      name: nameMatch ? nameMatch[1].trim() : '',
      address: addressMatch ? addressMatch[1].trim() : '',
      countryCode,
      vatNumber,
      validationTimestamp: new Date().toISOString()
    };

    console.log('Validation Result:', {
      ...result,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - new Date(startTime).getTime()}ms`
    });

    res.json(result);
  } catch (error) {
    console.error('VAT validation error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - new Date(startTime).getTime()}ms`
    });

    const errorResponse = {
      error: 'Failed to validate VAT number',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
});
  
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
  app.get("/api/products/sold", validateRequest(dateRangeSchema), async (req, res) => {
    try {
      const { from, to } = req.query;
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      
      if (from) {
        fromDate = new Date(from as string);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json(createErrorResponse(
            'Invalid date format',
            'From date is invalid',
            'INVALID_DATE_FORMAT',
            { field: 'from', value: from }
          ));
        }
      }
      
      if (to) {
        toDate = new Date(to as string);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json(createErrorResponse(
            'Invalid date format',
            'To date is invalid',
            'INVALID_DATE_FORMAT',
            { field: 'to', value: to }
          ));
        }
      }

      // Validate date range
      if (fromDate && toDate && fromDate > toDate) {
        return res.status(400).json(createErrorResponse(
          'Invalid date range',
          'From date must be before or equal to to date',
          'INVALID_DATE_RANGE',
          { from: fromDate, to: toDate }
        ));
      }

      const result = await DatabaseService.getProductSales(fromDate, toDate);
      
      const response = createSuccessResponse(result.data, {
        total: result.data.length,
        dateRange: from || to ? { from, to } : null,
        queryTimestamp: result.meta.queryTimestamp
      });

      // Cache headers for improved performance
      res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
      res.json(response);
    } catch (error) {
      console.error("Failed to fetch product sales:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        query: { from: req.query.from, to: req.query.to },
        timestamp: new Date().toISOString()
      });

      const errorResponse = createErrorResponse(
        "Failed to fetch product sales",
        error instanceof Error ? error.message : "Unknown error",
        "PRODUCT_SALES_ERROR",
        {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        }
      );

      res.status(500).json(errorResponse);
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

  // CSV Bulk Import Products
  app.post("/api/products/bulk-import", async (req, res) => {
    const upload = multer().single('file');

    upload(req, res, async function(err) {
      if (err) {
        return res.status(400).json({ error: "Error uploading file" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded" });
      }

      try {
        const records: z.infer<typeof insertProductSchema>[] = [];
        const parser = parse({
          columns: true,
          skip_empty_lines: true,
        });

        const parsePromise = new Promise((resolve, reject) => {
          parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null) {
              try {
                const transformedRecord = insertProductSchema.parse({
                  name: record.Name || record.name || '',
                  sku: record.SKU || record.sku || '',
                  price: parseFloat(record.Price || record.price) || 0,
                  description: record.Description || record.description || '',
                });
                records.push(transformedRecord);
              } catch (error) {
                console.error('Invalid record:', record, error);
                // Continue processing other records
              }
            }
          });
          parser.on('end', () => resolve(records));
          parser.on('error', reject);
        });

        // Feed the parser with the uploaded file buffer
        parser.write(req.file.buffer);
        parser.end();

        const parsedRecords = await parsePromise as z.infer<typeof insertProductSchema>[];
        
        if (parsedRecords.length === 0) {
          return res.status(400).json({ error: "No valid records found in the CSV file" });
        }

        const results = {
          inserted: [] as any[],
          updated: [] as any[],
          skipped: [] as any[],
          errors: [] as string[]
        };

        // Process each record
        for (const record of parsedRecords) {
          try {
            if (!record.sku) {
              results.skipped.push({ ...record, reason: "Missing SKU" });
              continue;
            }

            // Check if product with SKU exists
            const existing = await db
              .select()
              .from(products)
              .where(eq(products.sku, record.sku));

            if (existing.length > 0) {
              // Update existing product
              const updated = await db
                .update(products)
                .set(record)
                .where(eq(products.sku, record.sku))
                .returning();
              results.updated.push(updated[0]);
            } else {
              // Insert new product
              const inserted = await db
                .insert(products)
                .values(record)
                .returning();
              results.inserted.push(inserted[0]);
            }
          } catch (error) {
            console.error("Error processing record:", record, error);
            results.errors.push(`Failed to process SKU ${record.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            results.skipped.push({ ...record, reason: "Processing error" });
          }
        }
        
        res.json({
          success: true,
          summary: {
            total: parsedRecords.length,
            inserted: results.inserted.length,
            updated: results.updated.length,
            skipped: results.skipped.length,
            errors: results.errors.length
          },
          details: results
        });
      } catch (error) {
        console.error("Failed to import products:", error);
        res.status(500).json({ error: "An error occurred while importing products" });
      }
    });
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
  // Products endpoint closing brace
  });

  // Import and use email routes
  import { registerEmailRoutes } from './routes/emails';
  registerEmailRoutes(app);

  // Settings
  // Logo Upload
  app.post("/api/settings/logo", upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded" });
      }

      // Convert buffer to base64 data URI
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      
      // Check if Cloudinary credentials are properly configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("Cloudinary credentials are not properly configured");
        return res.status(500).json({ 
          error: "Image upload service is not properly configured",
          details: "Missing required credentials"
        });
      }

      // Upload to Cloudinary
      try {
        const result = await cloudinary.uploader.upload(dataURI, {
          resource_type: "image",
          folder: "company-logos",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [
            { quality: "auto" },
            { fetch_format: "auto" }
          ]
        });

      // Get existing settings
      const currentSettings = await db
        .select()
        .from(settings)
        .limit(1);

      let updatedSettings;
      if (currentSettings.length > 0) {
        // Update existing settings
        updatedSettings = await db
          .update(settings)
          .set({ 
            companyLogo: result.secure_url,
            updatedAt: new Date()
          })
          .where(eq(settings.id, currentSettings[0].id))
          .returning();
      } else {
        // Create new settings
        updatedSettings = await db
          .insert(settings)
          .values({ 
            companyLogo: result.secure_url,
            companyName: '',
            companyEmail: '',
            updatedAt: new Date()
          })
          .returning();
      }

      res.json({ 
        logoUrl: result.secure_url,
        settings: updatedSettings[0]
      });
    } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", {
          error: cloudinaryError,
          timestamp: new Date().toISOString(),
          requestId: cloudinaryError.http_code ? `cloudinary_${cloudinaryError.http_code}` : undefined
        });

        // Handle specific Cloudinary errors
        if (cloudinaryError.http_code === 401) {
          return res.status(500).json({
            error: "Authentication failed with the image upload service",
            details: "Invalid credentials"
          });
        } else if (cloudinaryError.http_code === 403) {
          return res.status(500).json({
            error: "Access denied to image upload service",
            details: "Insufficient permissions"
          });
        } else if (cloudinaryError.http_code === 413) {
          return res.status(400).json({
            error: "File size too large",
            details: "Please upload a smaller image"
          });
        }

        return res.status(500).json({
          error: "Failed to upload image to cloud storage",
          details: cloudinaryError.message || "Unknown error occurred during upload"
        });
      }
    } catch (error) {
      console.error("Failed to process logo upload:", {
        error,
        timestamp: new Date().toISOString(),
        type: error.constructor.name
      });
      
      res.status(500).json({ 
        error: "An error occurred while processing the logo upload",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settingsData = await db
        .select()
        .from(settings)
        .limit(1);
      
      res.json(settingsData[0] || {});
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      res.status(500).json({ 
        error: "An error occurred while fetching settings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      // Validate required fields
      const requiredFields = ['companyName', 'companyEmail'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ 
            error: `${field} is required` 
          });
        }
      }

      const currentSettings = await db
        .select()
        .from(settings)
        .limit(1);

      let result;
      if (currentSettings.length > 0) {
        // Update existing settings
        result = await db
          .update(settings)
          .set({
            companyName: req.body.companyName,
            companyEmail: req.body.companyEmail,
            companyPhone: req.body.companyPhone,
            companyAddress: req.body.companyAddress,
            companyVatNumber: req.body.companyVatNumber,
            companyLogo: req.body.companyLogo,
            updatedAt: new Date()
          })
          .where(eq(settings.id, currentSettings[0].id))
          .returning();
      } else {
        // Create new settings
        result = await db
          .insert(settings)
          .values({
            companyName: req.body.companyName,
            companyEmail: req.body.companyEmail,
            companyPhone: req.body.companyPhone,
            companyAddress: req.body.companyAddress,
            companyVatNumber: req.body.companyVatNumber,
            companyLogo: req.body.companyLogo,
            updatedAt: new Date()
          })
          .returning();
      }

      if (!result || !result[0]) {
        throw new Error('Failed to save settings - No result returned');
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Failed to save settings:", error);
      res.status(500).json({ 
        error: "An error occurred while saving settings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      // Add pagination support
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = (page - 1) * limit;

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(clients);

      // Get paginated clients
      const paginatedClients = await db
        .select()
        .from(clients)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(clients.updatedAt));

      res.json({
        data: paginatedClients,
        pagination: {
          total: Number(count),
          page,
          limit,
          totalPages: Math.ceil(Number(count) / limit)
        }
      });
    } catch (error) {
      console.error("Failed to fetch clients:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json(createErrorResponse(
        "Failed to fetch clients",
        error instanceof Error ? error.message : "An error occurred while fetching clients",
        "DATABASE_ERROR"
      ));
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      // Validate UUID format
      if (!req.params.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        return res.status(400).json(createErrorResponse(
          "Invalid client ID",
          "The provided ID is not a valid UUID",
          "INVALID_UUID"
        ));
      }

      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, req.params.id));

      if (!client.length) {
        return res.status(404).json(createErrorResponse(
          "Client not found",
          "No client exists with the provided ID",
          "NOT_FOUND"
        ));
      }

      res.json(client[0]);
    } catch (error) {
      console.error("Failed to fetch client:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.params.id,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json(createErrorResponse(
        "Failed to fetch client",
        error instanceof Error ? error.message : "An error occurred while fetching the client",
        "DATABASE_ERROR"
      ));
    }
  });

  app.post("/api/clients", validateRequest(insertClientSchema), async (req, res) => {
    try {
      // Check for duplicate email
      const existingClient = await db
        .select()
        .from(clients)
        .where(eq(clients.email, req.body.email))
        .limit(1);

      if (existingClient.length > 0) {
        return res.status(409).json(createErrorResponse(
          "Duplicate client",
          "A client with this email already exists",
          "DUPLICATE_EMAIL"
        ));
      }

      const newClient = await db
        .insert(clients)
        .values({
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Log successful client creation
      console.log('Client created:', {
        id: newClient[0].id,
        email: newClient[0].email,
        timestamp: new Date().toISOString()
      });

      res.status(201).json(newClient[0]);
    } catch (error) {
      console.error("Failed to create client:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json(createErrorResponse(
        "Failed to create client",
        error instanceof Error ? error.message : "An error occurred while creating the client",
        "DATABASE_ERROR"
      ));
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
      const { items, includeVat, ...offerData } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one item is required" });
      }

      const data = {
        ...offerData,
        includeVat: includeVat ? 'true' : 'false',
        status: offerData.status || 'draft',
        validUntil: offerData.validUntil ? new Date(offerData.validUntil) : null,
        lastContact: offerData.lastContact ? new Date(offerData.lastContact) : null,
        nextContact: offerData.nextContact ? new Date(offerData.nextContact) : null
      };

      // Calculate total amount including VAT if needed
      const subtotal = items.reduce((sum, item) => {
        const itemSubtotal = item.quantity * Number(item.unitPrice);
        const discount = itemSubtotal * (Number(item.discount || 0) / 100);
        return sum + (itemSubtotal - discount);
      }, 0);

      const vat = includeVat ? subtotal * 0.23 : 0;
      data.totalAmount = subtotal + vat;

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

  
  // PATCH endpoint for offer status updates
  app.patch("/api/offers/:id", async (req, res) => {
    try {
      const { status, lastContact } = req.body;

      // Validate status
      if (!OFFER_STATUS.includes(status as OfferStatus)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${OFFER_STATUS.join(", ")}`
        });
      }

      const updatedOffer = await db
        .update(offers)
        .set({
          status,
          lastContact: lastContact ? new Date(lastContact) : new Date(),
          updatedAt: new Date()
        })
        .where(eq(offers.id, req.params.id))
        .returning();

      if (!updatedOffer.length) {
        return res.status(404).json({ message: "Offer not found" });
      }

      res.json(updatedOffer[0]);
    } catch (error) {
      console.error("Failed to update offer status:", error);
      res.status(500).json({ message: "Failed to update offer status" });
    }
  });

  
}