/* eslint-disable @typescript-eslint/no-explicit-any */

// Base meeting types
export type MeetingStatus = "waiting" | "active" | "ended" | "cancelled";
export type MeetingType = "instant" | "scheduled" | "recurring";
export type ParticipantRole = "host" | "moderator" | "participant" | "guest";
export type ConnectionType = "direct" | "relayed" | "hybrid";
export type ConnectionQuality = "poor" | "fair" | "good" | "excellent";
export type MediaQuality = "low" | "medium" | "high" | "auto";

// Meeting configuration and settings
export interface MeetingSettings {
  password: boolean | undefined;
  // Access control
  allowGuests: boolean;
  requirePassword: boolean;
  waitingRoom: boolean;
  allowJoinBeforeHost: boolean;
  maxParticipants: number;

  // Media defaults
  muteOnJoin: boolean;
  videoOnJoin: boolean;
  allowUnmuteSelf: boolean;

  // Features
  chat: boolean;
  screenShare: boolean;
  fileSharing: boolean;
  recording: boolean;
  whiteboard: boolean;
  reactions: boolean;
  handRaise: boolean;

  // Quality settings
  maxVideoQuality: MediaQuality;
  adaptiveQuality: boolean;
  bandwidthOptimization: boolean;

  // Advanced features
  backgroundBlur: boolean;
  noiseCancellation: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;

  // Recording settings
  recordingSettings?: {
    autoStart: boolean;
    includeAudio: boolean;
    includeVideo: boolean;
    includeScreenShare: boolean;
    includeChat: boolean;
    quality: MediaQuality;
    layout: "gallery" | "speaker" | "custom";
  };

  // Security settings
  endToEndEncryption: boolean;
  participantAuth: "none" | "password" | "invitation_only";
  moderatorApproval: boolean;

  // UI preferences
  layout: "grid" | "speaker" | "presentation";
  showParticipantNames: boolean;
  showConnectionQuality: boolean;
  theme: "light" | "dark" | "auto";
}

// Core meeting interface
export interface Meeting {
  startTime: any;
  id: string;
  roomId: string; // Human-readable room ID (ABC-123-XYZ)
  title: string;
  description?: string;

  // Ownership and access
  hostId: string;
  hostName: string;
  password?: string; // Hashed on server

  // Meeting type and timing
  type: MeetingType;
  status: MeetingStatus;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // in seconds

  // Capacity and participants
  maxParticipants: number;
  currentParticipants: number;
  participantIds: string[];

  // Settings and configuration
  settings: MeetingSettings;

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastActivity: string;

  // Analytics (populated after meeting ends)
  analytics?: MeetingAnalytics;
}

// Meeting participant interface
export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string; // null for guests

  // Identity
  displayName: string;
  avatar?: string;
  email?: string;

  // Role and permissions
  role: ParticipantRole;
  permissions: ParticipantPermissions;

  // Session information
  joinedAt: string;
  leftAt?: string;
  sessionDuration?: number;
  isActive: boolean;

  // Connection details
  socketId?: string;
  peerId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: DeviceInfo;

  // Media state
  mediaState: MediaState;

  // Connection quality
  connectionQuality: ConnectionQualityInfo;

  // Interaction state
  handRaised: boolean;
  lastSpeaking?: string;
  speakingDuration: number;

  // Local state (for current user)
  isLocal: boolean;
  isSelf: boolean;
}

// Participant permissions
export interface ParticipantPermissions {
  canTurnOnAudio: boolean;
  // Media controls
  canUnmuteSelf: boolean;
  canTurnOnVideo: boolean;
  canShareScreen: boolean;

  // Moderation
  canMuteOthers: boolean;
  canRemoveParticipants: boolean;
  canManageWaitingRoom: boolean;
  canManageRecording: boolean;

  // Communication
  canSendChat: boolean;
  canSendPrivateChat: boolean;
  canShareFiles: boolean;
  canUseWhiteboard: boolean;
  canUseReactions: boolean;

  // Meeting control
  canEndMeeting: boolean;
  canChangeMeetingSettings: boolean;
  canInviteParticipants: boolean;
  canManageRoles: boolean;
}

// Media state for participants
export interface MediaState {
  speaking: boolean;
  // Audio/Video
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioMuted: boolean; // Can be muted by moderator

  // Screen sharing
  screenSharing: boolean;
  screenShareType?: "window" | "tab" | "screen";

  // Advanced features
  backgroundBlur: boolean;
  virtualBackground?: string;

  // Audio processing
  noiseCancellation: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;

  // Video settings
  resolution: string; // e.g., "1920x1080"
  frameRate: number;
  bitrate: number;

  // Quality adaptation
  adaptiveQuality: boolean;
  currentQuality: MediaQuality;
  targetQuality: MediaQuality;
}

// Connection quality information
export interface ConnectionQualityInfo {
  overall: ConnectionQuality;

  // Network metrics
  latency: number; // milliseconds
  jitter: number; // milliseconds
  packetLoss: number; // percentage
  bandwidth: {
    incoming: number; // kbps
    outgoing: number; // kbps
    available: number; // kbps
  };

  // Media quality
  audio: {
    quality: ConnectionQuality;
    codec: string;
    bitrate: number;
    packetLoss: number;
  };

  video: {
    quality: ConnectionQuality;
    codec: string;
    resolution: string;
    frameRate: number;
    bitrate: number;
    packetLoss: number;
  };

  // Connection details
  connectionType: ConnectionType;
  protocol: "udp" | "tcp" | "turn-udp" | "turn-tcp";
  serverRegion?: string;

  // Timestamps
  lastMeasured: string;
  measurementInterval: number;
}

// Chat message types
export interface ChatMessage {
  id: string;
  meetingId: string;

  // Sender information
  senderId: string;
  senderName: string;
  senderRole: ParticipantRole;
  senderAvatar?: string;

  // Message content
  content: string;
  type: ChatMessageType;

  // Metadata
  timestamp: string;
  editedAt?: string;
  isEdited: boolean;

  // Threading (for replies)
  replyTo?: string;
  threadId?: string;

  // Message status
  deliveryStatus: "sending" | "delivered" | "failed";
  readBy: string[]; // participant IDs who read the message

  // Rich content
  attachments?: ChatAttachment[];
  mentions?: string[]; // participant IDs mentioned
  reactions?: ChatReaction[];

  // Moderation
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export type ChatMessageType =
  | "text"
  | "emoji"
  | "file"
  | "image"
  | "system"
  | "announcement"
  | "poll"
  | "reaction";

// Chat attachments
export interface ChatAttachment {
  id: string;
  type: "file" | "image" | "video" | "audio" | "document";
  name: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

// Chat reactions
export interface ChatReaction {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    name: string;
  }>;
  timestamp: string;
}

// Meeting analytics
export interface MeetingAnalytics {
  meetingId: string;

  // Basic metrics
  totalDuration: number;
  actualDuration: number; // excluding waiting time
  totalParticipants: number;
  peakParticipants: number;
  averageParticipants: number;

  // Engagement metrics
  participantEngagement: {
    totalJoins: number;
    averageStayDuration: number;
    dropOffRate: number;
    returnRate: number;
    activeParticipationRate: number;
  };

  // Communication metrics
  chatActivity: {
    totalMessages: number;
    averageMessagesPerParticipant: number;
    mostActiveParticipant: string;
    messagesOverTime: Array<{
      timestamp: string;
      count: number;
    }>;
  };

  // Technical metrics
  qualityMetrics: {
    averageConnectionQuality: number;
    connectionIssues: number;
    reconnections: number;
    audioQuality: number;
    videoQuality: number;
    bandwidthUsage: {
      average: number;
      peak: number;
      total: number;
    };
  };

  // Feature usage
  featureUsage: {
    screenShareUsed: boolean;
    recordingUsed: boolean;
    chatUsed: boolean;
    filesSharingUsed: boolean;
    reactionsUsed: boolean;
    whiteboardUsed: boolean;
    handsRaised: number;
  };

  // Participant breakdown
  participantBreakdown: {
    hosts: number;
    moderators: number;
    participants: number;
    guests: number;
    authenticated: number;
    anonymous: number;
  };

  // Geographic distribution
  geographic?: {
    countries: Record<string, number>;
    regions: Record<string, number>;
    timezones: Record<string, number>;
  };

  // Device/platform breakdown
  deviceBreakdown?: {
    web: number;
    desktop: number;
    mobile: number;
    platforms: Record<string, number>;
    browsers: Record<string, number>;
  };
}

// Meeting invitation
export interface MeetingInvitation {
  id: string;
  meetingId: string;
  roomId: string;

  // Meeting details
  title: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;

  // Invitation details
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;
  toEmail?: string;
  toName?: string;

  // Access details
  password?: string;
  directJoinLink: string;
  calendarLink?: string;

  // Status and timing
  status: "pending" | "accepted" | "declined" | "expired";
  sentAt: string;
  respondedAt?: string;
  expiresAt?: string;

  // Personalization
  personalMessage?: string;
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
}

// Screen sharing configuration
export interface ScreenShareConfig {
  type: "window" | "tab" | "screen";
  includeAudio: boolean;
  quality: MediaQuality;
  frameRate: number;

  // Source selection (for window/tab sharing)
  sourceId?: string;
  sourceName?: string;

  // Permissions
  allowParticipantControl: boolean;
  showCursor: boolean;
  highlightClicks: boolean;
}

// Recording configuration
export interface RecordingConfig {
  enabled: boolean;
  autoStart: boolean;

  // Content selection
  includeAudio: boolean;
  includeVideo: boolean;
  includeScreenShare: boolean;
  includeChat: boolean;
  includeWhiteboard: boolean;

  // Quality settings
  quality: MediaQuality;
  layout: "gallery" | "speaker" | "presentation" | "custom";

  // Output settings
  format: "mp4" | "webm" | "mov";
  resolution: string;
  frameRate: number;

  // Privacy settings
  blurBackground: boolean;
  hideParticipantNames: boolean;
  watermark?: {
    text: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    opacity: number;
  };
}

// Meeting recording status
export interface RecordingStatus {
  id: string;
  meetingId: string;
  status:
    | "starting"
    | "recording"
    | "paused"
    | "stopping"
    | "processing"
    | "completed"
    | "failed";

  // Timing
  startedAt?: string;
  pausedAt?: string;
  stoppedAt?: string;
  duration: number;

  // File information
  fileSize?: number;
  downloadUrl?: string;
  streamUrl?: string;
  thumbnailUrl?: string;

  // Processing information
  processingProgress?: number;
  estimatedProcessingTime?: number;

  // Configuration used
  config: RecordingConfig;

  // Error information
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Waiting room participant
export interface WaitingRoomParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  joinedWaitingRoomAt: string;
  deviceInfo?: DeviceInfo;

  // Additional context
  isReturnVisitor: boolean;
  previousMeetings: number;
  requestMessage?: string;
}

// Meeting poll (for interactive features)
export interface MeetingPoll {
  id: string;
  meetingId: string;
  createdBy: string;

  // Poll content
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
    voters: string[];
  }>;

  // Settings
  allowMultipleChoices: boolean;
  anonymous: boolean;
  showResults: "never" | "after_vote" | "real_time" | "after_close";

  // Status
  isActive: boolean;
  createdAt: string;
  closedAt?: string;

  // Results
  totalVotes: number;
  participantCount: number;
  participationRate: number;
}

// Breakout room configuration
export interface BreakoutRoom {
  id: string;
  mainMeetingId: string;
  name: string;

  // Participants
  participantIds: string[];
  maxParticipants: number;

  // Settings
  allowParticipantReturn: boolean;
  timeLimit?: number; // minutes

  // Status
  isActive: boolean;
  createdAt: string;
  closedAt?: string;

  // Analytics
  analytics?: Partial<MeetingAnalytics>;
}

// Device information for meetings
export interface DeviceInfo {
  deviceId: string;
  type: "web" | "desktop" | "mobile";
  platform: string;
  browser?: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;

  // Capabilities
  capabilities: {
    webrtc: boolean;
    camera: boolean;
    microphone: boolean;
    screenShare: boolean;
    recording: boolean;
    backgroundBlur: boolean;
  };

  // Hardware info (when available)
  hardware?: {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  };

  // Network info
  network?: {
    type: "wifi" | "cellular" | "ethernet" | "unknown";
    effectiveType: "2g" | "3g" | "4g" | "5g" | "wifi";
    downlink: number;
    rtt: number;
  };
}

// Meeting templates (for recurring meetings)
export interface MeetingTemplate {
  id: string;
  name: string;
  description?: string;

  // Template settings
  settings: Partial<MeetingSettings>;
  defaultTitle: string;
  defaultDuration: number;

  // Recurrence pattern
  recurrence?: {
    type: "daily" | "weekly" | "monthly" | "custom";
    interval: number;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    dayOfMonth?: number;
    endDate?: string;
    occurrences?: number;
  };

  // Default participants
  defaultParticipants?: Array<{
    userId?: string;
    email: string;
    role: ParticipantRole;
  }>;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

// Type guards for meeting types
export const isMeetingActive = (meeting: Meeting): boolean => {
  return meeting.status === "active";
};

export const isMeetingHost = (meeting: Meeting, userId: string): boolean => {
  return meeting.hostId === userId;
};

export const canJoinMeeting = (meeting: Meeting): boolean => {
  return meeting.status === "waiting" || meeting.status === "active";
};

export const isParticipantModerator = (
  participant: MeetingParticipant
): boolean => {
  return participant.role === "host" || participant.role === "moderator";
};

export const hasPermission = (
  participant: MeetingParticipant,
  permission: keyof ParticipantPermissions
): boolean => {
  return participant.permissions[permission];
};

// Meeting state helpers
export const getMeetingDuration = (meeting: Meeting): number => {
  if (!meeting.startedAt) return 0;
  const endTime = meeting.endedAt ? new Date(meeting.endedAt) : new Date();
  return Math.floor(
    (endTime.getTime() - new Date(meeting.startedAt).getTime()) / 1000
  );
};

export const getParticipantSessionDuration = (
  participant: MeetingParticipant
): number => {
  if (!participant.joinedAt) return 0;
  const endTime = participant.leftAt
    ? new Date(participant.leftAt)
    : new Date();
  return Math.floor(
    (endTime.getTime() - new Date(participant.joinedAt).getTime()) / 1000
  );
};
