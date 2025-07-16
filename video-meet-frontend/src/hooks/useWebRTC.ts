/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useSocket } from "./useSocket";
import { webrtcManager } from "@/lib/webrtc";
import { WS_EVENTS } from "@/utils/constants";
import type { MediaState, ConnectionQualityInfo } from "@/types/meeting";

// Simplified participant connection info
interface ParticipantConnection {
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  quality: ConnectionQualityInfo | null;
}

// Simplified hook interface - only what we actually need
interface UseWebRTCReturn {
  // Local media state
  localStream: MediaStream | null;
  mediaState: MediaState;

  // Remote participants
  participants: Map<string, ParticipantConnection>;

  // Core media controls
  toggleAudio: () => Promise<boolean>;
  toggleVideo: () => Promise<boolean>;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => Promise<boolean>;

  // Connection management
  initializeMedia: () => Promise<boolean>;
  connectToPeer: (
    participantId: string,
    isInitiator: boolean
  ) => Promise<boolean>;
  disconnectFromPeer: (participantId: string) => void;
  handleSignalingData: (
    fromId: string,
    data: any,
    type: string
  ) => Promise<void>;

  // State
  isInitialized: boolean;
  error: string | null;
}

export const useWebRTC = (meetingId?: string): UseWebRTCReturn => {
  const { socket, emit, on } = useSocket();

  // Local state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<
    Map<string, ParticipantConnection>
  >(new Map());

  // Media state matching the exact MediaState interface
  const [mediaState, setMediaState] = useState<MediaState>({
    audioEnabled: true,
    videoEnabled: true,
    audioMuted: false,
    speaking: false,
    screenSharing: false,
    screenShareType: undefined,
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
  });

  /**
   * Initialize local media stream
   */
  const initializeMedia = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      setLocalStream(stream);
      setIsInitialized(true);

      // Update media state based on actual tracks
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      setMediaState((prev) => ({
        ...prev,
        audioEnabled: audioTrack?.enabled || false,
        videoEnabled: videoTrack?.enabled || false,
      }));

      return true;
    } catch (err: any) {
      setError(err.message || "Failed to access media devices");
      return false;
    }
  }, []);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(async (): Promise<boolean> => {
    if (!localStream) return false;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;

      setMediaState((prev) => ({
        ...prev,
        audioEnabled: audioTrack.enabled,
      }));

      // Emit state change
      if (meetingId && socket) {
        emit(WS_EVENTS.MEDIA_STATE_CHANGE, {
          meetingId,
          participantId: socket.id,
          mediaState: { ...mediaState, audioEnabled: audioTrack.enabled },
        });
      }

      return audioTrack.enabled;
    }

    return false;
  }, [localStream, meetingId, socket, emit, mediaState]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async (): Promise<boolean> => {
    if (!localStream) return false;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;

      setMediaState((prev) => ({
        ...prev,
        videoEnabled: videoTrack.enabled,
      }));

      // Emit state change
      if (meetingId && socket) {
        emit(WS_EVENTS.MEDIA_STATE_CHANGE, {
          meetingId,
          participantId: socket.id,
          mediaState: { ...mediaState, videoEnabled: videoTrack.enabled },
        });
      }

      return videoTrack.enabled;
    }

    return false;
  }, [localStream, meetingId, socket, emit, mediaState]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async (): Promise<boolean> => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setMediaState((prev) => ({
        ...prev,
        screenSharing: true,
        screenShareType: "screen",
      }));

      // Emit screen share start
      if (meetingId && socket) {
        emit(WS_EVENTS.SCREEN_SHARE_START, {
          meetingId,
          participantId: socket.id,
        });
      }

      toast.success("Screen sharing started");
      return true;
    } catch (err: any) {
      toast.error("Failed to start screen sharing");
      return false;
    }
  }, [meetingId, socket, emit]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async (): Promise<boolean> => {
    try {
      setMediaState((prev) => ({
        ...prev,
        screenSharing: false,
        screenShareType: undefined,
      }));

      // Emit screen share stop
      if (meetingId && socket) {
        emit(WS_EVENTS.SCREEN_SHARE_STOP, {
          meetingId,
          participantId: socket.id,
        });
      }

      toast.success("Screen sharing stopped");
      return true;
    } catch (err: any) {
      toast.error("Failed to stop screen sharing");
      return false;
    }
  }, [meetingId, socket, emit]);

  /**
   * Connect to a peer
   */
  const connectToPeer = useCallback(
    async (participantId: string, isInitiator: boolean): Promise<boolean> => {
      try {
        // Create peer connection using webrtcManager
        const success = isInitiator
          ? await webrtcManager.initiateConnection(participantId)
          : await webrtcManager.acceptConnection(participantId);

        if (success) {
          // Add to participants map
          setParticipants(
            (prev) =>
              new Map(
                prev.set(participantId, {
                  stream: null,
                  connectionState: "connecting",
                  quality: null,
                })
              )
          );

          return true;
        }

        return false;
      } catch (err: any) {
        console.error("Failed to connect to peer:", err);
        return false;
      }
    },
    []
  );

  /**
   * Disconnect from a peer
   */
  const disconnectFromPeer = useCallback((participantId: string) => {
    webrtcManager.removePeerConnection(participantId);
    setParticipants((prev) => {
      const updated = new Map(prev);
      updated.delete(participantId);
      return updated;
    });
  }, []);

  /**
   * Handle WebRTC signaling data
   */
  const handleSignalingData = useCallback(
    async (fromId: string, data: any, type: string) => {
      try {
        await webrtcManager.handleSignalingData(fromId, data, type);
      } catch (err: any) {
        console.error("Failed to handle signaling data:", err);
      }
    },
    []
  );

  /**
   * Set up WebRTC manager event handlers
   */
  useEffect(() => {
    // Set up signal emitter for WebRTC manager
    if (emit) {
      webrtcManager.setSignalEmitter((to: string, signal: any, type: string) => {
        emit(WS_EVENTS.WEBRTC_SIGNAL, {
          to,
          signal,
          type,
        });
      });
    }
    
    // Handle remote stream received
    webrtcManager.onRemoteStream = (
      participantId: string,
      stream: MediaStream
    ) => {
      setParticipants((prev) => {
        const updated = new Map(prev);
        const participant = updated.get(participantId);
        if (participant) {
          updated.set(participantId, { ...participant, stream });
        }
        return updated;
      });
    };

    // Handle connection state changes
    webrtcManager.onConnectionStateChange = (
      participantId: string,
      state: RTCPeerConnectionState
    ) => {
      setParticipants((prev) => {
        const updated = new Map(prev);
        const participant = updated.get(participantId);
        if (participant) {
          updated.set(participantId, {
            ...participant,
            connectionState: state,
          });
        }
        return updated;
      });
    };

    // Handle connection quality updates
    webrtcManager.onConnectionQuality = (
      participantId: string,
      quality: ConnectionQualityInfo
    ) => {
      setParticipants((prev) => {
        const updated = new Map(prev);
        const participant = updated.get(participantId);
        if (participant) {
          updated.set(participantId, { ...participant, quality });
        }
        return updated;
      });
    };

    // Handle errors
    webrtcManager.onError = (error: Error) => {
      setError(error.message);
      toast.error(error.message);
    };

    return () => {
      webrtcManager.onRemoteStream = undefined;
      webrtcManager.onConnectionStateChange = undefined;
      webrtcManager.onConnectionQuality = undefined;
      webrtcManager.onError = undefined;
    };
  }, [emit]);

  /**
   * Set up WebSocket event handlers for signaling
   */
  useEffect(() => {
    if (!socket) return;

    // Handle WebRTC signals
    const handleWebRTCSignal = on(
      WS_EVENTS.WEBRTC_SIGNAL,
      async (data: any) => {
        await handleSignalingData(data.from, data.signal, data.type);
      }
    );

    return () => {
      handleWebRTCSignal();
    };
  }, [socket, on, handleSignalingData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      webrtcManager.destroy();
    };
  }, [localStream]);

  return {
    localStream,
    mediaState,
    participants,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    initializeMedia,
    connectToPeer,
    disconnectFromPeer,
    handleSignalingData,
    isInitialized,
    error,
  };
};

export default useWebRTC;
