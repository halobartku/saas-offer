import { Request, Response } from "express";
import { db } from "../../db";
import { offers, products, clients, offerItems } from "../../db/schema";
import { sql } from "drizzle-orm";
import { format } from "date-fns";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit-table";

export async function generateReport(req: Request, res: Response) {
  const { type, format, from, to } = req.query;

  try {
    let data;
    let dateFilter = sql`TRUE`;
    
    if (from && to) {
      dateFilter = sql`created_at BETWEEN ${from} AND ${to}`;
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

    // Format the data based on the requested format
    if (format === "csv") {
      const parser = new Parser({
        fields: Object.keys(data.rows[0] || {}),
      });
      const csv = parser.parse(data.rows);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}-report-${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      return res.send(csv);
    } else if (format === "pdf") {
      const doc = new PDFDocument({ margin: 30 });
      
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
        `attachment; filename=${type}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
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
