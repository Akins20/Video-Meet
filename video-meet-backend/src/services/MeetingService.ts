import { Types } from "mongoose";
import crypto from "crypto";
import { IMeeting, IParticipant, IUser, APIResponse } from "../types/models";

/**
 * Interface for creating a new meeting
 */
interface CreateMeetingData {
  title: string;
  description?: string;
  password?: string;
  type?: "instant" | "scheduled" | "recurring";
  scheduledAt?: Date;
  timezone?: string;
  maxParticipants?: number;
  settings?: Partial<IMeeting["settings"]>;
  recurring?: IMeeting["recurring"];
}

/**
 * Interface for joining a meeting
 */
interface JoinMeetingData {
  roomId: string;
  password?: string;
  userId?: string;
  guestName?: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceType: "web" | "mobile" | "desktop";
  };
}

/**
 * Interface for updating meeting settings
 */
interface UpdateMeetingData {
  title?: string;
  description?: string;
  password?: string;
  maxParticipants?: number;
  settings?: Partial<IMeeting["settings"]>;
}

/**
 * Interface for participant update data
 */
interface UpdateParticipantData {
  role?: "host" | "moderator" | "participant" | "guest";
  permissions?: Partial<IParticipant["permissions"]>;
  mediaState?: Partial<IParticipant["mediaState"]>;
}

/**
 * Meeting Service Class
 * Handles all meeting-related business logic
 */
export class MeetingService {
  /**
   * Create a new meeting
   */
  static async createMeeting(
    hostId: string,
    meetingData: CreateMeetingData
  ): Promise<APIResponse<IMeeting>> {
    try {
      // Import Meeting model dynamically to avoid circular dependencies
      const { Meeting } = await import("@/models/Meeting");

      // Generate unique room ID
      const roomId = this.generateRoomId();

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (meetingData.password) {
        const bcrypt = await import("bcryptjs");
        hashedPassword = await bcrypt.hash(meetingData.password, 10);
      }

      // Default meeting settings
      const defaultSettings: IMeeting["settings"] = {
        allowGuests: true,
        muteOnJoin: false,
        videoOnJoin: true,
        waitingRoom: false,
        chat: true,
        screenShare: true,
        fileSharing: true,
        whiteboard: false,
        recording: false,
        autoRecord: false,
        enablePassword: !!meetingData.password,
        lockMeeting: false,
        maxVideoQuality: "high",
        enableBackgroundBlur: true,
        ...meetingData.settings,
      };

      // Validate scheduled meeting
      if (meetingData.type === "scheduled" && meetingData.scheduledAt) {
        if (new Date(meetingData.scheduledAt) <= new Date()) {
          return {
            success: false,
            message: "Scheduled time must be in the future",
            error: { code: "INVALID_SCHEDULE_TIME" },
          };
        }
      }

      // Create meeting
      const meeting = new Meeting({
        roomId,
        title: meetingData.title,
        description: meetingData.description,
        password: hashedPassword,
        hostId: new Types.ObjectId(hostId),
        type: meetingData.type || "instant",
        isScheduled: meetingData.type === "scheduled",
        scheduledAt: meetingData.scheduledAt,
        timezone: meetingData.timezone,
        status: meetingData.type === "scheduled" ? "waiting" : "active",
        maxParticipants: meetingData.maxParticipants || 10,
        currentParticipants: 0,
        settings: defaultSettings,
        recurring: meetingData.recurring,
        participants: [],
      });

      await meeting.save();

      return {
        success: true,
        message: "Meeting created successfully",
        data: meeting,
      };
    } catch (error) {
      console.error("Create meeting error:", error);
      return {
        success: false,
        message: "Failed to create meeting",
        error: { code: "MEETING_CREATION_FAILED" },
      };
    }
  }

  /**
   * Join a meeting
   */
  static async joinMeeting(joinData: JoinMeetingData): Promise<
    APIResponse<{
      meeting: IMeeting;
      participant: IParticipant;
    }>
  > {
    try {
      const { Meeting } = await import("@/models/Meeting");
      const { Participant } = await import("@/models/Participant");
      const { User } = await import("@/models/User");

      // Find meeting
      const meeting = await Meeting.findOne({
        roomId: joinData.roomId,
        status: { $in: ["waiting", "active"] },
      }).populate("hostId", "firstName lastName username avatar");

      if (!meeting) {
        return {
          success: false,
          message: "Meeting not found or has ended",
          error: { code: "MEETING_NOT_FOUND" },
        };
      }

      // Check if meeting is locked
      if (meeting.settings.lockMeeting) {
        return {
          success: false,
          message: "Meeting is locked and not accepting new participants",
          error: { code: "MEETING_LOCKED" },
        };
      }

      // Check capacity
      if (meeting.currentParticipants >= meeting.maxParticipants) {
        return {
          success: false,
          message: "Meeting has reached maximum capacity",
          error: { code: "MEETING_FULL" },
        };
      }

      // Verify password if required
      if (meeting.settings.enablePassword && meeting.password) {
        if (!joinData.password) {
          return {
            success: false,
            message: "Meeting password is required",
            error: { code: "PASSWORD_REQUIRED" },
          };
        }

        const bcrypt = await import("bcryptjs");
        const isValidPassword = await bcrypt.compare(
          joinData.password,
          meeting.password
        );
        if (!isValidPassword) {
          return {
            success: false,
            message: "Incorrect meeting password",
            error: { code: "INVALID_PASSWORD" },
          };
        }
      }

      // Get user information if authenticated
      let user: IUser | null = null;
      if (joinData.userId) {
        user = await User.findById(joinData.userId);
      }

      // Check if user is already in the meeting
      if (user) {
        const existingParticipant = await Participant.findOne({
          meetingId: meeting._id,
          userId: user._id,
          leftAt: { $exists: false },
        });

        if (existingParticipant) {
          return {
            success: false,
            message: "You are already in this meeting",
            error: { code: "ALREADY_IN_MEETING" },
          };
        }
      }

      // Determine participant role
      let role: IParticipant["role"] = "participant";
      if (user && user._id.toString() === meeting.hostId.toString()) {
        role = "host";
      } else if (!user) {
        role = "guest";
      }

      // Create participant
      const participant = new Participant({
        meetingId: meeting._id,
        userId: user?._id,
        displayName: user ? user.getFullName() : joinData.guestName || "Guest",
        guestName: !user ? joinData.guestName : undefined,
        avatar: user?.avatar,
        role,
        permissions: this.getDefaultPermissions(role),
        joinedAt: new Date(),
        mediaState: {
          audioEnabled: !meeting.settings.muteOnJoin,
          videoEnabled: meeting.settings.videoOnJoin,
          screenSharing: false,
          handRaised: false,
        },
        connectionQuality: {
          quality: "good",
          lastUpdated: new Date(),
        },
        ipAddress: joinData.deviceInfo?.ipAddress,
        userAgent: joinData.deviceInfo?.userAgent,
      });

      await participant.save();

      // Update meeting
      meeting.participants.push(participant._id);
      meeting.currentParticipants += 1;

      // Start meeting if it's the first participant and meeting is scheduled
      if (meeting.status === "waiting" && meeting.currentParticipants === 1) {
        meeting.status = "active";
        meeting.startedAt = new Date();
      }

      await meeting.save();

      return {
        success: true,
        message: "Successfully joined meeting",
        data: {
          meeting,
          participant,
        },
      };
    } catch (error) {
      console.error("Join meeting error:", error);
      return {
        success: false,
        message: "Failed to join meeting",
        error: { code: "JOIN_MEETING_FAILED" },
      };
    }
  }

  /**
   * Leave a meeting
   */
  static async leaveMeeting(
    meetingId: string,
    participantId: string
  ): Promise<APIResponse> {
    try {
      const { Meeting } = await import("@/models/Meeting");
      const { Participant } = await import("@/models/Participant");

      // Find participant
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Update participant
      participant.leftAt = new Date();
      participant.sessionDuration = Math.floor(
        (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000
      );
      await participant.save();

      // Update meeting
      const meeting = await Meeting.findById(meetingId);
      if (meeting) {
        meeting.currentParticipants = Math.max(
          0,
          meeting.currentParticipants - 1
        );

        // End meeting if no participants left
        if (meeting.currentParticipants === 0) {
          meeting.status = "ended";
          meeting.endedAt = new Date();
          meeting.duration = Math.floor(
            (meeting.endedAt.getTime() -
              (meeting.startedAt?.getTime() || meeting.createdAt.getTime())) /
            1000
          );
        }

        await meeting.save();
      }

      return {
        success: true,
        message: "Successfully left meeting",
      };
    } catch (error) {
      console.error("Leave meeting error:", error);
      return {
        success: false,
        message: "Failed to leave meeting",
        error: { code: "LEAVE_MEETING_FAILED" },
      };
    }
  }

  /**
   * End a meeting (host only)
   */
  static async endMeeting(
    meetingId: string,
    hostId: string
  ): Promise<APIResponse> {
    try {
      const { Meeting } = await import("@/models/Meeting");
      const { Participant } = await import("@/models/Participant");

      // Find meeting and verify host
      const meeting = await Meeting.findOne({
        _id: meetingId,
        hostId: hostId,
        status: { $in: ["waiting", "active"] },
      });

      if (!meeting) {
        return {
          success: false,
          message: "Meeting not found or you are not the host",
          error: { code: "MEETING_NOT_FOUND_OR_NOT_HOST" },
        };
      }

      // End meeting
      meeting.status = "ended";
      meeting.endedAt = new Date();
      meeting.duration = Math.floor(
        (meeting.endedAt.getTime() -
          (meeting.startedAt?.getTime() || meeting.createdAt.getTime())) /
        1000
      );
      await meeting.save();

      // Update all active participants
      await Participant.updateMany(
        {
          meetingId: meeting._id,
          leftAt: { $exists: false },
        },
        {
          leftAt: new Date(),
          $inc: {
            sessionDuration: {
              $divide: [{ $subtract: [new Date(), "$joinedAt"] }, 1000],
            },
          },
        }
      );

      return {
        success: true,
        message: "Meeting ended successfully",
      };
    } catch (error) {
      console.error("End meeting error:", error);
      return {
        success: false,
        message: "Failed to end meeting",
        error: { code: "END_MEETING_FAILED" },
      };
    }
  }

  /**
   * Update meeting settings
   */
  static async updateMeeting(
    meetingId: string,
    hostId: string,
    updateData: UpdateMeetingData
  ): Promise<APIResponse<IMeeting>> {
    try {
      const { Meeting } = await import("@/models/Meeting");

      // Find meeting and verify host
      const meeting = await Meeting.findOne({
        _id: meetingId,
        hostId: hostId,
        status: { $in: ["waiting", "active"] },
      });

      if (!meeting) {
        return {
          success: false,
          message: "Meeting not found or you are not the host",
          error: { code: "MEETING_NOT_FOUND_OR_NOT_HOST" },
        };
      }

      // Hash new password if provided
      if (updateData.password) {
        const bcrypt = await import("bcryptjs");
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Update meeting
      Object.assign(meeting, updateData);

      if (updateData.settings) {
        Object.assign(meeting.settings, updateData.settings);
      }

      await meeting.save();

      return {
        success: true,
        message: "Meeting updated successfully",
        data: meeting,
      };
    } catch (error) {
      console.error("Update meeting error:", error);
      return {
        success: false,
        message: "Failed to update meeting",
        error: { code: "UPDATE_MEETING_FAILED" },
      };
    }
  }

  /**
   * Get meeting details
   */
  static async getMeeting(roomId: string): Promise<APIResponse<IMeeting>> {
    try {
      const { Meeting } = await import("@/models/Meeting");

      const meeting = await Meeting.findOne({ roomId })
        .populate("hostId", "firstName lastName username avatar")
        .populate("participants");

      if (!meeting) {
        return {
          success: false,
          message: "Meeting not found",
          error: { code: "MEETING_NOT_FOUND" },
        };
      }

      return {
        success: true,
        message: "Meeting found",
        data: meeting,
      };
    } catch (error) {
      console.error("Get meeting error:", error);
      return {
        success: false,
        message: "Failed to get meeting",
        error: { code: "GET_MEETING_FAILED" },
      };
    }
  }

  /**
   * Get user's meetings
   */
  static async getUserMeetings(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<APIResponse<IMeeting[]>> {
    try {
      const { Meeting } = await import("@/models/Meeting");

      const skip = (page - 1) * limit;

      const meetings = await Meeting.find({
        hostId: userId,
      })
        .populate("hostId", "firstName lastName username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Meeting.countDocuments({ hostId: userId });

      return {
        success: true,
        message: "Meetings retrieved successfully",
        data: meetings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get user meetings error:", error);
      return {
        success: false,
        message: "Failed to get user meetings",
        error: { code: "GET_USER_MEETINGS_FAILED" },
      };
    }
  }

  /**
   * Generate unique room ID
   */
  private static generateRoomId(): string {
    // Generate a 9-character alphanumeric room ID (e.g., "ABC-123-XYZ")
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < 9; i++) {
      if (i === 3 || i === 6) {
        result += "-";
      } else {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    return result;
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
}

export default MeetingService;
