import { sql } from 'drizzle-orm';
import { db } from '../db';
import { offers, products, offerItems } from '../db/schema';
import type { PaginationMeta } from '../types/api';

interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class DatabaseService {
  static async executePaginatedQuery<T>(
    baseQuery: any,
    options: QueryOptions
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    const page = options.page || 1;
    const limit = options.limit || 25;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = sql`SELECT COUNT(*) FROM (${baseQuery}) as total`;
    const [{ count }] = await db.execute(countQuery);

    // Add pagination to base query
    const paginatedQuery = sql`
      ${baseQuery}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await db.execute(paginatedQuery);

    return {
      data: result.rows as T[],
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }

  static async getProductSales(fromDate?: Date, toDate?: Date) {
    try {
      const dateConditions = [];
      const params = [];
      
      if (fromDate && toDate) {
        dateConditions.push(sql`o.updated_at BETWEEN ${fromDate} AND ${toDate}`);
      } else if (fromDate) {
        dateConditions.push(sql`o.updated_at >= ${fromDate}`);
      } else if (toDate) {
        dateConditions.push(sql`o.updated_at <= ${toDate}`);
      }

      const dateFilter = dateConditions.length > 0 
        ? sql`AND ${sql.join(dateConditions, sql` AND `)}` 
        : sql``;

      const query = sql`
        WITH closed_offers AS (
          SELECT id 
          FROM ${offers}
          WHERE status IN ('Close & Paid', 'Paid & Delivered')
          ${dateFilter}
        )
        SELECT 
          p.id as "productId",
          p.name,
          p.sku,
          SUM(oi.quantity) as "totalQuantity",
          SUM(oi.quantity * oi.unit_price * (1 - COALESCE(oi.discount, 0)/100)) as "totalRevenue",
          MAX(o.updated_at) as "lastSaleDate",
          COUNT(DISTINCT o.id) as "totalOrders",
          ARRAY_AGG(DISTINCT o.status) as "orderStatuses"
        FROM ${products} p
        LEFT JOIN ${offerItems} oi ON p.id = oi.product_id
        LEFT JOIN ${offers} o ON oi.offer_id = o.id AND o.id IN (SELECT id FROM closed_offers)
        GROUP BY p.id, p.name, p.sku
        ORDER BY "totalRevenue" DESC NULLS LAST
      `;

      const result = await db.execute(query);
      
      // Log query execution for monitoring
      console.debug('Product sales query executed:', {
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
        rowCount: result.rows.length,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: result.rows,
        meta: {
          fromDate,
          toDate,
          queryTimestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Failed to fetch product sales:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        params: { fromDate, toDate },
        timestamp: new Date().toISOString()
      });

      throw new Error(
        `Failed to fetch product sales: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
