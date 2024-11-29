import { Express } from "express";
import { registerProductRoutes } from "./products";
import { registerClientRoutes } from "./clients";
import { registerOfferRoutes } from "./offers";
import { registerSettingsRoutes } from "./settings";
import { registerEmailRoutes } from "./emails";
import { registerStatisticsRoutes } from "./statistics";
import { registerVatRoutes } from "./vat";
import { registerHealthRoutes } from "./health";

export function registerRoutes(app: Express) {
  // Register health check first for quick availability checks
  registerHealthRoutes(app);
  
  // Register business logic routes
  registerProductRoutes(app);
  registerClientRoutes(app);
  registerOfferRoutes(app);
  registerSettingsRoutes(app);
  registerEmailRoutes(app);
  registerStatisticsRoutes(app);
  registerVatRoutes(app);
}
