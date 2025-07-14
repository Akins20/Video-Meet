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
    deviceId?: string; // Unique device identifier
    sessionId?: string; // Unique session identifier
  };
  forceJoin?: boolean; // Force join by ending existing sessions
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
 * Handles all meeting-related business logic with enhanced session management
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
      const { Meeting } = await import("../models/Meeting");

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
   * Join a meeting with enhanced session management
   */
  static async joinMeeting(joinData: JoinMeetingData): Promise<
    APIResponse<{
      meeting: IMeeting;
      participant: IParticipant;
      replacedSession?: boolean;
    }>
  > {
    try {
      const [{ Meeting }, { Participant }] = await Promise.all([
        import("../models/Meeting"),
        import("../models/Participant"),
      ]);
      const { User } = await import("../models/User");
      console.log("joinMeeting", joinData);

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

      // Create unique session identifier
      const sessionId = joinData.deviceInfo?.sessionId || crypto.randomUUID();
      const deviceId = joinData.deviceInfo?.deviceId || crypto.randomUUID();

      // **ENHANCED SESSION MANAGEMENT**
      let replacedSession = false;

      if (user) {
        // For authenticated users: Check for existing active sessions
        const existingSessions = await Participant.find({
          meetingId: meeting._id,
          userId: user._id,
          leftAt: { $exists: false },
        }).sort({ joinedAt: -1 });

        if (existingSessions.length > 0) {
          if (joinData.forceJoin) {
            // Force join: End all existing sessions for this user
            console.log(
              `Force joining: Ending ${existingSessions.length} existing sessions for user ${user._id}`
            );

            const now = new Date();
            const endSessionPromises = existingSessions.map(async (session) => {
              const sessionDuration = Math.floor(
                (now.getTime() - new Date(session.joinedAt).getTime()) / 1000
              );

              return Participant.updateOne(
                { _id: session._id },
                {
                  leftAt: now,
                  sessionDuration: sessionDuration,
                  endReason: "replaced_by_new_session",
                }
              );
            });

            await Promise.all(endSessionPromises);

            // Update meeting participant count
            meeting.currentParticipants = Math.max(
              0,
              meeting.currentParticipants - existingSessions.length
            );

            replacedSession = true;
          } else {
            // Default behavior: Reject join attempt
            return {
              success: false,
              message:
                "You are already in this meeting from another device. Use forceJoin=true to replace existing session.",
              error: {
                code: "ALREADY_IN_MEETING",
                details: {
                  existingSessions: existingSessions.length,
                  lastJoinedAt: existingSessions[0].joinedAt,
                  suggestion: "Set forceJoin=true to replace existing session",
                },
              },
            };
          }
        }
      } else {
        // For guests: Check by guestName + device info to prevent duplicates
        const guestName = joinData.guestName || "Guest";

        const existingGuestSessions = await Participant.find({
          meetingId: meeting._id,
          userId: { $exists: false },
          guestName: guestName,
          leftAt: { $exists: false },
        });

        // Allow multiple guests with same name but different devices
        // But prevent exact duplicate sessions from same device
        const sameDeviceSession = existingGuestSessions.find(
          (session) =>
            session.deviceId === deviceId ||
            (session.ipAddress === joinData.deviceInfo?.ipAddress &&
              session.userAgent === joinData.deviceInfo?.userAgent)
        );

        if (sameDeviceSession) {
          if (joinData.forceJoin) {
            // End the existing session from same device
            const now = new Date();
            const sessionDuration = Math.floor(
              (now.getTime() - new Date(sameDeviceSession.joinedAt).getTime()) /
                1000
            );

            await Participant.updateOne(
              { _id: sameDeviceSession._id },
              {
                leftAt: now,
                sessionDuration: sessionDuration,
                endReason: "replaced_by_new_session",
              }
            );

            meeting.currentParticipants = Math.max(
              0,
              meeting.currentParticipants - 1
            );
            replacedSession = true;
          } else {
            return {
              success: false,
              message:
                "A guest session is already active from this device. Use forceJoin=true to replace it.",
              error: {
                code: "DEVICE_ALREADY_IN_MEETING",
                details: {
                  deviceId: sameDeviceSession.deviceId,
                  joinedAt: sameDeviceSession.joinedAt,
                },
              },
            };
          }
        }
      }

      // Check capacity after potential session cleanup
      if (meeting.currentParticipants >= meeting.maxParticipants) {
        return {
          success: false,
          message: "Meeting has reached maximum capacity",
          error: { code: "MEETING_FULL" },
        };
      }

      // Determine participant role
      let role: IParticipant["role"] = "participant";
      if (user && user._id.toString() === meeting.hostId.toString()) {
        role = "host";
      } else if (!user) {
        role = "guest";
      }

      // Get user full name safely
      const getFullName = (user: IUser | null): string => {
        if (!user) return "";
        if (typeof user.getFullName === "function") {
          return user.getFullName();
        }
        return `${user.firstName} ${user.lastName}`.trim();
      };

      const displayName = user
        ? getFullName(user)
        : joinData.guestName || "Guest";

      // Create new participant with enhanced tracking
      const participant = new Participant({
        meetingId: meeting._id,
        userId: user?._id,
        displayName: displayName,
        guestName: !user ? joinData.guestName || "Guest" : undefined,
        avatar: user?.avatar,
        role,
        permissions: this.getDefaultPermissions(role),
        joinedAt: new Date(),

        // Enhanced session tracking - REQUIRED FIELDS
        sessionId: sessionId,
        deviceId: deviceId,
        deviceType: joinData.deviceInfo?.deviceType || "web",

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

        // Device information
        ipAddress: joinData.deviceInfo?.ipAddress,
        userAgent: joinData.deviceInfo?.userAgent,
      });

      console.log("New participant joining:", {
        userId: user?._id,
        sessionId,
        deviceId,
        deviceType: participant.deviceType,
        replacedSession,
        displayName: participant.displayName,
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
        message: replacedSession
          ? "Successfully joined meeting (replaced existing session)"
          : "Successfully joined meeting",
        data: {
          meeting,
          participant,
          replacedSession,
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
   * Leave a meeting with enhanced cleanup
   */
  static async leaveMeeting(
    meetingId: string,
    participantId: string,
    reason: string = "user_left"
  ): Promise<APIResponse> {
    try {
      const { Meeting } = await import("../models/Meeting");
      const { Participant } = await import("../models/Participant");

      // Find participant
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      // Check if already left
      if (participant.leftAt) {
        return {
          success: true,
          message: "Participant already left the meeting",
        };
      }

      // Update participant with enhanced tracking
      const now = new Date();
      participant.leftAt = now;
      participant.sessionDuration = Math.floor(
        (now.getTime() - participant.joinedAt.getTime()) / 1000
      );
      participant.endReason = reason;
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

      console.log("Participant left:", {
        participantId,
        sessionId: participant.sessionId,
        reason,
        sessionDuration: participant.sessionDuration,
      });

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
   * End a meeting (host only) with proper session cleanup
   */
  static async endMeeting(
    meetingId: string,
    hostId: string
  ): Promise<APIResponse> {
    try {
      const { Meeting } = await import("../models/Meeting");
      const { Participant } = await import("../models/Participant");

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

      // Get all active participants
      const activeParticipants = await Participant.find({
        meetingId: meeting._id,
        leftAt: { $exists: false },
      });

      const now = new Date();

      // Update each participant with proper session cleanup
      const updatePromises = activeParticipants.map((participant) => {
        const sessionDuration = Math.floor(
          (now.getTime() - new Date(participant.joinedAt).getTime()) / 1000
        );

        return Participant.updateOne(
          { _id: participant._id },
          {
            leftAt: now,
            sessionDuration: sessionDuration,
            endReason: "meeting_ended_by_host",
          }
        );
      });

      await Promise.all(updatePromises);

      console.log("Meeting ended:", {
        meetingId,
        hostId,
        activeParticipantsCount: activeParticipants.length,
        duration: meeting.duration,
      });

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
   * Clean up stale sessions (utility method for maintenance)
   */
  static async cleanupStaleSessions(
    maxInactiveMinutes: number = 30
  ): Promise<APIResponse> {
    try {
      const { Participant } = await import("../models/Participant");
      const { Meeting } = await import("../models/Meeting");

      const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);

      // Find stale sessions (joined long ago but no recent activity)
      const staleSessions = await Participant.find({
        leftAt: { $exists: false },
        joinedAt: { $lt: cutoffTime },
        // Add additional criteria based on your last activity tracking
      });

      if (staleSessions.length === 0) {
        return {
          success: true,
          message: "No stale sessions found",
        };
      }

      const now = new Date();
      const cleanupPromises = staleSessions.map(async (session) => {
        const sessionDuration = Math.floor(
          (now.getTime() - new Date(session.joinedAt).getTime()) / 1000
        );

        // Update participant
        await Participant.updateOne(
          { _id: session._id },
          {
            leftAt: now,
            sessionDuration: sessionDuration,
            endReason: "session_cleanup_stale",
          }
        );

        // Update meeting participant count
        await Meeting.updateOne(
          { _id: session.meetingId },
          { $inc: { currentParticipants: -1 } }
        );
      });

      await Promise.all(cleanupPromises);

      console.log(`Cleaned up ${staleSessions.length} stale sessions`);

      return {
        success: true,
        message: `Cleaned up ${staleSessions.length} stale sessions`,
      };
    } catch (error) {
      console.error("Cleanup stale sessions error:", error);
      return {
        success: false,
        message: "Failed to cleanup stale sessions",
        error: { code: "CLEANUP_FAILED" },
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
      const { Meeting } = await import("../models/Meeting");

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
      const { Meeting } = await import("../models/Meeting");

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
      const { Meeting } = await import("../models/Meeting");

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
    // Generate a room ID in format ABC-123-XYZ (3 letters, 3 numbers, 3 letters)
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    // Generate 3 letters
    const firstPart = Array.from({ length: 3 }, () =>
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join("");

    // Generate 3 numbers
    const secondPart = Array.from({ length: 3 }, () =>
      numbers.charAt(Math.floor(Math.random() * numbers.length))
    ).join("");

    // Generate 3 letters
    const thirdPart = Array.from({ length: 3 }, () =>
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join("");

    const result = `${firstPart}-${secondPart}-${thirdPart}`;
    console.log("Generated room ID:", result);

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
