/**
 * WebSocket Events - Must match frontend constants exactly
 * These constants ensure consistency between frontend and backend
 */
export const WS_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  ERROR: "error",

  // Custom events
  PING: "ping",
  PONG: "pong",
  QUALITY_CHECK: "quality-check",
  QUALITY_RESPONSE: "quality-response",

  // System events
  SYSTEM_NOTIFICATION: "system-notification",
  ERROR_NOTIFICATION: "error-notification",
  SERVER_SHUTDOWN: "server-shutdown",

  // Meeting events
  JOIN_MEETING: "join-meeting",
  LEAVE_MEETING: "leave-meeting",
  JOIN_MEETING_SUCCESS: "join-meeting-success",
  JOIN_MEETING_ERROR: "join-meeting-error",
  LEAVE_MEETING_SUCCESS: "leave-meeting-success",
  LEAVE_MEETING_ERROR: "leave-meeting-error",
  MEETING_ENDED: "meeting-ended",

  // Participant events
  PARTICIPANT_JOINED: "participant-joined",
  PARTICIPANT_LEFT: "participant-left",
  USER_DISCONNECTED: "user-disconnected",

  // WebRTC events
  WEBRTC_SIGNAL: "webrtc-signal",
  WEBRTC_ERROR: "webrtc-error",

  // Media events
  MEDIA_STATE_CHANGE: "media-state-change",
  MEDIA_ERROR: "media-error",
  SCREEN_SHARE_START: "screen-share-start",
  SCREEN_SHARE_STOP: "screen-share-stop",

  // Chat events
  CHAT_MESSAGE: "chat-message",
  CHAT_ERROR: "chat-error",
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",

  // Recording events
  RECORDING_START: "recording-start",
  RECORDING_STOP: "recording-stop",
  RECORDING_STARTED: "recording-started",
  RECORDING_STOPPED: "recording-stopped",

  // Status events
  CONNECTION_QUALITY: "connection-quality",
  MEETING_STATUS: "meeting-status",
  PARTICIPANT_LIST: "participant-list",
} as const;

/**
 * Server Configuration Constants
 */
export const SERVER_CONFIG = {
  // Socket.IO Configuration
  SOCKET_IO: {
    PING_TIMEOUT: 60000, // 60s - matches frontend timeout expectations
    PING_INTERVAL: 25000, // 25s - matches frontend heartbeat
    UPGRADE_TIMEOUT: 10000, // 10s
    CONNECT_TIMEOUT: 45000, // 45s
    MAX_HTTP_BUFFER_SIZE: 1e6, // 1MB
    HEARTBEAT_INTERVAL: 30000, // 30s
  },

  // Request Timeouts
  REQUEST_TIMEOUT: 30000, // 30s
  SHUTDOWN_TIMEOUT: 10000, // 10s force shutdown timeout

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
} as const;

/**
 * Error Codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_FAILED: "AUTH_FAILED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",

  // Meeting
  MEETING_NOT_FOUND: "MEETING_NOT_FOUND",
  JOIN_FAILED: "JOIN_FAILED",
  LEAVE_FAILED: "LEAVE_FAILED",
  NO_MEETING: "NO_MEETING",

  // Chat
  EMPTY_MESSAGE: "EMPTY_MESSAGE",
  MESSAGE_FAILED: "MESSAGE_FAILED",

  // Media
  MEDIA_UPDATE_FAILED: "MEDIA_UPDATE_FAILED",
  SIGNALING_FAILED: "SIGNALING_FAILED",

  // System
  SOCKET_ERROR: "SOCKET_ERROR",
  SERVER_SHUTTING_DOWN: "SERVER_SHUTTING_DOWN",
} as const;
