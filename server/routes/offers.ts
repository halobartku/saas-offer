import { Express } from "express";
import { db } from "../db";
import { offers, offerItems, products } from "../db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { createSuccessResponse, createErrorResponse, paginationSchema } from "../types/api";
import { subDays } from "date-fns";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

// Request validation schemas
const getOffersQuerySchema = z.object({
  query: paginationSchema.extend({
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'Close & Paid', 'Paid & Delivered']).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  })
});

const getOfferItemsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid offer ID format")
  })
});

const createOfferSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    clientId: z.string().uuid("Invalid client ID"),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'Close & Paid', 'Paid & Delivered']).default('draft'),
    validUntil: z.string().datetime().nullable(),
    notes: z.string().optional(),
    lastContact: z.string().datetime().nullable(),
    nextContact: z.string().datetime().nullable(),
    items: z.array(z.object({
      productId: z.string().uuid("Invalid product ID"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.number().min(0, "Price cannot be negative"),
      discount: z.number().min(0).max(100).optional(),
    })).min(1, "At least one item is required"),
    includeVat: z.boolean().default(false)
  })
});

export function registerOfferRoutes(app: Express) {
  // Background jobs are now managed by BackgroundJobService

  // Get all offers with pagination
  app.get("/api/offers", validateRequest(getOffersQuerySchema), async (req, res) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      console.info('Fetching offers:', {
        requestId,
        query: req.query,
        timestamp: new Date().toISOString()
      });

      const { 
        page = 1, 
        limit = 25, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        status,
        fromDate,
        toDate
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      let whereClause = sql`1=1`;

      if (status) {
        whereClause = sql`${whereClause} AND status = ${status}`;
      }

      if (fromDate) {
        whereClause = sql`${whereClause} AND created_at >= ${fromDate}`;
      }

      if (toDate) {
        whereClause = sql`${whereClause} AND created_at <= ${toDate}`;
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(offers)
        .where(whereClause);

      // Validate sort parameters
      const validSortColumns = ['createdAt', 'updatedAt', 'status', 'totalAmount'];
      // Type-safe column selection
      const orderBy = validSortColumns.includes(sortBy as string) ? sortBy : 'createdAt';
      const order = sortOrder === 'asc' ? sql`ASC` : sql`DESC`;

      // Optimized query with proper type handling
      const paginatedOffers = await db
        .select({
          id: offers.id,
          title: offers.title,
          clientId: offers.clientId,
          status: offers.status,
          totalAmount: offers.totalAmount,
          validUntil: offers.validUntil,
          createdAt: offers.createdAt,
          updatedAt: offers.updatedAt,
          includeVat: offers.includeVat
        })
        .from(offers)
        .where(whereClause)
        .orderBy(sql`${offers[orderBy as keyof typeof offers]} ${order}`)
        .limit(Number(limit))
        .offset(offset);

      // Cache query results if needed
      const cacheKey = `offers:${JSON.stringify(req.query)}`;
      console.info('Query cache key:', {
        key: cacheKey,
        results: paginatedOffers.length,
        duration: `${Date.now() - startTime}ms`
      });

      // Log successful query
      console.info('Offers fetched successfully:', {
        duration: `${Date.now() - startTime}ms`,
        count: paginatedOffers.length,
        total: Number(count),
        page: Number(page),
        timestamp: new Date().toISOString()
      });

      res.json(createSuccessResponse(paginatedOffers, {
        total: Number(count),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(count) / Number(limit)),
        duration: `${Date.now() - startTime}ms`
      }));
    } catch (error) {
      // Log detailed error information
      console.error("Failed to fetch offers:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });

      res.status(500).json(createErrorResponse(
        "Failed to fetch offers",
        error instanceof Error ? error.message : "Unknown error",
        "FETCH_OFFERS_ERROR",
        {
          timestamp: new Date().toISOString(),
          duration: `${Date.now() - startTime}ms`
        }
      ));
    }
  });

  // Get offer items
  app.get("/api/offers/:id/items", validateRequest(getOfferItemsSchema), async (req, res) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // First verify if the offer exists
      const offer = await db
        .select({ id: offers.id })
        .from(offers)
        .where(eq(offers.id, req.params.id))
        .limit(1);

      if (!offer.length) {
        return res.status(404).json(createErrorResponse(
          "Offer not found",
          `No offer found with ID: ${req.params.id}`,
          "OFFER_NOT_FOUND",
          {
            offerId: req.params.id,
            requestId,
            timestamp: new Date().toISOString()
          }
        ));
      }

      // Fetch offer items with product details
      const items = await db
        .select({
          id: offerItems.id,
          offerId: offerItems.offerId,
          productId: offerItems.productId,
          quantity: offerItems.quantity,
          unitPrice: offerItems.unitPrice,
          discount: offerItems.discount,
          totalAmount: sql<number>`(${offerItems.quantity} * ${offerItems.unitPrice}) - COALESCE(${offerItems.discount}, 0)`,
          product: {
            id: products.id,
            name: products.name,
            sku: products.sku,
            price: products.price
          }
        })
        .from(offerItems)
        .leftJoin(products, eq(offerItems.productId, products.id))
        .where(eq(offerItems.offerId, req.params.id));

      if (!items.length) {
        return res.status(404).json(createErrorResponse(
          "No items found for this offer",
          `Offer exists but has no items. Offer ID: ${req.params.id}`,
          "OFFER_ITEMS_NOT_FOUND",
          {
            offerId: req.params.id,
            requestId,
            timestamp: new Date().toISOString()
          }
        ));
      }
      
      // Calculate total amount for the offer
      const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
      
      // Log successful query with performance metrics
      console.info('Offer items fetched successfully:', {
        requestId,
        offerId: req.params.id,
        itemCount: items.length,
        totalAmount,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });

      res.json(createSuccessResponse(items, {
        totalAmount,
        itemCount: items.length,
        requestId,
        duration: `${Date.now() - startTime}ms`
      }));
    } catch (error) {
      // Enhanced error logging with request context
      console.error("Failed to fetch offer items:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        offerId: req.params.id,
        requestId,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
        query: req.query
      });

      // Determine appropriate status code based on error type
      const statusCode = error instanceof Error && 
        (error.message.includes('not found') || error.message.includes('does not exist')) ? 404 : 500;

      res.status(statusCode).json(createErrorResponse(
        "Failed to fetch offer items",
        error instanceof Error ? error.message : "Unknown error",
        "FETCH_OFFER_ITEMS_ERROR",
        {
          offerId: req.params.id,
          requestId,
          timestamp: new Date().toISOString(),
          duration: `${Date.now() - startTime}ms`
        }
      ));
    }
  });
}
