import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { RateLimitError, createError } from "../middleware/errorHandler";
import config from "../config";

/**
 * Extended Request interface for rate limiting
 */
interface RateLimitRequest extends Request {
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

/**
 * Rate limit store interface for custom stores
 */
interface RateLimitStore {
  hits: Map<string, { count: number; resetTime: number }>;
  increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}

/**
 * In-memory rate limit store
 * For production, consider Redis or database-backed store
 */
class MemoryRateLimitStore implements RateLimitStore {
  hits = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.hits.entries()) {
        if (data.resetTime < now) {
          this.hits.delete(key);
        }
      }
    }, 60000);
  }

  async increment(
    key: string
  ): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const windowMs = config.security.rateLimit.windowMs;

    const existing = this.hits.get(key);

    if (!existing || existing.resetTime < now) {
      // Create new entry or reset expired entry
      const resetTime = now + windowMs;
      this.hits.set(key, { count: 1, resetTime });
      return { totalHits: 1, resetTime: new Date(resetTime) };
    } else {
      // Increment existing entry
      existing.count++;
      return {
        totalHits: existing.count,
        resetTime: new Date(existing.resetTime),
      };
    }
  }

  async decrement(key: string): Promise<void> {
    const existing = this.hits.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

// Global rate limit store instance
const rateLimitStore = new MemoryRateLimitStore();

/**
 * Generate rate limit key from request
 */
const generateRateLimitKey = (
  req: Request,
  prefix: string = "general"
): string => {
  // Use IP address as primary identifier
  const ip = req.ip || req.connection.remoteAddress || "unknown";

  // For authenticated users, also include user ID
  const userId = (req as any).userId;

  if (userId) {
    return `${prefix}:user:${userId}:${ip}`;
  }

  return `${prefix}:ip:${ip}`;
};

/**
 * Custom rate limiting middleware factory
 */
const createRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return async (
    req: RateLimitRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const key = generateRateLimitKey(req, options.keyPrefix);
      const { totalHits, resetTime } = await rateLimitStore.increment(key);

      // Add rate limit headers
      res.set({
        "X-RateLimit-Limit": options.maxRequests.toString(),
        "X-RateLimit-Remaining": Math.max(
          0,
          options.maxRequests - totalHits
        ).toString(),
        "X-RateLimit-Reset": resetTime.toISOString(),
        "X-RateLimit-Window": options.windowMs.toString(),
      });

      // Attach rate limit info to request
      req.rateLimitInfo = {
        limit: options.maxRequests,
        remaining: Math.max(0, options.maxRequests - totalHits),
        reset: resetTime,
      };

      // Check if limit exceeded
      if (totalHits > options.maxRequests) {
        const error = new RateLimitError(
          options.message ||
          `Too many requests. Limit: ${options.maxRequests} per ${options.windowMs}ms`
        );

        // Add Retry-After header
        const retryAfterSeconds = Math.ceil(
          (resetTime.getTime() - Date.now()) / 1000
        );
        res.set("Retry-After", retryAfterSeconds.toString());

        return next(error);
      }

      // Handle response completion for cleanup
      res.on("finish", () => {
        // Optionally decrement on successful requests
        if (
          options.skipSuccessfulRequests &&
          res.statusCode >= 200 &&
          res.statusCode < 400
        ) {
          rateLimitStore.decrement(key);
        }

        // Optionally decrement on failed requests
        if (options.skipFailedRequests && res.statusCode >= 400) {
          rateLimitStore.decrement(key);
        }
      });

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      next(); // Continue on rate limit errors
    }
  };
};

/**
 * General API rate limiting
 */
export const generalRateLimit = createRateLimit({
  windowMs: config.security.rateLimit.windowMs,
  maxRequests: config.security.rateLimit.maxRequests,
  message: "Too many requests from this IP, please try again later",
  keyPrefix: "general",
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes
  message: "Too many authentication attempts, please try again in 15 minutes",
  keyPrefix: "auth",
  skipSuccessfulRequests: true, // Don't count successful logins against limit
});

/**
 * Rate limiting for meeting creation
 */
export const meetingCreationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 meetings per hour per user
  message: "Too many meetings created, please try again later",
  keyPrefix: "meeting_creation",
});

/**
 * Rate limiting for file uploads
 */
export const fileUploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100, // 100 file uploads per hour
  message: "Too many file uploads, please try again later",
  keyPrefix: "file_upload",
});

/**
 * Rate limiting for WebRTC signaling
 */
export const signalingRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 1000 signaling messages per minute
  message: "Too many signaling requests",
  keyPrefix: "signaling",
  skipFailedRequests: true,
});

/**
 * CORS configuration
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (config.security.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow localhost in development
    if (config.nodeEnv === "development" && origin.includes("localhost")) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "Retry-After",
  ],
  maxAge: 86400, // 24 hours
});

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for WebRTC compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentLength = req.get("content-length");

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (size > maxSize) {
      const error = createError.validation("Request payload too large", {
        maxSize: maxSize,
        receivedSize: size,
      });
      return next(error);
    }
  }

  next();
};

/**
 * IP allowlist/blocklist middleware
 */
class IPFilter {
  private allowlist: Set<string> = new Set();
  private blocklist: Set<string> = new Set();
  private ipRanges: { start: number; end: number }[] = [];

  addToAllowlist(ip: string): void {
    this.allowlist.add(ip);
  }

  addToBlocklist(ip: string): void {
    this.blocklist.add(ip);
  }

  addRangeToBlocklist(startIP: string, endIP: string): void {
    const start = this.ipToNumber(startIP);
    const end = this.ipToNumber(endIP);
    this.ipRanges.push({ start, end });
  }

  private ipToNumber(ip: string): number {
    return ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  }

  isAllowed(ip: string): boolean {
    // Check blocklist first
    if (this.blocklist.has(ip)) {
      return false;
    }

    // Check blocked ranges
    const ipNum = this.ipToNumber(ip);
    for (const range of this.ipRanges) {
      if (ipNum >= range.start && ipNum <= range.end) {
        return false;
      }
    }

    // If allowlist is configured and IP is not in it, block
    if (this.allowlist.size > 0 && !this.allowlist.has(ip)) {
      return false;
    }

    return true;
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || "";

    if (!this.isAllowed(ip)) {
      const error = createError.authorization(
        "Access denied from this IP address",
        "IP_BLOCKED"
      );
      return next(error);
    }

    next();
  };
}

export const ipFilter = new IPFilter();

/**
 * Request fingerprinting for abuse detection
 */
interface RequestFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  timestamp: number;
}

class AbusDetector {
  private fingerprints: Map<string, RequestFingerprint[]> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  detectSuspiciousActivity(req: Request): boolean {
    const ip = req.ip || "";
    const userAgent = req.get("User-Agent") || "";
    const acceptLanguage = req.get("Accept-Language") || "";

    const fingerprint: RequestFingerprint = {
      ip,
      userAgent,
      acceptLanguage,
      timestamp: Date.now(),
    };

    // Get recent fingerprints for this IP
    const recentFingerprints = this.fingerprints.get(ip) || [];

    // Clean old fingerprints (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const validFingerprints = recentFingerprints.filter(
      (f) => f.timestamp > tenMinutesAgo
    );

    // Add current fingerprint
    validFingerprints.push(fingerprint);
    this.fingerprints.set(ip, validFingerprints);

    // Check for suspicious patterns
    if (validFingerprints.length > 100) {
      // More than 100 requests in 10 minutes
      this.suspiciousIPs.add(ip);
      return true;
    }

    // Check for rapid user agent changes (possible bot)
    const uniqueUserAgents = new Set(validFingerprints.map((f) => f.userAgent));
    if (uniqueUserAgents.size > 5 && validFingerprints.length > 20) {
      this.suspiciousIPs.add(ip);
      return true;
    }

    return false;
  }

  isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  clearSuspiciousIP(ip: string): void {
    this.suspiciousIPs.delete(ip);
    this.fingerprints.delete(ip);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || "";

    // Check if IP is already marked as suspicious
    if (this.isSuspicious(ip)) {
      const error = new RateLimitError(
        "Suspicious activity detected. Please try again later."
      );
      return next(error);
    }

    // Detect new suspicious activity
    if (this.detectSuspiciousActivity(req)) {
      console.warn(`🚨 Suspicious activity detected from IP: ${ip}`);
      const error = new RateLimitError(
        "Suspicious activity detected. Access temporarily restricted."
      );
      return next(error);
    }

    next();
  };
}

export const abuseDetector = new AbusDetector();

/**
 * Compression middleware with security considerations
 */
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Compression level (1-9, 6 is good balance)
  level: 6,
  // Don't compress responses for suspicious user agents
  filter: (req, res) => {
    // Don't compress if user agent looks suspicious
    const userAgent = req.get("User-Agent") || "";
    if (userAgent.includes("bot") || userAgent.includes("crawler")) {
      return false;
    }

    // Use default compression filter
    return compression.filter(req, res);
  },
});

/**
 * Request logging middleware for security auditing
 */
export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log security-relevant request information
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    referer: req.get("Referer"),
    userId: (req as any).userId || null,
  };

  // Log after response
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const securityLog = {
      ...logData,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get("content-length"),
    };

    // Log security events
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn("🔒 Security event:", JSON.stringify(securityLog));
    }

    // Log slow requests (potential DoS)
    if (duration > 10000) {
      // 10 seconds
      console.warn("🐌 Slow request:", JSON.stringify(securityLog));
    }
  });

  next();
};

/**
 * Initialize all security middleware
 */
export const initSecurity = () => {
  // Set up global error handlers for rate limit store
  process.on("exit", () => {
    rateLimitStore.cleanup();
  });

  console.log("🔒 Security middleware initialized");
};

export default {
  // Rate limiting
  generalRateLimit,
  authRateLimit,
  meetingCreationRateLimit,
  fileUploadRateLimit,
  signalingRateLimit,

  // Security middleware
  corsMiddleware,
  securityHeaders,
  requestSizeLimit,
  compressionMiddleware,
  securityLogger,

  // Advanced security
  ipFilter,
  abuseDetector,

  // Initialization
  initSecurity,
};
