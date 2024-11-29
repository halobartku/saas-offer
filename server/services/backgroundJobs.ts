import { db } from "../db";
import { offers } from "../db/schema";
import { eq, and, lt } from "drizzle-orm";
import { subDays } from "date-fns";

export class BackgroundJobService {
  private static isArchiving = false;

  static async archiveOldOffers() {
    // Prevent concurrent runs
    if (this.isArchiving) {
      console.warn('Archive job already running, skipping this iteration');
      return;
    }

    const startTime = Date.now();
    this.isArchiving = true;

    try {
      const thresholdDate = subDays(new Date(), 3);
      
      const result = await db
        .update(offers)
        .set({ 
          status: 'Paid & Delivered',
          archivedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(offers.status, 'Close & Paid'),
            lt(offers.updatedAt, thresholdDate)
          )
        )
        .returning();

      console.info('Archived old offers:', {
        count: result.length,
        thresholdDate: thresholdDate.toISOString(),
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to archive old offers:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isArchiving = false;
    }
  }

  static startJobs() {
    // Run archive job every day
    setInterval(this.archiveOldOffers.bind(this), 24 * 60 * 60 * 1000);
    // Run once at startup
    this.archiveOldOffers();

    console.info('Background jobs started:', {
      jobs: ['archiveOldOffers'],
      timestamp: new Date().toISOString()
    });
  }
}
