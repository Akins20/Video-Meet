import { Document, Types } from 'mongoose';

/**
 * Base interface for all MongoDB documents
 * Provides common fields that every document should have
 */
export interface BaseDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User interface - represents a registered user
 */
export interface IUser extends BaseDocument {
  // Basic user information
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string; // Hashed password
  
  // Profile information
  avatar?: string; // URL to avatar image
  bio?: string;
  
  // Account status
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  
  // Security
  lastLogin?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: string[]; // Array of valid refresh tokens
  
  // Preferences
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      meetingInvites: boolean;
      meetingReminders: boolean;
    };
    privacy: {
      allowDiscovery: boolean; // Can be found in user searches
      showOnlineStatus: boolean;
    };
    meeting: {
      defaultMicMuted: boolean;
      defaultVideoOff: boolean;
      preferredQuality: 'low' | 'medium' | 'high' | 'auto';
    };
  };
  
  // Methods (will be added in the schema)
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  clearPasswordResetToken(): void;
  addRefreshToken(token: string): void;
  removeRefreshToken(token: string): void;
  getFullName(): string;
}

/**
 * Meeting interface - represents a video call room
 */
export interface IMeeting extends BaseDocument {
  // Basic meeting information
  roomId: string; // Unique room identifier (user-friendly)
  title: string;
  description?: string;
  password?: string; // Hashed meeting password
  
  // Host information
  hostId: Types.ObjectId; // Reference to User
  
  // Meeting type and scheduling
  type: 'instant' | 'scheduled' | 'recurring';
  isScheduled: boolean;
  scheduledAt?: Date;
  timezone?: string;
  
  // Recurring meeting settings
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // Every X days/weeks/months
    daysOfWeek?: number[]; // For weekly: [1,2,3,4,5] = Mon-Fri
    endDate?: Date;
    maxOccurrences?: number;
  };
  
  // Meeting status
  status: 'waiting' | 'active' | 'ended' | 'cancelled';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // Actual duration in seconds
  
  // Capacity and limits
  maxParticipants: number;
  currentParticipants: number;
  
  // Meeting settings
  settings: {
    // Basic features
    allowGuests: boolean;
    muteOnJoin: boolean;
    videoOnJoin: boolean;
    waitingRoom: boolean;
    
    // Communication features
    chat: boolean;
    screenShare: boolean;
    fileSharing: boolean;
    whiteboard: boolean;
    
    // Recording settings
    recording: boolean;
    autoRecord: boolean;
    recordingUrl?: string;
    
    // Security settings
    enablePassword: boolean;
    lockMeeting: boolean; // Prevent new participants from joining
    
    // Quality settings
    maxVideoQuality: 'low' | 'medium' | 'high';
    enableBackgroundBlur: boolean;
  };
  
  // Participant management
  participants: Types.ObjectId[]; // References to Participant documents
  
  // Methods
  generateRoomId(): string;
  isHost(userId: string): boolean;
  canJoin(userId?: string): boolean;
  addParticipant(participantId: Types.ObjectId): void;
  removeParticipant(participantId: Types.ObjectId): void;
}

/**
 * Participant interface - represents a user in a specific meeting
 */
export interface IParticipant extends BaseDocument {
  // References
  meetingId: Types.ObjectId; // Reference to Meeting
  userId?: Types.ObjectId; // Reference to User (null for guests)
  
  // Identity information
  displayName: string;
  guestName?: string; // For guest users
  avatar?: string;
  
  // Role and permissions
  role: 'host' | 'moderator' | 'participant' | 'guest';
  permissions: {
    canMuteOthers: boolean;
    canRemoveParticipants: boolean;
    canManageRecording: boolean;
    canShareScreen: boolean;
    canShareFiles: boolean;
    canUseWhiteboard: boolean;
  };
  
  // Session information
  joinedAt: Date;
  leftAt?: Date;
  sessionDuration?: number; // Time spent in meeting (seconds)
  
  // Connection information
  socketId?: string; // WebSocket connection ID
  peerId?: string; // WebRTC peer identifier
  ipAddress?: string;
  userAgent?: string;
  
  // Media state
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    handRaised: boolean;
  };
  
  // Connection quality
  connectionQuality: {
    latency?: number; // Ping in milliseconds
    bandwidth?: number; // Available bandwidth
    packetLoss?: number; // Packet loss percentage
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    lastUpdated: Date;
  };
  
  // Methods
  isOnline(): boolean;
  updateConnectionQuality(metrics: Partial<IParticipant['connectionQuality']>): void;
  hasPermission(permission: keyof IParticipant['permissions']): boolean;
}

/**
 * Message interface - represents chat messages in meetings
 */
export interface IMessage extends BaseDocument {
  // References
  meetingId: Types.ObjectId; // Reference to Meeting
  senderId?: Types.ObjectId; // Reference to Participant (null for system messages)
  
  // Message content
  content: string;
  type: 'text' | 'system' | 'file' | 'emoji' | 'poll';
  
  // Sender information (denormalized for performance)
  senderName: string;
  senderRole: 'host' | 'moderator' | 'participant' | 'guest' | 'system';
  senderAvatar?: string;
  
  // Message metadata
  timestamp: Date;
  editedAt?: Date;
  isEdited: boolean;
  isDeleted: boolean;
  
  // File attachment (if type is 'file')
  fileInfo?: {
    filename: string;
    fileSize: number;
    mimeType: string;
    downloadUrl: string;
    thumbnailUrl?: string;
  };
  
  // Poll data (if type is 'poll')
  pollData?: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    votes: Map<string, number[]>; // participantId -> selected option indices
    endDate?: Date;
  };
  
  // Delivery tracking
  deliveredTo: Types.ObjectId[]; // Participant IDs who received the message
  readBy: Array<{
    participantId: Types.ObjectId;
    readAt: Date;
  }>;
  
  // Methods
  markAsDelivered(participantId: Types.ObjectId): void;
  markAsRead(participantId: Types.ObjectId): void;
  isDeliveredTo(participantId: Types.ObjectId): boolean;
  isReadBy(participantId: Types.ObjectId): boolean;
}

/**
 * Authentication token interface for JWT payload
 */
export interface ITokenPayload {
  userId: string;
  email: string;
  username: string;
  role?: string;
  iat?: number; // Issued at
  exp?: number; // Expires at
}

/**
 * Refresh token interface
 */
export interface IRefreshToken {
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceType: 'web' | 'mobile' | 'desktop';
  };
}

/**
 * API Response interfaces for consistent API responses
 */
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * WebSocket event interfaces
 */
export interface SocketEventData {
  // Meeting events
  'meeting:join': {
    meetingId: string;
    participant: Partial<IParticipant>;
  };
  'meeting:leave': {
    meetingId: string;
    participantId: string;
  };
  'meeting:ended': {
    meetingId: string;
    reason: string;
  };
  
  // WebRTC signaling events
  'webrtc:offer': {
    to: string;
    from: string;
    offer: RTCSessionDescriptionInit;
  };
  'webrtc:answer': {
    to: string;
    from: string;
    answer: RTCSessionDescriptionInit;
  };
  'webrtc:ice-candidate': {
    to: string;
    from: string;
    candidate: RTCIceCandidateInit;
  };
  
  // Chat events
  'chat:message': {
    meetingId: string;
    message: Partial<IMessage>;
  };
  'chat:typing': {
    meetingId: string;
    participantId: string;
    isTyping: boolean;
  };
  
  // Media control events
  'media:toggle': {
    meetingId: string;
    participantId: string;
    type: 'audio' | 'video';
    enabled: boolean;
  };
  'screen:share': {
    meetingId: string;
    participantId: string;
    enabled: boolean;
  };
}

/**
 * Minimal WebRTC type definitions for Node.js compatibility
 */
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}
export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  usernameFragment?: string;
}