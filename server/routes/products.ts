import { Express } from "express";
import { db } from "../db";
import { products, offerItems } from "../db/schema";
import { eq } from "drizzle-orm";
import { validateRequest } from "../middleware/validation";
import { DatabaseService } from "../services/database";
import { createSuccessResponse, createErrorResponse } from "../types/api";
import multer from "multer";
import { parse } from 'csv-parse';
import { insertProductSchema } from '../db/schema';
import { z } from 'zod';

export function registerProductRoutes(app: Express) {
  // Products sold statistics
  app.get("/api/products/sold", validateRequest(dateRangeSchema), async (req, res) => {
    try {
      const { from, to } = req.query;
      let dateFilter = 'TRUE';
      
      if (from && to) {
        const fromDate = new Date(from as string);
        const toDate = new Date(to as string);
        dateFilter = `o.updated_at BETWEEN '${fromDate.toISOString()}' AND '${toDate.toISOString()}'`;
      }

      const result = await DatabaseService.getProductSales(dateFilter);
      
      const response = createSuccessResponse(result.rows, {
        total: result.rows.length,
        dateRange: from && to ? { from, to } : null,
      });

      res.json(response);
    } catch (error) {
      console.error("Failed to fetch product sales:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      const errorResponse = createErrorResponse(
        "Failed to fetch product sales",
        error instanceof Error ? error.message : "Unknown error",
        "PRODUCT_SALES_ERROR"
      );

      res.status(500).json(errorResponse);
    }
  });

  // Basic CRUD operations
  app.get("/api/products", validateRequest(paginationSchema), async (req, res) => {
    try {
      const { page = 1, limit = 25, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(products);

      // Validate sort parameters
      const validSortColumns = ['name', 'price', 'createdAt', 'updatedAt'];
      const orderBy = validSortColumns.includes(sortBy as string) ? sortBy : 'createdAt';
      const order = sortOrder === 'asc' ? sql`ASC` : sql`DESC`;

      const paginatedProducts = await db
        .select()
        .from(products)
        .orderBy(sql`${products[orderBy as keyof typeof products]} ${order}`)
        .limit(Number(limit))
        .offset(offset);

      res.json(createSuccessResponse(paginatedProducts, {
        total: Number(count),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(count) / Number(limit))
      }));
    } catch (error) {
      console.error("Failed to fetch products:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      res.status(500).json(createErrorResponse(
        "Failed to fetch products",
        error instanceof Error ? error.message : "Unknown error",
        "FETCH_PRODUCTS_ERROR",
        {
          timestamp: new Date().toISOString()
        }
      ));
    }
  });

  app.post("/api/products", validateRequest(insertProductSchema), async (req, res) => {
    try {
      const newProduct = await db.insert(products).values(req.body).returning();
      res.json(createSuccessResponse(newProduct[0]));
    } catch (error) {
      console.error("Failed to create product:", error);
      res.status(500).json(createErrorResponse(
        "Failed to create product",
        error instanceof Error ? error.message : "Unknown error",
        "CREATE_PRODUCT_ERROR"
      ));
    }
  });

  app.put("/api/products/:id", validateRequest(insertProductSchema), async (req, res) => {
    try {
      const updatedProduct = await db
        .update(products)
        .set(req.body)
        .where(eq(products.id, req.params.id))
        .returning();
      
      if (!updatedProduct.length) {
        return res.status(404).json(createErrorResponse(
          "Product not found",
          `No product found with ID ${req.params.id}`,
          "PRODUCT_NOT_FOUND"
        ));
      }
      
      res.json(createSuccessResponse(updatedProduct[0]));
    } catch (error) {
      console.error("Failed to update product:", error);
      res.status(500).json(createErrorResponse(
        "Failed to update product",
        error instanceof Error ? error.message : "Unknown error",
        "UPDATE_PRODUCT_ERROR"
      ));
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const offerWithProduct = await db
        .select()
        .from(offerItems)
        .where(eq(offerItems.productId, req.params.id))
        .limit(1);

      if (offerWithProduct.length > 0) {
        return res.status(400).json(createErrorResponse(
          "Cannot delete product",
          "Product is used in existing offers. Remove it from all offers first.",
          "PRODUCT_IN_USE"
        ));
      }

      const deletedProduct = await db
        .delete(products)
        .where(eq(products.id, req.params.id))
        .returning();

      if (!deletedProduct.length) {
        return res.status(404).json(createErrorResponse(
          "Product not found",
          `No product found with ID ${req.params.id}`,
          "PRODUCT_NOT_FOUND"
        ));
      }

      res.json(createSuccessResponse(deletedProduct[0]));
    } catch (error) {
      console.error("Failed to delete product:", error);
      res.status(500).json(createErrorResponse(
        "Failed to delete product",
        error instanceof Error ? error.message : "Unknown error",
        "DELETE_PRODUCT_ERROR"
      ));
    }
  });
}
