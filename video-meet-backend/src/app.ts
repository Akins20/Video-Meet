import express, { Application, Request, Response, NextFunction } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";

// Models
import "./models/AuthToken";
import "./models/MeetingRoom";
import "./models/MeetingRoomParticipant";
import "./models/MeetingRoomChatMessage";
import "./models/MeetingRoomMediaState";
import "./models/MeetingRoomConnectionQuality";
import "./models/MeetingRoomRecording";
import "./models/MeetingRoomStatistics";
import "./models/MeetingRoomSettings";
import "./models/MeetingRoomPoll";
import "./models/MeetingRoomPollOption";
import "./models/MeetingRoomPollVote";
import "./models/MeetingRoomPollResult";
import "./models/MeetingRoomNotification";
import "./models/MeetingRoomFile";
import "./models/MeetingRoomFileShare";
import "./models/MeetingRoomFileShareParticipant";
import "./models/MeetingRoomFileShareMessage";
import "./models/MeetingRoomFileShareNotification";
import "./models/MeetingRoomFileShareStatistics";
import "./models/MeetingRoomFileShareSettings";
import "./models/MeetingRoomFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantMessage";
import "./models/MeetingRoomFileShareParticipantMediaState";
import "./models/MeetingRoomFileShareParticipantConnectionQuality";
import "./models/MeetingRoomFileShareParticipantRecording";
import "./models/MeetingRoomFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantPoll";
import "./models/MeetingRoomFileShareParticipantPollOption";
import "./models/MeetingRoomFileShareParticipantPollVote";
import "./models/MeetingRoomFileShareParticipantPollResult";
import "./models/MeetingRoomFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFile";
import "./models/MeetingRoomFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareMessage";
import "./models/MeetingRoomFileShareParticipantFileShareNotification";
import "./models/MeetingRoomFileShareParticipantFileShareStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantMessage";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantMediaState";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantConnectionQuality";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantRecording";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantPoll";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantPollOption";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantPollVote";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantPollResult";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFile";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareMessage";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantMessage";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantMediaState";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantConnectionQuality";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantRecording";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantPoll";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantPollOption";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantPollVote";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantPollResult";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFile";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareMessage";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantMessage";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantMediaState";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantConnectionQuality";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantRecording";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantStatistics";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantSettings";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantPoll";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantPollOption";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantPollVote";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantPollResult";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantNotification";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFile";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFile";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFile";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipantFileShare";
import "./models/MeetingRoomFileShareParticipantFileShareParticipantFileShareParticipantFileShareParticipant";
import "./models/Meeting";
import "./models/Participant";
import "./models/User";

// Configuration and Database
import config from "./config";
import { connectDatabase } from "./config/database";

// Routes
import apiRoutes from "./routes";

// Middleware
import {
  corsMiddleware,
  securityHeaders,
  compressionMiddleware,
  requestSizeLimit,
  securityLogger,
  initSecurity,
} from "./middleware/security";
import {
  errorHandler,
  notFoundHandler,
  monitorErrors,
  requestTimeout,
  handleUnhandledRejection,
  handleUncaughtException,
  handleSIGTERM,
} from "./middleware/errorHandler";
import { sanitizeInput } from "./middleware/validation";

// Types
import { APIResponse } from "./types/models";

/**
 * Express Application Class
 * Handles server initialization, middleware setup, and graceful shutdown
 */
class VideoMeetApp {
  public app: Application;
  public server: http.Server;
  public io: SocketIOServer;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.security.corsOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
    this.setupGracefulShutdown();
  }

  /**
   * Initialize Express middleware
   */
  private initializeMiddleware(): void {
    console.log("🔧 Initializing middleware...");

    // Trust proxy for deployment behind load balancers
    this.app.set("trust proxy", 1);

    // Security middleware (first layer)
    this.app.use(securityHeaders); // Security headers via Helmet
    this.app.use(corsMiddleware); // CORS configuration
    this.app.use(requestSizeLimit); // Request size limiting
    this.app.use(requestTimeout(30000)); // 30-second request timeout

    // Request processing middleware
    this.app.use(compressionMiddleware); // Gzip compression
    this.app.use(express.json({ limit: "10mb" })); // JSON body parser
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" })); // URL-encoded parser
    this.app.use(sanitizeInput); // Input sanitization

    // Logging and monitoring
    this.app.use(securityLogger); // Security event logging
    this.app.use(monitorErrors); // Error monitoring

    // Static files (if needed)
    if (config.nodeEnv === "development") {
      this.app.use(
        "/uploads",
        express.static(path.join(process.cwd(), "uploads"))
      );
    }

    console.log("✅ Middleware initialized");
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    console.log("🛣️  Initializing routes...");

    // API routes with versioning
    this.app.use("/api/v1", apiRoutes);

    // Root endpoint
    this.app.get("/", (req: Request, res: Response) => {
      const response: APIResponse = {
        success: true,
        message: "Video Meet API Server",
        data: {
          version: "2.0.0",
          documentation: "/api/v1",
          health: "/api/v1/health",
          status: "online",
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    });

    // Health check endpoint (for load balancers)
    this.app.get("/health", (req: Request, res: Response) => {
      if (this.isShuttingDown) {
        res.status(503).json({
          success: false,
          message: "Server is shutting down",
          error: { code: "SERVER_SHUTTING_DOWN" },
        });
        return;
      }

      const response: APIResponse = {
        success: true,
        message: "Server is healthy",
        data: {
          status: "healthy",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    });

    console.log("✅ Routes initialized");
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    console.log("🚨 Initializing error handling...");

    // 404 handler (must be after all routes)
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);

    // Global exception handlers
    handleUnhandledRejection();
    handleUncaughtException();

    console.log("✅ Error handling initialized");
  }

  /**
   * Initialize Socket.IO for real-time communication
   */
  private initializeSocketIO(): void {
    console.log("🔌 Initializing Socket.IO...");

    // Socket.IO middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token
        const AuthService = (await import("./services/AuthService")).default;
        const decoded = await AuthService.verifyAccessToken(token);

        if (!decoded) {
          return next(new Error("Invalid authentication token"));
        }

        // Attach user info to socket
        (socket as any).userId = decoded.userId;
        (socket as any).userEmail = decoded.email;

        console.log(`🔌 User ${decoded.email} connected to Socket.IO`);
        next();
      } catch (error) {
        console.error("Socket.IO authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });

    // Socket.IO connection handling
    this.io.on("connection", (socket) => {
      const userId = (socket as any).userId;
      const userEmail = (socket as any).userEmail;

      console.log(`✅ Socket.IO connection established for user: ${userEmail}`);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      // Handle meeting join
      socket.on("join-meeting", async (data) => {
        try {
          const { meetingId, participantId } = data;

          // Validate meeting participation
          const ParticipantService = (
            await import("./services/ParticipantService")
          ).default;
          const result = await ParticipantService.getParticipant(participantId);

          if (
            result.success &&
            result.data?.meetingId.toString() === meetingId
          ) {
            socket.join(`meeting:${meetingId}`);

            // Update participant socket ID
            await ParticipantService.updateSocketId(participantId, socket.id);

            // Notify other participants
            socket.to(`meeting:${meetingId}`).emit("participant-joined", {
              participantId,
              userId,
              timestamp: new Date().toISOString(),
            });

            console.log(`📹 User ${userEmail} joined meeting ${meetingId}`);
          } else {
            socket.emit("error", { message: "Invalid meeting or participant" });
          }
        } catch (error) {
          console.error("Join meeting error:", error);
          socket.emit("error", { message: "Failed to join meeting" });
        }
      });

      // Handle meeting leave
      socket.on("leave-meeting", async (data) => {
        try {
          const { meetingId, participantId } = data;

          socket.leave(`meeting:${meetingId}`);

          // Notify other participants
          socket.to(`meeting:${meetingId}`).emit("participant-left", {
            participantId,
            userId,
            timestamp: new Date().toISOString(),
          });

          console.log(`👋 User ${userEmail} left meeting ${meetingId}`);
        } catch (error) {
          console.error("Leave meeting error:", error);
        }
      });

      // Handle WebRTC signaling
      socket.on("webrtc-signal", (data) => {
        try {
          const { to, signal, type } = data;

          // Forward signal to target participant
          socket.to(to).emit("webrtc-signal", {
            from: socket.id,
            signal,
            type,
            timestamp: new Date().toISOString(),
          });

          console.log(`📡 WebRTC ${type} signal from ${socket.id} to ${to}`);
        } catch (error) {
          console.error("WebRTC signaling error:", error);
          socket.emit("error", { message: "Signaling failed" });
        }
      });

      // Handle chat messages
      socket.on("chat-message", async (data) => {
        try {
          const { meetingId, message, type = "text" } = data;

          // Broadcast message to meeting participants
          this.io.to(`meeting:${meetingId}`).emit("chat-message", {
            senderId: userId,
            senderEmail: userEmail,
            message,
            type,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `💬 Chat message in meeting ${meetingId} from ${userEmail}`
          );
        } catch (error) {
          console.error("Chat message error:", error);
        }
      });

      // Handle media state changes
      socket.on("media-state-change", (data) => {
        try {
          const { meetingId, mediaState } = data;

          // Broadcast media state change to meeting participants
          socket.to(`meeting:${meetingId}`).emit("media-state-change", {
            participantId: (socket as any).participantId,
            userId,
            mediaState,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `🎥 Media state change in meeting ${meetingId} from ${userEmail}`
          );
        } catch (error) {
          console.error("Media state change error:", error);
        }
      });

      // Handle connection quality updates
      socket.on("connection-quality", (data) => {
        try {
          const { meetingId, quality } = data;

          // Broadcast quality update to meeting participants
          socket.to(`meeting:${meetingId}`).emit("connection-quality", {
            participantId: (socket as any).participantId,
            userId,
            quality,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Connection quality error:", error);
        }
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`🔌 User ${userEmail} disconnected: ${reason}`);

        // Notify all rooms that this user left
        socket.broadcast.emit("user-disconnected", {
          userId,
          socketId: socket.id,
          reason,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error(`Socket.IO error for user ${userEmail}:`, error);
      });
    });

    console.log("✅ Socket.IO initialized");
  }

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      return () => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
        this.isShuttingDown = true;

        // Stop accepting new connections
        this.server.close(async () => {
          console.log("📡 HTTP server closed");

          try {
            // Close Socket.IO connections
            this.io.close(() => {
              console.log("🔌 Socket.IO server closed");
            });

            // Close database connection
            const { disconnectDatabase } = await import("./config/database");
            await disconnectDatabase();
            console.log("🗄️  Database connection closed");

            // Cleanup error monitor
            const { errorMonitor } = await import("./middleware/errorHandler");
            errorMonitor.cleanup();
            console.log("📊 Error monitor cleaned up");

            console.log("✅ Graceful shutdown completed");
            process.exit(0);
          } catch (error) {
            console.error("❌ Error during shutdown:", error);
            process.exit(1);
          }
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.error("⚠️  Forced shutdown after timeout");
          process.exit(1);
        }, 10000);
      };
    };

    // Handle different termination signals
    process.on("SIGTERM", gracefulShutdown("SIGTERM"));
    process.on("SIGINT", gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", gracefulShutdown("SIGUSR2")); // Nodemon restart
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      console.log("🚀 Starting Video Meet API Server...");
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔧 Node.js version: ${process.version}`);

      // Initialize security
      initSecurity();

      // Connect to database
      console.log("🗄️  Connecting to database...");
      await connectDatabase();

      // Start HTTP server
      const port = config.port;
      this.server.listen(port, () => {
        console.log("\n" + "=".repeat(50));
        console.log("🎉 VIDEO MEET API SERVER STARTED");
        console.log("=".repeat(50));
        console.log(`🌐 Server running on port: ${port}`);
        console.log(`📡 API endpoint: http://localhost:${port}/api/v1`);
        console.log(`🔌 Socket.IO endpoint: http://localhost:${port}`);
        console.log(`💚 Health check: http://localhost:${port}/health`);
        console.log(`📊 Statistics: http://localhost:${port}/api/v1/stats`);
        console.log("=".repeat(50));

        if (config.nodeEnv === "development") {
          console.log("🛠️  Development features enabled:");
          console.log("   • Detailed error messages");
          console.log("   • Request logging");
          console.log("   • Static file serving");
          console.log("=".repeat(50));
        }
      });

      // Handle server errors
      this.server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.syscall !== "listen") {
          throw error;
        }

        switch (error.code) {
          case "EACCES":
            console.error(`❌ Port ${port} requires elevated privileges`);
            process.exit(1);
          case "EADDRINUSE":
            console.error(`❌ Port ${port} is already in use`);
            process.exit(1);
          default:
            throw error;
        }
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}

// Create and export app instance
const app = new VideoMeetApp();

// Start server if this file is run directly
if (require.main === module) {
  app.start().catch((error) => {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  });
}

export default app;
export { VideoMeetApp };
