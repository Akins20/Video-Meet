import express, { Application } from "express";
import path from "path";
import config from "../config";

// Import existing middleware
import {
  corsMiddleware,
  securityHeaders,
  compressionMiddleware,
  requestSizeLimit,
  securityLogger,
  initSecurity,
} from "./security";
import {
  monitorErrors,
  requestTimeout,
  handleUnhandledRejection,
  handleUncaughtException,
} from "./errorHandler";
import { sanitizeInput } from "./validation";

/**
 * Set up all middleware for the Express app
 */
export function setupMiddleware(app: Application): void {
  console.log("🔧 Configuring middleware layers...");

  // Trust proxy for proper IP handling
  app.set("trust proxy", 1);

  // Initialize security
  initSecurity();

  // Security middleware (order matters)
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(requestSizeLimit);
  app.use(requestTimeout(30000));

  // Request processing middleware
  app.use(compressionMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(sanitizeInput);

  // Monitoring and logging middleware
  app.use(securityLogger);
  app.use(monitorErrors);

  // Static file serving (development only)
  if (config.nodeEnv === "development") {
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
    console.log("📁 Static file serving enabled for development");
  }

  // Set up global error handlers
  handleUnhandledRejection();
  handleUncaughtException();

  console.log("✅ Middleware configuration completed");
}

/**
 * Enhanced error handling setup
 */
export function setupErrorHandling(app: Application): void {
  console.log("🚨 Configuring error handling...");

  // Import error handlers
  const { errorHandler, notFoundHandler } = require("./errorHandler");

  // 404 handler (must be before error handler)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  console.log("✅ Error handling configuration completed");
}
