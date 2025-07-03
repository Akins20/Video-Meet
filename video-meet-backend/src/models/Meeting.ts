import mongoose, { Schema, Model } from "mongoose";
import crypto from "crypto";
import { IMeeting } from "@/types/models";

/**
 * Meeting Schema Definition
 * Comprehensive meeting model with scheduling, settings, and participant management
 */
const MeetingSchema = new Schema<IMeeting>(
  {
    // Basic meeting information
    roomId: {
      type: String,
      required: [true, "Room ID is required"],
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (roomId: string) {
          // Validate format: ABC-123-XYZ (3 chars, dash, 3 chars, dash, 3 chars)
          return /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(roomId);
        },
        message: "Room ID must be in format ABC-123-XYZ",
      },
      index: true, // Index for fast room lookups
    },

    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      maxlength: [100, "Meeting title cannot exceed 100 characters"],
      validate: {
        validator: function (title: string) {
          return title.length >= 3;
        },
        message: "Meeting title must be at least 3 characters long",
      },
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Meeting description cannot exceed 500 characters"],
    },

    password: {
      type: String,
      select: false, // Don't include password in queries by default
      validate: {
        validator: function (password: string) {
          // Only validate if password is provided
          if (!password) return true;
          return password.length >= 4;
        },
        message: "Meeting password must be at least 4 characters long",
      },
    },

    // Host information
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host ID is required"],
      index: true, // Index for host queries
    },

    // Meeting type and scheduling
    type: {
      type: String,
      enum: {
        values: ["instant", "scheduled", "recurring"],
        message: "Meeting type must be instant, scheduled, or recurring",
      },
      default: "instant",
      index: true,
    },

    isScheduled: {
      type: Boolean,
      default: false,
      index: true,
    },

    scheduledAt: {
      type: Date,
      validate: {
        validator: function (scheduledAt: Date) {
          // If meeting is scheduled, scheduledAt must be in the future
          if (this.isScheduled && scheduledAt) {
            return scheduledAt > new Date();
          }
          return true;
        },
        message: "Scheduled time must be in the future",
      },
    },

    timezone: {
      type: String,
      validate: {
        validator: function (timezone: string) {
          if (!timezone) return true;
          // Basic timezone validation (can be enhanced with timezone library)
          return /^[A-Za-z]+\/[A-Za-z_]+$/.test(timezone);
        },
        message: "Invalid timezone format",
      },
    },

    // Recurring meeting settings
    recurring: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
      },
      interval: {
        type: Number,
        min: [1, "Interval must be at least 1"],
        max: [12, "Interval cannot exceed 12"],
      },
      daysOfWeek: {
        type: [Number],
        validate: {
          validator: function (days: number[]) {
            return days.every((day) => day >= 0 && day <= 6);
          },
          message: "Days of week must be between 0 (Sunday) and 6 (Saturday)",
        },
      },
      endDate: Date,
      maxOccurrences: {
        type: Number,
        min: [1, "Max occurrences must be at least 1"],
        max: [100, "Max occurrences cannot exceed 100"],
      },
    },

    // Meeting status
    status: {
      type: String,
      enum: {
        values: ["waiting", "active", "ended", "cancelled"],
        message: "Status must be waiting, active, ended, or cancelled",
      },
      default: "waiting",
      index: true, // Index for status queries
    },

    startedAt: {
      type: Date,
      validate: {
        validator: function (startedAt: Date) {
          // startedAt should be set when status becomes 'active'
          if (this.status === "active" && !startedAt) {
            return false;
          }
          return true;
        },
        message: "Started time is required when meeting is active",
      },
    },

    endedAt: {
      type: Date,
      validate: {
        validator: function (endedAt: Date) {
          // endedAt should be after startedAt
          if (endedAt && this.startedAt) {
            return endedAt > this.startedAt;
          }
          return true;
        },
        message: "End time must be after start time",
      },
    },

    duration: {
      type: Number, // Duration in seconds
      min: [0, "Duration cannot be negative"],
    },

    // Capacity and limits
    maxParticipants: {
      type: Number,
      required: [true, "Max participants is required"],
      min: [2, "Meeting must allow at least 2 participants"],
      max: [100, "Meeting cannot exceed 100 participants"],
      default: 10,
    },

    currentParticipants: {
      type: Number,
      default: 0,
      min: [0, "Current participants cannot be negative"],
      validate: {
        validator: function (current: number) {
          return current <= this.maxParticipants;
        },
        message: "Current participants cannot exceed maximum participants",
      },
    },

    // Meeting settings
    settings: {
      // Basic features
      allowGuests: {
        type: Boolean,
        default: true,
      },
      muteOnJoin: {
        type: Boolean,
        default: false,
      },
      videoOnJoin: {
        type: Boolean,
        default: true,
      },
      waitingRoom: {
        type: Boolean,
        default: false,
      },

      // Communication features
      chat: {
        type: Boolean,
        default: true,
      },
      screenShare: {
        type: Boolean,
        default: true,
      },
      fileSharing: {
        type: Boolean,
        default: true,
      },
      whiteboard: {
        type: Boolean,
        default: false,
      },

      // Recording settings
      recording: {
        type: Boolean,
        default: false,
      },
      autoRecord: {
        type: Boolean,
        default: false,
      },
      recordingUrl: {
        type: String,
        validate: {
          validator: function (url: string) {
            if (!url) return true;
            return /^https?:\/\/.+/.test(url);
          },
          message: "Recording URL must be a valid HTTP/HTTPS URL",
        },
      },

      // Security settings
      enablePassword: {
        type: Boolean,
        default: false,
      },
      lockMeeting: {
        type: Boolean,
        default: false,
      },

      // Quality settings
      maxVideoQuality: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "high",
      },
      enableBackgroundBlur: {
        type: Boolean,
        default: true,
      },
    },

    // Participant management
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "Participant",
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    versionKey: false, // Remove __v field
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password; // Never include password in JSON
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
 * Indexes for performance optimization
 */
MeetingSchema.index({ roomId: 1 }, { unique: true });
MeetingSchema.index({ hostId: 1, status: 1 });
MeetingSchema.index({ type: 1, scheduledAt: 1 });
MeetingSchema.index({ status: 1, createdAt: -1 });
MeetingSchema.index({ "settings.allowGuests": 1, status: 1 });

// Compound index for scheduled meetings
MeetingSchema.index({
  type: 1,
  scheduledAt: 1,
  status: 1,
});

/**
 * Pre-save middleware to generate room ID if not provided
 */
MeetingSchema.pre("save", function (next) {
  if (!this.roomId) {
    this.roomId = this.generateRoomId();
  }
  next();
});

/**
 * Pre-save middleware to validate recurring meeting settings
 */
MeetingSchema.pre("save", function (next) {
  if (this.type === "recurring") {
    if (!this.recurring || !this.recurring.frequency) {
      return next(
        new Error("Recurring meetings must have frequency specified")
      );
    }

    if (
      this.recurring.frequency === "weekly" &&
      (!this.recurring.daysOfWeek || this.recurring.daysOfWeek.length === 0)
    ) {
      return next(
        new Error("Weekly recurring meetings must have days of week specified")
      );
    }
  }
  next();
});

/**
 * Pre-save middleware to auto-calculate duration when meeting ends
 */
MeetingSchema.pre("save", function (next) {
  if (this.isModified("endedAt") && this.endedAt && this.startedAt) {
    this.duration = Math.floor(
      (this.endedAt.getTime() - this.startedAt.getTime()) / 1000
    );
  }
  next();
});

/**
 * Instance method: Generate unique room ID
 */
MeetingSchema.methods.generateRoomId = function (): string {
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
};

/**
 * Instance method: Check if user is the host
 */
MeetingSchema.methods.isHost = function (userId: string): boolean {
  return this.hostId.toString() === userId;
};

/**
 * Instance method: Check if meeting can be joined
 */
MeetingSchema.methods.canJoin = function (userId?: string): boolean {
  // Check if meeting is active or waiting
  if (!["waiting", "active"].includes(this.status)) {
    return false;
  }

  // Check if meeting is locked
  if (this.settings.lockMeeting) {
    return false;
  }

  // Check capacity
  if (this.currentParticipants >= this.maxParticipants) {
    return false;
  }

  // Check if guests are allowed (for non-authenticated users)
  if (!userId && !this.settings.allowGuests) {
    return false;
  }

  return true;
};

/**
 * Instance method: Add participant
 */
MeetingSchema.methods.addParticipant = function (
  participantId: mongoose.Types.ObjectId
): void {
  if (!this.participants.includes(participantId)) {
    this.participants.push(participantId);
    this.currentParticipants += 1;
  }
};

/**
 * Instance method: Remove participant
 */
MeetingSchema.methods.removeParticipant = function (
  participantId: mongoose.Types.ObjectId
): void {
  const index = this.participants.indexOf(participantId);
  if (index > -1) {
    this.participants.splice(index, 1);
    this.currentParticipants = Math.max(0, this.currentParticipants - 1);
  }
};

/**
 * Instance method: Check if meeting is active
 */
MeetingSchema.methods.isActive = function (): boolean {
  return this.status === "active";
};

/**
 * Instance method: Check if meeting has ended
 */
MeetingSchema.methods.hasEnded = function (): boolean {
  return ["ended", "cancelled"].includes(this.status);
};

/**
 * Instance method: Get meeting duration in minutes
 */
MeetingSchema.methods.getDurationInMinutes = function (): number {
  if (!this.duration) return 0;
  return Math.floor(this.duration / 60);
};

/**
 * Static method: Find active meetings by host
 */
MeetingSchema.statics.findActiveByHost = function (hostId: string) {
  return this.find({
    hostId,
    status: { $in: ["waiting", "active"] },
  }).sort({ createdAt: -1 });
};

/**
 * Static method: Find meetings by room ID
 */
MeetingSchema.statics.findByRoomId = function (roomId: string) {
  return this.findOne({ roomId: roomId.toUpperCase() });
};

/**
 * Static method: Find scheduled meetings that should start soon
 */
MeetingSchema.statics.findScheduledToStart = function (
  minutesAhead: number = 5
) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

  return this.find({
    type: "scheduled",
    status: "waiting",
    scheduledAt: {
      $gte: now,
      $lte: futureTime,
    },
  });
};

/**
 * Static method: Find meetings that should auto-end
 */
MeetingSchema.statics.findMeetingsToAutoEnd = function () {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  return this.find({
    status: "active",
    currentParticipants: 0,
    updatedAt: { $lt: oneHourAgo },
  });
};

/**
 * Static method: Get meeting statistics
 */
MeetingSchema.statics.getStats = function (hostId?: string) {
  const matchStage = hostId
    ? { hostId: new mongoose.Types.ObjectId(hostId) }
    : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMeetings: { $sum: 1 },
        activeMeetings: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        completedMeetings: {
          $sum: { $cond: [{ $eq: ["$status", "ended"] }, 1, 0] },
        },
        totalDuration: { $sum: "$duration" },
        averageDuration: { $avg: "$duration" },
        totalParticipants: { $sum: "$currentParticipants" },
        averageParticipants: { $avg: "$currentParticipants" },
      },
    },
  ]);
};

/**
 * Virtual field: Is meeting currently active
 */
MeetingSchema.virtual("isCurrentlyActive").get(function () {
  return this.status === "active";
});

/**
 * Virtual field: Meeting URL (for frontend)
 */
MeetingSchema.virtual("meetingUrl").get(function () {
  return `/meeting/${this.roomId}`;
});

/**
 * Virtual field: Time until scheduled start (for scheduled meetings)
 */
MeetingSchema.virtual("timeUntilStart").get(function () {
  if (!this.scheduledAt) return null;
  return this.scheduledAt.getTime() - Date.now();
});

// Ensure virtual fields are included in JSON output
MeetingSchema.set("toJSON", { virtuals: true });
MeetingSchema.set("toObject", { virtuals: true });

/**
 * Create and export the Meeting model
 */
export const Meeting: Model<IMeeting> = mongoose.model<IMeeting>(
  "Meeting",
  MeetingSchema
);

// Export default
export default Meeting;
