/* eslint-disable @typescript-eslint/no-unused-vars */

import { useMemo, useRef, useEffect } from "react";
import { useMeetingCore } from "./useMeetingCore";
import { useMeetingChat } from "./useMeetingChat";
import { useMeetingMedia } from "./useMeetingMedia";
import { useMeetingRecording } from "./useMeetingRecording";
import { useMeetingEvents } from "./useMeetingEvents";
import { useMeetingUtils } from "./useMeetingUtils";
import { useMeetingData } from "./useMeetingData";
import type {
  MediaState,
  ConnectionQualityInfo,
  ConnectionQuality,
} from "@/types/meeting";

/**
 * Main meeting hook that combines all sub-hooks
 * This is the single hook that components should use
 *
 * @param roomId - The room ID to join/manage or fetch data for
 * @param mode - 'live' for active meeting management, 'data' for historical data viewing
 */
export const useMeeting = (roomId: string, mode: "live" | "data" = "live") => {
  // Use refs to track stable values
  const roomIdRef = useRef(roomId);
  const modeRef = useRef(mode);

  // Update refs when values change
  useEffect(() => {
    roomIdRef.current = roomId;
    modeRef.current = mode;
  }, [roomId, mode]);

  // Data mode for viewing historical meetings - ONLY create when needed
  const dataHook = useMeetingData(mode === "data" ? roomId : undefined, {
    autoFetch: mode === "data",
    includeParticipants: true,
    includeMessages: true,
    includeAnalytics: true,
  });

  // Live mode hooks - ONLY active when in live mode
  const coreHook = useMeetingCore();
  const chatHook = useMeetingChat();
  const mediaHook = useMeetingMedia();
  const recordingHook = useMeetingRecording();

  // Events functionality (socket event handlers) - only for live mode
  // Create stable event handler config to prevent recreation
  const eventHandlerConfig = useMemo(
    () => ({
      meeting: mode === "live" ? coreHook.meeting : null,
      localParticipant: mode === "live" ? coreHook.localParticipant : null,
      addParticipant: coreHook.addParticipant,
      removeParticipantFromList: coreHook.removeParticipantFromList,
      updateParticipant: coreHook.updateParticipant,
      getParticipantById: coreHook.getParticipantById,
    }),
    [
      mode,
      coreHook.meeting,
      coreHook.localParticipant,
      coreHook.addParticipant,
      coreHook.removeParticipantFromList,
      coreHook.updateParticipant,
      coreHook.getParticipantById,
    ]
  );

  const eventsHook = useMeetingEvents(eventHandlerConfig);

  // Create a STABLE MediaState object for utils
  const fullMediaState: MediaState = useMemo(() => {
    if (mode === "data") {
      // For data mode, create a default MediaState based on local participant data
      const localParticipant = dataHook.localParticipant;
      return {
        audioEnabled: localParticipant?.mediaState?.audioEnabled || false,
        videoEnabled: localParticipant?.mediaState?.videoEnabled || false,
        audioMuted: localParticipant?.mediaState?.audioMuted || false,
        speaking: localParticipant?.mediaState?.speaking || false,
        screenSharing: localParticipant?.mediaState?.screenSharing || false,
        screenShareType: localParticipant?.mediaState?.screenSharing
          ? "screen"
          : undefined,
        backgroundBlur: localParticipant?.mediaState?.backgroundBlur || false,
        virtualBackground: localParticipant?.mediaState?.virtualBackground,
        noiseCancellation:
          localParticipant?.mediaState?.noiseCancellation || true,
        echoCancellation:
          localParticipant?.mediaState?.echoCancellation || true,
        autoGainControl: localParticipant?.mediaState?.autoGainControl || true,
        resolution: localParticipant?.mediaState?.resolution || "1280x720",
        frameRate: localParticipant?.mediaState?.frameRate || 30,
        bitrate: localParticipant?.mediaState?.bitrate || 1000,
        adaptiveQuality: localParticipant?.mediaState?.adaptiveQuality || true,
        currentQuality: localParticipant?.mediaState?.currentQuality || "high",
        targetQuality: localParticipant?.mediaState?.targetQuality || "high",
      };
    }

    // Live mode - use media hook state
    return {
      audioEnabled: mediaHook.localMediaState.audioEnabled,
      videoEnabled: mediaHook.localMediaState.videoEnabled,
      audioMuted: false,
      speaking: false,
      screenSharing: mediaHook.localMediaState.screenSharing,
      screenShareType: mediaHook.localMediaState.screenSharing
        ? "screen"
        : undefined,
      backgroundBlur: false,
      virtualBackground: undefined,
      noiseCancellation: true,
      echoCancellation: true,
      autoGainControl: true,
      resolution: "1280x720",
      frameRate: 30,
      bitrate: 1000,
      adaptiveQuality: true,
      currentQuality: "high",
      targetQuality: "high",
    };
  }, [
    mode,
    // Only include the specific properties we need to avoid unnecessary updates
    dataHook.localParticipant?.mediaState?.audioEnabled,
    dataHook.localParticipant?.mediaState?.videoEnabled,
    dataHook.localParticipant?.mediaState?.screenSharing,
    mediaHook.localMediaState.audioEnabled,
    mediaHook.localMediaState.videoEnabled,
    mediaHook.localMediaState.screenSharing,
  ]);

  // Utility functions configuration - STABLE
  const utilsConfig = useMemo(
    () => ({
      meeting: mode === "data" ? dataHook.meetingData : coreHook.meeting,
      participants:
        mode === "data" ? dataHook.participants : coreHook.participants,
      messages: mode === "data" ? dataHook.messages : chatHook.messages,
      localParticipant:
        mode === "data" ? dataHook.localParticipant : coreHook.localParticipant,
      meetingDuration:
        mode === "data"
          ? dataHook.calculatedDuration
          : coreHook.meetingDuration,
      recordingDuration: mode === "data" ? 0 : recordingHook.recordingDuration,
      isRecording:
        mode === "data" ? dataHook.wasRecorded : recordingHook.isRecording,
      localMediaState: fullMediaState,
      screenShareActive:
        mode === "data"
          ? dataHook.localParticipant?.mediaState?.screenSharing || false
          : mediaHook.localMediaState.screenSharing,
      roomId,
    }),
    [
      mode,
      dataHook.meetingData,
      dataHook.participants,
      dataHook.messages,
      dataHook.localParticipant,
      dataHook.calculatedDuration,
      dataHook.wasRecorded,
      coreHook.meeting,
      coreHook.participants,
      coreHook.localParticipant,
      coreHook.meetingDuration,
      chatHook.messages,
      recordingHook.recordingDuration,
      recordingHook.isRecording,
      fullMediaState,
      mediaHook.localMediaState.screenSharing,
      roomId,
    ]
  );

  const utilsHook = useMeetingUtils(utilsConfig);

  // Combine all hooks into a single interface - OPTIMIZED MEMOIZATION
  const combinedHook = useMemo(() => {
    const isDataMode = mode === "data";

    const baseData = isDataMode
      ? {
          // Data mode - return historical data
          meeting: dataHook.meetingData,
          participants: dataHook.participants,
          messages: dataHook.messages,
          localParticipant: dataHook.localParticipant,
          isInMeeting: false,
          isHost: dataHook.localParticipant?.role === "host",
          isModerator: ["host", "moderator"].includes(
            dataHook.localParticipant?.role || ""
          ),
          meetingStatus: dataHook.meetingData?.status || "ended",
          meetingError: dataHook.error,
          participantCount: dataHook.participants.length,
          meetingDuration: dataHook.calculatedDuration,
          isLoading: dataHook.isLoading,
          error: dataHook.error,
          isRecording: dataHook.wasRecorded,
          recordingDuration: 0,

          // Data mode specific
          isDataMode: true,
          refreshData: dataHook.refreshMeetingData,
          clearData: dataHook.clearData,
          dataLastUpdated: dataHook.dataLastUpdated,

          // Disabled actions for data mode
          createMeeting: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          joinMeeting: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          leaveMeeting: async () => {},
          endMeeting: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          removeParticipant: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          changeParticipantRole: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          muteParticipant: async () => ({
            success: false,
            error: "Not available in data mode",
          }),

          // Media controls - disabled in data mode
          localMediaState: fullMediaState,
          toggleAudio: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          toggleVideo: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          toggleScreenShare: async () => ({
            success: false,
            error: "Not available in data mode",
          }),

          // Chat - read-only in data mode
          unreadCount: 0,
          sendMessage: async () => ({
            success: false,
            error: "Not available in data mode",
          }),
          markAsRead: () => {},
          clearChat: () => {},

          // Connection quality - static for data mode
          connectionQuality: "good" as ConnectionQuality,
          networkStatus: "offline",
        }
      : {
          // Live mode - return active meeting management
          ...coreHook,
          ...chatHook,
          ...mediaHook,
          ...recordingHook,

          connectionQuality: eventsHook.connectionQuality,
          networkStatus: eventsHook.networkStatus,

          // Live mode specific
          isDataMode: false,
          refreshData: async () => ({
            success: false,
            error: "Not available in live mode",
          }),
          clearData: () => {},
          dataLastUpdated: null,
        };

    return {
      ...baseData,
      ...utilsHook,

      // Additional computed properties - MEMOIZED
      hasUnreadMessages: isDataMode ? false : chatHook.unreadCount > 0,
      totalActiveParticipants: isDataMode
        ? dataHook.participants.filter((p) => p.isActive).length
        : coreHook.participants.length,
      meetingHasStarted: isDataMode
        ? dataHook.meetingData?.status === "active" ||
          dataHook.meetingData?.status === "ended"
        : coreHook.meeting?.status === "active",
      canStartMeeting: isDataMode
        ? false
        : coreHook.isHost && coreHook.meeting?.status !== "active",

      // Quick action helpers - STABLE REFERENCES
      toggleMute: isDataMode
        ? async () => ({
            success: false,
            error: "Not available in data mode",
          })
        : mediaHook.toggleAudio,
      toggleCamera: isDataMode
        ? async () => ({
            success: false,
            error: "Not available in data mode",
          })
        : mediaHook.toggleVideo,
      toggleShare: isDataMode
        ? async () => ({
            success: false,
            error: "Not available in data mode",
          })
        : mediaHook.toggleScreenShare,
      toggleRecording: isDataMode
        ? async () => ({
            success: false,
            error: "Not available in data mode",
          })
        : recordingHook.isRecording
        ? recordingHook.stopRecording
        : recordingHook.startRecording,

      // Screen share state
      screenShareActive: isDataMode
        ? dataHook.localParticipant?.mediaState?.screenSharing || false
        : mediaHook.localMediaState.screenSharing,

      // Bulk actions - disabled in data mode
      muteAllParticipants: async () => {
        if (isDataMode) {
          return { success: false, error: "Not available in data mode" };
        }

        if (!coreHook.isModerator)
          return { success: false, error: "Insufficient permissions" };

        const results = await Promise.allSettled(
          coreHook.participants
            .filter((p) => p.id !== coreHook.localParticipant?.id)
            .map((p) => coreHook.muteParticipant(p.id))
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        return { success: successCount > 0, mutedCount: successCount };
      },

      inviteByEmail: async (emails: string[]) => {
        if (isDataMode) {
          return { success: false, error: "Not available in data mode" };
        }

        const meeting = coreHook.meeting;
        if (!meeting) return { success: false, error: "No active meeting" };

        return { success: true, invitedCount: emails.length };
      },

      // Meeting summary - MEMOIZED
      getMeetingSummary: () => {
        const currentMeeting = isDataMode
          ? dataHook.meetingData
          : coreHook.meeting;
        const currentParticipants = isDataMode
          ? dataHook.participants
          : coreHook.participants;
        const currentMessages = isDataMode
          ? dataHook.messages
          : chatHook.messages;
        const currentDuration = isDataMode
          ? dataHook.calculatedDuration
          : coreHook.meetingDuration;
        const currentRecording = isDataMode
          ? dataHook.wasRecorded
          : recordingHook.isRecording;
        const currentScreenShare = isDataMode
          ? dataHook.localParticipant?.mediaState?.screenSharing || false
          : mediaHook.localMediaState.screenSharing;

        return {
          id: currentMeeting?.id,
          title: currentMeeting?.title,
          duration: currentDuration,
          participantCount: currentParticipants.length,
          messageCount: currentMessages.length,
          isRecorded: currentRecording,
          hasScreenShare: currentScreenShare,
          status: currentMeeting?.status,
          startTime: currentMeeting?.startTime || currentMeeting?.startedAt,
          host: currentMeeting?.hostId,
          quality: isDataMode
            ? ("good" as ConnectionQuality)
            : (eventsHook.connectionQuality as ConnectionQuality),
          mode,
        };
      },
    };
  }, [
    mode,
    // Only include the specific hook properties that matter for the combination
    coreHook.meeting?.id,
    coreHook.meeting?.status,
    coreHook.isHost,
    coreHook.participants.length,
    coreHook.meetingDuration,
    chatHook.unreadCount,
    chatHook.messages.length,
    dataHook.meetingData?.id,
    dataHook.meetingData?.status,
    dataHook.participants.length,
    dataHook.calculatedDuration,
    dataHook.isLoading,
    dataHook.error,
    utilsHook,
    eventsHook.connectionQuality,
    eventsHook.networkStatus,
  ]);

  return combinedHook;
};

export default useMeeting;
