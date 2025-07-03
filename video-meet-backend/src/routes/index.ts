import { Router } from "express";
import authRoutes from "./auth";
import meetingRoutes from "./meetings";
import participantRoutes from "./participants";
import { generalRateLimit } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { APIResponse } from "../types/models";
import config from "../config";

const router = Router();

/**
 * API Routes
 * Base path: /api/v1
 */

/**
 * @route   GET /api/v1/
 * @desc    API health check and information
 * @access  Public
 */
router.get(
  "/",
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const response: APIResponse = {
      success: true,
      message: "Video Meet API is running",
      data: {
        version: "2.0.0",
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        features: {
          authentication: true,
          meetings: true,
          participants: true,
          webrtc: true,
          localNetwork: config.localNetwork.enabled,
          fileSharing: true,
          recording: false, // Will be implemented in future
        },
        endpoints: {
          auth: "/api/v1/auth",
          meetings: "/api/v1/meetings",
          participants: "/api/v1/participants",
          health: "/api/v1/health",
        },
      },
    };

    res.status(200).json(response);
  })
);

/**
 * @route   GET /api/v1/health
 * @desc    Detailed health check
 * @access  Public
 */
router.get(
  "/health",
  generalRateLimit,
  asyncHandler(async (req, res) => {
    // Check database connection
    const { checkDatabaseHealth } = await import("@/config/database");
    const dbHealth = await checkDatabaseHealth();

    // Calculate uptime
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    // Memory usage
    const memoryUsage = process.memoryUsage();

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: `${uptimeHours}h ${uptimeMinutes}m`,
      },
      database: dbHealth,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
        external: Math.round(memoryUsage.external / 1024 / 1024) + " MB",
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      features: {
        authentication: "active",
        meetings: "active",
        participants: "active",
        webrtc: "active",
        localNetwork: config.localNetwork.enabled ? "active" : "disabled",
        fileSharing: "active",
        security: "active",
      },
    };

    // Determine overall health status
    const overallStatus =
      dbHealth.status === "healthy" ? "healthy" : "degraded";

    const response: APIResponse = {
      success: true,
      message: `API health check - ${overallStatus}`,
      data: {
        ...healthData,
        status: overallStatus,
      },
    };

    // Return appropriate status code
    const statusCode = overallStatus === "healthy" ? 200 : 503;
    res.status(statusCode).json(response);
  })
);

/**
 * @route   GET /api/v1/stats
 * @desc    API usage statistics
 * @access  Public
 */
router.get(
  "/stats",
  generalRateLimit,
  asyncHandler(async (req, res) => {
    // Get error monitoring stats
    const { errorMonitor } = await import("@/middleware/errorHandler");
    const errorCounts = errorMonitor.getErrorCounts();
    const errorRate = errorMonitor.getErrorRate();

    // Get basic statistics
    const { User } = await import("@/models/User");
    const { Meeting } = await import("@/models/Meeting");
    const { Participant } = await import("@/models/Participant");

    const [
      totalUsers,
      activeUsers,
      totalMeetings,
      activeMeetings,
      totalParticipants,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        isActive: true,
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      }),
      Meeting.countDocuments(),
      Meeting.countDocuments({ status: { $in: ["waiting", "active"] } }),
      Participant.countDocuments(),
    ]);

    const response: APIResponse = {
      success: true,
      message: "API statistics retrieved successfully",
      data: {
        users: {
          total: totalUsers,
          activeToday: activeUsers,
        },
        meetings: {
          total: totalMeetings,
          active: activeMeetings,
        },
        participants: {
          total: totalParticipants,
        },
        errors: {
          counts: errorCounts,
          rate: errorRate,
        },
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  })
);

/**
 * Mount route modules
 */

// Authentication routes
router.use("/auth", authRoutes);

// Meeting routes
router.use("/meetings", meetingRoutes);

// Participant routes
router.use("/participants", participantRoutes);

/**
 * @route   * /api/v1/*
 * @desc    Handle undefined routes
 * @access  Public
 */
router.use("*", (req, res) => {
  const response: APIResponse = {
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: {
      code: "ROUTE_NOT_FOUND",
    },
  };

  res.status(404).json(response);
});

export default router;
