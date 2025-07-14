// app.ts - Refactored and modular
import express, { Application, Request, Response } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

// Models
import "./models/Meeting";
import "./models/Participant";
import "./models/User";

// Configuration and Database
import config from "./config";
import { connectDatabase, disconnectDatabase } from "./config/database";

// Routes
import apiRoutes from "./routes";

// Middleware
import { setupMiddleware } from "./middleware/setup";
import { setupErrorHandling } from "./middleware/setup";

// Handlers
import { SocketHandlers } from "./handlers/socketHandlers";

// Constants
import { WS_EVENTS, SERVER_CONFIG } from "./constants/events";

// Types
import { APIResponse } from "./types/models";

/**
 * Express Application Class - Refactored and Modular
 */
export class VideoMeetApp {
  public app: Application;
  public server: http.Server;
  public io: SocketIOServer;
  private socketHandlers: SocketHandlers;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = this.createSocketIOServer();
    this.socketHandlers = new SocketHandlers(this.io);

    this.initialize();
  }

  /**
   * Create and configure Socket.IO server
   */
  private createSocketIOServer(): SocketIOServer {
    return new SocketIOServer(this.server, {
      cors: {
        origin: config.security.corsOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },

      // Connection settings aligned with frontend
      pingTimeout: SERVER_CONFIG.SOCKET_IO.PING_TIMEOUT,
      pingInterval: SERVER_CONFIG.SOCKET_IO.PING_INTERVAL,
      upgradeTimeout: SERVER_CONFIG.SOCKET_IO.UPGRADE_TIMEOUT,
      connectTimeout: SERVER_CONFIG.SOCKET_IO.CONNECT_TIMEOUT,

      // Transport configuration for stability
      transports: ["websocket", "polling"],
      allowUpgrades: true,

      // Security
      allowEIO3: false,
      serveClient: false,

      // Message size
      maxHttpBufferSize: SERVER_CONFIG.SOCKET_IO.MAX_HTTP_BUFFER_SIZE,

      // Additional stability
      cookie: false,
      destroyUpgrade: false,
      destroyUpgradeTimeout: 1000,
    });
  }

  /**
   * Initialize all components
   */
  private initialize(): void {
    console.log("🔧 Initializing Video Meet API Server...");

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupSocketIO();
    this.setupGracefulShutdown();

    console.log("✅ Server initialization completed");
  }

  /**
   * Set up middleware
   */
  private setupMiddleware(): void {
    console.log("🔧 Setting up middleware...");
    setupMiddleware(this.app);
    console.log("✅ Middleware setup completed");
  }

  /**
   * Set up routes
   */
  private setupRoutes(): void {
    console.log("🛣️  Setting up routes...");

    // API routes
    this.app.use("/api/v1", apiRoutes);

    // Root endpoint
    this.app.get("/", this.handleRootEndpoint.bind(this));

    // Health check endpoint
    this.app.get("/health", this.handleHealthCheck.bind(this));

    console.log("✅ Routes setup completed");
  }

  /**
   * Handle root endpoint
   */
  private handleRootEndpoint(req: Request, res: Response): void {
    const response: APIResponse = {
      success: true,
      message: "Video Meet API Server",
      data: {
        version: "2.0.0",
        documentation: "/api/v1",
        health: "/health",
        status: "online",
        timestamp: new Date().toISOString(),
      },
    };
    res.status(200).json(response);
  }

  /**
   * Handle health check endpoint
   */
  private handleHealthCheck(req: Request, res: Response): void {
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
        connections: this.socketHandlers.getConnectionStats(),
      },
    };
    res.status(200).json(response);
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    console.log("🚨 Setting up error handling...");
    setupErrorHandling(this.app);
    console.log("✅ Error handling setup completed");
  }

  /**
   * Set up Socket.IO
   */
  private setupSocketIO(): void {
    console.log("🔌 Setting up Socket.IO...");

    // Set up authentication middleware
    this.socketHandlers.setupAuthMiddleware();

    // Handle connections
    this.io.on("connection", (socket) => {
      this.socketHandlers.handleConnection(socket as any);
    });

    console.log("✅ Socket.IO setup completed");
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      return async () => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
        this.isShuttingDown = true;

        // Notify all connected clients
        this.socketHandlers.broadcastSystemMessage(
          "Server is shutting down",
          "warning"
        );

        // Close HTTP server
        this.server.close(async () => {
          console.log("📡 HTTP server closed");

          try {
            // Close Socket.IO server
            this.io.close(() => {
              console.log("🔌 Socket.IO server closed");
            });

            // Disconnect database
            await disconnectDatabase();
            console.log("🗄️  Database connection closed");

            console.log("✅ Graceful shutdown completed");
            process.exit(0);
          } catch (error) {
            console.error("❌ Error during shutdown:", error);
            process.exit(1);
          }
        });

        // Force close after timeout
        setTimeout(() => {
          console.error("⚠️  Forced shutdown after timeout");
          process.exit(1);
        }, SERVER_CONFIG.SHUTDOWN_TIMEOUT);
      };
    };

    process.on("SIGTERM", gracefulShutdown("SIGTERM"));
    process.on("SIGINT", gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", gracefulShutdown("SIGUSR2"));
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      console.log("🚀 Starting Video Meet API Server...");
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔧 Node.js version: ${process.version}`);

      // Connect to database
      console.log("🗄️  Connecting to database...");
      await connectDatabase();

      // Start listening
      const port = config.port;
      await new Promise<void>((resolve, reject) => {
        this.server.listen(port, () => {
          resolve();
        });

        this.server.on("error", (error: NodeJS.ErrnoException) => {
          reject(this.handleServerError(error, port));
        });
      });

      this.logServerStarted(port);
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  /**
   * Handle server startup errors
   */
  private handleServerError(error: NodeJS.ErrnoException, port: number): Error {
    if (error.syscall !== "listen") {
      return error;
    }

    switch (error.code) {
      case "EACCES":
        return new Error(`Port ${port} requires elevated privileges`);
      case "EADDRINUSE":
        return new Error(`Port ${port} is already in use`);
      default:
        return error;
    }
  }

  /**
   * Log server startup success
   */
  private logServerStarted(port: number): void {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 VIDEO MEET API SERVER STARTED");
    console.log("=".repeat(60));
    console.log(`🌐 Server running on port: ${port}`);
    console.log(`📡 API endpoint: http://localhost:${port}/api/v1`);
    console.log(`🔌 Socket.IO endpoint: http://localhost:${port}`);
    console.log(`💚 Health check: http://localhost:${port}/health`);
    console.log(
      `📊 WebSocket events: ${Object.keys(WS_EVENTS).length} events configured`
    );
    console.log("=".repeat(60));

    if (config.nodeEnv === "development") {
      console.log("🛠️  Development features enabled:");
      console.log("   • Detailed error messages");
      console.log("   • Request logging");
      console.log("   • Static file serving");
      console.log("   • Enhanced debugging");
      console.log("=".repeat(60));
    }
  }

  /**
   * Get server statistics
   */
  public getStats() {
    return {
      uptime: process.uptime(),
      connections: this.socketHandlers.getConnectionStats(),
      isShuttingDown: this.isShuttingDown,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Broadcast system message to all clients
   */
  public broadcastMessage(
    message: string,
    type: "info" | "warning" | "error" = "info"
  ): void {
    this.socketHandlers.broadcastSystemMessage(message, type);
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
