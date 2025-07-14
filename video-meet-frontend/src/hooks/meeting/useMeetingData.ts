/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../useAuth";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS } from "@/utils/constants";
import type { Meeting, MeetingParticipant, ChatMessage } from "@/types/meeting";
import type { ApiResponse } from "@/types/api";

interface UseMeetingDataOptions {
  autoFetch?: boolean;
  includeParticipants?: boolean;
  includeMessages?: boolean;
  includeAnalytics?: boolean;
}

interface UseMeetingDataReturn {
  // Data state
  meetingData: Meeting | null;
  participants: MeetingParticipant[];
  messages: ChatMessage[];
  localParticipant: MeetingParticipant | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;
  isDataMode: boolean;

  // Computed values
  calculatedDuration: number;
  wasRecorded: boolean;

  // Actions
  fetchMeetingData: (
    roomId: string
  ) => Promise<{ success: boolean; error?: string }>;
  refreshMeetingData: () => Promise<{ success: boolean; error?: string }>;
  clearData: () => void;

  // Status checks
  hasData: boolean;
  dataLastUpdated: Date | null;
}

/**
 * Hook for fetching and managing meeting data (for viewing historical meetings)
 */
export const useMeetingData = (
  roomId?: string,
  options: UseMeetingDataOptions = {}
): UseMeetingDataReturn => {
  const {
    autoFetch = true,
    includeParticipants = true,
    includeMessages = true,
    includeAnalytics = true,
  } = options;

  const { user } = useAuth();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  // Use refs to track values that shouldn't trigger re-renders
  const optionsRef = useRef({
    includeParticipants,
    includeMessages,
    includeAnalytics,
  });
  const isFirstFetch = useRef(true);

  // Update options ref when values change
  useEffect(() => {
    optionsRef.current = {
      includeParticipants,
      includeMessages,
      includeAnalytics,
    };
  }, [includeParticipants, includeMessages, includeAnalytics]);

  // Data state
  const [meetingData, setMeetingData] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localParticipant, setLocalParticipant] =
    useState<MeetingParticipant | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLastUpdated, setDataLastUpdated] = useState<Date | null>(null);

  // Mode indicator
  const isDataMode = !!roomId && !!meetingData;

  /**
   * Calculate meeting duration from start/end times
   */
  const calculatedDuration =
    meetingData && meetingData.startedAt && meetingData.endedAt
      ? Math.floor(
          (new Date(meetingData.endedAt).getTime() -
            new Date(meetingData.startedAt).getTime()) /
            1000
        )
      : meetingData?.duration || 0;

  /**
   * Check if meeting was recorded
   */
  const wasRecorded =
    meetingData?.analytics?.featureUsage.recordingUsed || false;

  /**
   * Fetch meeting data from API - STABLE REFERENCE
   */
  const fetchMeetingData = useCallback(
    async (
      targetRoomId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!targetRoomId?.trim()) {
        return { success: false, error: "Room ID is required" };
      }

      if (!accessToken) {
        return { success: false, error: "Authentication required" };
      }

      try {
        setIsLoading(true);
        setError(null);

        // Build query parameters based on current options
        const queryParams = new URLSearchParams();
        if (optionsRef.current.includeParticipants) {
          queryParams.append("includeParticipants", "true");
        }
        if (optionsRef.current.includeMessages) {
          queryParams.append("includeMessages", "true");
        }
        if (optionsRef.current.includeAnalytics) {
          queryParams.append("includeAnalytics", "true");
        }
        console.log("targetRoomId", targetRoomId);

        const response = await apiClient.get<
          ApiResponse<{
            meeting: Meeting;
            participants?: MeetingParticipant[];
            messages?: ChatMessage[];
          }>
        >(`${API_ENDPOINTS.meetings.base}/${targetRoomId}/stats`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        console.log(response.data);

        if (response.data.success && response.data.data) {
          const {
            meeting,
            participants = [],
            messages = [],
          } = response.data.data;

          setMeetingData(meeting);
          setParticipants(participants);
          setMessages(messages);

          // Find local participant
          const localPart =
            participants.find((p) => p.userId === user?.id) || null;
          setLocalParticipant(localPart);

          setDataLastUpdated(new Date());

          toast.success("Meeting data loaded successfully");
          return { success: true };
        } else {
          const errorMsg =
            response.data.message || "Failed to fetch meeting data";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch meeting data";
        setError(errorMsg);
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, user?.id]
  ); // Only depend on stable values

  /**
   * Refresh current meeting data - STABLE REFERENCE
   */
  const refreshMeetingData = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!meetingData?.roomId) {
      return { success: false, error: "No meeting data to refresh" };
    }

    return await fetchMeetingData(meetingData.roomId);
  }, [meetingData?.roomId, fetchMeetingData]);

  /**
   * Clear all data - STABLE REFERENCE
   */
  const clearData = useCallback(() => {
    setMeetingData(null);
    setParticipants([]);
    setMessages([]);
    setLocalParticipant(null);
    setError(null);
    setDataLastUpdated(null);
  }, []);

  /**
   * Auto-fetch data when roomId is provided - FIXED DEPENDENCY ARRAY
   */
  useEffect(() => {
    // Only auto-fetch if:
    // 1. We have a roomId
    // 2. autoFetch is enabled
    // 3. We don't already have data for this roomId
    // 4. We're not already loading
    const shouldFetch =
      roomId &&
      autoFetch &&
      !isLoading &&
      (meetingData?.roomId !== roomId || isFirstFetch.current);

    if (shouldFetch) {
      isFirstFetch.current = false;
      fetchMeetingData(roomId);
    }
  }, [roomId, autoFetch, isLoading, meetingData?.roomId]);

  // Reset first fetch flag when roomId changes
  useEffect(() => {
    isFirstFetch.current = true;
  }, [roomId]);

  return {
    // Data state
    meetingData,
    participants,
    messages,
    localParticipant,

    // Loading and error states
    isLoading,
    error,
    isDataMode,

    // Computed values
    calculatedDuration,
    wasRecorded,

    // Actions
    fetchMeetingData,
    refreshMeetingData,
    clearData,

    // Status checks
    hasData: !!meetingData,
    dataLastUpdated,
  };
};

export default useMeetingData;
