import { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { APIResponse } from "../types/models";
import config from "../config";

/**
 * Custom application error class
 * Extends Error with additional properties for API responses
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintain proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific error classes for different scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication failed",
    errorCode: string = "AUTH_FAILED"
  ) {
    super(message, 401, errorCode, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = "Insufficient permissions",
    errorCode: string = "INSUFFICIENT_PERMISSIONS"
  ) {
    super(message, 403, errorCode, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND", true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode: string = "CONFLICT") {
    super(message, 409, errorCode, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED", true);
  }
}

/**
 * Error logger utility
 */
const logError = (error: Error, req?: Request): void => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    message: error.message,
    stack: error.stack,
    url: req?.url,
    method: req?.method,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    userId: (req as any)?.userId,
  };

  // In production, you'd want to use a proper logging service
  console.error("🚨 Error occurred:", JSON.stringify(errorInfo, null, 2));

  // TODO: Send to external logging service (e.g., Sentry, LogRocket)
  // await sendToLoggingService(errorInfo);
};

/**
 * MongoDB/Mongoose error handler
 */
const handleMongooseError = (error: MongooseError): AppError => {
  switch (error.name) {
    case "ValidationError":
      const mongooseValidationError = error as MongooseError.ValidationError;
      const validationErrors = Object.values(
        mongooseValidationError.errors
      ).map((err) => ({
        field: err.path,
        message: err.message,
        value: (err as any).value,
      }));

      return new ValidationError(
        "Database validation failed",
        validationErrors
      );

    case "CastError":
      const castError = error as MongooseError.CastError;
      return new ValidationError(
        `Invalid ${castError.path}: ${castError.value}`,
        {
          field: castError.path,
          value: castError.value,
          expectedType: castError.kind,
        }
      );

    case "MongoServerError":
      const mongoError = error as any;

      // Handle duplicate key error (E11000)
      if (mongoError.code === 11000) {
        const field = mongoError.keyPattern ? Object.keys(mongoError.keyPattern)[0] : undefined;
        const value = field && mongoError.keyValue ? mongoError.keyValue[field] : undefined;
        if (field && value !== undefined) {
          return new ConflictError(
            `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`,
            "DUPLICATE_KEY"
          );
        } else {
          return new ConflictError(
            `Duplicate key error`,
            "DUPLICATE_KEY"
          );
        }
      }

      return new AppError(
        "Database operation failed",
        500,
        "DATABASE_ERROR",
        false
      );

    default:
      return new AppError(
        "Database error occurred",
        500,
        "DATABASE_ERROR",
        false
      );
  }
};

/**
 * JWT error handler
 */
const handleJWTError = (error: JsonWebTokenError): AppError => {
  if (error instanceof TokenExpiredError) {
    return new AuthenticationError("Token has expired", "TOKEN_EXPIRED");
  }

  if (error instanceof JsonWebTokenError) {
    return new AuthenticationError("Invalid token", "TOKEN_INVALID");
  }

  return new AuthenticationError("Token verification failed", "TOKEN_ERROR");
};

/**
 * Development error response
 * Includes stack trace and detailed error information
 */
const sendDevError = (error: AppError, req: Request, res: Response): void => {
  const errorResponse: APIResponse = {
    success: false,
    message: error.message,
    error: {
      code: error.errorCode,
      details: {
        ...error.details,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      },
    },
  };

  res.status(error.statusCode).json(errorResponse);
};

/**
 * Production error response
 * Only sends safe error information to prevent information leakage
 */
const sendProdError = (error: AppError, res: Response): void => {
  // Only send operational errors to client in production
  if (error.isOperational) {
    const errorResponse: APIResponse = {
      success: false,
      message: error.message,
      error: {
        code: error.errorCode,
        details: error.details,
      },
    };

    res.status(error.statusCode).json(errorResponse);
  } else {
    // For programming errors, send generic message
    const errorResponse: APIResponse = {
      success: false,
      message: "Something went wrong",
      error: {
        code: "INTERNAL_ERROR",
      },
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Main error handling middleware
 * Must be the last middleware in the stack
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Log all errors
  logError(error, req);

  let appError: AppError;

  // Convert known error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof MongooseError || error.name?.includes("Mongo")) {
    appError = handleMongooseError(error as MongooseError);
  } else if (error instanceof JsonWebTokenError) {
    appError = handleJWTError(error);
  } else {
    // Unknown error - create generic AppError
    appError = new AppError(
      config.development.enableDetailedErrors
        ? error.message
        : "Internal server error",
      500,
      "INTERNAL_ERROR",
      false
    );
  }

  // Send appropriate response based on environment
  if (config.nodeEnv === "development") {
    sendDevError(appError, req, res);
  } else {
    sendProdError(appError, res);
  }
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch unhandled promise rejections
 */
export const asyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return (...args: T): Promise<R> => {
    const [req, res, next] = args as any;
    return Promise.resolve(fn(...args)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Unhandled rejection handler
 * Catches unhandled promise rejections globally
 */
export const handleUnhandledRejection = (): void => {
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    console.error("🚨 Unhandled Promise Rejection:", reason);
    console.error("Promise:", promise);

    // TODO: Send to logging service

    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Uncaught exception handler
 * Catches uncaught exceptions globally
 */
export const handleUncaughtException = (): void => {
  process.on("uncaughtException", (error: Error) => {
    console.error("🚨 Uncaught Exception:", error);

    // TODO: Send to logging service

    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * SIGTERM handler for graceful shutdown
 */
export const handleSIGTERM = (server: any): void => {
  process.on("SIGTERM", () => {
    console.log("👋 SIGTERM received. Shutting down gracefully...");

    server.close(() => {
      console.log("✅ Process terminated");
      process.exit(0);
    });
  });
};

/**
 * Request timeout middleware
 * Automatically timeout requests that take too long
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set request timeout
    req.setTimeout(timeoutMs, () => {
      const error = new AppError(
        "Request timeout",
        408,
        "REQUEST_TIMEOUT",
        true
      );
      next(error);
    });

    // Set response timeout
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        const error = new AppError(
          "Response timeout",
          408,
          "RESPONSE_TIMEOUT",
          true
        );
        next(error);
      }
    });

    next();
  };
};

/**
 * Health check error monitoring
 * Tracks error rates for health checks
 */
class ErrorMonitor {
  private errorCounts: Map<string, number> = new Map();
  private resetInterval: NodeJS.Timeout;

  constructor(resetIntervalMs: number = 60000) {
    // Reset error counts every minute
    this.resetInterval = setInterval(() => {
      this.errorCounts.clear();
    }, resetIntervalMs);
  }

  recordError(errorCode: string): void {
    const current = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, current + 1);
  }

  getErrorCounts(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  getErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    return totalErrors;
  }

  cleanup(): void {
    clearInterval(this.resetInterval);
  }
}

export const errorMonitor = new ErrorMonitor();

/**
 * Error monitoring middleware
 * Records error statistics for monitoring
 */
export const monitorErrors = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof AppError) {
    errorMonitor.recordError(error.errorCode);
  } else {
    errorMonitor.recordError("UNKNOWN_ERROR");
  }

  next(error);
};

/**
 * Custom error creator helpers
 */
export const createError = {
  validation: (message: string, details?: any) =>
    new ValidationError(message, details),
  auth: (message?: string, code?: string) =>
    new AuthenticationError(message, code),
  authorization: (message?: string, code?: string) =>
    new AuthorizationError(message, code),
  notFound: (resource?: string) => new NotFoundError(resource),
  conflict: (message: string, code?: string) =>
    new ConflictError(message, code),
  rateLimit: (message?: string) => new RateLimitError(message),
  internal: (message: string, code?: string) =>
    new AppError(message, 500, code || "INTERNAL_ERROR", false),
};

/**
 * Error response helper for controllers
 */
export const sendErrorResponse = (
  res: Response,
  error: AppError | Error,
  defaultStatusCode: number = 500
): void => {
  if (error instanceof AppError) {
    const response: APIResponse = {
      success: false,
      message: error.message,
      error: {
        code: error.errorCode,
        details: error.details,
      },
    };
    res.status(error.statusCode).json(response);
  } else {
    const response: APIResponse = {
      success: false,
      message: config.development.enableDetailedErrors
        ? error.message
        : "Internal server error",
      error: {
        code: "INTERNAL_ERROR",
      },
    };
    res.status(defaultStatusCode).json(response);
  }
};

export default {
  // Main middleware
  errorHandler,
  notFoundHandler,
  monitorErrors,
  requestTimeout,

  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,

  // Utilities
  asyncHandler,
  createError,
  sendErrorResponse,
  errorMonitor,

  // Global handlers
  handleUnhandledRejection,
  handleUncaughtException,
  handleSIGTERM,
};
