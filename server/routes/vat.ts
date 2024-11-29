import { Express } from "express";
import { VatService } from "../services/vatService";
import { createSuccessResponse, createErrorResponse } from "../types/api";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";
import { apiLimiter } from "../middleware/rateLimiter";

// Input validation schema
const vatValidationSchema = z.object({
  params: z.object({
    countryCode: z.string()
      .length(2)
      .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters'),
    vatNumber: z.string()
      .min(4)
      .max(14)
      .regex(/^[0-9A-Z]+$/, 'VAT number must contain only numbers and uppercase letters')
  })
});

export function registerVatRoutes(app: Express) {
  app.get(
    "/api/vat/validate/:countryCode/:vatNumber",
    apiLimiter,
    validateRequest(vatValidationSchema),
    async (req, res) => {
      try {
        const { countryCode, vatNumber } = req.params;

        const startTime = Date.now();
        const result = await VatService.validateVAT(countryCode, vatNumber);
        const duration = Date.now() - startTime;

        // Log successful validation
        console.info('VAT validation completed:', {
          countryCode,
          vatNumber: `${vatNumber.slice(0, 2)}...${vatNumber.slice(-2)}`, // Partial logging for privacy
          valid: result.valid,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });

        res.json(createSuccessResponse(result));
      } catch (error) {
        // Log detailed error information
        console.error('VAT validation failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });

        const statusCode = error instanceof Error && 
          error.message.includes('Invalid input') ? 400 : 500;

        const errorResponse = createErrorResponse(
          'Failed to validate VAT number',
          error instanceof Error ? error.message : 'Unknown error',
          'VAT_VALIDATION_ERROR',
          {
            timestamp: new Date().toISOString()
          }
        );

        res.status(statusCode).json(errorResponse);
      }
    }
  );
}
