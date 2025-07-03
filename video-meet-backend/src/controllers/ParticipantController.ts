import { Response } from "express";
import { AuthenticatedRequest } from "@/middleware/auth";
import ParticipantService from "@/services/ParticipantService";
import { asyncHandler, createError } from "@/middleware/errorHandler";
import { APIResponse } from "@/types/models";

/**
 * Participant Controller
 * Handles all participant-related HTTP requests and WebRTC signaling
 */
export class ParticipantController {
  /**
   * Get participant details
   * GET /api/v1/participants/:participantId
   */
  static getParticipant = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      // Call participant service to get participant
      const result = await ParticipantService.getParticipant(participantId);

      if (!result.success) {
        switch (result.error?.code) {
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          default:
            throw createError.internal("Failed to retrieve participant");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participant retrieved successfully",
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update participant media state (self-service)
   * PUT /api/v1/participants/:participantId/media
   */
  static updateMediaState = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { audioEnabled, videoEnabled, screenSharing, handRaised } =
        req.body;
      const requester = (req as any).participant;

      // Ensure user can only update their own media state
      if (!requester || requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only update your own media state"
        );
      }

      // Prepare media state data
      const mediaData = {
        ...(audioEnabled !== undefined && { audioEnabled }),
        ...(videoEnabled !== undefined && { videoEnabled }),
        ...(screenSharing !== undefined && { screenSharing }),
        ...(handRaised !== undefined && { handRaised }),
      };

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
   * Update connection quality (self-service)
   * PUT /api/v1/participants/:participantId/quality
   */
  static updateConnectionQuality = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { latency, bandwidth, packetLoss, quality } = req.body;
      const requester = (req as any).participant;

      // Ensure user can only update their own connection quality
      if (!requester || requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only update your own connection quality"
        );
      }

      // Prepare quality data
      const qualityData = {
        ...(latency !== undefined && { latency }),
        ...(bandwidth !== undefined && { bandwidth }),
        ...(packetLoss !== undefined && { packetLoss }),
        ...(quality !== undefined && { quality }),
      };

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
   * Update socket ID for real-time communication
   * PUT /api/v1/participants/:participantId/socket
   */
  static updateSocketId = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { socketId } = req.body;
      const requester = (req as any).participant;

      // Ensure user can only update their own socket ID
      if (!requester || requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only update your own socket ID"
        );
      }

      // Call participant service to update socket ID
      const result = await ParticipantService.updateSocketId(
        participantId,
        socketId
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          default:
            throw createError.internal("Failed to update socket ID");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Socket ID updated successfully",
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get participant's meeting history
   * GET /api/v1/participants/history
   */
  static getParticipantHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Call participant service to get history
      const result = await ParticipantService.getParticipantHistory(
        userId,
        page,
        limit
      );

      if (!result.success) {
        throw createError.internal("Failed to retrieve participant history");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participant history retrieved successfully",
        data: { history: result.data },
        pagination: result.pagination,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update participant permissions (host/moderator only)
   * PUT /api/v1/participants/:participantId/permissions
   */
  static updatePermissions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { permissions } = req.body;
      const requester = (req as any).participant;
      const meeting = (req as any).meeting;

      if (!requester || !meeting) {
        throw createError.authorization("Meeting context not found");
      }

      // Call participant service to update permissions
      const result = await ParticipantService.updateParticipantPermissions(
        meeting._id.toString(),
        {
          participantId,
          permissions,
          requesterId: requester._id.toString(),
        }
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization(
              "Insufficient permissions to update participant permissions"
            );
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          default:
            throw createError.internal(
              "Failed to update participant permissions"
            );
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participant permissions updated successfully",
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * WebRTC signaling endpoint
   * POST /api/v1/participants/signal
   */
  static handleWebRTCSignaling = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { to, from, type, offer, answer, candidate } = req.body;
      const requester = (req as any).participant;

      if (!requester) {
        throw createError.authorization(
          "You must be a meeting participant to send signals"
        );
      }

      // Validate that the 'from' field matches the requester
      if (from !== requester._id.toString()) {
        throw createError.authorization(
          "You can only send signals from your own participant ID"
        );
      }

      // Prepare signaling data based on type
      let signalingData: any = { to, from, type };

      switch (type) {
        case "offer":
          if (!offer || !offer.sdp) {
            throw createError.validation(
              "Offer SDP is required for offer signals"
            );
          }
          signalingData.offer = offer;
          break;

        case "answer":
          if (!answer || !answer.sdp) {
            throw createError.validation(
              "Answer SDP is required for answer signals"
            );
          }
          signalingData.answer = answer;
          break;

        case "ice-candidate":
          if (!candidate) {
            throw createError.validation(
              "ICE candidate is required for ice-candidate signals"
            );
          }
          signalingData.candidate = candidate;
          break;

        default:
          throw createError.validation("Invalid signal type");
      }

      // In a real implementation, this would be handled by Socket.io
      // For now, we'll just acknowledge the signal
      // TODO: Implement actual WebRTC signaling through Socket.io

      // Success response
      const response: APIResponse = {
        success: true,
        message: "WebRTC signal processed successfully",
        data: { signal: signalingData },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Raise/lower hand
   * PUT /api/v1/participants/:participantId/hand
   */
  static toggleHand = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { raised } = req.body;
      const requester = (req as any).participant;

      // Ensure user can only raise/lower their own hand
      if (!requester || requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only raise/lower your own hand"
        );
      }

      // Update hand raised state
      const result = await ParticipantService.updateMediaState(participantId, {
        handRaised: Boolean(raised),
      });

      if (!result.success) {
        throw createError.internal("Failed to update hand state");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: `Hand ${raised ? "raised" : "lowered"} successfully`,
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Start/stop screen sharing
   * PUT /api/v1/participants/:participantId/screen-share
   */
  static toggleScreenShare = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { sharing } = req.body;
      const requester = (req as any).participant;

      // Ensure user can only control their own screen sharing
      if (!requester || requester._id.toString() !== participantId) {
        throw createError.authorization(
          "You can only control your own screen sharing"
        );
      }

      // Check if user has permission to share screen
      if (sharing && !requester.permissions.canShareScreen) {
        throw createError.authorization(
          "You do not have permission to share your screen"
        );
      }

      // Update screen sharing state
      const result = await ParticipantService.updateMediaState(participantId, {
        screenSharing: Boolean(sharing),
      });

      if (!result.success) {
        throw createError.internal("Failed to update screen sharing state");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: `Screen sharing ${
          sharing ? "started" : "stopped"
        } successfully`,
        data: { participant: result.data },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get participant status (online/offline/connection info)
   * GET /api/v1/participants/:participantId/status
   */
  static getParticipantStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      // Get participant details
      const result = await ParticipantService.getParticipant(participantId);

      if (!result.success) {
        throw createError.notFound("Participant not found");
      }

      const participant = result.data!;
      // Calculate status information
      const status = {
        participantId: participant._id,
        isOnline: ParticipantService.isParticipantOnline(participant),
        isActive: !participant.leftAt,
        connectionQuality: participant.connectionQuality,
        mediaState: participant.mediaState,
        joinedAt: participant.joinedAt,
        sessionDuration: participant.sessionDuration || null,
        lastSeen: participant.connectionQuality.lastUpdated,
      };

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Participant status retrieved successfully",
        data: { status },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Batch update multiple participants (host/moderator only)
   * PUT /api/v1/participants/batch
   */
  static batchUpdateParticipants = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { updates } = req.body; // Array of { participantId, action, data }
      const requester = (req as any).participant;
      const meeting = (req as any).meeting;

      if (!requester || !meeting) {
        throw createError.authorization("Meeting context not found");
      }

      // Check if requester has moderator permissions
      if (!requester.canModerate()) {
        throw createError.authorization(
          "Only hosts and moderators can perform batch updates"
        );
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        throw createError.validation(
          "Updates array is required and must not be empty"
        );
      }

      if (updates.length > 50) {
        throw createError.validation("Maximum 50 updates allowed per batch");
      }

      // Process each update
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { participantId, action, data } = update;

          switch (action) {
            case "mute":
              const muteResult = await ParticipantService.muteParticipant(
                meeting._id.toString(),
                {
                  participantId,
                  requesterId: requester._id.toString(),
                  muted: data.muted,
                  type: data.type,
                }
              );
              if (muteResult.success) {
                results.push({ participantId, action, success: true });
              } else {
                errors.push({ participantId, action, error: muteResult.error });
              }
              break;

            case "removeParticipant":
              const removeResult = await ParticipantService.removeParticipant(
                meeting._id.toString(),
                {
                  participantId,
                  requesterId: requester._id.toString(),
                  reason: data.reason,
                }
              );
              if (removeResult.success) {
                results.push({ participantId, action, success: true });
              } else {
                errors.push({
                  participantId,
                  action,
                  error: removeResult.error,
                });
              }
              break;

            case "changeRole":
              const roleResult = await ParticipantService.changeParticipantRole(
                meeting._id.toString(),
                {
                  participantId,
                  newRole: data.newRole,
                  requesterId: requester._id.toString(),
                }
              );
              if (roleResult.success) {
                results.push({ participantId, action, success: true });
              } else {
                errors.push({ participantId, action, error: roleResult.error });
              }
              break;

            default:
              errors.push({
                participantId,
                action,
                error: { code: "INVALID_ACTION", message: "Invalid action" },
              });
          }
        } catch (error) {
          errors.push({
            participantId: update.participantId,
            action: update.action,
            error: {
              code: "PROCESSING_ERROR",
              message: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      // Success response with results and errors
      const response: APIResponse = {
        success: true,
        message: "Batch update completed",
        data: {
          processed: updates.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors,
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Export participant data (for analytics/compliance)
   * GET /api/v1/participants/:participantId/export
   */
  static exportParticipantData = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { participantId } = req.params;
      if (!participantId) {
        throw createError.validation("participantId is required");
      }
      const { format = "json" } = req.query;
      const requester = (req as any).participant;

      // Ensure user can only export their own data or has admin permissions
      if (
        !requester ||
        (requester._id.toString() !== participantId && !requester.canModerate())
      ) {
        throw createError.authorization(
          "You can only export your own data or need moderator privileges"
        );
      }

      // Get participant details
      const result = await ParticipantService.getParticipant(participantId);

      if (!result.success) {
        throw createError.notFound("Participant not found");
      }

      const participant = result.data!;

      // Prepare export data
      const exportData = {
        participant: {
          id: participant._id,
          displayName: participant.displayName,
          role: participant.role,
          joinedAt: participant.joinedAt,
          leftAt: participant.leftAt,
          sessionDuration: participant.sessionDuration,
        },
        meeting: {
          id: participant.meetingId,
          // Additional meeting data would be populated here
        },
        mediaState: participant.mediaState,
        connectionQuality: participant.connectionQuality,
        permissions: participant.permissions,
        exportedAt: new Date().toISOString(),
      };

      // Handle different export formats
      if (format === "csv") {
        // Convert to CSV format
        const csv = [
          "Field,Value",
          `ID,${exportData.participant.id}`,
          `Display Name,${exportData.participant.displayName}`,
          `Role,${exportData.participant.role}`,
          `Joined At,${exportData.participant.joinedAt}`,
          `Left At,${exportData.participant.leftAt || "N/A"}`,
          `Session Duration,${exportData.participant.sessionDuration || "N/A"}`,
          `Audio Enabled,${exportData.mediaState.audioEnabled}`,
          `Video Enabled,${exportData.mediaState.videoEnabled}`,
          `Screen Sharing,${exportData.mediaState.screenSharing}`,
          `Connection Quality,${exportData.connectionQuality.quality}`,
          `Latency,${exportData.connectionQuality.latency || "N/A"}`,
          `Packet Loss,${exportData.connectionQuality.packetLoss || "N/A"}`,
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="participant-${participantId}.csv"`
        );
        res.status(200).send(csv);
      } else {
        // JSON format (default)
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="participant-${participantId}.json"`
        );
        res.status(200).json(exportData);
      }
    }
  );
}

export default ParticipantController;
