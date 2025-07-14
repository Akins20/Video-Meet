/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { useAuth } from "./useAuth";
import { useAuthState } from "@/store/hooks";
import { WS_EVENTS, ENV_CONFIG, TIME_CONFIG } from "@/utils/constants";

// Socket connection states
type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "disabled"
  | "reconnecting";

// WebSocket event handler types
type EventHandler<T = any> = (data: T) => void;
type EventMap = Record<string, EventHandler>;

// Socket hook return interface
interface UseSocketReturn {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  reconnectAttempts: number;

  // Core methods
  connect: () => void;
  disconnect: () => void;
  emit: <T = any>(event: string, data?: T) => void;

  // Event management
  on: <T = any>(event: string, handler: EventHandler<T>) => () => void;
  off: (event: string, handler?: EventHandler) => void;
  once: <T = any>(event: string, handler: EventHandler<T>) => void;

  // Utility methods
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: any) => void;

  // Connection health
  ping: () => Promise<number>;
  getConnectionQuality: () => "poor" | "fair" | "good" | "excellent";

  // Control methods
  enableSocket: () => void;
  disableSocket: () => void;
  resetConnection: () => void;
}

// Hook configuration options
interface SocketOptions {
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  namespace?: string;
}

// FIXED: Simplified and robust useSocket hook
export const useSocket = (options: SocketOptions = {}): UseSocketReturn => {
  const { user, isAuthenticated } = useAuth();
  const { accessToken } = useAuthState();

  // Configuration with safe defaults
  const config = {
    autoConnect: options.autoConnect !== false, // Default true
    maxReconnectAttempts: options.maxReconnectAttempts || 5,
    reconnectDelay: options.reconnectDelay || 2000,
    namespace: options.namespace || "",
  };

  // State management
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isSocketEnabled, setIsSocketEnabled] = useState(true);
  const [lastPingTime, setLastPingTime] = useState(0);

  // Refs to prevent stale closures and race conditions
  const socketRef = useRef<Socket | null>(null);
  const eventHandlersRef = useRef<EventMap>({});
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  // Computed state
  const isConnected =
    connectionStatus === "connected" && socketRef.current?.connected === true;

  /**
   * Enhanced logging with connection context
   */
  const log = useCallback(
    (action: string, data?: any) => {
      if (ENV_CONFIG.isDevelopment) {
        console.log(`🔌 Socket [${action}]:`, {
          status: connectionStatus,
          attempts: reconnectAttempts,
          isConnecting: isConnectingRef.current,
          isEnabled: isSocketEnabled,
          isAuthenticated,
          socketId: socketRef.current?.id,
          ...data,
        });
      }
    },
    [connectionStatus, reconnectAttempts, isSocketEnabled, isAuthenticated]
  );

  /**
   * Get WebSocket URL with proper fallback
   */
  const getSocketUrl = useCallback(() => {
    // Use the URL from your constants - this should be consistent
    return "http://localhost:5000" + config.namespace;
  }, [config.namespace]);

  /**
   * Clear reconnect timeout
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Start heartbeat monitoring
   */
  const startHeartbeat = useCallback(() => {
    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const startTime = Date.now();
        socketRef.current.emit("ping", startTime);

        // Set timeout for pong response
        const pongTimeout = setTimeout(() => {
          log("HEARTBEAT_TIMEOUT", { lastPing: startTime });
          // Don't disconnect immediately, just log the issue
        }, 5000);

        // Clear timeout when pong is received
        socketRef.current.once("pong", (timestamp) => {
          clearTimeout(pongTimeout);
          const pingTime = Date.now() - timestamp;
          setLastPingTime(pingTime);
          log("HEARTBEAT_SUCCESS", { pingTime });
        });
      }
    }, 30000); // Ping every 30 seconds
  }, [log]);

  /**
   * Stop heartbeat monitoring
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Create socket instance with proper configuration
   */
  const createSocket = useCallback(
    (url: string, auth: any) => {
      log("CREATE_SOCKET", { url });

      return io(url, {
        auth,
        // FIXED: Optimal transport configuration
        transports: ["websocket", "polling"], // Keep both for reliability
        upgrade: true, // Allow upgrading from polling to websocket
        rememberUpgrade: true, // Remember successful upgrades

        // Connection timeouts (aligned with server)
        timeout: 10000, // Connection timeout (10s)

        // Reconnection handling (we handle this manually)
        reconnection: false, // Disable auto-reconnection
        autoConnect: false, // Don't auto-connect
        forceNew: true, // Force new connection

        // Performance settings
        // compression: true, // Enable compression

        // Additional stability options
        closeOnBeforeunload: false, // Don't close on page unload automatically
      });
    },
    [log]
  );

  /**
   * Initialize socket connection - SIMPLIFIED AND ROBUST
   */
  const initializeConnection = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || !mountedRef.current) {
      log("INIT_SKIPPED", { reason: "already_connecting_or_unmounted" });
      return;
    }

    // Check prerequisites
    if (!isAuthenticated || !user || !accessToken) {
      log("INIT_SKIPPED", { reason: "not_authenticated" });
      setConnectionStatus("disconnected");
      return;
    }

    if (!isSocketEnabled) {
      log("INIT_SKIPPED", { reason: "socket_disabled" });
      setConnectionStatus("disabled");
      return;
    }

    // Increment attempt counter
    connectionAttemptRef.current += 1;

    // Check max attempts
    if (connectionAttemptRef.current > config.maxReconnectAttempts) {
      log("MAX_ATTEMPTS_REACHED");
      setConnectionStatus("error");
      setConnectionError("Max reconnection attempts reached");
      setIsSocketEnabled(false);
      return;
    }

    log("INIT_START", { attempt: connectionAttemptRef.current });

    isConnectingRef.current = true;
    setConnectionStatus(
      connectionAttemptRef.current === 1 ? "connecting" : "reconnecting"
    );
    setConnectionError(null);

    try {
      // Clean up existing socket
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Create new socket
      const socketUrl = getSocketUrl();
      const socket = createSocket(socketUrl, {
        token: accessToken,
        userId: user.id,
      });

      socketRef.current = socket;

      // Set up event listeners BEFORE connecting
      setupSocketEventListeners(socket);

      // Connect the socket
      socket.connect();

      // Wait for connection with timeout
      await waitForConnection(socket);

      log("INIT_SUCCESS");

      // Reset attempt counter on successful connection
      connectionAttemptRef.current = 0;
      setReconnectAttempts(0);
      setConnectionStatus("connected");
      setConnectionError(null);

      // Start heartbeat monitoring
      startHeartbeat();

      // Re-register custom event handlers
      Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
        socket.on(event, handler);
      });

      // Show success message only on initial connection or after errors
      if (reconnectAttempts > 0) {
        toast.success("Connection restored");
      }
    } catch (error: any) {
      log("INIT_ERROR", { error: error.message });

      setConnectionStatus("error");
      setConnectionError(error.message);

      // Schedule reconnection if enabled and not at max attempts
      if (
        isSocketEnabled &&
        connectionAttemptRef.current < config.maxReconnectAttempts
      ) {
        scheduleReconnection();
      } else {
        log("GIVING_UP");
        setIsSocketEnabled(false);
        if (connectionAttemptRef.current >= config.maxReconnectAttempts) {
          toast.error("Unable to connect to server. Please refresh the page.");
        }
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [
    isAuthenticated,
    user,
    accessToken,
    isSocketEnabled,
    config.maxReconnectAttempts,
    getSocketUrl,
    createSocket,
    startHeartbeat,
    reconnectAttempts,
    log,
  ]);

  /**
   * Set up socket event listeners
   */
  const setupSocketEventListeners = useCallback(
    (socket: Socket) => {
      // Connection events
      socket.on("connect", () => {
        log("CONNECTED", { socketId: socket.id });
        // Status will be set in initializeConnection after this resolves
      });

      socket.on("disconnect", (reason) => {
        log("DISCONNECTED", { reason });

        setConnectionStatus("disconnected");
        stopHeartbeat();

        // Only attempt reconnection for certain disconnect reasons
        if (
          reason !== "io server disconnect" &&
          reason !== "io client disconnect" &&
          isSocketEnabled &&
          mountedRef.current
        ) {
          scheduleReconnection();
        }
      });

      socket.on("connect_error", (error) => {
        log("CONNECT_ERROR", { error: error.message });
        // Error handling is done in initializeConnection
      });

      // Server-sent events
      socket.on("error-notification", (data) => {
        log("SERVER_ERROR", data);
        toast.error(data.message || "Server error occurred");
      });

      socket.on("system-notification", (data) => {
        log("SYSTEM_NOTIFICATION", data);
        if (data.type === "warning" || data.type === "error") {
          toast(data.message, {
            icon: data.type === "warning" ? "⚠️" : "❌",
          });
        }
      });

      socket.on("server-shutdown", (data) => {
        log("SERVER_SHUTDOWN", data);
        toast.error("Server is shutting down");
        setConnectionStatus("disconnected");
        setIsSocketEnabled(false); // Disable auto-reconnection
      });

      // Quality monitoring
      socket.on("quality-response", (timestamp) => {
        const pingTime = Date.now() - timestamp;
        setLastPingTime(pingTime);
      });
    },
    [log, stopHeartbeat, isSocketEnabled]
  );

  /**
   * Wait for socket connection with timeout
   */
  const waitForConnection = useCallback((socket: Socket): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000); // 10 second timeout

      const onConnect = () => {
        clearTimeout(timeout);
        socket.off("connect_error", onError);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        socket.off("connect", onConnect);
        reject(error);
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
    });
  }, []);

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnection = useCallback(() => {
    clearReconnectTimeout();

    const delay =
      config.reconnectDelay * Math.pow(2, Math.min(reconnectAttempts, 5));

    log("SCHEDULE_RECONNECT", { delay, attempts: reconnectAttempts });

    setReconnectAttempts((prev) => prev + 1);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && isSocketEnabled) {
        initializeConnection();
      }
    }, delay);
  }, [
    config.reconnectDelay,
    reconnectAttempts,
    clearReconnectTimeout,
    initializeConnection,
    isSocketEnabled,
    log,
  ]);

  /**
   * Connect to socket server
   */
  const connect = useCallback(() => {
    log("CONNECT_REQUESTED");

    if (!isSocketEnabled) {
      setIsSocketEnabled(true);
    }

    setReconnectAttempts(0);
    connectionAttemptRef.current = 0;

    initializeConnection();
  }, [isSocketEnabled, initializeConnection, log]);

  /**
   * Disconnect from socket server
   */
  const disconnect = useCallback(() => {
    log("DISCONNECT_REQUESTED");

    clearReconnectTimeout();
    stopHeartbeat();
    isConnectingRef.current = false;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus("disconnected");
    setConnectionError(null);
    setReconnectAttempts(0);
    connectionAttemptRef.current = 0;
    eventHandlersRef.current = {};
  }, [clearReconnectTimeout, stopHeartbeat, log]);

  /**
   * Enable socket connections
   */
  const enableSocket = useCallback(() => {
    log("ENABLE_SOCKET");
    setIsSocketEnabled(true);
    setConnectionError(null);
    setReconnectAttempts(0);
    connectionAttemptRef.current = 0;

    if (isAuthenticated && user) {
      initializeConnection();
    }
  }, [isAuthenticated, user, initializeConnection, log]);

  /**
   * Disable socket connections
   */
  const disableSocket = useCallback(() => {
    log("DISABLE_SOCKET");
    setIsSocketEnabled(false);
    disconnect();
    setConnectionStatus("disabled");
  }, [disconnect, log]);

  /**
   * Reset connection state
   */
  const resetConnection = useCallback(() => {
    log("RESET_CONNECTION");
    disconnect();
    setReconnectAttempts(0);
    setConnectionError(null);
    connectionAttemptRef.current = 0;

    if (isSocketEnabled && isAuthenticated && user) {
      setTimeout(() => initializeConnection(), 1000);
    }
  }, [
    disconnect,
    initializeConnection,
    isSocketEnabled,
    isAuthenticated,
    user,
    log,
  ]);

  /**
   * Emit event to server
   */
  const emit = useCallback(
    <T = any>(event: string, data?: T) => {
      if (!socketRef.current?.connected) {
        log("EMIT_FAILED", { event, reason: "not_connected" });
        return;
      }

      try {
        socketRef.current.emit(event, data);
        log("EMIT_SUCCESS", { event });
      } catch (error: any) {
        log("EMIT_ERROR", { event, error: error.message });
      }
    },
    [log]
  );

  /**
   * Listen for events from server
   */
  const on = useCallback(<T = any>(event: string, handler: EventHandler<T>) => {
    eventHandlersRef.current[event] = handler;

    if (socketRef.current?.connected) {
      socketRef.current.on(event, handler);
    }

    return () => {
      delete eventHandlersRef.current[event];
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  /**
   * Remove event listeners
   */
  const off = useCallback((event: string, handler?: EventHandler) => {
    if (handler) {
      delete eventHandlersRef.current[event];
    }
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  /**
   * Listen for event once
   */
  const once = useCallback(
    <T = any>(event: string, handler: EventHandler<T>) => {
      if (!socketRef.current?.connected) {
        log("ONCE_FAILED", { event, reason: "not_connected" });
        return;
      }
      socketRef.current.once(event, handler);
    },
    [log]
  );

  /**
   * Join a room
   */
  const joinRoom = useCallback(
    (roomId: string) => {
      log("JOIN_ROOM", { roomId });
      emit(WS_EVENTS.JOIN_MEETING, { roomId });
    },
    [emit, log]
  );

  /**
   * Leave a room
   */
  const leaveRoom = useCallback(
    (roomId: string) => {
      log("LEAVE_ROOM", { roomId });
      emit(WS_EVENTS.LEAVE_MEETING, { roomId });
    },
    [emit, log]
  );

  /**
   * Send message to room
   */
  const sendMessage = useCallback(
    (roomId: string, message: any) => {
      log("SEND_MESSAGE", { roomId });
      emit(WS_EVENTS.CHAT_MESSAGE, { roomId, message });
    },
    [emit, log]
  );

  /**
   * Ping server
   */
  const ping = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const startTime = Date.now();

      socketRef.current.emit("quality-check");

      const timeout = setTimeout(() => {
        reject(new Error("Ping timeout"));
      }, 5000);

      socketRef.current.once("quality-response", (timestamp) => {
        clearTimeout(timeout);
        const pingTime = Date.now() - timestamp;
        resolve(pingTime);
      });
    });
  }, []);

  /**
   * Get connection quality
   */
  const getConnectionQuality = useCallback(():
    | "poor"
    | "fair"
    | "good"
    | "excellent" => {
    if (!isConnected) return "poor";
    if (lastPingTime === 0) return "good"; // Default until first ping
    if (lastPingTime < 50) return "excellent";
    if (lastPingTime < 150) return "good";
    if (lastPingTime < 300) return "fair";
    return "poor";
  }, [isConnected, lastPingTime]);

  // FIXED: Auto-connect effect - SAFE and prevents loops
  useEffect(() => {
    log("AUTO_CONNECT_CHECK", {
      shouldTryConnect:
        config.autoConnect && isAuthenticated && isSocketEnabled,
    });

    // Only auto-connect once when conditions are met
    if (
      config.autoConnect &&
      isAuthenticated &&
      isSocketEnabled &&
      connectionStatus === "disconnected"
    ) {
      log("AUTO_CONNECT_TRIGGERING");
      // Small delay to ensure all auth state is settled
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          initializeConnection();
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [config.autoConnect, isAuthenticated, isSocketEnabled]); // Minimal dependencies

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      log("CLEANUP_ON_UNMOUNT");
      mountedRef.current = false;
      clearReconnectTimeout();
      stopHeartbeat();
      disconnect();
    };
  }, []); // Empty dependency array

  return {
    // Connection state
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    connectionError,
    reconnectAttempts,

    // Core methods
    connect,
    disconnect,
    emit,

    // Event management
    on,
    off,
    once,

    // Utility methods
    joinRoom,
    leaveRoom,
    sendMessage,

    // Connection health
    ping,
    getConnectionQuality,

    // Control methods
    enableSocket,
    disableSocket,
    resetConnection,
  };
};

export default useSocket;
