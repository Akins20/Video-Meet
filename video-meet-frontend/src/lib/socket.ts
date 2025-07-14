/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { ENV_CONFIG, WS_EVENTS, TIME_CONFIG } from "@/utils/constants";
import { errorUtils, asyncUtils } from "@/utils/helpers";
import type {
  WebSocketMessage,
  WebSocketError,
  WebSocketEventType,
} from "@/types/api";

// Event handler type
type EventHandler<T = any> = (data: T) => void | Promise<void>;

// Connection state
interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  error?: string;
}

// Socket.IO client configuration
interface SocketConfig {
  url: string;
  options: {
    auth?: Record<string, any>;
    transports: string[];
    timeout: number;
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    maxReconnectionAttempts: number;
    autoConnect: boolean;
    forceNew: boolean;
  };
}

class SocketClient {
  private socket: Socket | null = null;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    reconnectAttempts: 0,
  };
  private config: SocketConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private isManualDisconnect = false;

  constructor() {
    this.config = {
      url: "http://localhost:5000",
      options: {
        transports: ["websocket", "polling"],
        timeout: TIME_CONFIG.timeouts.apiRequest,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
        autoConnect: false,
        forceNew: false,
      },
    };

    // Bind methods to preserve context
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    this.handleReconnectAttempt = this.handleReconnectAttempt.bind(this);
    this.handleReconnectError = this.handleReconnectError.bind(this);
  }

  /**
   * Connect to Socket.IO server
   */
  public async connect(auth?: Record<string, any>): Promise<void> {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    if (this.connectionState.isConnecting) {
      console.log("Socket connection already in progress");
      return;
    }

    try {
      this.connectionState.isConnecting = true;
      this.isManualDisconnect = false;

      // Update auth if provided
      if (auth) {
        this.config.options.auth = auth;
      }

      // Create socket instance
      this.socket = io(this.config.url, this.config.options);

      // Setup event listeners
      this.setupEventListeners();

      // Wait for connection
      await this.waitForConnection();

      console.log("✅ Socket connected successfully");

      // Process queued messages
      this.processMessageQueue();
    } catch (error) {
      console.error("❌ Socket connection failed:", error);
      this.connectionState.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  public disconnect(): void {
    if (!this.socket) return;

    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.clearReconnectTimeout();

    // Clear event handlers
    this.socket.removeAllListeners();

    // Disconnect
    this.socket.disconnect();
    this.socket = null;

    // Update state
    this.connectionState = {
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastDisconnected: new Date(),
    };

    console.log("🔌 Socket disconnected");
  }

  /**
   * Emit event to server
   */
  public emit<T = any>(event: string, data?: T): void {
    if (!this.socket?.connected) {
      // Queue message if not connected
      this.messageQueue.push({ event, data });
      console.warn(`Socket not connected. Queuing message: ${event}`);
      return;
    }

    try {
      // Add metadata to message
      const message: WebSocketMessage<T> = {
        type: event,
        data: data || ({} as T),
        timestamp: new Date().toISOString(),
        id: this.generateMessageId(),
      };

      this.socket.emit(event, message);

      if (ENV_CONFIG.isDevelopment) {
        console.log(`📤 Socket emit: ${event}`, message);
      }
    } catch (error) {
      console.error(`Failed to emit event ${event}:`, error);
      toast.error("Failed to send message");
    }
  }

  /**
   * Listen for events from server
   */
  public on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // If socket exists, add listener
    if (this.socket) {
      this.socket.on(event, this.createEventWrapper(event, handler));
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
          this.socket?.off(event);
        }
      }
    };
  }

  /**
   * Listen for event once
   */
  public once<T = any>(event: string, handler: EventHandler<T>): void {
    const unsubscribe = this.on(event, (data: T) => {
      handler(data);
      unsubscribe();
    });
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all listeners for event
      this.eventHandlers.delete(event);
      this.socket?.off(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
        this.socket?.off(event);
      }
    }
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Join a room
   */
  public joinRoom(roomId: string, data?: any): void {
    this.emit(WS_EVENTS.JOIN_MEETING, { roomId, ...data });
  }

  /**
   * Leave a room
   */
  public leaveRoom(roomId: string, data?: any): void {
    this.emit(WS_EVENTS.LEAVE_MEETING, { roomId, ...data });
  }

  /**
   * Send chat message
   */
  public sendChatMessage(roomId: string, message: string, type = "text"): void {
    this.emit(WS_EVENTS.CHAT_MESSAGE, {
      roomId,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send WebRTC signaling data
   */
  public sendWebRTCSignal(data: {
    to: string;
    from: string;
    type: "offer" | "answer" | "ice-candidate";
    signal: any;
  }): void {
    this.emit(WS_EVENTS.WEBRTC_SIGNAL, data);
  }

  /**
   * Update media state
   */
  public updateMediaState(
    roomId: string,
    mediaState: {
      audioEnabled: boolean;
      videoEnabled: boolean;
      screenSharing: boolean;
      handRaised: boolean;
    }
  ): void {
    this.emit(WS_EVENTS.MEDIA_STATE_CHANGE, { roomId, mediaState });
  }

  /**
   * Update connection quality
   */
  public updateConnectionQuality(roomId: string, quality: any): void {
    this.emit(WS_EVENTS.CONNECTION_QUALITY, { roomId, quality });
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", this.handleConnect);
    this.socket.on("disconnect", this.handleDisconnect);
    this.socket.on("connect_error", this.handleError);
    this.socket.on("reconnect", this.handleReconnect);
    this.socket.on("reconnect_attempt", this.handleReconnectAttempt);
    this.socket.on("reconnect_error", this.handleReconnectError);

    // Setup custom event listeners
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket!.on(event, this.createEventWrapper(event, handler));
      });
    });

    // Global error handler
    this.socket.on("error", (error: WebSocketError) => {
      console.error("Socket error:", error);
      toast.error(error.error?.message || "Connection error occurred");
    });

    if (ENV_CONFIG.isDevelopment) {
      // Log all events in development
      this.socket.onAny((event, ...args) => {
        console.log(`📥 Socket event: ${event}`, args);
      });
    }
  }

  private createEventWrapper<T>(event: string, handler: EventHandler<T>) {
    return async (data: T) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error handling socket event ${event}:`, error);
        toast.error(`Failed to handle ${event} event`);
      }
    };
  }

  private handleConnect(): void {
    this.connectionState = {
      isConnected: true,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastConnected: new Date(),
    };

    this.startHeartbeat();
    this.processMessageQueue();

    // Emit connection state change
    this.emitConnectionStateChange();

    if (ENV_CONFIG.isDevelopment) {
      console.log("🔌 Socket connected:", this.socket?.id);
    }
  }

  private handleDisconnect(reason: string): void {
    this.connectionState = {
      ...this.connectionState,
      isConnected: false,
      lastDisconnected: new Date(),
      error: reason,
    };

    this.stopHeartbeat();

    // Don't reconnect if disconnect was manual
    if (!this.isManualDisconnect) {
      this.connectionState.isReconnecting = true;
      this.scheduleReconnect();
    }

    // Emit connection state change
    this.emitConnectionStateChange();

    console.log("🔌 Socket disconnected:", reason);
  }

  private handleError(error: Error): void {
    console.error("Socket connection error:", error);

    this.connectionState = {
      ...this.connectionState,
      isConnecting: false,
      error: error.message,
    };

    // Show user-friendly error message
    if (!this.connectionState.isReconnecting) {
      toast.error("Connection failed. Retrying...");
    }
  }

  private handleReconnect(attemptNumber: number): void {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);

    this.connectionState = {
      ...this.connectionState,
      isReconnecting: false,
      reconnectAttempts: 0,
    };

    toast.success("Connection restored");
  }

  private handleReconnectAttempt(attemptNumber: number): void {
    console.log(`🔄 Socket reconnect attempt ${attemptNumber}`);

    this.connectionState = {
      ...this.connectionState,
      reconnectAttempts: attemptNumber,
    };
  }

  private handleReconnectError(error: Error): void {
    console.error("Socket reconnection failed:", error);

    if (
      this.connectionState.reconnectAttempts >=
      this.config.options.maxReconnectionAttempts
    ) {
      toast.error("Connection lost. Please refresh the page.");
      this.connectionState.isReconnecting = false;
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, this.config.options.timeout);

      this.socket?.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket?.once("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift()!;
      this.emit(event, data);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping", { timestamp: Date.now() });
      }
    }, TIME_CONFIG.intervals.heartbeat);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    const delay = Math.min(
      this.config.options.reconnectionDelay *
        Math.pow(2, this.connectionState.reconnectAttempts),
      this.config.options.reconnectionDelayMax
    );

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isManualDisconnect && !this.socket?.connected) {
        console.log("🔄 Attempting socket reconnection...");
        this.socket?.connect();
      }
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }

  private emitConnectionStateChange(): void {
    // This will be integrated with Redux store
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("socket:connection-state-change", {
          detail: this.connectionState,
        })
      );
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
export const socketClient = new SocketClient();

// Export default instance
export default socketClient;

// High-level API for common operations
export const socket = {
  // Connection management
  connect: socketClient.connect.bind(socketClient),
  disconnect: socketClient.disconnect.bind(socketClient),
  isConnected: socketClient.isConnected.bind(socketClient),
  getConnectionState: socketClient.getConnectionState.bind(socketClient),
  getSocketId: socketClient.getSocketId.bind(socketClient),

  // Event management
  on: socketClient.on.bind(socketClient),
  once: socketClient.once.bind(socketClient),
  off: socketClient.off.bind(socketClient),
  emit: socketClient.emit.bind(socketClient),

  // Meeting operations
  joinRoom: socketClient.joinRoom.bind(socketClient),
  leaveRoom: socketClient.leaveRoom.bind(socketClient),
  sendChatMessage: socketClient.sendChatMessage.bind(socketClient),
  updateMediaState: socketClient.updateMediaState.bind(socketClient),
  updateConnectionQuality:
    socketClient.updateConnectionQuality.bind(socketClient),

  // WebRTC signaling
  sendWebRTCSignal: socketClient.sendWebRTCSignal.bind(socketClient),
};

// Utility functions for socket management
export const socketUtils = {
  /**
   * Wait for socket to be connected
   */
  waitForConnection: async (timeout = 5000): Promise<void> => {
    if (socketClient.isConnected()) return;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Socket connection timeout"));
      }, timeout);

      const unsubscribe = socketClient.on("connect", () => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      });
    });
  },

  /**
   * Emit event and wait for response
   */
  emitWithAck: async <T = any>(
    event: string,
    data: any,
    timeout = 10000
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket acknowledgment timeout for ${event}`));
      }, timeout);

      const responseEvent = `${event}:response`;
      const unsubscribe = socketClient.once(responseEvent, (response: T) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      socketClient.emit(event, { ...data, expectResponse: true });
    });
  },

  /**
   * Check if event has listeners
   */
  hasListeners: (event: string): boolean => {
    return socketClient["eventHandlers"].has(event);
  },

  /**
   * Get connection statistics
   */
  getConnectionStats: () => {
    const state = socketClient.getConnectionState();
    return {
      ...state,
      socketId: socketClient.getSocketId(),
      uptime: state.lastConnected
        ? Date.now() - state.lastConnected.getTime()
        : 0,
      downtime: state.lastDisconnected
        ? Date.now() - state.lastDisconnected.getTime()
        : 0,
    };
  },

  /**
   * Create event logger for debugging
   */
  createEventLogger: (events: string[] = []) => {
    const loggers = events.map((event) =>
      socketClient.on(event, (data) => {
        console.log(`🎯 Socket Event [${event}]:`, data);
      })
    );

    return () => {
      loggers.forEach((unsubscribe) => unsubscribe());
    };
  },
};

// Export event constants for type safety
export { WS_EVENTS } from "@/utils/constants";
