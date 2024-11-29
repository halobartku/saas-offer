import { Express } from "express";
import { db } from "../db";
import { emails } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { EmailService } from "../services/emailService";
import { createSuccessResponse, createErrorResponse } from "../types/api";

export function registerEmailRoutes(app: Express) {
  // Apply rate limiter to email endpoints
  app.use('/api/emails', EmailService.rateLimiter);

  app.get("/api/emails", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const connectionStatus = await EmailService.verifyConnection();
      if (!connectionStatus.success) {
        return res.status(500).json(createErrorResponse(
          "SMTP Connection Error",
          connectionStatus.message,
          "SMTP_CONNECTION_ERROR"
        ));
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = (page - 1) * limit;

      // Validate sort parameters
      const validSortColumns = ['createdAt', 'subject', 'fromEmail', 'toEmail', 'status', 'updatedAt'] as const;
      const requestedSortBy = (req.query.sortBy as string) || 'createdAt';
      const sortBy = validSortColumns.includes(requestedSortBy as any) ? requestedSortBy : 'createdAt';
      const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? sql`ASC` : sql`DESC`;

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(emails);

      // Get paginated emails with essential fields only
      const paginatedEmails = await db
        .select({
          id: emails.id,
          subject: emails.subject,
          fromEmail: emails.fromEmail,
          toEmail: emails.toEmail,
          status: emails.status,
          isRead: emails.isRead,
          createdAt: emails.createdAt,
          updatedAt: emails.updatedAt,
        })
        .from(emails)
        .orderBy(sql`${emails[sortBy as keyof typeof emails]} ${sortOrder}`)
        .limit(limit)
        .offset(offset);
      
      return res.json(createSuccessResponse(paginatedEmails, {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit)
      }));
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      return res.status(500).json(createErrorResponse(
        "Failed to fetch emails",
        error instanceof Error ? error.message : "Unknown error",
        "FETCH_EMAILS_ERROR"
      ));
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const { toEmail, subject, body, clientId, offerId, attachments, threadId, parentId } = req.body;

      // First, try to send the email with retry mechanism
      const emailResult = await EmailService.sendEmail(toEmail, subject, body, attachments, threadId, parentId);

      // Save to database
      const newEmail = await db
        .insert(emails)
        .values({
          subject,
          body,
          fromEmail: process.env.SMTP_USER!,
          toEmail,
          status: 'sent',
          clientId,
          offerId,
          isRead: 'true',
          attachments: attachments || [],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json(createSuccessResponse({ 
        ...newEmail[0], 
        messageId: emailResult.messageId,
        attempt: emailResult.attempt
      }));
    } catch (error) {
      console.error("Failed to send/save email:", {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Validation error')) {
          return res.status(400).json(createErrorResponse(
            "Invalid email data",
            error.message,
            "EMAIL_VALIDATION_ERROR"
          ));
        }
        
        if (error.message.includes('SMTP Configuration Error')) {
          return res.status(500).json(createErrorResponse(
            "Email service configuration error",
            "Please check email service settings",
            "SMTP_CONFIG_ERROR"
          ));
        }

        if (error.message.includes('Too many email requests')) {
          return res.status(429).json(createErrorResponse(
            "Rate limit exceeded",
            "Please try again later",
            "RATE_LIMIT_ERROR"
          ));
        }
      }

      res.status(500).json(createErrorResponse(
        "Failed to process email",
        error instanceof Error ? error.message : "Unknown error",
        "EMAIL_PROCESSING_ERROR"
      ));
    }
  });

  app.patch("/api/emails/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, isRead } = req.body;

      // Validate status if provided
      if (status && !['inbox', 'sent', 'draft', 'trash', 'archived'].includes(status)) {
        return res.status(400).json(createErrorResponse(
          "Invalid status",
          "Status must be one of: inbox, sent, draft, trash, archived",
          "INVALID_EMAIL_STATUS"
        ));
      }

      const updatedEmail = await db
        .update(emails)
        .set({
          ...(status && { status }),
          ...(isRead !== undefined && { isRead: isRead.toString() }),
          updatedAt: new Date(),
        })
        .where(eq(emails.id, id))
        .returning();

      if (!updatedEmail.length) {
        return res.status(404).json(createErrorResponse(
          "Email not found",
          `No email found with ID ${id}`,
          "EMAIL_NOT_FOUND"
        ));
      }

      res.json(createSuccessResponse(updatedEmail[0]));
    } catch (error) {
      console.error("Failed to update email:", error);
      res.status(500).json(createErrorResponse(
        "Failed to update email",
        error instanceof Error ? error.message : "Unknown error",
        "UPDATE_EMAIL_ERROR"
      ));
    }
  });
}
