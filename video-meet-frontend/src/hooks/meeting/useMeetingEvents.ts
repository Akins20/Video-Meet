/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../useAuth";
import { useSocket } from "../useSocket";
import { useWebRTC } from "../useWebRTC";
import { WEBSOCKET_CONFIG } from "@/utils/constants";
import type {
  Meeting,
  MeetingParticipant,
  ConnectionQuality,
} from "@/types/meeting";

const WS_EVENTS = WEBSOCKET_CONFIG.events;

interface MeetingEventsProps {
  meeting: Meeting | null;
  localParticipant: MeetingParticipant | null;
  addParticipant: (participant: MeetingParticipant) => void;
  removeParticipantFromList: (participantId: string) => void;
  updateParticipant: (
    participantId: string,
    updates: Partial<MeetingParticipant>
  ) => void;
  getParticipantById: (id: string) => MeetingParticipant | undefined;
}

interface UseMeetingEventsReturn {
  connectionQuality: ConnectionQuality | null;
  networkStatus: "online" | "offline" | "poor" | "unstable";
}

/**
 * FIXED meeting events hook - Prevents infinite re-renders and debug spam
 */
export const useMeetingEvents = (
  props: MeetingEventsProps
): UseMeetingEventsReturn => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const webrtc = useWebRTC();

  const {
    meeting,
    localParticipant,
    addParticipant,
    removeParticipantFromList,
    updateParticipant,
    getParticipantById,
  } = props;

  // Simple connection state
  const [connectionQuality, setConnectionQuality] =
    useState<ConnectionQuality | null>(null);
  const [networkStatus, setNetworkStatus] = useState<
    "online" | "offline" | "poor" | "unstable"
  >("online");

  // CRITICAL FIX: Use refs to track setup state and prevent re-initialization
  const setupRef = useRef(false);
  const handlersRef = useRef<(() => void)[]>([]);
  const localParticipantIdRef = useRef<string | null>(null);
  const meetingIdRef = useRef<string | null>(null);

  // Update refs when values change (but don't trigger effects)
  useEffect(() => {
    localParticipantIdRef.current = localParticipant?.id || null;
    meetingIdRef.current = meeting?.id || null;
  }, [localParticipant?.id, meeting?.id]);

  /**
   * STABLE event handlers using useCallback with minimal dependencies
   */
  const stableHandlers = {
    handleParticipantJoined: useCallback(
      (data: any) => {
        if (
          data.participant &&
          data.participant.id !== localParticipantIdRef.current
        ) {
          console.log("👥 Participant joined:", data.participant.displayName);
          addParticipant(data.participant);

          // Connect via WebRTC if available
          if (webrtc) {
            webrtc.connectToPeer(data.participant.id, false);
          }

          toast.success(`${data.participant.displayName} joined`);
        }
      },
      [addParticipant, webrtc]
    ),

    handleParticipantLeft: useCallback(
      (data: any) => {
        const participantId = data.participantId || data.userId;
        if (participantId && participantId !== localParticipantIdRef.current) {
          console.log("👋 Participant left:", participantId);

          const participant = getParticipantById(participantId);
          removeParticipantFromList(participantId);

          if (webrtc) {
            webrtc.disconnectFromPeer(participantId);
          }

          if (participant) {
            toast(`${participant.displayName} left`);
          }
        }
      },
      [removeParticipantFromList, getParticipantById, webrtc]
    ),

    handleMediaStateChange: useCallback(
      (data: any) => {
        if (
          data.participantId &&
          data.participantId !== localParticipantIdRef.current
        ) {
          updateParticipant(data.participantId, {
            mediaState: data.mediaState,
          });
        }
      },
      [updateParticipant]
    ),

    handleWebRTCSignal: useCallback(
      (data: any) => {
        // WebRTC signals are handled by the useWebRTC hook directly
        // This handler is kept for consistency but doesn't duplicate the work
        console.log("WebRTC signal received in meeting events (handled by useWebRTC):", data.type);
      },
      []
    ),

    handleConnectionQuality: useCallback(
      (data: any) => {
        if (data.participantId === localParticipantIdRef.current) {
          setConnectionQuality(data.quality);
          setNetworkStatus(
            data.quality?.overall === "poor" ? "poor" : "online"
          );
        } else if (data.participantId) {
          updateParticipant(data.participantId, {
            connectionQuality: data.quality,
          });
        }
      },
      [updateParticipant]
    ),

    handleMeetingEnded: useCallback(
      (data: any) => {
        if (data.endedBy !== user?.id) {
          toast(`Meeting ended by ${data.endedByName}`, { icon: "ℹ️" });
        }
      },
      [user?.id]
    ),

    handleJoinError: useCallback((data: any) => {
      toast.error(data.message || "Failed to join meeting");
    }, []),

    handleWebRTCError: useCallback((data: any) => {
      toast.error(data.message || "Connection error");
    }, []),

    handleJoinMeetingSuccess: useCallback(
      (data: any) => {
        // Handle existing participants and establish WebRTC connections
        if (data.existingParticipants && webrtc) {
          data.existingParticipants.forEach((participant: any) => {
            console.log("🔗 Establishing WebRTC connection with existing participant:", participant.displayName);
            // Add participant to the list
            addParticipant(participant);
            // Connect to existing participant (as caller)
            webrtc.connectToPeer(participant.id, true);
          });
        }
      },
      [addParticipant, webrtc]
    ),
  };

  /**
   * CRITICAL FIX: Set up event handlers only once per socket connection
   */
  useEffect(() => {
    // Only set up if we have socket, connection, and haven't set up yet
    if (!socket || !isConnected || setupRef.current) {
      return;
    }

    console.log("🔌 Setting up meeting event handlers (ONE TIME)");
    setupRef.current = true;

    // Clear any existing handlers
    handlersRef.current.forEach((cleanup) => cleanup());
    handlersRef.current = [];

    // Set up event listeners with stable handlers
    const eventHandlers = [
      {
        event: WS_EVENTS.PARTICIPANT_JOINED,
        handler: stableHandlers.handleParticipantJoined,
      },
      {
        event: WS_EVENTS.PARTICIPANT_LEFT,
        handler: stableHandlers.handleParticipantLeft,
      },
      {
        event: WS_EVENTS.MEDIA_STATE_CHANGE,
        handler: stableHandlers.handleMediaStateChange,
      },
      {
        event: WS_EVENTS.WEBRTC_SIGNAL,
        handler: stableHandlers.handleWebRTCSignal,
      },
      {
        event: WS_EVENTS.CONNECTION_QUALITY,
        handler: stableHandlers.handleConnectionQuality,
      },
      {
        event: WS_EVENTS.MEETING_ENDED,
        handler: stableHandlers.handleMeetingEnded,
      },
      {
        event: WS_EVENTS.JOIN_MEETING_ERROR,
        handler: stableHandlers.handleJoinError,
      },
      {
        event: WS_EVENTS.WEBRTC_ERROR,
        handler: stableHandlers.handleWebRTCError,
      },
      {
        event: WS_EVENTS.JOIN_MEETING_SUCCESS,
        handler: stableHandlers.handleJoinMeetingSuccess,
      },
    ];

    // Add listeners and store cleanup functions
    eventHandlers.forEach(({ event, handler }) => {
      socket.on(event, handler);
      handlersRef.current.push(() => socket.off(event, handler));
    });

    console.log("✅ Meeting event handlers set up successfully");

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up meeting event handlers");
      handlersRef.current.forEach((cleanup) => cleanup());
      handlersRef.current = [];
      setupRef.current = false;
    };
  }, [socket, isConnected]); // MINIMAL dependencies - only socket and connection state

  /**
   * Reset setup when socket disconnects
   */
  useEffect(() => {
    if (!isConnected) {
      setupRef.current = false;
    }
  }, [isConnected]);

  /**
   * STABLE network status monitoring (separate from socket events)
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Network online");
      setNetworkStatus("online");
    };

    const handleOffline = () => {
      console.log("🌐 Network offline");
      setNetworkStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // No dependencies - set up once

  return {
    connectionQuality,
    networkStatus,
  };
};

export default useMeetingEvents;
