import { Types } from "mongoose";
import { IMeeting, IParticipant, IUser, APIResponse } from "../types/models";

/**
 * Interface for creating a new meeting
 */
export interface CreateMeetingData {
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
 * Enhanced interface for joining a meeting with comprehensive session management
 * This interface matches exactly what your MeetingService expects
 */
export interface JoinMeetingData {
    roomId: string;
    password?: string;
    userId?: string;
    guestName?: string;

    // Enhanced device information - matches your MeetingService implementation
    deviceInfo?: {
        userAgent: string;
        ipAddress: string;
        deviceType: "web" | "mobile" | "desktop";
        deviceId?: string; // Unique device identifier
        sessionId?: string; // Unique session identifier
    };

    // Session management options
    forceJoin?: boolean; // Force join by ending existing sessions
}

/**
 * Interface for updating meeting settings
 */
export interface UpdateMeetingData {
    title?: string;
    description?: string;
    password?: string;
    maxParticipants?: number;
    settings?: Partial<IMeeting["settings"]>;
}

/**
 * Interface for participant update data
 */
export interface UpdateParticipantData {
    role?: "host" | "moderator" | "participant" | "guest";
    permissions?: Partial<IParticipant["permissions"]>;
    mediaState?: Partial<IParticipant["mediaState"]>;
    connectionQuality?: Partial<IParticipant["connectionQuality"]>;
}

/**
 * Enhanced join meeting response interface
 */
export interface JoinMeetingResponse {
    meeting: IMeeting;
    participant: IParticipant;
    replacedSession?: boolean;
}

/**
 * Session cleanup result interface
 */
export interface SessionCleanupResult {
    staleSessions: number;
    totalCleaned: number;
    affectedMeetings: string[];
}

/**
 * Meeting capacity information
 */
export interface MeetingCapacityInfo {
    maxParticipants: number;
    currentParticipants: number;
    availableSlots: number;
    isAtCapacity: boolean;
}

/**
 * Device session information
 */
export interface DeviceSessionInfo {
    sessionId: string;
    deviceId: string;
    deviceType: "web" | "mobile" | "desktop";
    joinedAt: Date;
    isActive: boolean;
    meetingId: string;
    userId?: string;
    guestName?: string;
}

/**
 * Session management options
 */
export interface SessionManagementOptions {
    maxInactiveMinutes?: number;
    enforceUniqueDeviceSessions?: boolean;
    allowGuestSessionReplacement?: boolean;
}

/**
 * Error codes for enhanced session management
 */
export enum SessionErrorCodes {
    MEETING_NOT_FOUND = "MEETING_NOT_FOUND",
    MEETING_LOCKED = "MEETING_LOCKED",
    MEETING_FULL = "MEETING_FULL",
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED",
    INVALID_PASSWORD = "INVALID_PASSWORD",
    ALREADY_IN_MEETING = "ALREADY_IN_MEETING",
    DEVICE_ALREADY_IN_MEETING = "DEVICE_ALREADY_IN_MEETING",
    PARTICIPANT_NOT_FOUND = "PARTICIPANT_NOT_FOUND",
    MEETING_CREATION_FAILED = "MEETING_CREATION_FAILED",
    JOIN_MEETING_FAILED = "JOIN_MEETING_FAILED",
    LEAVE_MEETING_FAILED = "LEAVE_MEETING_FAILED",
    UPDATE_MEETING_FAILED = "UPDATE_MEETING_FAILED",
    END_MEETING_FAILED = "END_MEETING_FAILED",
    CLEANUP_FAILED = "CLEANUP_FAILED",
    INVALID_SCHEDULE_TIME = "INVALID_SCHEDULE_TIME",
    MEETING_NOT_FOUND_OR_NOT_HOST = "MEETING_NOT_FOUND_OR_NOT_HOST",
    GET_MEETING_FAILED = "GET_MEETING_FAILED",
    GET_USER_MEETINGS_FAILED = "GET_USER_MEETINGS_FAILED",
}

/**
 * Enhanced API Response with session management details
 */
export interface EnhancedAPIResponse<T = any> extends APIResponse<T> {
    sessionInfo?: {
        sessionId: string;
        deviceId: string;
        replacedSessions?: number;
    };

    meetingCapacity?: MeetingCapacityInfo;

    warnings?: Array<{
        code: string;
        message: string;
        details?: any;
    }>;
}

/**
 * Type guards for session management
 */
export const isValidJoinMeetingData = (data: any): data is JoinMeetingData => {
    return data &&
        typeof data.roomId === 'string' &&
        data.roomId.length > 0;
};

export const isActiveParticipant = (participant: IParticipant): boolean => {
    return !participant.leftAt;
};

export const hasDeviceInfo = (joinData: JoinMeetingData): boolean => {
    return !!(joinData.deviceInfo?.userAgent &&
        joinData.deviceInfo?.ipAddress &&
        joinData.deviceInfo?.deviceType);
};

export const isStaleSession = (
    participant: IParticipant,
    maxInactiveMinutes: number = 30
): boolean => {
    if (participant.leftAt) return false;

    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    return participant.joinedAt < cutoffTime &&
        (!participant.connectionQuality.lastUpdated ||
            participant.connectionQuality.lastUpdated < cutoffTime);
};

export const canReplaceSession = (
    participant: IParticipant,
    newDeviceId: string,
    forceJoin: boolean
): boolean => {
    return forceJoin || participant.deviceId === newDeviceId;
};

/**
 * Meeting statistics interface
 */
export interface MeetingStatistics {
    meetingId: string;
    totalParticipants: number;
    activeParticipants: number;
    guestParticipants: number;
    averageSessionDuration: number;
    totalSessionTime: number;

    roleDistribution: {
        host: number;
        moderator: number;
        participant: number;
        guest: number;
    };

    qualityDistribution: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
    };

    deviceDistribution: {
        web: number;
        mobile: number;
        desktop: number;
    };

    endReasonDistribution: {
        user_left: number;
        replaced_by_new_session: number;
        meeting_ended_by_host: number;
        session_cleanup_stale: number;
        connection_lost: number;
        kicked_by_moderator: number;
    };
}

/**
 * Participant search options
 */
export interface ParticipantSearchOptions {
    meetingId?: string;
    userId?: string;
    deviceId?: string;
    sessionId?: string;
    isActive?: boolean;
    role?: IParticipant["role"];
    deviceType?: "web" | "mobile" | "desktop";
    joinedAfter?: Date;
    joinedBefore?: Date;
    minSessionDuration?: number;
}

/**
 * Meeting service configuration
 */
export interface MeetingServiceConfig {
    defaultMaxParticipants: number;
    maxPasswordLength: number;
    sessionTimeoutMinutes: number;
    staleSessionCleanupIntervalMinutes: number;
    allowGuestParticipants: boolean;
    enforceUniqueDeviceSessions: boolean;
    maxConcurrentMeetingsPerUser: number;
}

/**
 * Service method return types
 */
export type CreateMeetingResult = APIResponse<IMeeting>;
export type JoinMeetingResult = APIResponse<JoinMeetingResponse>;
export type LeaveMeetingResult = APIResponse<void>;
export type EndMeetingResult = APIResponse<void>;
export type UpdateMeetingResult = APIResponse<IMeeting>;
export type GetMeetingResult = APIResponse<IMeeting>;
export type GetUserMeetingsResult = APIResponse<IMeeting[]>;
export type CleanupStaleSessionsResult = APIResponse<SessionCleanupResult>;

/**
 * Default service configuration
 */
export const DEFAULT_MEETING_SERVICE_CONFIG: MeetingServiceConfig = {
    defaultMaxParticipants: 10,
    maxPasswordLength: 50,
    sessionTimeoutMinutes: 30,
    staleSessionCleanupIntervalMinutes: 15,
    allowGuestParticipants: true,
    enforceUniqueDeviceSessions: true,
    maxConcurrentMeetingsPerUser: 5,
};

/**
 * Utility functions for meeting service
 */
export class MeetingServiceUtils {
    /**
     * Generate a unique room ID in format ABC-123-XYZ
     */
    static generateRoomId(): string {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";

        // Generate 3 letters
        const firstPart = Array.from({ length: 3 }, () =>
            letters.charAt(Math.floor(Math.random() * letters.length))
        ).join('');

        // Generate 3 numbers
        const secondPart = Array.from({ length: 3 }, () =>
            numbers.charAt(Math.floor(Math.random() * numbers.length))
        ).join('');

        // Generate 3 letters
        const thirdPart = Array.from({ length: 3 }, () =>
            letters.charAt(Math.floor(Math.random() * letters.length))
        ).join('');

        return `${firstPart}-${secondPart}-${thirdPart}`;
    }

    /**
     * Get default permissions based on role
     */
    static getDefaultPermissions(role: IParticipant["role"]): IParticipant["permissions"] {
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
     * Validate room ID format
     */
    static isValidRoomId(roomId: string): boolean {
        return /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(roomId);
    }

    /**
     * Validate device info
     */
    static isValidDeviceInfo(deviceInfo?: JoinMeetingData["deviceInfo"]): boolean {
        if (!deviceInfo) return false;

        return !!(
            deviceInfo.userAgent &&
            deviceInfo.ipAddress &&
            deviceInfo.deviceType &&
            ['web', 'mobile', 'desktop'].includes(deviceInfo.deviceType)
        );
    }

    /**
     * Calculate session duration in seconds
     */
    static calculateSessionDuration(joinedAt: Date, leftAt?: Date): number {
        const endTime = leftAt || new Date();
        return Math.floor((endTime.getTime() - joinedAt.getTime()) / 1000);
    }

    /**
     * Check if a meeting is joinable
     */
    static isMeetingJoinable(meeting: IMeeting): boolean {
        return ['waiting', 'active'].includes(meeting.status) &&
            !meeting.settings.lockMeeting &&
            meeting.currentParticipants < meeting.maxParticipants;
    }

    /**
     * Check if user can host a meeting
     */
    static canUserHostMeeting(user: IUser, currentMeetingCount: number): boolean {
        return user.isActive &&
            user.isEmailVerified &&
            currentMeetingCount < DEFAULT_MEETING_SERVICE_CONFIG.maxConcurrentMeetingsPerUser;
    }
}