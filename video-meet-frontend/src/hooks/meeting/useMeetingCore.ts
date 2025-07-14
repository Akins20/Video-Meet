/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "../useAuth";
import { useSocket } from "../useSocket";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS, WEBSOCKET_CONFIG } from "@/utils/constants";
import type {
  Meeting,
  MeetingParticipant,
  MeetingStatus,
  ParticipantRole,
} from "@/types/meeting";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const WS_EVENTS = WEBSOCKET_CONFIG.events;

// Core meeting interfaces
interface JoinMeetingOptions {
  roomId: string;
  password?: string;
  guestName?: string;
  autoEnableAudio?: boolean;
  autoEnableVideo?: boolean;
}

interface CreateMeetingOptions {
  title: string;
  description?: string;
  scheduledTime?: string;
  duration?: number;
  settings?: any;
  invitees?: string[];
}

interface UseMeetingCoreOptions {
  dataMode?: boolean;
  roomId?: string;
}

interface UseMeetingCoreReturn {
  // Meeting state
  meeting: Meeting | null;
  isInMeeting: boolean;
  isHost: boolean;
  isModerator: boolean;
  meetingStatus: MeetingStatus;
  meetingError: string | null;

  // Participants
  participants: MeetingParticipant[];
  participantCount: number;
  localParticipant: MeetingParticipant | null;
  onlineParticipants: MeetingParticipant[];
  offlineParticipants: MeetingParticipant[];

  // Core actions
  createMeeting: (
    options: CreateMeetingOptions
  ) => Promise<{ success: boolean; meeting?: Meeting; error?: string }>;
  joinMeeting: (
    options: JoinMeetingOptions
  ) => Promise<{ success: boolean; error?: string }>;
  leaveMeeting: () => Promise<void>;
  endMeeting: () => Promise<{ success: boolean; error?: string }>;

  // Participant management
  removeParticipant: (
    participantId: string
  ) => Promise<{ success: boolean; error?: string }>;
  changeParticipantRole: (
    participantId: string,
    role: ParticipantRole
  ) => Promise<{ success: boolean; error?: string }>;
  muteParticipant: (
    participantId: string
  ) => Promise<{ success: boolean; error?: string }>;

  // State management
  isLoading: boolean;
  error: string | null;
  meetingDuration: number;

  // Utility functions
  canPerformAction: (action: string) => boolean;
  getMeetingLink: (includePassword?: boolean) => string;
  getParticipantById: (id: string) => MeetingParticipant | undefined;

  // Internal state setters for other hooks
  setMeeting: (meeting: Meeting | null) => void;
  setParticipants: (
    participants:
      | MeetingParticipant[]
      | ((prev: MeetingParticipant[]) => MeetingParticipant[])
  ) => void;
  setLocalParticipant: (participant: MeetingParticipant | null) => void;
  updateParticipant: (
    participantId: string,
    updates: Partial<MeetingParticipant>
  ) => void;
  addParticipant: (participant: MeetingParticipant) => void;
  removeParticipantFromList: (participantId: string) => void;

  // Data mode specific
  isDataMode: boolean;
  fetchMeetingData?: (
    roomId: string
  ) => Promise<{ success: boolean; error?: string }>;
  refreshData?: () => Promise<{ success: boolean; error?: string }>;
}

/**
 * Core meeting hook - handles basic meeting operations
 * Can work in both live mode and data mode for historical meetings
 */
export const useMeetingCore = (
  options: UseMeetingCoreOptions = {}
): UseMeetingCoreReturn => {
  const { dataMode = false, roomId } = options;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, emit, on } = useSocket();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  // Core meeting state
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [localParticipant, setLocalParticipant] =
    useState<MeetingParticipant | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingDuration, setMeetingDuration] = useState(0);

  // Refs for tracking
  const meetingStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const joinAttemptRef = useRef<boolean>(false);
  const mountedRef = useRef(true);

  // Computed state
  const isInMeeting =
    !dataMode && !!meeting && meeting.status === "active" && !!localParticipant;
  const isHost = meeting?.hostId === user?.id;
  const isModerator =
    localParticipant?.role === "host" || localParticipant?.role === "moderator";
  const meetingStatus = meeting?.status || "waiting";
  const participantCount = participants.length;
  const onlineParticipants = participants.filter((p) => p.isActive);
  const offlineParticipants = participants.filter((p) => !p.isActive);

  /**
   * Enhanced logging
   */
  const logMeetingAction = useCallback(
    (action: string, data?: any) => {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📹 Meeting [${action}] ${dataMode ? "[DATA MODE]" : "[LIVE MODE]"}:`,
          {
            meetingId: meeting?.id,
            roomId: meeting?.roomId || roomId,
            participantId: localParticipant?.id,
            isConnected,
            timestamp: new Date().toISOString(),
            ...data,
          }
        );
      }
    },
    [meeting, localParticipant, isConnected, dataMode, roomId]
  );

  /**
   * Clear error helper
   */
  const clearError = useCallback(() => {
    setError(null);
    setMeetingError(null);
  }, []);

  /**
   * Fetch meeting data for data mode
   */
  const fetchMeetingData = useCallback(
    async (
      targetRoomId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!dataMode) {
        return { success: false, error: "Not in data mode" };
      }

      try {
        logMeetingAction("FETCH_MEETING_DATA_START", { roomId: targetRoomId });
        setIsLoading(true);
        clearError();

        // Fetch meeting by room ID
        const meetingResponse = await apiClient.get<{ meeting: Meeting }>(
          API_ENDPOINTS.meetings.getByRoomId(targetRoomId)
        );

        if (!meetingResponse.success || !meetingResponse.data?.meeting) {
          throw new Error("Meeting not found");
        }

        const meetingData = meetingResponse.data.meeting;
        setMeeting(meetingData);

        // Calculate duration from start/end times
        if (meetingData.startedAt && meetingData.endedAt) {
          const duration = Math.floor(
            (new Date(meetingData.endedAt).getTime() -
              new Date(meetingData.startedAt).getTime()) /
              1000
          );
          setMeetingDuration(duration);
        } else if (meetingData.duration) {
          setMeetingDuration(meetingData.duration);
        }

        // Fetch participants
        try {
          const participantsResponse = await apiClient.get<{
            participants: MeetingParticipant[];
          }>(API_ENDPOINTS.meetings.participants(meetingData.id));

          if (
            participantsResponse.success &&
            participantsResponse.data?.participants
          ) {
            const participantList = participantsResponse.data.participants;
            setParticipants(participantList);

            // Find local participant if user was in the meeting
            if (user) {
              const userParticipant = participantList.find(
                (p) => p.userId === user.id || p.email === user.email
              );
              setLocalParticipant(userParticipant || null);
            }
          }
        } catch (error) {
          console.warn("Failed to fetch participants:", error);
          setParticipants([]);
        }

        logMeetingAction("FETCH_MEETING_DATA_SUCCESS", {
          meetingId: meetingData.id,
        });
        return { success: true };
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch meeting data";
        logMeetingAction("FETCH_MEETING_DATA_ERROR", { error: errorMessage });
        setError(errorMessage);
        setMeetingError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [dataMode, user, clearError, logMeetingAction]
  );

  /**
   * Refresh data for data mode
   */
  const refreshData = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!dataMode || !meeting?.roomId) {
      return { success: false, error: "No meeting data to refresh" };
    }
    return await fetchMeetingData(meeting.roomId);
  }, [dataMode, meeting?.roomId, fetchMeetingData]);

  /**
   * Auto-fetch data in data mode
   */
  useEffect(() => {
    if (dataMode && roomId && !meeting) {
      fetchMeetingData(roomId);
    }
  }, [dataMode, roomId, meeting, fetchMeetingData]);

  /**
   * Start meeting duration timer (live mode only)
   */
  const startDurationTimer = useCallback(() => {
    if (dataMode) return; // Don't start timer in data mode

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    meetingStartTimeRef.current = new Date();
    durationIntervalRef.current = setInterval(() => {
      if (meetingStartTimeRef.current && mountedRef.current) {
        const duration = Math.floor(
          (Date.now() - meetingStartTimeRef.current.getTime()) / 1000
        );
        setMeetingDuration(duration);
      }
    }, 1000);
  }, [dataMode]);

  /**
   * Stop meeting duration timer
   */
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    meetingStartTimeRef.current = null;
  }, []);

  /**
   * Participant management functions
   */
  const updateParticipant = useCallback(
    (participantId: string, updates: Partial<MeetingParticipant>) => {
      if (dataMode) return; // Read-only in data mode

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId || p.userId === participantId
            ? { ...p, ...updates }
            : p
        )
      );
    },
    [dataMode]
  );

  const addParticipant = useCallback(
    (participant: MeetingParticipant) => {
      if (dataMode) return; // Read-only in data mode

      setParticipants((prev) => {
        const exists = prev.some(
          (p) => p.id === participant.id || p.userId === participant.userId
        );
        if (!exists) {
          return [...prev, participant];
        }
        return prev;
      });
    },
    [dataMode]
  );

  const removeParticipantFromList = useCallback(
    (participantId: string) => {
      if (dataMode) return; // Read-only in data mode

      setParticipants((prev) =>
        prev.filter((p) => p.id !== participantId && p.userId !== participantId)
      );
    },
    [dataMode]
  );

  /**
   * Create a new meeting (live mode only)
   */
  const createMeeting = useCallback(
    async (
      options: CreateMeetingOptions
    ): Promise<{ success: boolean; meeting?: Meeting; error?: string }> => {
      if (dataMode) {
        return { success: false, error: "Not available in data mode" };
      }

      try {
        logMeetingAction("CREATE_MEETING_START", options);
        setIsLoading(true);
        clearError();

        const meetingData = {
          title: options.title,
          description: options.description,
          scheduledTime: options.scheduledTime,
          duration: options.duration,
          settings: {
            allowChat: true,
            allowScreenShare: true,
            allowRecording: false,
            muteParticipantsOnJoin: false,
            requirePassword: false,
            maxParticipants: 100,
            enableWaitingRoom: false,
            autoStartRecording: false,
            enableBreakoutRooms: false,
            allowParticipantVideo: true,
            allowParticipantAudio: true,
            enableFileSharing: true,
            ...options.settings,
          },
          invitees: options.invitees || [],
        };

        const response = await apiClient.post<{ meeting: Meeting }>(
          API_ENDPOINTS.meetings.create,
          meetingData
        );

        if (response.success && response.data?.meeting) {
          const newMeeting = response.data.meeting;
          setMeeting(newMeeting);
          logMeetingAction("CREATE_MEETING_SUCCESS", {
            meetingId: newMeeting.id,
          });

          toast.success("Meeting created successfully!");
          router.push(`/meeting/${newMeeting.roomId}`);

          return { success: true, meeting: newMeeting };
        }

        return { success: false, error: "Failed to create meeting" };
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || "Failed to create meeting";
        logMeetingAction("CREATE_MEETING_ERROR", { error: errorMessage });
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [dataMode, router, clearError, logMeetingAction]
  );

  /**
   * Join a meeting (live mode only)
   */
  const joinMeeting = useCallback(
    async (
      options: JoinMeetingOptions
    ): Promise<{ success: boolean; error?: string }> => {
      if (dataMode) {
        return { success: false, error: "Not available in data mode" };
      }

      if (joinAttemptRef.current) {
        return { success: false, error: "Already joining meeting" };
      }

      joinAttemptRef.current = true;

      try {
        logMeetingAction("JOIN_MEETING_START", options);
        setIsLoading(true);
        clearError();

        // Get meeting details
        const meetingResponse = await apiClient.get<{ meeting: Meeting }>(
          API_ENDPOINTS.meetings.getByRoomId(options.roomId)
        );

        if (!meetingResponse.success || !meetingResponse.data?.meeting) {
          throw new Error("Meeting not found");
        }

        const meetingData = meetingResponse.data.meeting;

        // Join the meeting via API
        const joinResponse = await apiClient.post<{
          participant: MeetingParticipant;
        }>(
          API_ENDPOINTS.meetings.join(options.roomId),
          {
            password: options.password,
            guestName: options.guestName,
            deviceInfo: {
              type: "web",
              platform: navigator.platform,
              browser: navigator.userAgent,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!joinResponse.success || !joinResponse.data?.participant) {
          throw new Error(joinResponse.message || "Failed to join meeting");
        }

        const participant = joinResponse.data.participant;

        // Set meeting and participant data
        setMeeting(meetingData);
        setLocalParticipant(participant);
        addParticipant(participant);

        // Join socket room if connected
        if (isConnected && socket) {
          emit(WS_EVENTS.JOIN_MEETING, {
            meetingId: meetingData.id,
            participantId: participant.id,
            roomId: options.roomId,
            userId: user?.id,
          });
        }

        // Start duration timer if meeting is active
        if (meetingData.status === "active") {
          startDurationTimer();
        }

        logMeetingAction("JOIN_MEETING_SUCCESS");
        toast.success("Joined meeting successfully!");

        return { success: true };
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to join meeting";
        logMeetingAction("JOIN_MEETING_ERROR", { error: errorMessage });
        setError(errorMessage);
        setMeetingError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
        joinAttemptRef.current = false;
      }
    },
    [
      dataMode,
      socket,
      isConnected,
      emit,
      user,
      startDurationTimer,
      addParticipant,
      clearError,
      logMeetingAction,
    ]
  );

  /**
   * Leave the current meeting (live mode only)
   */
  const leaveMeeting = useCallback(async (): Promise<void> => {
    if (dataMode) return; // No-op in data mode

    try {
      logMeetingAction("LEAVE_MEETING_START");

      if (!meeting) return;

      setIsLoading(true);
      stopDurationTimer();

      // Leave via API
      try {
        await apiClient.post(API_ENDPOINTS.meetings.leave(meeting.id), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (apiError) {
        logMeetingAction("API_LEAVE_ERROR", { error: apiError });
      }

      // Leave socket room
      if (socket && isConnected) {
        emit(WS_EVENTS.LEAVE_MEETING, {
          meetingId: meeting.id,
          participantId: localParticipant?.id,
          roomId: meeting.roomId,
          userId: user?.id,
        });
      }

      // Clear state
      setMeeting(null);
      setParticipants([]);
      setLocalParticipant(null);
      setMeetingDuration(0);
      setError(null);
      setMeetingError(null);
      joinAttemptRef.current = false;

      toast.success("Left meeting");
      router.push("/dashboard");
    } catch (error) {
      logMeetingAction("LEAVE_MEETING_ERROR", { error });

      // Clear state even if operations fail
      setMeeting(null);
      setParticipants([]);
      setLocalParticipant(null);
      joinAttemptRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [
    dataMode,
    meeting,
    localParticipant,
    socket,
    isConnected,
    emit,
    user,
    stopDurationTimer,
    router,
    logMeetingAction,
  ]);

  /**
   * End the meeting (host only, live mode only)
   */
  const endMeeting = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (dataMode) {
      return { success: false, error: "Not available in data mode" };
    }

    try {
      if (!meeting || !isHost) {
        return { success: false, error: "Only the host can end the meeting" };
      }

      setIsLoading(true);
      const response = await apiClient.post(
        API_ENDPOINTS.meetings.end(meeting.id),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success) {
        // Notify all participants
        if (socket && isConnected) {
          emit(WS_EVENTS.MEETING_ENDED, {
            meetingId: meeting.id,
            endedBy: user?.id,
            endedByName: user?.displayName || user?.email,
            timestamp: new Date().toISOString(),
          });
        }

        toast.success("Meeting ended");
        setTimeout(() => leaveMeeting(), 2000);
        return { success: true };
      }

      return {
        success: false,
        error: response.message || "Failed to end meeting",
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to end meeting";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [
    dataMode,
    meeting,
    isHost,
    socket,
    isConnected,
    emit,
    user,
    leaveMeeting,
  ]);

  /**
   * Participant management (live mode only)
   */
  const removeParticipant = useCallback(
    async (
      participantId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (dataMode) {
        return { success: false, error: "Not available in data mode" };
      }

      try {
        if (!meeting || !isModerator) {
          return { success: false, error: "Insufficient permissions" };
        }

        const response = await apiClient.delete(
          API_ENDPOINTS.meetings.removeParticipant(meeting.id, participantId),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.success) {
          removeParticipantFromList(participantId);
          toast.success("Participant removed");
          return { success: true };
        }

        return {
          success: false,
          error: response.message || "Failed to remove participant",
        };
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || "Failed to remove participant";
        return { success: false, error: errorMessage };
      }
    },
    [dataMode, meeting, isModerator, removeParticipantFromList]
  );

  const changeParticipantRole = useCallback(
    async (
      participantId: string,
      role: ParticipantRole
    ): Promise<{ success: boolean; error?: string }> => {
      if (dataMode) {
        return { success: false, error: "Not available in data mode" };
      }

      try {
        if (!meeting || !isHost) {
          return {
            success: false,
            error: "Only the host can change participant roles",
          };
        }

        updateParticipant(participantId, { role });

        if (socket && isConnected) {
          emit("participant-role-change", {
            meetingId: meeting.id,
            participantId,
            role,
            changedBy: user?.id,
          });
        }

        toast.success(`Participant role changed to ${role}`);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: "Failed to change participant role" };
      }
    },
    [
      dataMode,
      meeting,
      isHost,
      socket,
      isConnected,
      user,
      emit,
      updateParticipant,
    ]
  );

  const muteParticipant = useCallback(
    async (
      participantId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (dataMode) {
        return { success: false, error: "Not available in data mode" };
      }

      try {
        if (!meeting || !isModerator) {
          return { success: false, error: "Insufficient permissions" };
        }

        if (socket && isConnected) {
          emit("mute-participant", {
            meetingId: meeting.id,
            participantId,
            mutedBy: user?.id,
          });
        }

        toast.success("Participant muted");
        return { success: true };
      } catch (error: any) {
        return { success: false, error: "Failed to mute participant" };
      }
    },
    [dataMode, meeting, isModerator, socket, isConnected, user, emit]
  );

  /**
   * Utility functions
   */
  const canPerformAction = useCallback(
    (action: string): boolean => {
      if (!localParticipant || dataMode) return false; // No actions in data mode

      switch (action) {
        case "end_meeting":
          return isHost;
        case "mute_others":
        case "remove_participants":
        case "start_recording":
        case "stop_recording":
          return isModerator;
        case "share_screen":
        case "send_chat":
        case "turn_on_video":
        case "turn_on_audio":
          return true; // Basic permissions
        default:
          return false;
      }
    },
    [localParticipant, isHost, isModerator, dataMode]
  );

  const getMeetingLink = useCallback(
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

  const getParticipantById = useCallback(
    (id: string): MeetingParticipant | undefined => {
      return participants.find((p) => p.id === id || p.userId === id);
    },
    [participants]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopDurationTimer();
      joinAttemptRef.current = false;
    };
  }, [stopDurationTimer]);

  return {
    // Meeting state
    meeting,
    isInMeeting,
    isHost,
    isModerator,
    meetingStatus,
    meetingError,

    // Participants
    participants,
    participantCount,
    localParticipant,
    onlineParticipants,
    offlineParticipants,

    // Core actions
    createMeeting,
    joinMeeting,
    leaveMeeting,
    endMeeting,

    // Participant management
    removeParticipant,
    changeParticipantRole,
    muteParticipant,

    // State management
    isLoading,
    error,
    meetingDuration,

    // Utility functions
    canPerformAction,
    getMeetingLink,
    getParticipantById,

    // Internal setters for other hooks
    setMeeting,
    setParticipants,
    setLocalParticipant,
    updateParticipant,
    addParticipant,
    removeParticipantFromList,

    // Data mode specific
    isDataMode: dataMode,
    fetchMeetingData: dataMode ? fetchMeetingData : undefined,
    refreshData: dataMode ? refreshData : undefined,
  };
};

export default useMeetingCore;
