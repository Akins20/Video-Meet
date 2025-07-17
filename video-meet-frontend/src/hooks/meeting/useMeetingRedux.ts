/* eslint-disable @typescript-eslint/no-explicit-any */

import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import { RootState } from "@/store";
import {
  // Meeting actions
  joinMeetingSuccess,
  joinMeetingFailure,
  leaveMeetingSuccess,
  participantJoined,
  participantLeft,
  updateParticipantMedia,
  
  // Media actions
  toggleMute,
  toggleVideo,
  toggleScreenShare,
  toggleHandRaise,
  
  // Chat actions
  addChatMessage,
  clearUnreadMessages,
  toggleChatPanel,
  
  // UI actions
  toggleParticipantsPanel,
  updateConnectionQuality,
  updateNetworkQuality,
  
  // Recording actions
  startRecording,
  stopRecording,
  
  // Error actions
  setError,
  clearErrors,
  
  // Timer actions
  updateTimerTimestamp,
  
  // Selectors
  selectCurrentMeeting,
  selectParticipants,
  selectLocalParticipant,
  selectChatMessages,
  selectUnreadCount,
  selectIsInMeeting,
  selectOrderedParticipants,
  selectParticipantCount,
  selectIsHost,
  selectCanModerate,
  selectMeetingDuration,
  selectRecordingDuration,
  
  // Types - use Redux slice types for internal Redux operations
  MeetingParticipant as ReduxMeetingParticipant,
  Meeting as ReduxMeeting,
  ChatMessage,
} from "@/store/meetingSlice";
import type { MeetingParticipant, Meeting } from "@/types/meeting";
import type { ConnectionQuality } from "@/types/meeting";

/**
 * Redux integration hook for meeting functionality
 * Provides a bridge between Redux store and meeting hooks
 */
export const useMeetingRedux = () => {
  const dispatch = useDispatch();

  // Selectors - get data from Redux store
  const meeting = useSelector(selectCurrentMeeting);
  const participants = useSelector(selectParticipants);
  const participantOrder = useSelector(selectOrderedParticipants);
  const participantCount = useSelector(selectParticipantCount);
  const localParticipant = useSelector(selectLocalParticipant);
  const messages = useSelector(selectChatMessages);
  const unreadCount = useSelector(selectUnreadCount);
  const isInMeeting = useSelector(selectIsInMeeting);
  const isHost = useSelector(selectIsHost);
  const canModerate = useSelector(selectCanModerate);
  const meetingDuration = useSelector(selectMeetingDuration);
  const recordingDuration = useSelector(selectRecordingDuration);
  
  // Meeting state selectors
  const meetingState = useSelector((state: RootState) => state.meeting);
  const {
    isJoining,
    isLeaving,
    isCreating,
    isLoading,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,
    isRecording,
    showChat,
    showParticipants,
    chatPanelOpen,
    networkQuality,
    error,
    connectionError,
  } = meetingState;

  // Action creators - dispatch Redux actions
  const actions = {
    // Meeting lifecycle
    joinMeeting: useCallback((meeting: Meeting, participant: MeetingParticipant) => {
      const reduxMeeting = convertToReduxMeeting(meeting);
      const reduxParticipant = convertToReduxParticipant(participant);
      dispatch(joinMeetingSuccess({ meeting: reduxMeeting, localParticipant: reduxParticipant }));
    }, [dispatch]),

    leaveMeeting: useCallback(() => {
      dispatch(leaveMeetingSuccess());
    }, [dispatch]),

    setJoinError: useCallback((error: string) => {
      dispatch(joinMeetingFailure(error));
    }, [dispatch]),

    // Participant management
    addParticipant: useCallback((participant: MeetingParticipant) => {
      const reduxParticipant = convertToReduxParticipant(participant);
      dispatch(participantJoined(reduxParticipant));
    }, [dispatch]),

    removeParticipant: useCallback((participantId: string) => {
      dispatch(participantLeft(participantId));
    }, [dispatch]),

    updateParticipantMediaState: useCallback((participantId: string, mediaState: Partial<MeetingParticipant['mediaState']>) => {
      dispatch(updateParticipantMedia({ participantId, mediaState }));
    }, [dispatch]),

    updateParticipantConnectionQuality: useCallback((participantId: string, quality: any) => {
      dispatch(updateConnectionQuality({ participantId, quality }));
    }, [dispatch]),

    // Media controls
    toggleMuteState: useCallback(() => {
      dispatch(toggleMute());
    }, [dispatch]),

    toggleVideoState: useCallback(() => {
      dispatch(toggleVideo());
    }, [dispatch]),

    toggleScreenShareState: useCallback(() => {
      dispatch(toggleScreenShare());
    }, [dispatch]),

    toggleHandRaiseState: useCallback(() => {
      dispatch(toggleHandRaise());
    }, [dispatch]),

    // Chat functionality
    addMessage: useCallback((message: ChatMessage) => {
      dispatch(addChatMessage(message));
    }, [dispatch]),

    clearUnread: useCallback(() => {
      dispatch(clearUnreadMessages());
    }, [dispatch]),

    toggleChat: useCallback(() => {
      dispatch(toggleChatPanel());
    }, [dispatch]),

    // UI state
    toggleParticipants: useCallback(() => {
      dispatch(toggleParticipantsPanel());
    }, [dispatch]),

    // Recording
    startRecordingState: useCallback(() => {
      dispatch(startRecording());
    }, [dispatch]),

    stopRecordingState: useCallback(() => {
      dispatch(stopRecording());
    }, [dispatch]),

    // Network and quality
    updateNetworkQualityState: useCallback((quality: ConnectionQuality) => {
      dispatch(updateNetworkQuality(quality));
    }, [dispatch]),

    // Error handling
    setErrorState: useCallback((error: string) => {
      dispatch(setError(error));
    }, [dispatch]),

    clearErrorState: useCallback(() => {
      dispatch(clearErrors());
    }, [dispatch]),

    // Timer actions
    updateTimerTimestamp: useCallback(() => {
      dispatch(updateTimerTimestamp());
    }, [dispatch]),
  };

  // Computed values
  const mediaState = {
    audioEnabled: !isMuted,
    videoEnabled: !isVideoOff,
    screenSharing: isScreenSharing,
    handRaised: isHandRaised,
  };

  const connectionState = {
    quality: networkQuality,
    isConnected: isInMeeting,
  };

  // Convert participants object to array format expected by components
  const participantsArray = Object.values(participants || {});

  return {
    // Data
    meeting,
    participants: participantsArray,
    participantOrder,
    participantCount,
    localParticipant,
    messages,
    unreadCount,
    
    // State flags
    isInMeeting,
    isHost,
    canModerate,
    isJoining,
    isLeaving,
    isCreating,
    isLoading,
    
    // Media state
    mediaState,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,
    
    // Recording
    isRecording,
    recordingDuration,
    
    // UI state
    showChat,
    showParticipants,
    chatPanelOpen,
    
    // Connection and quality
    connectionState,
    networkQuality,
    
    // Timing
    meetingDuration,
    
    // Errors
    error,
    connectionError,
    
    // Actions
    ...actions,
  };
};

/**
 * Convert main Meeting type to Redux Meeting type
 */
const convertToReduxMeeting = (meeting: Meeting): ReduxMeeting => {
  return {
    ...meeting,
    hasPassword: !!(meeting as any).password || !!((meeting.settings as any)?.requirePassword),
    // Map other required Redux Meeting fields with defaults if needed
  } as ReduxMeeting;
};

/**
 * Convert main MeetingParticipant type to Redux MeetingParticipant type
 */
const convertToReduxParticipant = (participant: MeetingParticipant): ReduxMeetingParticipant => {
  return {
    ...participant,
    lastSeen: participant.leftAt || new Date().toISOString(),
    // Map connectionQuality if it exists, otherwise provide defaults
    connectionQuality: participant.connectionQuality || {
      quality: 'good' as const,
      lastUpdated: new Date().toISOString(),
    },
    // Ensure mediaState includes handRaised property for Redux
    mediaState: {
      ...participant.mediaState,
      handRaised: participant.handRaised || false,
    },
    // Ensure all required Redux fields are present
    socketId: participant.socketId,
    peerId: participant.peerId,
    isLocal: participant.userId === participant.userId, // This will be updated by calling code
  } as unknown as ReduxMeetingParticipant;
};

/**
 * Hook to sync external meeting data with Redux store
 * Useful for keeping Redux in sync with API data or WebRTC events
 */
export const useMeetingReduxSync = () => {
  const dispatch = useDispatch();
  
  const syncMeeting = useCallback((meeting: Meeting, participant: MeetingParticipant) => {
    const reduxMeeting = convertToReduxMeeting(meeting);
    const reduxParticipant = convertToReduxParticipant(participant);
    dispatch(joinMeetingSuccess({ meeting: reduxMeeting, localParticipant: reduxParticipant }));
  }, [dispatch]);

  const syncParticipantJoined = useCallback((participant: MeetingParticipant) => {
    const reduxParticipant = convertToReduxParticipant(participant);
    dispatch(participantJoined(reduxParticipant));
  }, [dispatch]);

  const syncParticipantLeft = useCallback((participantId: string) => {
    dispatch(participantLeft(participantId));
  }, [dispatch]);

  const syncMediaState = useCallback((participantId: string, mediaState: Partial<MeetingParticipant['mediaState']>) => {
    dispatch(updateParticipantMedia({ participantId, mediaState }));
  }, [dispatch]);

  const syncChatMessage = useCallback((message: ChatMessage) => {
    dispatch(addChatMessage(message));
  }, [dispatch]);

  const syncConnectionQuality = useCallback((participantId: string, quality: any) => {
    dispatch(updateConnectionQuality({ participantId, quality }));
  }, [dispatch]);

  const syncError = useCallback((error: string) => {
    dispatch(setError(error));
  }, [dispatch]);

  const syncLeaveMeeting = useCallback(() => {
    dispatch(leaveMeetingSuccess());
  }, [dispatch]);

  return {
    syncMeeting,
    syncParticipantJoined,
    syncParticipantLeft,
    syncMediaState,
    syncChatMessage,
    syncConnectionQuality,
    syncError,
    syncLeaveMeeting,
  };
};

export default useMeetingRedux;