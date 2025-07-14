/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../useAuth";
import { useSocket } from "../useSocket";
import { WEBSOCKET_CONFIG } from "@/utils/constants";
import type { ChatMessage } from "@/types/meeting";

const WS_EVENTS = WEBSOCKET_CONFIG.events;

// Simple chat interfaces
interface SendMessageOptions {
  content: string;
  type?: "text" | "system";
  meetingId: string;
  user: any;
}

interface UseMeetingChatReturn {
  // Chat state
  messages: ChatMessage[];
  unreadCount: number;
  isConnected: boolean;

  // Chat actions
  sendMessage: (
    options: SendMessageOptions
  ) => Promise<{ success: boolean; error?: string }>;
  markMessagesAsRead: () => void;
  clearChat: () => void;

  // Simple utilities
  getMessageById: (messageId: string) => ChatMessage | undefined;
  searchMessages: (query: string) => ChatMessage[];
}

/**
 * FINAL FIXED meeting chat hook - handles basic text messaging
 * This version ensures messages are properly received and stored
 */
export const useMeetingChat = (): UseMeetingChatReturn => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs for tracking
  const lastReadMessageTimeRef = useRef<Date>(new Date());
  const mountedRef = useRef(true);
  const setupRef = useRef(false);

  /**
   * Enhanced logging for chat
   */
  const logChatAction = useCallback(
    (action: string, data?: any) => {
      console.log(`💬 Chat [${action}]:`, {
        messageCount: messages.length,
        unreadCount,
        isConnected,
        socketId: socket?.id,
        mounted: mountedRef.current,
        ...data,
      });
    },
    [messages.length, unreadCount, isConnected, socket?.id]
  );

  /**
   * FIXED: Send a chat message with comprehensive error handling
   */
  const sendMessage = useCallback(
    async (
      options: SendMessageOptions
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        logChatAction("SEND_MESSAGE_ATTEMPT", {
          content: options.content,
          meetingId: options.meetingId,
          hasSocket: !!socket,
          isConnected,
          userId: user?.id,
        });

        // Enhanced validation
        if (!socket) {
          const error = "Socket not available";
          logChatAction("SEND_MESSAGE_ERROR", { error });
          return { success: false, error };
        }

        if (!isConnected) {
          const error = "Socket not connected";
          logChatAction("SEND_MESSAGE_ERROR", { error });
          return { success: false, error };
        }

        if (!options.content?.trim()) {
          const error = "Message content cannot be empty";
          logChatAction("SEND_MESSAGE_ERROR", { error });
          return { success: false, error };
        }

        if (!options.meetingId) {
          const error = "Meeting ID is required";
          logChatAction("SEND_MESSAGE_ERROR", { error });
          return { success: false, error };
        }

        if (!user?.id) {
          const error = "User not authenticated";
          logChatAction("SEND_MESSAGE_ERROR", { error });
          return { success: false, error };
        }

        // Create message data
        const messageData = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          meetingId: options.meetingId,
          content: options.content.trim(),
          type: options.type || "text",
          senderId: user.id,
          senderName:
            user.displayName ||
            `${user.firstName} ${user.lastName}` ||
            user.email ||
            "Unknown",
          senderEmail: user.email || "",
          senderRole: "participant",
          timestamp: new Date().toISOString(),
          isEdited: false,
          deliveryStatus: "sending" as const,
          readBy: [],
          isDeleted: false,
        };

        logChatAction("EMITTING_MESSAGE", {
          messageId: messageData.id,
          eventName: "chat-message",
          socketId: socket.id,
        });

        // Emit the message using the exact event name the backend expects
        socket.emit("chat-message", messageData);

        logChatAction("MESSAGE_EMITTED_SUCCESS", { messageId: messageData.id });
        return { success: true };
      } catch (error: any) {
        const errorMsg = error?.message || "Failed to send message";
        logChatAction("SEND_MESSAGE_ERROR", { error: errorMsg });
        return { success: false, error: errorMsg };
      }
    },
    [socket, isConnected, user, logChatAction]
  );

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(() => {
    setUnreadCount(0);
    lastReadMessageTimeRef.current = new Date();
    logChatAction("MESSAGES_READ");
  }, [logChatAction]);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
    lastReadMessageTimeRef.current = new Date();
    logChatAction("CHAT_CLEARED");
  }, [logChatAction]);

  /**
   * Get message by ID
   */
  const getMessageById = useCallback(
    (messageId: string): ChatMessage | undefined => {
      return messages.find((msg) => msg.id === messageId);
    },
    [messages]
  );

  /**
   * Search messages
   */
  const searchMessages = useCallback(
    (query: string): ChatMessage[] => {
      if (!query.trim()) return [];

      const lowerQuery = query.toLowerCase();
      return messages.filter(
        (msg) =>
          msg.content.toLowerCase().includes(lowerQuery) ||
          msg.senderName.toLowerCase().includes(lowerQuery)
      );
    },
    [messages]
  );

  /**
   * CRITICAL FIX: Set up socket event listeners with proper lifecycle management
   * This effect is the key to receiving messages properly
   */
  useEffect(() => {
    // Only set up once when we have a socket and connection
    if (!socket || !isConnected || setupRef.current) {
      logChatAction("SOCKET_SETUP_SKIPPED", {
        hasSocket: !!socket,
        isConnected,
        alreadySetup: setupRef.current,
      });
      return;
    }

    logChatAction("SETTING_UP_SOCKET_LISTENERS");
    setupRef.current = true;

    // Handle incoming chat messages - THIS IS THE CRITICAL HANDLER
    const handleChatMessage = (message: ChatMessage) => {
      logChatAction("MESSAGE_RECEIVED_RAW", {
        messageId: message.id,
        sender: message.senderName,
        content: message.content?.substring(0, 50) + "...",
        senderId: message.senderId,
        currentUserId: user?.id,
        timestamp: message.timestamp,
      });

      // Ensure the component is still mounted
      if (!mountedRef.current) {
        logChatAction("MESSAGE_IGNORED_UNMOUNTED", { messageId: message.id });
        return;
      }

      // Update messages state
      setMessages((prevMessages) => {
        // Check for duplicates
        const exists = prevMessages.find((m) => m.id === message.id);
        if (exists) {
          logChatAction("DUPLICATE_MESSAGE_IGNORED", { messageId: message.id });
          return prevMessages;
        }

        // Add new message
        const newMessages = [
          ...prevMessages,
          {
            ...message,
            deliveryStatus: "delivered" as const,
          },
        ];

        logChatAction("MESSAGE_ADDED_TO_STATE", {
          messageId: message.id,
          totalMessages: newMessages.length,
        });

        return newMessages;
      });

      // Handle unread count
      if (message.senderId !== user?.id) {
        const messageTime = new Date(message.timestamp);
        if (messageTime > lastReadMessageTimeRef.current) {
          setUnreadCount((prevCount) => {
            const newCount = prevCount + 1;
            logChatAction("UNREAD_COUNT_INCREMENTED", { newCount });
            return newCount;
          });
        }
      }
    };

    // Handle chat errors
    const handleChatError = (data: any) => {
      logChatAction("CHAT_ERROR_RECEIVED", data);
      toast.error(data.message || "Chat error occurred");
    };

    // Set up the critical event listeners
    socket.on("chat-message", handleChatMessage);
    socket.on("chat-error", handleChatError);

    logChatAction("SOCKET_LISTENERS_ACTIVE", {
      events: ["chat-message", "chat-error"],
      socketId: socket.id,
    });

    // Cleanup function
    return () => {
      logChatAction("CLEANING_UP_SOCKET_LISTENERS");
      socket.off("chat-message", handleChatMessage);
      socket.off("chat-error", handleChatError);
      setupRef.current = false;
    };
  }, [socket, isConnected, user?.id, logChatAction]); // Dependencies are intentionally minimal

  /**
   * Reset setup when socket disconnects
   */
  useEffect(() => {
    if (!isConnected) {
      setupRef.current = false;
      logChatAction("SOCKET_DISCONNECTED_RESET_SETUP");
    }
  }, [isConnected, logChatAction]);

  /**
   * Component lifecycle management
   */
  useEffect(() => {
    mountedRef.current = true;
    logChatAction("COMPONENT_MOUNTED");

    return () => {
      mountedRef.current = false;
      setupRef.current = false;
      logChatAction("COMPONENT_UNMOUNTING");
    };
  }, [logChatAction]);

  return {
    // Chat state
    messages,
    unreadCount,
    isConnected: (socket && isConnected) || false,

    // Chat actions
    sendMessage,
    markMessagesAsRead,
    clearChat,

    // Simple utilities
    getMessageById,
    searchMessages,
  };
};

export default useMeetingChat;
