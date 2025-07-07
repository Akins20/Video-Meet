import mongoose, { Schema, Model, Document } from "mongoose";
import crypto from "crypto";
import { IParticipant } from "../types/models";

/**
 * Enhanced Participant Schema Definition
 * Represents a user's participation in a specific meeting with enhanced session management
 * Fixed TypeScript errors and validation issues
 */
const ParticipantSchema = new Schema<IParticipant>(
  {
    // References
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: [true, "Meeting ID is required"],
      index: true, // Index for meeting queries
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for guest users
      index: true, // Index for user queries
    },

    // Identity information
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [100, "Display name cannot exceed 100 characters"],
      validate: {
        validator: function (name: string): boolean {
          return name.length >= 1;
        },
        message: "Display name cannot be empty",
      },
    },

    guestName: {
      type: String,
      trim: true,
      maxlength: [100, "Guest name cannot exceed 100 characters"],
      validate: {
        validator: function (this: IParticipant, guestName: string): boolean {
          // Guest name is required if userId is null (guest user)
          if (!this.userId && !guestName) {
            return false;
          }
          return true;
        },
        message: "Guest name is required for guest participants",
      },
    },

    avatar: {
      type: String,
      validate: {
        validator: function (url: string): boolean {
          if (!url) return true; // Optional field
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        },
        message: "Avatar must be a valid image URL",
      },
    },

    // Role and permissions
    role: {
      type: String,
      enum: {
        values: ["host", "moderator", "participant", "guest"],
        message: "Role must be host, moderator, participant, or guest",
      },
      required: [true, "Role is required"],
      default: "participant",
      index: true, // Index for role-based queries
    },

    permissions: {
      canMuteOthers: {
        type: Boolean,
        default: false,
      },
      canRemoveParticipants: {
        type: Boolean,
        default: false,
      },
      canManageRecording: {
        type: Boolean,
        default: false,
      },
      canShareScreen: {
        type: Boolean,
        default: true,
      },
      canShareFiles: {
        type: Boolean,
        default: true,
      },
      canUseWhiteboard: {
        type: Boolean,
        default: true,
      },
    },

    // Session information
    joinedAt: {
      type: Date,
      required: [true, "Join time is required"],
      default: Date.now,
      index: true, // Index for chronological queries
    },

    leftAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (this: IParticipant, leftAt: Date): boolean {
          // leftAt must be after joinedAt
          if (leftAt && this.joinedAt) {
            return leftAt > this.joinedAt;
          }
          return true;
        },
        message: "Leave time must be after join time",
      },
    },

    sessionDuration: {
      type: Number, // Duration in seconds
      default: null,
      min: [0, "Session duration cannot be negative"],
    },

    // *** ENHANCED SESSION TRACKING - NEW REQUIRED FIELDS ***
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
      unique: true, // Ensure session IDs are unique across all participants
      index: true, // Index for session lookups
      default: () => crypto.randomUUID(), // Auto-generate if not provided
      validate: {
        validator: function (sessionId: string): boolean {
          return !!(sessionId && sessionId.length >= 10);
        },
        message: "Session ID must be at least 10 characters long",
      },
    },

    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      index: true, // Index for device tracking
      validate: {
        validator: function (deviceId: string): boolean {
          return !!(deviceId && deviceId.length >= 8);
        },
        message: "Device ID must be at least 8 characters long",
      },
    },

    deviceType: {
      type: String,
      enum: {
        values: ["web", "mobile", "desktop"],
        message: "Device type must be web, mobile, or desktop",
      },
      required: [true, "Device type is required"],
      default: "web",
      index: true, // Index for device type queries
    },

    endReason: {
      type: String,
      enum: {
        values: [
          "user_left",
          "replaced_by_new_session", 
          "meeting_ended_by_host",
          "session_cleanup_stale",
          "connection_lost",
          "kicked_by_moderator"
        ],
        message: "Invalid end reason",
      },
      default: null,
    },

    // Connection information
    socketId: {
      type: String,
      default: null,
      index: true, // Index for socket lookups
    },

    peerId: {
      type: String,
      default: null,
      validate: {
        validator: function (peerId: string): boolean {
          if (!peerId) return true;
          // Basic peer ID validation (can be enhanced based on WebRTC library)
          return peerId.length >= 10 && peerId.length <= 50;
        },
        message: "Peer ID must be between 10 and 50 characters",
      },
    },

    ipAddress: {
      type: String,
      validate: {
        validator: function (ip: string): boolean {
          if (!ip) return true;
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(ip) || ipv6Regex.test(ip);
        },
        message: "Invalid IP address format",
      },
    },

    userAgent: {
      type: String,
      maxlength: [500, "User agent cannot exceed 500 characters"],
    },

    // Media state
    mediaState: {
      audioEnabled: {
        type: Boolean,
        default: true,
      },
      videoEnabled: {
        type: Boolean,
        default: true,
      },
      screenSharing: {
        type: Boolean,
        default: false,
      },
      handRaised: {
        type: Boolean,
        default: false,
      },
    },

    // Connection quality
    connectionQuality: {
      latency: {
        type: Number,
        min: [0, "Latency cannot be negative"],
        max: [5000, "Latency cannot exceed 5000ms"],
      },
      bandwidth: {
        type: Number,
        min: [0, "Bandwidth cannot be negative"],
      },
      packetLoss: {
        type: Number,
        min: [0, "Packet loss cannot be negative"],
        max: [100, "Packet loss cannot exceed 100%"],
      },
      quality: {
        type: String,
        enum: {
          values: ["poor", "fair", "good", "excellent"],
          message: "Quality must be poor, fair, good, or excellent",
        },
        default: "good",
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    versionKey: false, // Remove __v field
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

/**
 * Enhanced indexes for performance optimization and session management
 */
ParticipantSchema.index({ meetingId: 1, leftAt: 1 }); // Active participants
ParticipantSchema.index({ userId: 1, joinedAt: -1 }); // User's participation history
ParticipantSchema.index({ meetingId: 1, role: 1 }); // Participants by role
ParticipantSchema.index({ socketId: 1 }, { sparse: true }); // Socket lookups
ParticipantSchema.index({ peerId: 1 }, { sparse: true }); // WebRTC peer lookups

// *** ENHANCED SESSION MANAGEMENT INDEXES ***
ParticipantSchema.index({ sessionId: 1 }, { unique: true }); // Unique session lookups
ParticipantSchema.index({ deviceId: 1, leftAt: 1 }); // Device-based session tracking
ParticipantSchema.index({ userId: 1, meetingId: 1, leftAt: 1 }); // User active sessions in meetings
ParticipantSchema.index({ meetingId: 1, deviceId: 1, leftAt: 1 }); // Meeting device sessions
ParticipantSchema.index({ deviceType: 1, leftAt: 1 }); // Device type tracking

// Compound index for enhanced session queries
ParticipantSchema.index({
  meetingId: 1,
  userId: 1,
  leftAt: 1,
  joinedAt: 1,
});

// Index for stale session cleanup
ParticipantSchema.index({ 
  leftAt: 1, 
  joinedAt: 1,
  'connectionQuality.lastUpdated': 1
});

/**
 * Pre-save middleware to auto-calculate session duration
 */
ParticipantSchema.pre("save", function (next) {
  // Calculate session duration when participant leaves
  if (this.isModified("leftAt") && this.leftAt && this.joinedAt) {
    this.sessionDuration = Math.floor(
      (this.leftAt.getTime() - this.joinedAt.getTime()) / 1000
    );
  }
  next();
});

/**
 * Pre-save middleware to ensure sessionId uniqueness
 */
ParticipantSchema.pre("save", function (next) {
  // Generate sessionId if not provided
  if (!this.sessionId) {
    this.sessionId = crypto.randomUUID();
  }
  next();
});

/**
 * Pre-save middleware to validate endReason when leaving
 */
ParticipantSchema.pre("save", function (next) {
  // Set endReason to 'user_left' if leftAt is set but no endReason provided
  if (this.isModified("leftAt") && this.leftAt && !this.endReason) {
    this.endReason = "user_left";
  }
  next();
});

/**
 * Helper function: Get default permissions based on role
 */
function getDefaultPermissions(
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
 * Pre-save middleware to set default permissions based on role
 */
ParticipantSchema.pre("save", function (next) {
  // Set default permissions if this is a new participant
  if (this.isNew) {
    this.permissions = getDefaultPermissions(this.role);
  }
  next();
});

/**
 * Pre-save middleware to validate guest user logic
 */
ParticipantSchema.pre("save", function (next) {
  // Ensure guest users have guest names and appropriate roles
  if (!this.userId) {
    if (!this.guestName) {
      return next(new Error("Guest participants must have a guest name"));
    }
    if (this.role === "host") {
      return next(new Error("Guest participants cannot be hosts"));
    }
  }
  next();
});

/**
 * Instance method: Check if participant is online
 */
ParticipantSchema.methods.isOnline = function (): boolean {
  // Participant is online if they haven't left and have recent connection quality update
  if (this.leftAt) return false;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (
    this.connectionQuality &&
    this.connectionQuality.lastUpdated &&
    this.connectionQuality.lastUpdated >= fiveMinutesAgo
  ) {
    return true;
  }
  return false;
};

/**
 * Instance method: Update connection quality
 */
ParticipantSchema.methods.updateConnectionQuality = function (
  metrics: Partial<IParticipant['connectionQuality']>
): void {
  Object.assign(this.connectionQuality, metrics);
  this.connectionQuality.lastUpdated = new Date();
  this.markModified('connectionQuality');
};

/**
 * Instance method: Check if participant has a specific permission
 */
ParticipantSchema.methods.hasPermission = function (
  permission: keyof IParticipant['permissions']
): boolean {
  return this.permissions[permission] || false;
};

/**
 * Static method: Find active participants in a meeting
 */
ParticipantSchema.statics.findActiveInMeeting = function (meetingId: string) {
  return this.find({
    meetingId: new mongoose.Types.ObjectId(meetingId),
    leftAt: { $exists: false },
  })
    .populate("userId", "firstName lastName username avatar")
    .sort({ joinedAt: 1 });
};

/**
 * Static method: Find participant by socket ID
 */
ParticipantSchema.statics.findBySocketId = function (socketId: string) {
  return this.findOne({
    socketId,
    leftAt: { $exists: false },
  })
    .populate("meetingId", "roomId title hostId")
    .populate("userId", "firstName lastName username");
};

/**
 * Static method: Find participant by session ID
 */
ParticipantSchema.statics.findBySessionId = function (sessionId: string) {
  return this.findOne({
    sessionId,
  });
};

/**
 * Static method: Find active sessions for a user in a meeting
 */
ParticipantSchema.statics.findActiveUserSessions = function (
  meetingId: string, 
  userId: string
) {
  return this.find({
    meetingId: new mongoose.Types.ObjectId(meetingId),
    userId: new mongoose.Types.ObjectId(userId),
    leftAt: { $exists: false },
  }).sort({ joinedAt: -1 });
};

/**
 * Static method: Find active sessions for a device
 */
ParticipantSchema.statics.findActiveDeviceSessions = function (
  deviceId: string
) {
  return this.find({
    deviceId,
    leftAt: { $exists: false },
  }).sort({ joinedAt: -1 });
};

/**
 * Static method: Find guest sessions by name and device info
 */
ParticipantSchema.statics.findGuestSessions = function (
  meetingId: string,
  guestName: string,
  deviceId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const query: any = {
    meetingId: new mongoose.Types.ObjectId(meetingId),
    userId: { $exists: false },
    guestName: guestName,
    leftAt: { $exists: false },
  };

  // Add device/connection filters if provided
  if (deviceId) query.deviceId = deviceId;
  if (ipAddress) query.ipAddress = ipAddress;
  if (userAgent) query.userAgent = userAgent;

  return this.find(query).sort({ joinedAt: -1 });
};

/**
 * Static method: Find stale sessions for cleanup
 */
ParticipantSchema.statics.findStaleSessions = function (
  maxInactiveMinutes: number = 30
) {
  const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
  
  return this.find({
    leftAt: { $exists: false },
    joinedAt: { $lt: cutoffTime },
    'connectionQuality.lastUpdated': { $lt: cutoffTime }
  });
};

/**
 * Static method: Force end sessions by device ID (for session replacement)
 */
ParticipantSchema.statics.forceEndDeviceSessions = function (
  deviceId: string,
  endReason: string = 'replaced_by_new_session'
) {
  const now = new Date();
  
  return this.updateMany(
    {
      deviceId,
      leftAt: { $exists: false },
    },
    {
      $set: {
        leftAt: now,
        endReason: endReason,
      },
    }
  );
};

/**
 * Static method: Force end user sessions in a meeting (for session replacement)
 */
ParticipantSchema.statics.forceEndUserMeetingSessions = function (
  meetingId: string,
  userId: string,
  endReason: string = 'replaced_by_new_session'
) {
  const now = new Date();
  
  return this.updateMany(
    {
      meetingId: new mongoose.Types.ObjectId(meetingId),
      userId: new mongoose.Types.ObjectId(userId),
      leftAt: { $exists: false },
    },
    {
      $set: {
        leftAt: now,
        endReason: endReason,
      },
    }
  );
};

/**
 * Static method: Bulk update session end reasons
 */
ParticipantSchema.statics.bulkEndSessions = function (
  sessionIds: string[],
  endReason: string = 'session_cleanup_stale'
) {
  const now = new Date();
  
  return this.updateMany(
    {
      sessionId: { $in: sessionIds },
      leftAt: { $exists: false },
    },
    {
      $set: {
        leftAt: now,
        endReason: endReason,
      },
    }
  );
};

/**
 * Static method: Get meeting participant statistics
 */
ParticipantSchema.statics.getMeetingStats = function (meetingId: string) {
  return this.aggregate([
    {
      $match: {
        meetingId: new mongoose.Types.ObjectId(meetingId),
      },
    },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        activeParticipants: {
          $sum: {
            $cond: [{ $eq: ["$leftAt", null] }, 1, 0],
          },
        },
        guestParticipants: {
          $sum: {
            $cond: [{ $eq: ["$userId", null] }, 1, 0],
          },
        },
        averageSessionDuration: { $avg: "$sessionDuration" },
        totalSessionTime: { $sum: "$sessionDuration" },
        participantsByRole: {
          $push: "$role",
        },
        connectionQualityDistribution: {
          $push: "$connectionQuality.quality",
        },
        deviceTypeDistribution: {
          $push: "$deviceType",
        },
        endReasonDistribution: {
          $push: "$endReason",
        },
      },
    },
    {
      $project: {
        totalParticipants: 1,
        activeParticipants: 1,
        guestParticipants: 1,
        averageSessionDuration: 1,
        totalSessionTime: 1,
        roleDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$participantsByRole"] },
              as: "role",
              in: {
                k: "$$role",
                v: {
                  $size: {
                    $filter: {
                      input: "$participantsByRole",
                      cond: { $eq: ["$$this", "$$role"] },
                    },
                  },
                },
              },
            },
          },
        },
        qualityDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$connectionQualityDistribution"] },
              as: "quality",
              in: {
                k: "$$quality",
                v: {
                  $size: {
                    $filter: {
                      input: "$connectionQualityDistribution",
                      cond: { $eq: ["$$this", "$$quality"] },
                    },
                  },
                },
              },
            },
          },
        },
        deviceDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$deviceTypeDistribution"] },
              as: "device",
              in: {
                k: "$$device",
                v: {
                  $size: {
                    $filter: {
                      input: "$deviceTypeDistribution",
                      cond: { $eq: ["$$this", "$$device"] },
                    },
                  },
                },
              },
            },
          },
        },
        endReasonDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$endReasonDistribution"] },
              as: "reason",
              in: {
                k: "$$reason",
                v: {
                  $size: {
                    $filter: {
                      input: "$endReasonDistribution",
                      cond: { $eq: ["$$this", "$$reason"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);
};

/**
 * Static method: Get user participation history
 */
ParticipantSchema.statics.getUserHistory = function (
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;

  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .populate("meetingId", "title roomId startedAt endedAt duration hostId")
    .sort({ joinedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Static method: Clean up old participant records
 */
ParticipantSchema.statics.cleanupOldRecords = function (daysOld: number = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    leftAt: { $lt: cutoffDate },
  });
};

/**
 * Virtual field: Is participant currently active
 */
ParticipantSchema.virtual("isActive").get(function (this: IParticipant) {
  return !this.leftAt;
});

/**
 * Virtual field: Current session duration (for active participants)
 */
ParticipantSchema.virtual("currentSessionDuration").get(function (this: IParticipant) {
  if (this.leftAt) return this.sessionDuration;
  return Math.floor((Date.now() - this.joinedAt.getTime()) / 1000);
});

/**
 * Virtual field: Connection status indicator
 */
ParticipantSchema.virtual("connectionStatus").get(function (this: IParticipant) {
  if (this.leftAt) return "offline";

  const lastUpdate = this.connectionQuality.lastUpdated;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  if (lastUpdate < twoMinutesAgo) return "disconnected";
  return "connected";
});

/**
 * Virtual field: Session info summary
 */
ParticipantSchema.virtual("sessionInfo").get(function (this: IParticipant) {
  return {
    sessionId: this.sessionId,
    deviceId: this.deviceId,
    deviceType: this.deviceType,
    isActive: !this.leftAt,
    duration: this.leftAt ? this.sessionDuration : (this as any).currentSessionDuration,
    endReason: this.endReason,
  };
});

// Ensure virtual fields are included in JSON output
ParticipantSchema.set("toJSON", { virtuals: true });
ParticipantSchema.set("toObject", { virtuals: true });

/**
 * Interface for static methods (to help with TypeScript)
 */
interface IParticipantModel extends Model<IParticipant> {
  findActiveInMeeting(meetingId: string): any;
  findBySocketId(socketId: string): any;
  findBySessionId(sessionId: string): any;
  findActiveUserSessions(meetingId: string, userId: string): any;
  findActiveDeviceSessions(deviceId: string): any;
  findGuestSessions(meetingId: string, guestName: string, deviceId?: string, ipAddress?: string, userAgent?: string): any;
  findStaleSessions(maxInactiveMinutes?: number): any;
  forceEndDeviceSessions(deviceId: string, endReason?: string): any;
  forceEndUserMeetingSessions(meetingId: string, userId: string, endReason?: string): any;
  bulkEndSessions(sessionIds: string[], endReason?: string): any;
  getMeetingStats(meetingId: string): any;
  getUserHistory(userId: string, page?: number, limit?: number): any;
  cleanupOldRecords(daysOld?: number): any;
}

/**
 * Create and export the Participant model
 */
export const Participant: IParticipantModel = mongoose.model<IParticipant, IParticipantModel>(
  "Participant",
  ParticipantSchema
);

// Export default
export default Participant;