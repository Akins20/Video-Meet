import { Types } from "mongoose";
import ChatMessage, { IChatMessage } from "../models/ChatMessage";
import Meeting from "../models/Meeting";
import Participant from "../models/Participant";
/**
 * Service result interface
 */
interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Chat Service
 * Handles all chat-related business logic
 */
export class ChatService {
  /**
   * Send a chat message
   */
  static async sendMessage(
    meetingId: string,
    participantId: string,
    messageData: {
      message: string;
      messageType?: 'text' | 'file' | 'system' | 'emoji';
      metadata?: any;
      replyTo?: string;
      mentionedParticipants?: string[];
    }
  ): Promise<ServiceResult<IChatMessage>> {
    try {
      // Validate meeting exists and is active
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return {
          success: false,
          error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" },
        };
      }

      if (meeting.status !== "active") {
        return {
          success: false,
          error: { code: "MEETING_NOT_ACTIVE", message: "Meeting is not active" },
        };
      }

      // Validate participant exists and is in meeting
      const participant = await Participant.findOne({
        _id: participantId,
        meeting: meetingId,
        isActive: true,
      });

      if (!participant) {
        return {
          success: false,
          error: { code: "PARTICIPANT_NOT_FOUND", message: "Participant not found in meeting" },
        };
      }

      // Check if participant has permission to send messages (all roles except guests can chat)
      if (participant.role === 'guest' && !meeting.settings.chat) {
        return {
          success: false,
          error: { code: "INSUFFICIENT_PERMISSIONS", message: "Guests cannot send messages" },
        };
      }

      // Create the message
      const chatMessage = new ChatMessage({
        meeting: meetingId,
        participant: participantId,
        user: (participant as any).user || undefined,
        message: messageData.message,
        messageType: messageData.messageType || 'text',
        metadata: messageData.metadata,
        replyTo: messageData.replyTo || null,
        mentionedParticipants: messageData.mentionedParticipants || [],
      });

      await chatMessage.save();

      // Populate the message for return
      const populatedMessage = await ChatMessage.findById(chatMessage._id)
        .populate("participant", "displayName user role")
        .populate("user", "firstName lastName avatar")
        .populate("replyTo", "message participant timestamp");

      return {
        success: true,
        data: populatedMessage!,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error: { code: "MESSAGE_SEND_FAILED", message: "Failed to send message" },
      };
    }
  }

  /**
   * Get chat messages for a meeting
   */
  static async getMessages(
    meetingId: string,
    participantId: string,
    options: {
      page?: number;
      limit?: number;
      messageType?: string;
      includeDeleted?: boolean;
    } = {}
  ): Promise<ServiceResult<{ messages: IChatMessage[]; totalCount: number; hasMore: boolean }>> {
    try {
      // Validate meeting exists
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return {
          success: false,
          error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" },
        };
      }

      // Validate participant is in meeting
      const participant = await Participant.findOne({
        _id: participantId,
        meeting: meetingId,
      });

      if (!participant) {
        return {
          success: false,
          error: { code: "PARTICIPANT_NOT_FOUND", message: "Participant not found in meeting" },
        };
      }

      const { page = 1, limit = 50, messageType, includeDeleted = false } = options;

      // Get messages using the static method
      const messages = await (ChatMessage as any).findByMeeting(meetingId, {
        page,
        limit,
        messageType,
        includeDeleted,
      });

      // Get total count
      const totalQuery: any = { meeting: meetingId };
      if (!includeDeleted) {
        totalQuery.isDeleted = false;
      }
      if (messageType) {
        totalQuery.messageType = messageType;
      }

      const totalCount = await ChatMessage.countDocuments(totalQuery);
      const hasMore = page * limit < totalCount;

      return {
        success: true,
        data: {
          messages: messages.reverse(), // Reverse to get chronological order
          totalCount,
          hasMore,
        },
      };
    } catch (error) {
      console.error("Error getting messages:", error);
      return {
        success: false,
        error: { code: "MESSAGES_FETCH_FAILED", message: "Failed to fetch messages" },
      };
    }
  }

  /**
   * Edit a chat message
   */
  static async editMessage(
    messageId: string,
    participantId: string,
    newMessage: string
  ): Promise<ServiceResult<IChatMessage>> {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: { code: "MESSAGE_NOT_FOUND", message: "Message not found" },
        };
      }

      // Check if participant owns the message
      if (message.participant.toString() !== participantId) {
        return {
          success: false,
          error: { code: "INSUFFICIENT_PERMISSIONS", message: "Can only edit your own messages" },
        };
      }

      // Check if message is too old to edit (24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (message.timestamp < oneDayAgo) {
        return {
          success: false,
          error: { code: "EDIT_TIME_EXPIRED", message: "Message is too old to edit" },
        };
      }

      message.message = newMessage;
      await message.save();

      const populatedMessage = await ChatMessage.findById(messageId)
        .populate("participant", "displayName user role")
        .populate("user", "firstName lastName avatar");

      return {
        success: true,
        data: populatedMessage!,
      };
    } catch (error) {
      console.error("Error editing message:", error);
      return {
        success: false,
        error: { code: "MESSAGE_EDIT_FAILED", message: "Failed to edit message" },
      };
    }
  }

  /**
   * Delete a chat message
   */
  static async deleteMessage(
    messageId: string,
    participantId: string
  ): Promise<ServiceResult<void>> {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: { code: "MESSAGE_NOT_FOUND", message: "Message not found" },
        };
      }

      // Check permissions - participant owns message or is moderator
      const participant = await Participant.findById(participantId);
      const canDelete = message.participant.toString() === participantId || 
                       participant?.role === 'host' || 
                       participant?.role === 'moderator';

      if (!canDelete) {
        return {
          success: false,
          error: { code: "INSUFFICIENT_PERMISSIONS", message: "Cannot delete this message" },
        };
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Error deleting message:", error);
      return {
        success: false,
        error: { code: "MESSAGE_DELETE_FAILED", message: "Failed to delete message" },
      };
    }
  }

  /**
   * Add reaction to a message
   */
  static async addReaction(
    messageId: string,
    participantId: string,
    emoji: string
  ): Promise<ServiceResult<IChatMessage>> {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: { code: "MESSAGE_NOT_FOUND", message: "Message not found" },
        };
      }

      // Check if participant already reacted with this emoji
      const existingReaction = message.reactions?.find(
        (r) => r.participant.toString() === participantId && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove existing reaction
        message.reactions = message.reactions?.filter(
          (r) => !(r.participant.toString() === participantId && r.emoji === emoji)
        );
      } else {
        // Add new reaction
        if (!message.reactions) {
          message.reactions = [];
        }
        message.reactions.push({
          emoji,
          participant: new Types.ObjectId(participantId),
          timestamp: new Date(),
        });
      }

      await message.save();

      const populatedMessage = await ChatMessage.findById(messageId)
        .populate("participant", "displayName user role")
        .populate("user", "firstName lastName avatar");

      return {
        success: true,
        data: populatedMessage!,
      };
    } catch (error) {
      console.error("Error adding reaction:", error);
      return {
        success: false,
        error: { code: "REACTION_FAILED", message: "Failed to add reaction" },
      };
    }
  }

  /**
   * Get chat statistics for a meeting
   */
  static async getChatStats(
    meetingId: string
  ): Promise<ServiceResult<any>> {
    try {
      const stats = await (ChatMessage as any).getMessageStats(meetingId);
      
      const totalMessages = await ChatMessage.countDocuments({ 
        meeting: meetingId,
        isDeleted: false 
      });

      const activeParticipants = await ChatMessage.distinct("participant", {
        meeting: meetingId,
        isDeleted: false,
      });

      return {
        success: true,
        data: {
          totalMessages,
          activeParticipants: activeParticipants.length,
          messageTypes: stats,
        },
      };
    } catch (error) {
      console.error("Error getting chat stats:", error);
      return {
        success: false,
        error: { code: "STATS_FETCH_FAILED", message: "Failed to fetch chat statistics" },
      };
    }
  }

  /**
   * Clear all chat messages for a meeting (host only)
   */
  static async clearChat(
    meetingId: string,
    participantId: string
  ): Promise<ServiceResult<void>> {
    try {
      // Validate participant is host
      const participant = await Participant.findOne({
        _id: participantId,
        meeting: meetingId,
        role: 'host',
      });

      if (!participant) {
        return {
          success: false,
          error: { code: "INSUFFICIENT_PERMISSIONS", message: "Only host can clear chat" },
        };
      }

      // Soft delete all messages
      await ChatMessage.updateMany(
        { meeting: meetingId, isDeleted: false },
        { 
          isDeleted: true, 
          deletedAt: new Date(),
          message: "[This message was deleted by the host]"
        }
      );

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Error clearing chat:", error);
      return {
        success: false,
        error: { code: "CLEAR_CHAT_FAILED", message: "Failed to clear chat" },
      };
    }
  }
}

export default ChatService;