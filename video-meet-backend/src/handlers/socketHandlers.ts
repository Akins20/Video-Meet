// handlers/socketHandlers.ts
import { Server as SocketIOServer, Socket } from "socket.io";
import { WS_EVENTS } from "../constants/events";

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userName: string;
  currentMeetingId?: string;
  participantId?: string;
}

export class SocketHandlers {
  // Participant to socket mapping for WebRTC signaling
  private participantSocketMap: Map<string, string> = new Map();
  
  constructor(private io: SocketIOServer) {}

  /**
   * Set up authentication middleware
   */
  setupAuthMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const AuthService = (await import("../services/AuthService")).default;
        const decoded = await AuthService.verifyAccessToken(token);

        if (!decoded) {
          return next(new Error("Invalid authentication token"));
        }

        // Attach user info to socket
        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).userEmail = decoded.email;
        (socket as AuthenticatedSocket).userName =
          decoded.username || decoded.email;

        console.log(`🔌 User ${decoded.email} authenticated for Socket.IO`);
        next();
      } catch (error) {
        console.error("Socket.IO authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  /**
   * Handle new socket connections
   */
  handleConnection(socket: AuthenticatedSocket) {
    const { userId, userEmail, userName } = socket;

    console.log(
      `✅ Socket.IO connection established for user: ${userEmail} (${socket.id})`
    );

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Set up all event handlers
    this.setupConnectionHandlers(socket);
    this.setupMeetingHandlers(socket);
    this.setupChatHandlers(socket);
    this.setupMediaHandlers(socket);
    this.setupWebRTCHandlers(socket);
    this.setupUtilityHandlers(socket);
    this.setupDisconnectHandler(socket);
  }

  /**
   * Connection and heartbeat handlers
   */
  private setupConnectionHandlers(socket: AuthenticatedSocket) {
    // Handle quality check (frontend expects this exact event)
    socket.on(WS_EVENTS.QUALITY_CHECK, (timestamp) => {
      socket.emit(WS_EVENTS.QUALITY_RESPONSE, timestamp);
    });

    // Handle ping/pong for connection monitoring
    socket.on(WS_EVENTS.PING, (timestamp) => {
      socket.emit(WS_EVENTS.PONG, timestamp);
    });

    // Set up heartbeat monitoring
    this.setupHeartbeat(socket);
  }

  /**
   * Meeting-related event handlers
   */
  private setupMeetingHandlers(socket: AuthenticatedSocket) {
    const { userId, userEmail, userName } = socket;

    socket.on(WS_EVENTS.JOIN_MEETING, async (data) => {
      try {
        const { meetingId, roomId, participantId } = data;
        const actualRoomId = roomId || meetingId;

        console.log(`👥 Join meeting request:`, {
          user: userEmail,
          meetingId: actualRoomId,
          participantId,
        });

        // Validate meeting exists
        const meetingExists = await this.validateMeeting(actualRoomId);
        if (!meetingExists) {
          socket.emit(WS_EVENTS.JOIN_MEETING_ERROR, {
            message: "Meeting not found",
            code: "MEETING_NOT_FOUND",
          });
          return;
        }

        // Join meeting room
        socket.join(`meeting:${actualRoomId}`);
        socket.currentMeetingId = actualRoomId;
        const finalParticipantId = participantId || userId;
        socket.participantId = finalParticipantId;
        
        // Add participant to socket mapping for WebRTC signaling
        this.participantSocketMap.set(finalParticipantId, socket.id);

        // Create participant object
        const participant = {
          id: participantId || userId,
          socketId: socket.id,
          displayName: userName,
          email: userEmail,
          joinedAt: new Date().toISOString(),
          mediaState: {
            audioEnabled: true,
            videoEnabled: true,
            screenSharing: false,
          },
        };

        // Get existing participants in the meeting (excluding current user)
        const existingParticipants = await this.getExistingParticipants(actualRoomId, socket.id);
        
        // Notify other participants about the new participant
        socket
          .to(`meeting:${actualRoomId}`)
          .emit(WS_EVENTS.PARTICIPANT_JOINED, {
            participant,
            meetingId: actualRoomId,
          });

        // Confirm successful join and send existing participants
        socket.emit(WS_EVENTS.JOIN_MEETING_SUCCESS, {
          meetingId: actualRoomId,
          participant,
          existingParticipants,
        });

        console.log(`👥 User ${userEmail} joined meeting ${actualRoomId}`);
      } catch (error) {
        console.error("Join meeting error:", error);
        socket.emit(WS_EVENTS.JOIN_MEETING_ERROR, {
          message: "Failed to join meeting",
          code: "JOIN_FAILED",
        });
      }
    });

    socket.on(WS_EVENTS.LEAVE_MEETING, async (data) => {
      try {
        const { meetingId, participantId } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = participantId || socket.participantId;

        if (actualMeetingId) {
          socket.leave(`meeting:${actualMeetingId}`);
          
          // Remove participant from socket mapping
          if (actualParticipantId) {
            this.participantSocketMap.delete(actualParticipantId);
          }

          // Notify other participants
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.PARTICIPANT_LEFT, {
              participantId: actualParticipantId,
              userId,
              timestamp: new Date().toISOString(),
            });

          // Clear meeting info from socket
          socket.currentMeetingId = undefined;
          socket.participantId = undefined;
          
          // Confirm successful leave
          socket.emit(WS_EVENTS.LEAVE_MEETING_SUCCESS, {
            meetingId: actualMeetingId,
          });

          console.log(`👋 User ${userEmail} left meeting ${actualMeetingId}`);
        }
      } catch (error) {
        console.error("Leave meeting error:", error);
        socket.emit(WS_EVENTS.LEAVE_MEETING_ERROR, {
          message: "Failed to leave meeting",
          code: "LEAVE_FAILED",
        });
      }
    });
  }

  /**
   * Chat event handlers - FIXED
   */
  private setupChatHandlers(socket: AuthenticatedSocket) {
    const { userId, userEmail, userName } = socket;

    socket.on(WS_EVENTS.CHAT_MESSAGE, async (data) => {
      try {
        console.log(`💬 Received chat message from ${userEmail}:`, data);

        const { meetingId, content, type = "text", replyTo } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;

        if (!actualMeetingId) {
          console.error("No meeting ID provided for chat message");
          socket.emit(WS_EVENTS.CHAT_ERROR, {
            message: "No active meeting found",
            code: "NO_MEETING",
          });
          return;
        }

        if (!content || !content.trim()) {
          socket.emit(WS_EVENTS.CHAT_ERROR, {
            message: "Message content cannot be empty",
            code: "EMPTY_MESSAGE",
          });
          return;
        }

        const message = {
          id:
            data.id ||
            `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          meetingId: actualMeetingId,
          senderId: userId,
          senderName: userName,
          senderEmail: userEmail,
          senderRole: "participant",
          content: content.trim(),
          type,
          replyTo,
          timestamp: new Date().toISOString(),
          deliveryStatus: "delivered",
          readBy: [],
          isEdited: false,
          isDeleted: false,
        };

        console.log(`💬 Broadcasting message to meeting:${actualMeetingId}:`, {
          messageId: message.id,
          content: message.content,
          sender: userName,
        });

        // Broadcast to ALL participants in the meeting (including sender)
        this.io
          .to(`meeting:${actualMeetingId}`)
          .emit(WS_EVENTS.CHAT_MESSAGE, message);

        console.log(
          `💬 Chat message broadcasted in meeting ${actualMeetingId} from ${userEmail}`
        );
      } catch (error) {
        console.error("Chat message error:", error);
        socket.emit(WS_EVENTS.CHAT_ERROR, {
          message: "Failed to send message",
          code: "MESSAGE_FAILED",
        });
      }
    });

    // Typing indicators
    socket.on(WS_EVENTS.TYPING_START, (data) => {
      const { meetingId } = data;
      const actualMeetingId = meetingId || socket.currentMeetingId;

      if (actualMeetingId) {
        socket.to(`meeting:${actualMeetingId}`).emit(WS_EVENTS.TYPING_START, {
          userId,
          name: userName,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on(WS_EVENTS.TYPING_STOP, (data) => {
      const { meetingId } = data;
      const actualMeetingId = meetingId || socket.currentMeetingId;

      if (actualMeetingId) {
        socket.to(`meeting:${actualMeetingId}`).emit(WS_EVENTS.TYPING_STOP, {
          userId,
          name: userName,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  /**
   * Media-related event handlers
   */
  private setupMediaHandlers(socket: AuthenticatedSocket) {
    const { userId, userEmail } = socket;

    // Media State Changes
    socket.on(WS_EVENTS.MEDIA_STATE_CHANGE, (data) => {
      try {
        const { meetingId, participantId, mediaState } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = participantId || socket.participantId;

        if (actualMeetingId) {
          // Broadcast to other participants in the meeting
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.MEDIA_STATE_CHANGE, {
              participantId: actualParticipantId,
              mediaState,
              timestamp: new Date().toISOString(),
            });

          console.log(
            `🎥 Media state change in meeting ${actualMeetingId} from ${userEmail}`
          );
        }
      } catch (error) {
        console.error("Media state change error:", error);
        socket.emit(WS_EVENTS.MEDIA_ERROR, {
          message: "Failed to update media state",
          code: "MEDIA_UPDATE_FAILED",
        });
      }
    });

    // Screen Share Events
    socket.on(WS_EVENTS.SCREEN_SHARE_START, (data) => {
      try {
        const { meetingId, participantId } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = participantId || socket.participantId;

        if (actualMeetingId) {
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.SCREEN_SHARE_START, {
              participantId: actualParticipantId,
              timestamp: new Date().toISOString(),
            });

          console.log(
            `🖥️ Screen share started in meeting ${actualMeetingId} by ${userEmail}`
          );
        }
      } catch (error) {
        console.error("Screen share start error:", error);
      }
    });

    socket.on(WS_EVENTS.SCREEN_SHARE_STOP, (data) => {
      try {
        const { meetingId, participantId } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = participantId || socket.participantId;

        if (actualMeetingId) {
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.SCREEN_SHARE_STOP, {
              participantId: actualParticipantId,
              timestamp: new Date().toISOString(),
            });

          console.log(
            `🖥️ Screen share stopped in meeting ${actualMeetingId} by ${userEmail}`
          );
        }
      } catch (error) {
        console.error("Screen share stop error:", error);
      }
    });

    // Recording Events
    socket.on(WS_EVENTS.RECORDING_START, (data) => {
      try {
        const { meetingId, participantId } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = participantId || socket.participantId;

        if (actualMeetingId) {
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.RECORDING_STARTED, {
              participantId: actualParticipantId,
              timestamp: new Date().toISOString(),
            });

          console.log(
            `🎬 Recording started in meeting ${actualMeetingId} by ${userEmail}`
          );
        }
      } catch (error) {
        console.error("Recording start error:", error);
      }
    });

    socket.on(WS_EVENTS.RECORDING_STOP, (data) => {
      try {
        const { meetingId, participantId } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = participantId || socket.participantId;

        if (actualMeetingId) {
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.RECORDING_STOPPED, {
              participantId: actualParticipantId,
              timestamp: new Date().toISOString(),
            });

          console.log(
            `🎬 Recording stopped in meeting ${actualMeetingId} by ${userEmail}`
          );
        }
      } catch (error) {
        console.error("Recording stop error:", error);
      }
    });
  }

  /**
   * WebRTC signaling handlers
   */
  private setupWebRTCHandlers(socket: AuthenticatedSocket) {
    socket.on(WS_EVENTS.WEBRTC_SIGNAL, (data) => {
      try {
        const { to, signal, type, from } = data;
        
        // Get target socket ID from participant mapping
        const targetSocketId = this.participantSocketMap.get(to);
        
        if (!targetSocketId) {
          console.error(`❌ Target participant ${to} not found in mapping`);
          socket.emit(WS_EVENTS.WEBRTC_ERROR, {
            message: "Target participant not found",
            code: "PARTICIPANT_NOT_FOUND",
          });
          return;
        }

        // Forward signal to target participant
        socket.to(targetSocketId).emit(WS_EVENTS.WEBRTC_SIGNAL, {
          from: from || socket.participantId || socket.id,
          signal,
          type,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `📡 WebRTC ${type} signal from ${socket.participantId || socket.id} to ${to} (socket: ${targetSocketId})`
        );
      } catch (error) {
        console.error("WebRTC signaling error:", error);
        socket.emit(WS_EVENTS.WEBRTC_ERROR, {
          message: "Signaling failed",
          code: "SIGNALING_FAILED",
        });
      }
    });
  }

  /**
   * Get existing participants in a meeting (excluding current socket)
   */
  private async getExistingParticipants(meetingId: string, excludeSocketId?: string): Promise<any[]> {
    try {
      const sockets = await this.io.in(`meeting:${meetingId}`).fetchSockets();
      
      return sockets
        .filter(socket => socket.id !== excludeSocketId)
        .map(socket => {
          const authSocket = socket as any; // Type assertion to access custom properties
          return {
            id: authSocket.participantId || socket.id,
            socketId: socket.id,
            displayName: authSocket.userName || 'Unknown',
            email: authSocket.userEmail,
            joinedAt: new Date().toISOString(),
            mediaState: {
              audioEnabled: true,
              videoEnabled: true,
              screenSharing: false,
            },
          };
        });
    } catch (error) {
      console.error('Error getting existing participants:', error);
      return [];
    }
  }

  /**
   * Utility event handlers
   */
  private setupUtilityHandlers(socket: AuthenticatedSocket) {
    const { userId } = socket;

    // Connection Quality Updates
    socket.on(WS_EVENTS.CONNECTION_QUALITY, (data) => {
      try {
        const { meetingId, quality } = data;
        const actualMeetingId = meetingId || socket.currentMeetingId;
        const actualParticipantId = socket.participantId;

        if (actualMeetingId) {
          socket
            .to(`meeting:${actualMeetingId}`)
            .emit(WS_EVENTS.CONNECTION_QUALITY, {
              participantId: actualParticipantId,
              quality,
              timestamp: new Date().toISOString(),
            });
        }
      } catch (error) {
        console.error("Connection quality error:", error);
      }
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`❌ Socket error for user ${socket.userEmail}:`, error);
      socket.emit(WS_EVENTS.ERROR_NOTIFICATION, {
        message: "A connection error occurred",
        code: "SOCKET_ERROR",
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle socket disconnection
   */
  private setupDisconnectHandler(socket: AuthenticatedSocket) {
    const { userId, userEmail } = socket;

    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 User ${userEmail} disconnected: ${reason} (${socket.id})`
      );

      const currentMeetingId = socket.currentMeetingId;
      const participantId = socket.participantId;
      
      // Remove participant from socket mapping
      if (participantId) {
        this.participantSocketMap.delete(participantId);
      }

      // Notify meeting participants
      if (currentMeetingId) {
        socket
          .to(`meeting:${currentMeetingId}`)
          .emit(WS_EVENTS.PARTICIPANT_LEFT, {
            participantId: participantId || userId,
            userId,
            reason,
            timestamp: new Date().toISOString(),
          });
      }

      // Broadcast user disconnection
      socket.broadcast.emit(WS_EVENTS.USER_DISCONNECTED, {
        userId,
        socketId: socket.id,
        reason,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Set up heartbeat monitoring for a socket
   */
  private setupHeartbeat(socket: AuthenticatedSocket): void {
    let heartbeatInterval: NodeJS.Timeout;

    const startHeartbeat = () => {
      heartbeatInterval = setInterval(() => {
        socket.emit(WS_EVENTS.PING, Date.now());
      }, 30000); // Ping every 30 seconds
    };

    socket.on(WS_EVENTS.PONG, (timestamp: number) => {
      const latency = Date.now() - timestamp;
      console.log(`💓 Heartbeat for ${socket.userEmail}: ${latency}ms`);
    });

    startHeartbeat();

    socket.on("disconnect", () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    });
  }

  /**
   * Validate meeting exists
   */
  private async validateMeeting(meetingId: string): Promise<boolean> {
    try {
      // TODO: Add actual database validation
      console.log(`🔍 Validating meeting: ${meetingId}`);
      return true; // For now, assume all meetings are valid
    } catch (error) {
      console.error("Meeting validation error:", error);
      return false;
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const rooms = this.io.sockets.adapter.rooms;
    const sockets = this.io.sockets.sockets;

    let meetingRooms = 0;
    let totalParticipants = 0;

    for (const [roomName, roomSet] of rooms) {
      if (roomName.startsWith("meeting:")) {
        meetingRooms++;
        totalParticipants += roomSet.size;
      }
    }

    return {
      connectedSockets: sockets.size,
      activeMeetings: meetingRooms,
      totalParticipants,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Broadcast system message to all clients
   */
  broadcastSystemMessage(
    message: string,
    type: "info" | "warning" | "error" = "info"
  ): void {
    this.io.emit(WS_EVENTS.SYSTEM_NOTIFICATION, {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
    console.log(`📢 System broadcast (${type}): ${message}`);
  }
}
