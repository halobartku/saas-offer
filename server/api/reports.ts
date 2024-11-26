import { Request, Response } from "express";
import { db } from "../../db";
import { offers, products, clients, offerItems } from "../../db/schema";
import { sql } from "drizzle-orm";
import { format } from "date-fns";
import { Parser } from "json2csv";
import PDFKit from "pdfkit-table";

export async function generateReport(req: Request, res: Response) {
  const { type, format: exportFormat, from, to, fields, filters, sortBy, sortOrder, groupBy } = req.query;

  try {
    let data;
    let dateFilter = sql`TRUE`;
    let customFilters = sql`TRUE`;
    let selectedFields = '*';
    let sortClause = '';
    let groupClause = '';
    
    if (from && to) {
      dateFilter = sql`created_at BETWEEN ${from} AND ${to}`;
    }

    // Process custom filters
    if (filters) {
      const parsedFilters = JSON.parse(filters as string);
      customFilters = parsedFilters.reduce((acc: any, filter: any) => {
        const { field, operator, value } = filter;
        switch (operator) {
          case 'equals':
            return sql`${acc} AND ${sql.raw(field)} = ${value}`;
          case 'contains':
            return sql`${acc} AND ${sql.raw(field)} ILIKE ${`%${value}%`}`;
          case 'greaterThan':
            return sql`${acc} AND ${sql.raw(field)} > ${value}`;
          case 'lessThan':
            return sql`${acc} AND ${sql.raw(field)} < ${value}`;
          default:
            return acc;
        }
      }, sql`TRUE`);
    }

    // Process selected fields
    if (fields) {
      const parsedFields = JSON.parse(fields as string);
      selectedFields = parsedFields.join(', ');
    }

    // Process sorting
    if (sortBy && sortOrder) {
      sortClause = ` ORDER BY ${sortBy} ${sortOrder}`;
    }

    // Process grouping
    if (groupBy) {
      groupClause = ` GROUP BY ${groupBy}`;
    }

    switch (type) {
      case "sales":
        data = await db.execute(sql`
          WITH closed_offers AS (
            SELECT id, created_at, total_amount
            FROM ${offers}
            WHERE status IN ('Close & Paid', 'Paid & Delivered')
            AND ${dateFilter}
          )
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as total_sales,
            SUM(total_amount) as revenue
          FROM closed_offers
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date DESC
        `);
        break;

      case "products":
        data = await db.execute(sql`
          WITH product_sales AS (
            SELECT 
              p.id,
              p.name,
              p.sku,
              oi.quantity,
              oi.unit_price,
              oi.discount,
              o.created_at
            FROM ${products} p
            JOIN ${offerItems} oi ON p.id = oi.product_id
            JOIN ${offers} o ON oi.offer_id = o.id
            WHERE o.status IN ('Close & Paid', 'Paid & Delivered')
            AND ${dateFilter}
          )
          SELECT 
            name,
            sku,
            SUM(quantity) as total_quantity,
            SUM(quantity * unit_price * (1 - COALESCE(discount, 0)/100)) as total_revenue
          FROM product_sales
          GROUP BY id, name, sku
          ORDER BY total_revenue DESC
        `);
        break;

      case "clients":
        data = await db.execute(sql`
          WITH client_activity AS (
            SELECT 
              c.*,
              o.status as offer_status,
              o.total_amount,
              o.created_at
            FROM ${clients} c
            LEFT JOIN ${offers} o ON c.id = o.client_id
            WHERE ${dateFilter}
          )
          SELECT 
            name,
            email,
            COUNT(DISTINCT CASE WHEN offer_status IN ('Close & Paid', 'Paid & Delivered') THEN id END) as completed_offers,
            SUM(CASE WHEN offer_status IN ('Close & Paid', 'Paid & Delivered') THEN total_amount ELSE 0 END) as total_spent
          FROM client_activity
          GROUP BY id, name, email
          ORDER BY total_spent DESC
        `);
        break;

      case "pipeline":
        data = await db.execute(sql`
          SELECT 
            status,
            COUNT(*) as count,
            SUM(total_amount) as total_value,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days_in_status
          FROM ${offers}
          WHERE ${dateFilter}
          GROUP BY status
          ORDER BY count DESC
        `);
        break;

      default:
        return res.status(400).json({ error: "Invalid report type" });
    }

    const currentDate = format(new Date(), "yyyy-MM-dd");
    const filename = `${type}-report-${currentDate}`;

    // Format the data based on the requested format
    if (exportFormat === "csv") {
      const parser = new Parser({
        fields: Object.keys(data.rows[0] || {}),
      });
      const csv = parser.parse(data.rows);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}.csv`
      );
      return res.send(csv);
    } else if (exportFormat === "pdf") {
      const doc = new PDFKit({ 
        margin: 30,
        bufferPages: true,
        autoFirstPage: true,
        size: 'A4'
      }) as PDFKit.PDFDocument;
      
      // Add metadata
      doc.info.Title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;
      doc.info.Author = 'ReiterWelt';
      doc.info.Creator = 'Report Generator';
      
      // Add title
      doc.fontSize(20).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, {
        align: "center",
      });
      doc.moveDown();

      // Add date range if provided
      if (from && to) {
        doc.fontSize(12).text(
          `Period: ${format(new Date(from as string), "PP")} - ${format(
            new Date(to as string),
            "PP"
          )}`,
          { align: "center" }
        );
        doc.moveDown();
      }
      
      // Add generation timestamp
      doc.fontSize(10).text(
        `Generated on: ${format(new Date(), "PPpp")}`,
        { align: "right" }
      );
      doc.moveDown();

      // Create table
      const tableData = {
        headers: Object.keys(data.rows[0] || {}),
        rows: data.rows.map((row: any) =>
          Object.values(row).map((value) =>
            typeof value === "number"
              ? value.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })
              : value?.toString() || ""
          )
        ),
      };

      await doc.table(tableData, {
        prepareHeader: () => doc.fontSize(10),
        prepareRow: () => doc.fontSize(10),
      });

      // Add generation date
      doc.moveDown();
      doc.fontSize(10).text(
        `Generated on ${format(new Date(), "PPpp")}`,
        { align: "right" }
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}.pdf`
      );
      
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(400).json({ error: "Invalid export format" });
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({
      error: "Failed to generate report",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
