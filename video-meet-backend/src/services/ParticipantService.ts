import { Types } from "mongoose";
import { IParticipant, IMeeting, APIResponse } from "../types/models";

/**
 * Interface for updating participant media state
 */
interface UpdateMediaStateData {
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
}

/**
 * Interface for updating connection quality
 */
interface ConnectionQualityData {
  latency?: number;
  bandwidth?: number;
  packetLoss?: number;
  quality?: "poor" | "fair" | "good" | "excellent";
}

/**
 * Interface for participant role change
 */
interface ChangeRoleData {
  participantId: string;
  newRole: "host" | "moderator" | "participant" | "guest";
  requesterId: string; // Who is making the change
}

/**
 * Interface for updating participant permissions
 */
interface UpdatePermissionsData {
  participantId: string;
  permissions: Partial<IParticipant["permissions"]>;
  requesterId: string;
}

/**
 * Interface for removing participant
 */
interface RemoveParticipantData {
  participantId: string;
  requesterId: string;
  reason?: string;
}

/**
 * Interface for muting/unmuting participant
 */
interface MuteParticipantData {
  participantId: string;
  requesterId: string;
  muted: boolean;
  type: "audio" | "video";
}

/**
 * Participant Service Class
 * Handles all participant-related operations within meetings
 */
export class ParticipantService {
  /**
   * Get all participants in a meeting
   */
  static async getMeetingParticipants(
    meetingId: string
  ): Promise<APIResponse<IParticipant[]>> {
    try {
      const { Participant } = await import("../models/Participant");

      const participants = await Participant.find({
        meetingId: new Types.ObjectId(meetingId),
        leftAt: { $exists: false }, // Only active participants
      })
        .populate("userId", "firstName lastName username avatar")
        .sort({ joinedAt: 1 }); // Sort by join time

      return {
        success: true,
        message: "Participants retrieved successfully",
        data: participants,
      };
    } catch (error) {
      console.error("Get meeting participants error:", error);
      return {
        success: false,
        message: "Failed to get meeting participants",
        error: { code: "GET_PARTICIPANTS_FAILED" },
      };
    }
  }

  /**
   * Get participant by ID
   */
  static async getParticipant(
    participantId: string
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");

      const participant = await Participant.findById(participantId)
        .populate("userId", "firstName lastName username avatar")
        .populate("meetingId", "title roomId hostId status");

      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      return {
        success: true,
        message: "Participant found",
        data: participant,
      };
    } catch (error) {
      console.error("Get participant error:", error);
      return {
        success: false,
        message: "Failed to get participant",
        error: { code: "GET_PARTICIPANT_FAILED" },
      };
    }
  }

  /**
   * Update participant media state (audio/video/screen share)
   */
  static async updateMediaState(
    participantId: string,
    mediaData: UpdateMediaStateData
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");

      const participant = await Participant.findById(participantId);

      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Check if participant is still in meeting
      if (participant.leftAt) {
        return {
          success: false,
          message: "Participant has left the meeting",
          error: { code: "PARTICIPANT_LEFT_MEETING" },
        };
      }

      // Update media state
      Object.assign(participant.mediaState, mediaData);
      await participant.save();

      return {
        success: true,
        message: "Media state updated successfully",
        data: participant,
      };
    } catch (error) {
      console.error("Update media state error:", error);
      return {
        success: false,
        message: "Failed to update media state",
        error: { code: "UPDATE_MEDIA_STATE_FAILED" },
      };
    }
  }

  /**
   * Update participant connection quality
   */
  static async updateConnectionQuality(
    participantId: string,
    qualityData: ConnectionQualityData
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");

      const participant = await Participant.findById(participantId);

      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Auto-determine quality if not provided
      if (
        !qualityData.quality &&
        qualityData.latency &&
        qualityData.packetLoss !== undefined
      ) {
        qualityData.quality = this.calculateConnectionQuality(
          qualityData.latency,
          qualityData.packetLoss
        );
      }

      // Update connection quality
      Object.assign(participant.connectionQuality, {
        ...qualityData,
        lastUpdated: new Date(),
      });

      await participant.save();

      return {
        success: true,
        message: "Connection quality updated successfully",
        data: participant,
      };
    } catch (error) {
      console.error("Update connection quality error:", error);
      return {
        success: false,
        message: "Failed to update connection quality",
        error: { code: "UPDATE_CONNECTION_QUALITY_FAILED" },
      };
    }
  }

  /**
   * Change participant role (host/moderator only)
   */
  static async changeParticipantRole(
    meetingId: string,
    roleData: ChangeRoleData
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");
      const { Meeting } = await import("../models/Meeting");

      // Verify requester has permission
      const requester = await Participant.findOne({
        _id: roleData.requesterId,
        meetingId: new Types.ObjectId(meetingId),
        leftAt: { $exists: false },
      });

      if (!requester || !["host", "moderator"].includes(requester.role)) {
        return {
          success: false,
          message: "Insufficient permissions to change participant role",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // Get meeting to check host
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return {
          success: false,
          message: "Meeting not found",
          error: { code: "MEETING_NOT_FOUND" },
        };
      }

      // Find target participant
      const participant = await Participant.findById(roleData.participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Prevent non-hosts from changing host role
      if (roleData.newRole === "host" && requester.role !== "host") {
        return {
          success: false,
          message: "Only the host can assign host role",
          error: { code: "ONLY_HOST_CAN_ASSIGN_HOST" },
        };
      }

      // Prevent changing the original host unless they're doing it themselves
      const isOriginalHost =
        participant.userId?.toString() === meeting.hostId.toString();
      if (
        isOriginalHost &&
        requester.userId?.toString() !== meeting.hostId.toString()
      ) {
        return {
          success: false,
          message: "Cannot change the original host role",
          error: { code: "CANNOT_CHANGE_HOST_ROLE" },
        };
      }

      // Update role and permissions
      participant.role = roleData.newRole;
      participant.permissions = this.getDefaultPermissions(roleData.newRole);
      await participant.save();

      return {
        success: true,
        message: "Participant role changed successfully",
        data: participant,
      };
    } catch (error) {
      console.error("Change participant role error:", error);
      return {
        success: false,
        message: "Failed to change participant role",
        error: { code: "CHANGE_ROLE_FAILED" },
      };
    }
  }

  /**
   * Update participant permissions (host/moderator only)
   */
  static async updateParticipantPermissions(
    meetingId: string,
    permissionData: UpdatePermissionsData
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");

      // Verify requester has permission
      const requester = await Participant.findOne({
        _id: permissionData.requesterId,
        meetingId: new Types.ObjectId(meetingId),
        leftAt: { $exists: false },
      });

      if (!requester || !["host", "moderator"].includes(requester.role)) {
        return {
          success: false,
          message: "Insufficient permissions to update participant permissions",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // Find target participant
      const participant = await Participant.findById(
        permissionData.participantId
      );
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Update permissions
      Object.assign(participant.permissions, permissionData.permissions);
      await participant.save();

      return {
        success: true,
        message: "Participant permissions updated successfully",
        data: participant,
      };
    } catch (error) {
      console.error("Update participant permissions error:", error);
      return {
        success: false,
        message: "Failed to update participant permissions",
        error: { code: "UPDATE_PERMISSIONS_FAILED" },
      };
    }
  }

  /**
   * Remove participant from meeting (host/moderator only)
   */
  static async removeParticipant(
    meetingId: string,
    removeData: RemoveParticipantData
  ): Promise<APIResponse> {
    try {
      const { Participant } = await import("../models/Participant");
      const { Meeting } = await import("../models/Meeting");

      // Verify requester has permission
      const requester = await Participant.findOne({
        _id: removeData.requesterId,
        meetingId: new Types.ObjectId(meetingId),
        leftAt: { $exists: false },
      });

      if (!requester || !requester.permissions.canRemoveParticipants) {
        return {
          success: false,
          message: "Insufficient permissions to remove participant",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // Find target participant
      const participant = await Participant.findById(removeData.participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Prevent removing the host (unless host is removing themselves)
      if (
        participant.role === "host" &&
        removeData.requesterId !== removeData.participantId
      ) {
        return {
          success: false,
          message: "Cannot remove the host from the meeting",
          error: { code: "CANNOT_REMOVE_HOST" },
        };
      }

      // Mark participant as left
      participant.leftAt = new Date();
      participant.sessionDuration = Math.floor(
        (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000
      );
      await participant.save();

      // Update meeting participant count
      const meeting = await Meeting.findById(meetingId);
      if (meeting) {
        meeting.currentParticipants = Math.max(
          0,
          meeting.currentParticipants - 1
        );
        await meeting.save();
      }

      return {
        success: true,
        message: "Participant removed successfully",
      };
    } catch (error) {
      console.error("Remove participant error:", error);
      return {
        success: false,
        message: "Failed to remove participant",
        error: { code: "REMOVE_PARTICIPANT_FAILED" },
      };
    }
  }

  /**
   * Mute/unmute participant (host/moderator only)
   */
  static async muteParticipant(
    meetingId: string,
    muteData: MuteParticipantData
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");

      // Verify requester has permission
      const requester = await Participant.findOne({
        _id: muteData.requesterId,
        meetingId: new Types.ObjectId(meetingId),
        leftAt: { $exists: false },
      });

      if (!requester || !requester.permissions.canMuteOthers) {
        return {
          success: false,
          message: "Insufficient permissions to mute participant",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // Find target participant
      const participant = await Participant.findById(muteData.participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Update media state
      if (muteData.type === "audio") {
        participant.mediaState.audioEnabled = !muteData.muted;
      } else if (muteData.type === "video") {
        participant.mediaState.videoEnabled = !muteData.muted;
      }

      await participant.save();

      return {
        success: true,
        message: `Participant ${muteData.muted ? "muted" : "unmuted"
          } successfully`,
        data: participant,
      };
    } catch (error) {
      console.error("Mute participant error:", error);
      return {
        success: false,
        message: "Failed to mute participant",
        error: { code: "MUTE_PARTICIPANT_FAILED" },
      };
    }
  }

  /**
   * Update participant socket ID (for real-time communication)
   */
  static async updateSocketId(
    participantId: string,
    socketId: string
  ): Promise<APIResponse<IParticipant>> {
    try {
      const { Participant } = await import("../models/Participant");

      const participant = await Participant.findByIdAndUpdate(
        participantId,
        { socketId },
        { new: true }
      );

      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      return {
        success: true,
        message: "Socket ID updated successfully",
        data: participant,
      };
    } catch (error) {
      console.error("Update socket ID error:", error);
      return {
        success: false,
        message: "Failed to update socket ID",
        error: { code: "UPDATE_SOCKET_ID_FAILED" },
      };
    }
  }

  /**
   * Get participant meeting history
   */
  static async getParticipantHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<APIResponse<IParticipant[]>> {
    try {
      const { Participant } = await import("../models/Participant");

      const skip = (page - 1) * limit;

      const participants = await Participant.find({
        userId: new Types.ObjectId(userId),
      })
        .populate("meetingId", "title roomId startedAt endedAt duration")
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Participant.countDocuments({
        userId: new Types.ObjectId(userId),
      });

      return {
        success: true,
        message: "Participant history retrieved successfully",
        data: participants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get participant history error:", error);
      return {
        success: false,
        message: "Failed to get participant history",
        error: { code: "GET_PARTICIPANT_HISTORY_FAILED" },
      };
    }
  }

  /**
   * Calculate connection quality based on metrics
   */
  private static calculateConnectionQuality(
    latency: number,
    packetLoss: number
  ): "poor" | "fair" | "good" | "excellent" {
    // Excellent: Low latency (<50ms) and minimal packet loss (<1%)
    if (latency < 50 && packetLoss < 1) {
      return "excellent";
    }

    // Good: Moderate latency (<150ms) and low packet loss (<3%)
    if (latency < 150 && packetLoss < 3) {
      return "good";
    }

    // Fair: Higher latency (<300ms) and moderate packet loss (<5%)
    if (latency < 300 && packetLoss < 5) {
      return "fair";
    }

    // Poor: High latency (>300ms) or high packet loss (>5%)
    return "poor";
  }

  /**
   * Get default permissions based on role
   */
  private static getDefaultPermissions(
    role: IParticipant["role"]
  ): IParticipant["permissions"] {
    switch (role) {
      case "host":
        return {
          canMuteOthers: true,
          canRemoveParticipants: true,
          canManageRecording: true,
          canShareScreen: true,
          canShareFiles: true,
          canUseWhiteboard: true,
        };
      case "moderator":
        return {
          canMuteOthers: true,
          canRemoveParticipants: true,
          canManageRecording: true,
          canShareScreen: true,
          canShareFiles: true,
          canUseWhiteboard: true,
        };
      case "participant":
        return {
          canMuteOthers: false,
          canRemoveParticipants: false,
          canManageRecording: false,
          canShareScreen: true,
          canShareFiles: true,
          canUseWhiteboard: true,
        };
      case "guest":
        return {
          canMuteOthers: false,
          canRemoveParticipants: false,
          canManageRecording: false,
          canShareScreen: false,
          canShareFiles: false,
          canUseWhiteboard: false,
        };
      default:
        return {
          canMuteOthers: false,
          canRemoveParticipants: false,
          canManageRecording: false,
          canShareScreen: false,
          canShareFiles: false,
          canUseWhiteboard: false,
        };
    }
  }

  /**
   * Check if participant is online (based on recent activity)
   */
  static isParticipantOnline(participant: IParticipant): boolean {
    if (participant.leftAt) return false;

    // Consider online if connection quality was updated within last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    return participant.connectionQuality.lastUpdated > thirtySecondsAgo;
  }

  /**
   * Get meeting statistics for participants
   */
  static async getMeetingStats(meetingId: string): Promise<
    APIResponse<{
      totalParticipants: number;
      activeParticipants: number;
      participantsByRole: Record<string, number>;
      averageSessionDuration: number;
      connectionQualityDistribution: Record<string, number>;
    }>
  > {
    try {
      const { Participant } = await import("../models/Participant");

      const participants = await Participant.find({
        meetingId: new Types.ObjectId(meetingId),
      });

      const activeParticipants = participants.filter((p) => !p.leftAt);

      // Count by role
      const participantsByRole = participants.reduce((acc, p) => {
        acc[p.role] = (acc[p.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate average session duration for completed sessions
      const completedSessions = participants.filter((p) => p.sessionDuration);
      const averageSessionDuration =
        completedSessions.length > 0
          ? completedSessions.reduce(
            (sum, p) => sum + (p.sessionDuration || 0),
            0
          ) / completedSessions.length
          : 0;

      // Connection quality distribution
      const connectionQualityDistribution = activeParticipants.reduce(
        (acc, p) => {
          acc[p.connectionQuality.quality] =
            (acc[p.connectionQuality.quality] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        success: true,
        message: "Meeting statistics retrieved successfully",
        data: {
          totalParticipants: participants.length,
          activeParticipants: activeParticipants.length,
          participantsByRole,
          averageSessionDuration,
          connectionQualityDistribution,
        },
      };
    } catch (error) {
      console.error("Get meeting stats error:", error);
      return {
        success: false,
        message: "Failed to get meeting statistics",
        error: { code: "GET_MEETING_STATS_FAILED" },
      };
    }
  }
}

export default ParticipantService;
