import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import MeetingService from "../services/MeetingService";
import ParticipantService from "../services/ParticipantService";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { APIResponse } from "../types/models";

/**
 * Meeting Controller
 * Handles all meeting-related HTTP requests
 */
export class MeetingController {
  /**
   * Create a new meeting
   * POST /api/v1/meetings
   */
  static createMeeting = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.userId!;
      const meetingData = req.body;

      // Call meeting service to create meeting
      const result = await MeetingService.createMeeting(userId, meetingData);

      if (!result.success) {
        // Service returned an error
        switch (result.error?.code) {
          case "INVALID_SCHEDULE_TIME":
            throw createError.validation(
              "Scheduled time must be in the future"
            );
          case "MEETING_CREATION_FAILED":
            throw createError.internal(
              "Failed to create meeting. Please try again."
            );
          default:
            throw createError.internal("Meeting creation failed");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meeting created successfully",
        data: { meeting: result.data },
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get meeting details by room ID
   * GET /api/v1/meetings/:roomId
   */
  static getMeeting = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { roomId } = req.params;
      if (!roomId) {
        throw createError.validation("roomId is required");
      }
      // Call meeting service to get meeting
      const result = await MeetingService.getMeeting(roomId);

      if (!result.success) {
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND":
            throw createError.notFound("Meeting");
          default:
            throw createError.internal("Failed to retrieve meeting");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meeting retrieved successfully",
        data: { meeting: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Join a meeting
   * POST /api/v1/meetings/:roomId/join
   */
  static joinMeeting = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { roomId } = req.params;
      if (!roomId) {
        throw createError.validation("roomId is required");
      }
      const { password, guestName, deviceInfo } = req.body;
      const userId = req.userId; // Optional for guest users
      // Prepare join data
      const joinData = {
        roomId: roomId as string,
        password,
        userId,
        guestName,
        deviceInfo: {
          userAgent: req.get("User-Agent") || "",
          ipAddress: req.ip || "",
          deviceType: deviceInfo?.deviceType || "web",
          ...deviceInfo,
        },
      };

      // Call meeting service to join meeting
      const result = await MeetingService.joinMeeting(joinData);

      if (!result.success) {
        // Service returned an error
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND":
            throw createError.notFound("Meeting not found or has ended");
          case "MEETING_LOCKED":
            throw createError.authorization(
              "Meeting is locked and not accepting new participants"
            );
          case "MEETING_FULL":
            throw createError.conflict("Meeting has reached maximum capacity");
          case "PASSWORD_REQUIRED":
            throw createError.auth("Meeting password is required");
          case "INVALID_PASSWORD":
            throw createError.auth("Incorrect meeting password");
          case "ALREADY_IN_MEETING":
            throw createError.conflict("You are already in this meeting");
          default:
            throw createError.internal("Failed to join meeting");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Successfully joined meeting",
        data: {
          meeting: result.data!.meeting,
          participant: result.data!.participant,
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Leave a meeting
   * POST /api/v1/meetings/:meetingId/leave
   */
  static leaveMeeting = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      const participant = (req as any).participant; // Set by requireMeetingParticipant middleware

      if (!participant) {
        throw createError.authorization(
          "You are not a participant in this meeting"
        );
      }

      // Call meeting service to leave meeting
      const result = await MeetingService.leaveMeeting(
        meetingId,
        participant._id.toString()
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          default:
            throw createError.internal("Failed to leave meeting");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Successfully left meeting",
      };

      res.status(200).json(response);
    }
  );

  /**
   * End a meeting (host only)
   * POST /api/v1/meetings/:meetingId/end
   */
  static endMeeting = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      const userId = req.userId!;

      // Call meeting service to end meeting
      const result = await MeetingService.endMeeting(meetingId, userId);

      if (!result.success) {
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND_OR_NOT_HOST":
            throw createError.authorization(
              "Meeting not found or you are not the host"
            );
          default:
            throw createError.internal("Failed to end meeting");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meeting ended successfully",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update meeting settings (host only)
   * PUT /api/v1/meetings/:meetingId
   */
  static updateMeeting = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      const userId = req.userId!;
      const updateData = req.body;

      // Call meeting service to update meeting
      const result = await MeetingService.updateMeeting(
        meetingId,
        userId,
        updateData
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND_OR_NOT_HOST":
            throw createError.authorization(
              "Meeting not found or you are not the host"
            );
          default:
            throw createError.internal("Failed to update meeting");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meeting updated successfully",
        data: { meeting: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get meeting participants
   * GET /api/v1/meetings/:meetingId/participants
   */
  static getMeetingParticipants = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      // Call participant service to get participants
      const result = await ParticipantService.getMeetingParticipants(meetingId);

      if (!result.success) {
        throw createError.internal("Failed to retrieve meeting participants");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participants retrieved successfully",
        data: {
          participants: result.data,
          count: result.data!.length,
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get user's meetings
   * GET /api/v1/meetings
   */
  static getUserMeetings = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Call meeting service to get user meetings
      const result = await MeetingService.getUserMeetings(userId, page, limit);

      if (!result.success) {
        throw createError.internal("Failed to retrieve user meetings");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meetings retrieved successfully",
        data: { meetings: result.data },
        pagination: result.pagination,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get meeting statistics
   * GET /api/v1/meetings/:meetingId/stats
   */
  static getMeetingStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      // Call participant service to get meeting statistics
      const result = await ParticipantService.getMeetingStats(meetingId);

      if (!result.success) {
        throw createError.internal("Failed to retrieve meeting statistics");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meeting statistics retrieved successfully",
        data: { stats: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Remove participant from meeting (host/moderator only)
   * DELETE /api/v1/meetings/:meetingId/participants/:participantId
   */
  static removeParticipant = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId, participantId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { reason } = req.body;
      const requester = (req as any).participant; // Set by requireMeetingParticipant middleware

      if (!requester) {
        throw createError.authorization(
          "You are not a participant in this meeting"
        );
      }

      // Call participant service to remove participant
      const result = await ParticipantService.removeParticipant(meetingId, {
        participantId,
        requesterId: requester._id.toString(),
        reason,
      });

      if (!result.success) {
        switch (result.error?.code) {
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization(
              "Insufficient permissions to remove participant"
            );
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          case "CANNOT_REMOVE_HOST":
            throw createError.authorization(
              "Cannot remove the host from the meeting"
            );
          default:
            throw createError.internal("Failed to remove participant");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participant removed successfully",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Change participant role (host/moderator only)
   * PUT /api/v1/meetings/:meetingId/participants/:participantId/role
   */
  static changeParticipantRole = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId, participantId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { newRole } = req.body;
      const requester = (req as any).participant; // Set by requireMeetingParticipant middleware

      if (!requester) {
        throw createError.authorization(
          "You are not a participant in this meeting"
        );
      }

      // Call participant service to change role
      const result = await ParticipantService.changeParticipantRole(meetingId, {
        participantId,
        newRole,
        requesterId: requester._id.toString(),
      });

      if (!result.success) {
        switch (result.error?.code) {
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization(
              "Insufficient permissions to change participant role"
            );
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          case "MEETING_NOT_FOUND":
            throw createError.notFound("Meeting not found");
          case "ONLY_HOST_CAN_ASSIGN_HOST":
            throw createError.authorization(
              "Only the host can assign host role"
            );
          case "CANNOT_CHANGE_HOST_ROLE":
            throw createError.authorization(
              "Cannot change the original host role"
            );
          default:
            throw createError.internal("Failed to change participant role");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participant role changed successfully",
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Mute/unmute participant (host/moderator only)
   * PUT /api/v1/meetings/:meetingId/participants/:participantId/mute
   */
  static muteParticipant = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId, participantId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { muted, type } = req.body; // type: 'audio' | 'video'
      const requester = (req as any).participant; // Set by requireMeetingParticipant middleware

      if (!requester) {
        throw createError.authorization(
          "You are not a participant in this meeting"
        );
      }

      // Validate mute type
      if (!["audio", "video"].includes(type)) {
        throw createError.validation('Mute type must be "audio" or "video"');
      }

      // Call participant service to mute participant
      const result = await ParticipantService.muteParticipant(meetingId, {
        participantId,
        requesterId: requester._id.toString(),
        muted: Boolean(muted),
        type,
      });

      if (!result.success) {
        switch (result.error?.code) {
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization(
              "Insufficient permissions to mute participant"
            );
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          default:
            throw createError.internal("Failed to mute participant");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: `Participant ${muted ? "muted" : "unmuted"} successfully`,
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update participant media state
   * PUT /api/v1/meetings/:meetingId/participants/:participantId/media
   */
  static updateMediaState = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const mediaData = req.body;
      const requester = (req as any).participant; // Set by requireMeetingParticipant middleware

      // Check if user is updating their own media state
      if (requester && requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only update your own media state"
        );
      }

      // Call participant service to update media state
      const result = await ParticipantService.updateMediaState(
        participantId,
        mediaData
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          case "PARTICIPANT_LEFT_MEETING":
            throw createError.authorization("Participant has left the meeting");
          default:
            throw createError.internal("Failed to update media state");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Media state updated successfully",
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update connection quality
   * PUT /api/v1/meetings/:meetingId/participants/:participantId/quality
   */
  static updateConnectionQuality = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const qualityData = req.body;
      const requester = (req as any).participant; // Set by requireMeetingParticipant middleware

      // Check if user is updating their own connection quality
      if (requester && requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only update your own connection quality"
        );
      }

      // Call participant service to update connection quality
      const result = await ParticipantService.updateConnectionQuality(
        participantId,
        qualityData
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          default:
            throw createError.internal("Failed to update connection quality");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Connection quality updated successfully",
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Search meetings (public meetings only)
   * GET /api/v1/meetings/search
   */
  static searchMeetings = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { q: query, page = 1, limit = 10 } = req.query;

      if (!query || typeof query !== "string") {
        throw createError.validation("Search query is required");
      }

      // Import Meeting model
      const { Meeting } = await import("@/models/Meeting");

      // Search for public meetings
      const skip = (Number(page) - 1) * Number(limit);
      const meetings = await Meeting.find({
        $and: [
          { status: { $in: ["waiting", "active"] } },
          { "settings.allowGuests": true },
          { "settings.enablePassword": false },
          {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
              { roomId: { $regex: query, $options: "i" } },
            ],
          },
        ],
      })
        .populate("hostId", "firstName lastName username avatar")
        .select(
          "roomId title description maxParticipants currentParticipants createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Meeting.countDocuments({
        $and: [
          { status: { $in: ["waiting", "active"] } },
          { "settings.allowGuests": true },
          { "settings.enablePassword": false },
          {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
              { roomId: { $regex: query, $options: "i" } },
            ],
          },
        ],
      });

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meetings search completed",
        data: { meetings },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get meeting health status
   * GET /api/v1/meetings/:meetingId/health
   */
  static getMeetingHealth = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      if (!meetingId) {
        throw createError.validation("meetingId is required");
      }
      // Get meeting and participants data
      const [meetingResult, participantsResult] = await Promise.all([
        MeetingService.getMeeting(meetingId),
        ParticipantService.getMeetingParticipants(meetingId),
      ]);

      if (!meetingResult.success) {
        throw createError.notFound("Meeting not found");
      }

      const meeting = meetingResult.data!;
      const participants = participantsResult.data || [];

      // Calculate health metrics
      const healthMetrics = {
        meeting: {
          status: meeting.status,
          participantCount: meeting.currentParticipants,
          capacity: meeting.maxParticipants,
          utilization:
            (meeting.currentParticipants / meeting.maxParticipants) * 100,
        },
        participants: {
          total: participants.length,
          connected: participants.filter((p) =>
            ParticipantService.isParticipantOnline(p)
          ).length,
          quality: {
            excellent: participants.filter(
              (p) => p.connectionQuality.quality === "excellent"
            ).length,
            good: participants.filter(
              (p) => p.connectionQuality.quality === "good"
            ).length,
            fair: participants.filter(
              (p) => p.connectionQuality.quality === "fair"
            ).length,
            poor: participants.filter(
              (p) => p.connectionQuality.quality === "poor"
            ).length,
          },
        },
        network: {
          averageLatency:
            participants.reduce(
              (sum, p) => sum + (p.connectionQuality.latency || 0),
              0
            ) / participants.length || 0,
          averagePacketLoss:
            participants.reduce(
              (sum, p) => sum + (p.connectionQuality.packetLoss || 0),
              0
            ) / participants.length || 0,
        },
      };

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Meeting health status retrieved successfully",
        data: { health: healthMetrics },
      };

      res.status(200).json(response);
    }
  );
}

export default MeetingController;
