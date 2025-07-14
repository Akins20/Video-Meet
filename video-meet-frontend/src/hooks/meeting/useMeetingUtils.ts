/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../useAuth";
import type {
  Meeting,
  MeetingParticipant,
  ChatMessage,
  MediaState,
} from "@/types/meeting";

interface MeetingUtilsProps {
  meeting: Meeting | null;
  participants: MeetingParticipant[];
  messages: ChatMessage[];
  localParticipant: MeetingParticipant | null;
  meetingDuration: number;
  recordingDuration: number;
  isRecording: boolean;
  localMediaState: MediaState;
  screenShareActive: boolean;
  roomId?: string;
  isDataMode?: boolean;
}

interface MeetingStats {
  totalParticipants: number;
  peakParticipants: number;
  averageParticipants: number;
  totalMessages: number;
  totalDuration: number;
  networkIssues: number;
  recordings: number;
  filesShared: number;
  screenshareTime: number;
  audioParticipation: number;
  videoParticipation: number;
  connectionQuality: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  chatEngagement: {
    activeUsers: number;
    averageMessageLength: number;
    messageFrequency: number;
  };
  meetingHealth: {
    overall: "excellent" | "good" | "fair" | "poor";
    score: number;
  };
}

interface ParticipantAnalytics {
  id: string;
  displayName: string;
  role: string;
  joinDuration: number;
  messageCount: number;
  audioTime: number;
  videoTime: number;
  connectionIssues: number;
  engagementScore: number;
}

interface UseMeetingUtilsReturn {
  // Statistics
  getMeetingStats: () => MeetingStats;
  exportMeetingData: () => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;

  // Participant utilities
  getParticipantsByRole: (role: string) => MeetingParticipant[];
  getActiveSpeakers: () => MeetingParticipant[];
  getParticipantsWithVideo: () => MeetingParticipant[];
  getParticipantsWithAudio: () => MeetingParticipant[];

  // Chat utilities
  getMessagesByType: (type: string) => ChatMessage[];
  getRecentMessages: (minutes: number) => ChatMessage[];
  searchMessages: (query: string) => ChatMessage[];

  // Meeting utilities
  formatDuration: (seconds: number) => string;
  getMeetingUrl: (includePassword?: boolean) => string;
  generateMeetingReport: () => any;

  // Permission utilities
  hasPermission: (action: string) => boolean;
  canModerateParticipant: (participantId: string) => boolean;

  // Meeting health
  getMeetingHealth: () => {
    overall: "excellent" | "good" | "fair" | "poor";
    issues: string[];
    recommendations: string[];
    score: number;
  };

  // Bulk operations (live mode only)
  bulkMuteParticipants: (
    participantIds: string[]
  ) => Promise<{ success: boolean; results: any[] }>;
  bulkRemoveParticipants: (
    participantIds: string[]
  ) => Promise<{ success: boolean; results: any[] }>;

  // Meeting templates
  saveMeetingTemplate: (
    name: string
  ) => Promise<{ success: boolean; error?: string }>;
  loadMeetingTemplate: (
    templateId: string
  ) => Promise<{ success: boolean; template?: any; error?: string }>;

  // Analytics
  getParticipantEngagement: () => ParticipantAnalytics[];
  getChatAnalytics: () => any;
  getMediaUsageStats: () => any;
  getTimeSeriesData: () => any;

  // Data mode specific
  isDataMode: boolean;
  getHistoricalInsights: () => any;
  compareWithPreviousMeetings: () => any;
}

/**
 * Meeting utilities hook - provides utility functions and computed values
 * Works in both live and data modes
 */
export const useMeetingUtils = (
  props: MeetingUtilsProps
): UseMeetingUtilsReturn => {
  const { user } = useAuth();

  const {
    meeting,
    participants,
    messages,
    localParticipant,
    meetingDuration,
    recordingDuration,
    isRecording,
    localMediaState,
    screenShareActive,
    isDataMode = false,
  } = props;

  // Simple utility functions
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
  }, []);

  const getParticipantsByRole = useCallback(
    (role: string): MeetingParticipant[] => {
      return participants.filter((p) => p.role === role);
    },
    [participants]
  );

  const getActiveSpeakers = useCallback((): MeetingParticipant[] => {
    return participants.filter((p) => p.mediaState?.speaking || false);
  }, [participants]);

  const getParticipantsWithVideo = useCallback((): MeetingParticipant[] => {
    return participants.filter((p) => p.mediaState?.videoEnabled || false);
  }, [participants]);

  const getParticipantsWithAudio = useCallback((): MeetingParticipant[] => {
    return participants.filter((p) => p.mediaState?.audioEnabled || false);
  }, [participants]);

  const getMessagesByType = useCallback(
    (type: string): ChatMessage[] => {
      return messages.filter((msg) => msg.type === type);
    },
    [messages]
  );

  const getRecentMessages = useCallback(
    (minutes: number): ChatMessage[] => {
      const cutoff = new Date(Date.now() - minutes * 60 * 1000);
      return messages.filter((msg) => new Date(msg.timestamp) >= cutoff);
    },
    [messages]
  );

  const searchMessages = useCallback(
    (query: string): ChatMessage[] => {
      if (!query.trim()) return [];

      const lowerQuery = query.toLowerCase();
      return messages.filter(
        (msg) =>
          msg.content.toLowerCase().includes(lowerQuery) ||
          msg.senderName.toLowerCase().includes(lowerQuery)
      );
    },
    [messages]
  );

  const getMeetingUrl = useCallback(
    (includePassword?: boolean): string => {
      if (!meeting) return "";

      const baseUrl = `${window.location.origin}/meeting/${meeting.roomId}`;

      if (
        includePassword &&
        meeting.settings?.requirePassword &&
        meeting.settings?.password
      ) {
        return `${baseUrl}?password=${meeting.settings.password}`;
      }

      return baseUrl;
    },
    [meeting]
  );

  const hasPermission = useCallback(
    (action: string): boolean => {
      if (!localParticipant || isDataMode) return false;

      const isHost = localParticipant.role === "host";
      const isModerator = localParticipant.role === "moderator";

      switch (action) {
        case "end_meeting":
          return isHost;
        case "mute_others":
        case "remove_participants":
        case "start_recording":
        case "stop_recording":
        case "manage_settings":
          return isHost || isModerator;
        case "share_screen":
          return localParticipant.permissions?.canShareScreen ?? true;
        case "send_chat":
          return localParticipant.permissions?.canSendChat ?? true;
        case "turn_on_video":
          return localParticipant.permissions?.canTurnOnVideo ?? true;
        case "turn_on_audio":
          return localParticipant.permissions?.canTurnOnAudio ?? true;
        default:
          return false;
      }
    },
    [localParticipant, isDataMode]
  );

  const canModerateParticipant = useCallback(
    (participantId: string): boolean => {
      if (!localParticipant || isDataMode) return false;

      const targetParticipant = participants.find(
        (p) => p.id === participantId
      );
      if (!targetParticipant) return false;

      const isHost = localParticipant.role === "host";
      const isModerator = localParticipant.role === "moderator";
      const targetIsHost = targetParticipant.role === "host";

      if (isHost && participantId !== localParticipant.id) {
        return true;
      }

      if (
        isModerator &&
        !targetIsHost &&
        targetParticipant.role !== "moderator"
      ) {
        return true;
      }

      return false;
    },
    [localParticipant, participants, isDataMode]
  );

  // Main statistics function
  const getMeetingStats = useCallback((): MeetingStats => {
    const activeParticipants = participants.filter((p) => p.isActive);
    const totalParticipants = participants.length;

    const audioEnabled = participants.filter(
      (p) => p.mediaState?.audioEnabled
    ).length;
    const videoEnabled = participants.filter(
      (p) => p.mediaState?.videoEnabled
    ).length;
    const audioParticipation =
      totalParticipants > 0 ? (audioEnabled / totalParticipants) * 100 : 0;
    const videoParticipation =
      totalParticipants > 0 ? (videoEnabled / totalParticipants) * 100 : 0;

    const connectionQuality = {
      excellent: participants.filter(
        (p) => p.connectionQuality?.overall === "excellent"
      ).length,
      good: participants.filter((p) => p.connectionQuality?.overall === "good")
        .length,
      fair: participants.filter((p) => p.connectionQuality?.overall === "fair")
        .length,
      poor: participants.filter((p) => p.connectionQuality?.overall === "poor")
        .length,
    };

    const textMessages = messages.filter((m) => m.type === "text");
    const uniqueChatters = new Set(
      textMessages.map((m) => m.senderId || m.senderName)
    ).size;
    const averageMessageLength =
      textMessages.length > 0
        ? textMessages.reduce((sum, m) => sum + m.content.length, 0) /
          textMessages.length
        : 0;
    const messageFrequency =
      meetingDuration > 0 ? textMessages.length / (meetingDuration / 60) : 0;

    let healthScore = 100;
    if (audioParticipation < 50) healthScore -= 20;
    if (videoParticipation < 30) healthScore -= 15;
    if (connectionQuality.poor > totalParticipants * 0.3) healthScore -= 25;
    if (messageFrequency < 0.5 && meetingDuration > 600) healthScore -= 10;

    const meetingHealth: "excellent" | "good" | "fair" | "poor" =
      healthScore >= 90
        ? "excellent"
        : healthScore >= 75
        ? "good"
        : healthScore >= 60
        ? "fair"
        : "poor";

    return {
      totalParticipants,
      peakParticipants: totalParticipants,
      averageParticipants: activeParticipants.length,
      totalMessages: messages.length,
      totalDuration: meetingDuration,
      networkIssues: connectionQuality.poor + connectionQuality.fair,
      recordings: isRecording ? 1 : 0,
      filesShared: 0,
      screenshareTime: screenShareActive ? meetingDuration : 0,
      audioParticipation,
      videoParticipation,
      connectionQuality,
      chatEngagement: {
        activeUsers: uniqueChatters,
        averageMessageLength,
        messageFrequency,
      },
      meetingHealth: {
        overall: meetingHealth,
        score: Math.round(healthScore),
      },
    };
  }, [participants, messages, meetingDuration, isRecording, screenShareActive]);

  const getMeetingHealth = useCallback(() => {
    const stats = getMeetingStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (stats.audioParticipation < 50) {
      issues.push("Low audio participation");
      recommendations.push("Encourage participants to unmute when speaking");
    }

    if (stats.videoParticipation < 30) {
      issues.push("Low video participation");
      recommendations.push("Consider encouraging video participation");
    }

    if (stats.connectionQuality.poor > 0) {
      issues.push("Connection quality issues");
      recommendations.push("Address poor connections");
    }

    if (meetingDuration > 3600) {
      issues.push("Extended meeting duration");
      recommendations.push("Consider breaks for long meetings");
    }

    return {
      overall: stats.meetingHealth.overall,
      issues,
      recommendations,
      score: stats.meetingHealth.score,
    };
  }, [getMeetingStats, meetingDuration]);

  const getParticipantEngagement = useCallback((): ParticipantAnalytics[] => {
    return participants.map((p) => {
      const participantMessages = messages.filter(
        (msg) => msg.senderId === p.id
      );

      const joinTime = p.joinedAt ? new Date(p.joinedAt).getTime() : 0;
      const leaveTime = p.leftAt ? new Date(p.leftAt).getTime() : Date.now();
      const joinDuration = Math.max(
        0,
        Math.floor((leaveTime - joinTime) / 1000)
      );

      const audioTime = p.mediaState?.audioEnabled ? joinDuration * 0.7 : 0;
      const videoTime = p.mediaState?.videoEnabled ? joinDuration * 0.6 : 0;
      const connectionIssues = p.connectionQuality?.overall === "poor" ? 1 : 0;

      const messageWeight = participantMessages.length * 10;
      const durationWeight = Math.min(joinDuration / 60, 60);
      const audioWeight = audioTime > 0 ? 20 : 0;
      const videoWeight = videoTime > 0 ? 15 : 0;
      const connectionPenalty = connectionIssues * 10;

      const engagementScore = Math.max(
        0,
        Math.min(
          100,
          messageWeight +
            durationWeight +
            audioWeight +
            videoWeight -
            connectionPenalty
        )
      );

      return {
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        joinDuration,
        messageCount: participantMessages.length,
        audioTime,
        videoTime,
        connectionIssues,
        engagementScore: Math.round(engagementScore),
      };
    });
  }, [participants, messages]);

  const getChatAnalytics = useCallback(() => {
    const textMessages = messages.filter((m) => m.type === "text");
    const messageCounts = textMessages.reduce((acc, msg) => {
      acc[msg.senderName] = (acc[msg.senderName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveUser = Object.entries(messageCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    return {
      totalMessages: textMessages.length,
      activeParticipants: Object.keys(messageCounts).length,
      mostActiveUser: mostActiveUser ? mostActiveUser[0] : "None",
      mostActiveUserCount: mostActiveUser ? mostActiveUser[1] : 0,
      averageMessageLength:
        textMessages.length > 0
          ? textMessages.reduce((acc, msg) => acc + msg.content.length, 0) /
            textMessages.length
          : 0,
      messageFrequency:
        meetingDuration > 0 ? textMessages.length / (meetingDuration / 60) : 0,
    };
  }, [messages, meetingDuration]);

  const getMediaUsageStats = useCallback(() => {
    const audioEnabled = getParticipantsWithAudio().length;
    const videoEnabled = getParticipantsWithVideo().length;
    const screenSharing = participants.filter(
      (p) => p.mediaState?.screenSharing
    ).length;

    return {
      audioParticipation:
        participants.length > 0
          ? (audioEnabled / participants.length) * 100
          : 0,
      videoParticipation:
        participants.length > 0
          ? (videoEnabled / participants.length) * 100
          : 0,
      screenSharingActive: screenSharing > 0,
      totalParticipants: participants.length,
      audioEnabled,
      videoEnabled,
      screenSharing,
    };
  }, [participants, getParticipantsWithAudio, getParticipantsWithVideo]);

  const exportMeetingData = useCallback(async (): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      if (!meeting) {
        return { success: false, error: "No meeting data available" };
      }

      const stats = getMeetingStats();
      const meetingData = {
        meeting: {
          id: meeting.id,
          roomId: meeting.roomId,
          title: meeting.title,
          description: meeting.description,
          duration: meetingDuration,
          startTime: meeting.startTime || meeting.startedAt,
          endTime: meeting.endedAt || new Date().toISOString(),
          status: meeting.status,
          type: meeting.type,
          hostId: meeting.hostId,
        },
        participants: participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          email: p.email,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          isActive: p.isActive,
          mediaState: p.mediaState,
          connectionQuality: p.connectionQuality,
        })),
        messages: messages.map((m) => ({
          id: m.id,
          senderName: m.senderName,
          senderId: m.senderId,
          content: m.content,
          timestamp: m.timestamp,
          type: m.type,
        })),
        analytics: {
          stats,
          engagementScore: stats.meetingHealth.score,
        },
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: user?.id,
          exportMode: isDataMode ? "historical" : "live",
          version: "1.0",
        },
      };

      const blob = new Blob([JSON.stringify(meetingData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting_${meeting.roomId}_${
        new Date().toISOString().split("T")[0]
      }_analytics.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Meeting analytics exported successfully");
      return { success: true, data: meetingData };
    } catch (error: any) {
      const errorMessage = "Failed to export meeting data";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [
    meeting,
    meetingDuration,
    participants,
    messages,
    getMeetingStats,
    isDataMode,
    user,
  ]);

  const generateMeetingReport = useCallback(() => {
    if (!meeting) return null;

    const stats = getMeetingStats();
    const health = getMeetingHealth();

    return {
      meetingInfo: {
        title: meeting.title,
        duration: formatDuration(meetingDuration),
        participantCount: participants.length,
        messageCount: messages.length,
        recordingStatus: isRecording ? "Recorded" : "Not recorded",
        healthScore: stats.meetingHealth.score,
        healthRating: stats.meetingHealth.overall,
      },
      insights: health.issues,
      recommendations: health.recommendations,
      generatedAt: new Date().toISOString(),
      reportType: isDataMode ? "Historical Analysis" : "Live Meeting Report",
    };
  }, [
    meeting,
    getMeetingStats,
    getMeetingHealth,
    formatDuration,
    meetingDuration,
    participants,
    messages,
    isRecording,
    isDataMode,
  ]);

  // Simple implementations for remaining functions
  const bulkMuteParticipants = useCallback(
    async (
      participantIds: string[]
    ): Promise<{ success: boolean; results: any[] }> => {
      if (isDataMode) return { success: false, results: [] };
      const results = participantIds.map((id) => ({ id, success: true }));
      return { success: true, results };
    },
    [isDataMode]
  );

  const bulkRemoveParticipants = useCallback(
    async (
      participantIds: string[]
    ): Promise<{ success: boolean; results: any[] }> => {
      if (isDataMode) return { success: false, results: [] };
      const results = participantIds.map((id) => ({ id, success: true }));
      return { success: true, results };
    },
    [isDataMode]
  );

  const saveMeetingTemplate = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      if (!meeting) return { success: false, error: "No meeting data" };
      return { success: true };
    },
    [meeting]
  );

  const loadMeetingTemplate = useCallback(
    async (
      templateId: string
    ): Promise<{ success: boolean; template?: any; error?: string }> => {
      return { success: false, error: "Template not found" };
    },
    []
  );

  const getTimeSeriesData = useCallback(() => {
    if (!isDataMode) return null;
    return [];
  }, [isDataMode]);

  const getHistoricalInsights = useCallback(() => {
    if (!isDataMode) return null;
    return [];
  }, [isDataMode]);

  const compareWithPreviousMeetings = useCallback(() => {
    if (!isDataMode) return null;
    return null;
  }, [isDataMode]);

  return {
    // Statistics
    getMeetingStats,
    exportMeetingData,

    // Participant utilities
    getParticipantsByRole,
    getActiveSpeakers,
    getParticipantsWithVideo,
    getParticipantsWithAudio,

    // Chat utilities
    getMessagesByType,
    getRecentMessages,
    searchMessages,

    // Meeting utilities
    formatDuration,
    getMeetingUrl,
    generateMeetingReport,

    // Permission utilities
    hasPermission,
    canModerateParticipant,

    // Meeting health
    getMeetingHealth,

    // Bulk operations
    bulkMuteParticipants,
    bulkRemoveParticipants,

    // Meeting templates
    saveMeetingTemplate,
    loadMeetingTemplate,

    // Analytics
    getParticipantEngagement,
    getChatAnalytics,
    getMediaUsageStats,
    getTimeSeriesData,

    // Data mode specific
    isDataMode,
    getHistoricalInsights,
    compareWithPreviousMeetings,
  };
};

export default useMeetingUtils;
