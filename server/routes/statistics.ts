import { Express } from "express";
import { db } from "../db";
import { products, clients, offers, offerItems } from "../db/schema";
import { sql } from "drizzle-orm";
import { createSuccessResponse, createErrorResponse } from "../types/api";

export function registerStatisticsRoutes(app: Express) {
  app.get("/api/stats", async (req, res) => {
    const startTime = Date.now();
    try {
      // Log request
      console.info('Fetching statistics:', {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || crypto.randomUUID()
      });

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

      // Log successful query times
      console.info('Statistics fetched successfully:', {
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
        counts: {
          products: productsCount[0].count,
          clients: clientsCount[0].count,
          activeOffers: activeOffersCount[0].count
        }
      });

      const response = createSuccessResponse({
        products: productsCount[0].count,
        clients: clientsCount[0].count,
        activeOffers: activeOffersCount[0].count,
        activeOffersTotal: activeOffersTotal[0].total || 0,
        bestsellingProduct: bestsellingProduct.rows[0],
        monthlyRevenue: monthlyRevenue.rows
      }, {
        requestDuration: `${Date.now() - startTime}ms`
      });

      res.json(response);
    } catch (error) {
      // Log detailed error information
      console.error('Failed to fetch statistics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });

      // Determine appropriate status code
      const statusCode = error instanceof Error && 
        error.message.includes('permission denied') ? 403 : 500;

      res.status(statusCode).json(createErrorResponse(
        "Failed to fetch statistics",
        error instanceof Error ? error.message : "Unknown error",
        "STATISTICS_ERROR",
        {
          timestamp: new Date().toISOString(),
          duration: `${Date.now() - startTime}ms`
        }
      ));
    }
  });
}
