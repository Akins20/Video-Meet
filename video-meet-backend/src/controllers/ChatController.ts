import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import ChatService from "../services/ChatService";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { APIResponse } from "../types/models";

/**
 * Chat Controller
 * Handles all chat-related HTTP requests
 */
export class ChatController {
  /**
   * Send a chat message
   * POST /api/v1/meetings/:meetingId/chat
   */
  static sendMessage = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      const participantId = req.participantId!;
      const messageData = req.body;

      // Validate required fields
      if (!messageData.message || messageData.message.trim() === "") {
        throw createError.validation("Message content is required");
      }

      // Call chat service
      const result = await ChatService.sendMessage(
        meetingId,
        participantId,
        messageData
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND":
            throw createError.notFound("Meeting not found");
          case "MEETING_NOT_ACTIVE":
            throw createError.authorization("Meeting is not active");
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found in meeting");
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("No permission to send messages");
          default:
            throw createError.internal("Failed to send message");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Message sent successfully",
        data: { message: result.data },
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get chat messages for a meeting
   * GET /api/v1/meetings/:meetingId/chat
   */
  static getMessages = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      const participantId = req.participantId!;
      const { page = 1, limit = 50, messageType, includeDeleted = false } = req.query;

      // Call chat service
      const result = await ChatService.getMessages(
        meetingId,
        participantId,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          messageType: messageType as string,
          includeDeleted: includeDeleted === 'true',
        }
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND":
            throw createError.notFound("Meeting not found");
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found in meeting");
          default:
            throw createError.internal("Failed to fetch messages");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Messages retrieved successfully",
        data: result.data,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Edit a chat message
   * PUT /api/v1/meetings/:meetingId/chat/:messageId
   */
  static editMessage = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { messageId } = req.params;
      const participantId = req.participantId!;
      const { message } = req.body;

      if (!message || message.trim() === "") {
        throw createError.validation("Message content is required");
      }

      // Call chat service
      const result = await ChatService.editMessage(
        messageId,
        participantId,
        message
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "MESSAGE_NOT_FOUND":
            throw createError.notFound("Message not found");
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("Can only edit your own messages");
          case "EDIT_TIME_EXPIRED":
            throw createError.authorization("Message is too old to edit");
          default:
            throw createError.internal("Failed to edit message");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Message edited successfully",
        data: { message: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete a chat message
   * DELETE /api/v1/meetings/:meetingId/chat/:messageId
   */
  static deleteMessage = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { messageId } = req.params;
      const participantId = req.participantId!;

      // Call chat service
      const result = await ChatService.deleteMessage(messageId, participantId);

      if (!result.success) {
        switch (result.error?.code) {
          case "MESSAGE_NOT_FOUND":
            throw createError.notFound("Message not found");
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("Cannot delete this message");
          default:
            throw createError.internal("Failed to delete message");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Message deleted successfully",
        data: null,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Add reaction to a message
   * POST /api/v1/meetings/:meetingId/chat/:messageId/reactions
   */
  static addReaction = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { messageId } = req.params;
      const participantId = req.participantId!;
      const { emoji } = req.body;

      if (!emoji || emoji.trim() === "") {
        throw createError.validation("Emoji is required");
      }

      // Call chat service
      const result = await ChatService.addReaction(
        messageId,
        participantId,
        emoji
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "MESSAGE_NOT_FOUND":
            throw createError.notFound("Message not found");
          default:
            throw createError.internal("Failed to add reaction");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Reaction added successfully",
        data: { message: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get chat statistics
   * GET /api/v1/meetings/:meetingId/chat/stats
   */
  static getChatStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;

      // Call chat service
      const result = await ChatService.getChatStats(meetingId);

      if (!result.success) {
        throw createError.internal("Failed to fetch chat statistics");
      }

      const response: APIResponse = {
        success: true,
        message: "Chat statistics retrieved successfully",
        data: result.data,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Clear all chat messages (host only)
   * DELETE /api/v1/meetings/:meetingId/chat
   */
  static clearChat = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      const participantId = req.participantId!;

      // Call chat service
      const result = await ChatService.clearChat(meetingId, participantId);

      if (!result.success) {
        switch (result.error?.code) {
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("Only host can clear chat");
          default:
            throw createError.internal("Failed to clear chat");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Chat cleared successfully",
        data: null,
      };

      res.status(200).json(response);
    }
  );
}

export default ChatController;