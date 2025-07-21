/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../useAuth";
import { useSocket } from "../useSocket";
import { useMeetingCore } from "./useMeetingCore";
import { WEBSOCKET_CONFIG } from "@/utils/constants";

const WS_EVENTS = WEBSOCKET_CONFIG.events;

// Simple media state (only what we need)
interface SimpleMediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
}

interface UseMeetingMediaReturn {
  // Media state
  localMediaState: SimpleMediaState;

  // Basic media actions
  toggleAudio: () => Promise<{ success: boolean; error?: string }>;
  toggleVideo: () => Promise<{ success: boolean; error?: string }>;
  toggleScreenShare: () => Promise<{ success: boolean; error?: string }>;
  raiseHand: () => Promise<{ success: boolean; error?: string }>;
  lowerHand: () => Promise<{ success: boolean; error?: string }>;
}

/**
 * Simple meeting media hook - handles basic audio/video controls
 */
export const useMeetingMedia = (): UseMeetingMediaReturn => {
  const { user } = useAuth();
  const { socket, isConnected, emit, on } = useSocket();
  const { meeting, localParticipant, updateParticipant } = useMeetingCore();

  // Simple media state
  const [localMediaState, setLocalMediaState] = useState<SimpleMediaState>({
    audioEnabled: false,
    videoEnabled: false,
    screenSharing: false,
    handRaised: false,
  });

  // Refs for tracking
  const mountedRef = useRef(true);

  /**
   * Enhanced logging for media - OPTIMIZED
   */
  const logMediaAction = useCallback(
    (action: string, data?: any) => {
      if (process.env.NODE_ENV === "development" && action !== "SETTING_UP_HANDLERS" && action !== "CLEANUP_HANDLERS") {
        console.log(`🎥 Media [${action}]:`, data);
      }
    },
    []
  );

  /**
   * Broadcast media state change
   */
  const broadcastMediaState = useCallback(
    (newState: Partial<SimpleMediaState>) => {
      if (socket && isConnected && meeting) {
        const updatedState = { ...localMediaState, ...newState };
        emit(WS_EVENTS.MEDIA_STATE_CHANGE, {
          meetingId: meeting.id,
          participantId: localParticipant?.id,
          mediaState: updatedState,
        });
      }
    },
    [socket, isConnected, meeting, localParticipant, localMediaState, emit]
  );

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const newState = !localMediaState.audioEnabled;
      logMediaAction("TOGGLE_AUDIO", { newState });

      // Try to get user media for audio
      if (newState) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          // Store stream reference for later cleanup
          logMediaAction("AUDIO_STREAM_OBTAINED");
        } catch (mediaError: any) {
          logMediaAction("AUDIO_PERMISSION_DENIED", {
            error: mediaError.message,
          });
          toast.error("Microphone access denied");
          return { success: false, error: "Microphone access denied" };
        }
      }

      const updatedState = { audioEnabled: newState };
      setLocalMediaState((prev) => ({ ...prev, ...updatedState }));
      broadcastMediaState(updatedState);

      toast.success(newState ? "Microphone enabled" : "Microphone disabled");
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to toggle audio";
      logMediaAction("TOGGLE_AUDIO_ERROR", { error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [localMediaState, broadcastMediaState, logMediaAction]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const newState = !localMediaState.videoEnabled;
      logMediaAction("TOGGLE_VIDEO", { newState });

      // Try to get user media for video
      if (newState) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          // Store stream reference for later cleanup
          logMediaAction("VIDEO_STREAM_OBTAINED");
        } catch (mediaError: any) {
          logMediaAction("VIDEO_PERMISSION_DENIED", {
            error: mediaError.message,
          });
          toast.error("Camera access denied");
          return { success: false, error: "Camera access denied" };
        }
      }

      const updatedState = { videoEnabled: newState };
      setLocalMediaState((prev) => ({ ...prev, ...updatedState }));
      broadcastMediaState(updatedState);

      toast.success(newState ? "Camera enabled" : "Camera disabled");
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to toggle video";
      logMediaAction("TOGGLE_VIDEO_ERROR", { error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [localMediaState, broadcastMediaState, logMediaAction]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const newState = !localMediaState.screenSharing;
      logMediaAction("TOGGLE_SCREEN_SHARE", { newState });

      if (newState) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
          logMediaAction("SCREEN_SHARE_STREAM_OBTAINED");

          // Broadcast screen share start
          if (socket && isConnected && meeting) {
            emit(WS_EVENTS.SCREEN_SHARE_START, {
              meetingId: meeting.id,
              participantId: localParticipant?.id,
              userId: user?.id,
            });
          }

          toast.success("Screen sharing started");
        } catch (mediaError: any) {
          logMediaAction("SCREEN_SHARE_PERMISSION_DENIED", {
            error: mediaError.message,
          });
          toast.error("Screen sharing permission denied");
          return { success: false, error: "Screen sharing permission denied" };
        }
      } else {
        // Broadcast screen share stop
        if (socket && isConnected && meeting) {
          emit(WS_EVENTS.SCREEN_SHARE_STOP, {
            meetingId: meeting.id,
            participantId: localParticipant?.id,
            userId: user?.id,
          });
        }

        toast.success("Screen sharing stopped");
      }

      const updatedState = { screenSharing: newState };
      setLocalMediaState((prev) => ({ ...prev, ...updatedState }));
      broadcastMediaState(updatedState);

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to toggle screen share";
      logMediaAction("TOGGLE_SCREEN_SHARE_ERROR", { error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [
    localMediaState,
    socket,
    isConnected,
    meeting,
    localParticipant,
    user,
    emit,
    broadcastMediaState,
    logMediaAction,
  ]);

  /**
   * Raise hand
   */
  const raiseHand = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const newState = !localMediaState.handRaised;
      logMediaAction("RAISE_HAND", { newState });

      const updatedState = { handRaised: newState };
      setLocalMediaState((prev) => ({ ...prev, ...updatedState }));
      broadcastMediaState(updatedState);

      toast.success(newState ? "Hand raised" : "Hand lowered");
      return { success: true };
    } catch (error: any) {
      const errorMessage = "Failed to update hand raise state";
      logMediaAction("RAISE_HAND_ERROR", { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [localMediaState, broadcastMediaState, logMediaAction]);

  /**
   * Lower hand
   */
  const lowerHand = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (localMediaState.handRaised) {
      return raiseHand(); // Toggle off
    }
    return { success: true };
  }, [localMediaState, raiseHand]);

  /**
   * Set up media socket event handlers - OPTIMIZED
   */
  const handlersSetupRef = useRef(false);
  
  useEffect(() => {
    if (!socket || !isConnected || handlersSetupRef.current) return;

    handlersSetupRef.current = true;

    // Handle media state changes from other participants
    const handleMediaStateChange = on(
      WS_EVENTS.MEDIA_STATE_CHANGE,
      (data: any) => {
        if (data.participantId && data.participantId !== localParticipant?.id) {
          updateParticipant(data.participantId, {
            mediaState: data.mediaState,
          });
        }
      }
    );

    // Handle screen share events
    const handleScreenShareStart = on(
      WS_EVENTS.SCREEN_SHARE_START,
      (data: any) => {
        if (data.participantId !== localParticipant?.id) {
          updateParticipant(data.participantId, {
            mediaState: { screenSharing: true },
          });
          toast.success("Screen sharing started by another participant");
        }
      }
    );

    const handleScreenShareStop = on(
      WS_EVENTS.SCREEN_SHARE_STOP,
      (data: any) => {
        if (data.participantId !== localParticipant?.id) {
          updateParticipant(data.participantId, {
            mediaState: { screenSharing: false },
          });
          toast.success("Screen sharing stopped");
        }
      }
    );

    // Handle media errors
    const handleMediaError = on(WS_EVENTS.MEDIA_ERROR, (data: any) => {
      toast.error(data.message || "Media error occurred");
    });

    return () => {
      handleMediaStateChange();
      handleScreenShareStart();
      handleScreenShareStop();
      handleMediaError();
      handlersSetupRef.current = false;
    };
  }, [socket, isConnected, on, updateParticipant]);

  /**
   * Reset media state when leaving meeting
   */
  useEffect(() => {
    if (!meeting) {
      setLocalMediaState({
        audioEnabled: false,
        videoEnabled: false,
        screenSharing: false,
        handRaised: false,
      });
    }
  }, [meeting]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      logMediaAction("COMPONENT_UNMOUNTED");
    };
  }, [logMediaAction]);

  return {
    // Media state
    localMediaState,

    // Basic media actions
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    raiseHand,
    lowerHand,
  };
};

export default useMeetingMedia;
