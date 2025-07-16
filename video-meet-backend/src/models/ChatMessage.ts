import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Chat Message Model
 * Represents a chat message in a meeting
 */

export interface IChatMessage extends Document {
  _id: Types.ObjectId;
  meeting: Types.ObjectId;
  participant: Types.ObjectId;
  user?: Types.ObjectId;
  message: string;
  messageType: 'text' | 'file' | 'system' | 'emoji';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
    emoji?: string;
    systemEventType?: string;
  };
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  reactions?: Array<{
    emoji: string;
    participant: Types.ObjectId;
    timestamp: Date;
  }>;
  replyTo?: Types.ObjectId;
  mentionedParticipants?: Types.ObjectId[];
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema<IChatMessage>(
  {
    meeting: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    participant: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    messageType: {
      type: String,
      enum: ["text", "file", "system", "emoji"],
      default: "text",
      required: true,
    },
    metadata: {
      fileName: String,
      fileSize: Number,
      fileType: String,
      fileUrl: String,
      emoji: String,
      systemEventType: String,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        participant: {
          type: Schema.Types.ObjectId,
          ref: "Participant",
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    mentionedParticipants: [
      {
        type: Schema.Types.ObjectId,
        ref: "Participant",
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for optimization
ChatMessageSchema.index({ meeting: 1, timestamp: -1 });
ChatMessageSchema.index({ participant: 1, timestamp: -1 });
ChatMessageSchema.index({ meeting: 1, messageType: 1 });
ChatMessageSchema.index({ meeting: 1, isDeleted: 1, timestamp: -1 });
ChatMessageSchema.index({ replyTo: 1 });

// Pre-save middleware
ChatMessageSchema.pre("save", function (next) {
  if (this.isModified("message") && this.isNew === false) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Methods
ChatMessageSchema.methods.toJSON = function () {
  const message = this.toObject();
  
  // Don't return deleted messages content
  if (message.isDeleted) {
    message.message = "[This message was deleted]";
    message.metadata = undefined;
  }
  
  return message;
};

// Statics
ChatMessageSchema.statics.findByMeeting = function (meetingId: string, options: any = {}) {
  const {
    page = 1,
    limit = 50,
    includeDeleted = false,
    messageType = null,
    participantId = null,
  } = options;

  const query: any = { meeting: meetingId };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  if (messageType) {
    query.messageType = messageType;
  }
  
  if (participantId) {
    query.participant = participantId;
  }

  return this.find(query)
    .populate("participant", "displayName user role")
    .populate("user", "firstName lastName avatar")
    .populate("replyTo", "message participant timestamp")
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

ChatMessageSchema.statics.getMessageStats = function (meetingId: string) {
  return this.aggregate([
    { $match: { meeting: new mongoose.Types.ObjectId(meetingId) } },
    {
      $group: {
        _id: "$messageType",
        count: { $sum: 1 },
        lastMessage: { $max: "$timestamp" },
      },
    },
  ]);
};

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);