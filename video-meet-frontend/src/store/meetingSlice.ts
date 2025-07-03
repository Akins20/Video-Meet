import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from './index'

// Meeting participant interface
export interface MeetingParticipant {
    id: string
    userId?: string // null for guests
    displayName: string
    avatar?: string
    role: 'host' | 'moderator' | 'participant' | 'guest'

    // Connection info
    socketId?: string
    peerId?: string
    isLocal: boolean // true for current user

    // Media state
    mediaState: {
        audioEnabled: boolean
        videoEnabled: boolean
        screenSharing: boolean
        handRaised: boolean
    }

    // Connection quality
    connectionQuality: {
        latency?: number
        bandwidth?: number
        packetLoss?: number
        quality: 'poor' | 'fair' | 'good' | 'excellent'
        lastUpdated: string
    }

    // Session info
    joinedAt: string
    lastSeen: string
}

// Meeting settings interface
export interface MeetingSettings {
    allowGuests: boolean
    muteOnJoin: boolean
    videoOnJoin: boolean
    waitingRoom: boolean
    chat: boolean
    screenShare: boolean
    fileSharing: boolean
    recording: boolean
    maxVideoQuality: 'low' | 'medium' | 'high'
    backgroundBlur: boolean
    noiseCancellation: boolean
}

// Chat message interface
export interface ChatMessage {
    id: string
    senderId: string
    senderName: string
    content: string
    type: 'text' | 'system' | 'file' | 'emoji'
    timestamp: string

    // File message specific
    fileInfo?: {
        filename: string
        fileSize: number
        mimeType: string
        downloadUrl?: string
    }
}

// Meeting interface
export interface Meeting {
    id: string
    roomId: string // ABC-123-XYZ format
    title: string
    description?: string

    // Host and status
    hostId: string
    status: 'waiting' | 'active' | 'ended' | 'cancelled'
    type: 'instant' | 'scheduled' | 'recurring'

    // Capacity
    maxParticipants: number
    currentParticipants: number

    // Timing
    scheduledAt?: string
    startedAt?: string
    endedAt?: string
    duration?: number // in seconds

    // Settings
    settings: MeetingSettings

    // Password protection
    hasPassword: boolean

    // Creation info
    createdAt: string
    updatedAt: string
}

// WebRTC connection state
export interface WebRTCState {
    localStream?: MediaStream
    connections: Record<string, RTCPeerConnection>
    connectionStates: Record<string, RTCPeerConnectionState>
    iceConnectionStates: Record<string, RTCIceConnectionState>
    dataChannels: Record<string, RTCDataChannel>
}

// Meeting slice state
export interface MeetingState {
    // Current active meeting
    currentMeeting: Meeting | null

    // Participants in current meeting
    participants: Record<string, MeetingParticipant>
    participantOrder: string[] // For consistent ordering

    // Chat messages
    messages: ChatMessage[]
    unreadCount: number

    // Local user state in meeting
    localParticipant: MeetingParticipant | null

    // Meeting controls
    isMuted: boolean
    isVideoOff: boolean
    isScreenSharing: boolean
    isHandRaised: boolean

    // UI state
    isJoining: boolean
    isLeaving: boolean
    isCreating: boolean
    isLoading: boolean

    // Meeting list (for dashboard)
    meetings: Meeting[]
    meetingsLoading: boolean

    // WebRTC state
    webrtc: WebRTCState

    // Errors
    error: string | null
    connectionError: string | null

    // Settings
    showChat: boolean
    showParticipants: boolean
    chatPanelOpen: boolean

    // Network and quality
    networkQuality: 'poor' | 'fair' | 'good' | 'excellent'
    bandwidthUsage: number

    // Recording state
    isRecording: boolean
    recordingStartedAt?: string
}

// Initial state
const initialState: MeetingState = {
    currentMeeting: null,
    participants: {},
    participantOrder: [],
    messages: [],
    unreadCount: 0,
    localParticipant: null,

    // Controls
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    isHandRaised: false,

    // Loading states
    isJoining: false,
    isLeaving: false,
    isCreating: false,
    isLoading: false,

    // Meeting list
    meetings: [],
    meetingsLoading: false,

    // WebRTC
    webrtc: {
        connections: {},
        connectionStates: {},
        iceConnectionStates: {},
        dataChannels: {},
    },

    // Errors
    error: null,
    connectionError: null,

    // UI state
    showChat: true,
    showParticipants: true,
    chatPanelOpen: false,

    // Network
    networkQuality: 'good',
    bandwidthUsage: 0,

    // Recording
    isRecording: false,
}

const meetingSlice = createSlice({
    name: 'meeting',
    initialState,
    reducers: {
        // Meeting CRUD operations
        createMeetingStart: (state) => {
            state.isCreating = true
            state.error = null
        },

        createMeetingSuccess: (state, action: PayloadAction<Meeting>) => {
            state.currentMeeting = action.payload
            state.isCreating = false
            state.error = null
        },

        createMeetingFailure: (state, action: PayloadAction<string>) => {
            state.isCreating = false
            state.error = action.payload
        },

        // Join meeting operations
        joinMeetingStart: (state) => {
            state.isJoining = true
            state.error = null
        },

        joinMeetingSuccess: (state, action: PayloadAction<{
            meeting: Meeting
            localParticipant: MeetingParticipant
        }>) => {
            const { meeting, localParticipant } = action.payload
            state.currentMeeting = meeting
            state.localParticipant = localParticipant
            state.participants[localParticipant.id] = localParticipant
            state.participantOrder = [localParticipant.id]
            state.isJoining = false
            state.error = null

            // Apply user preferences for media state
            state.isMuted = localParticipant.mediaState.audioEnabled === false
            state.isVideoOff = localParticipant.mediaState.videoEnabled === false
        },

        joinMeetingFailure: (state, action: PayloadAction<string>) => {
            state.isJoining = false
            state.error = action.payload
        },

        // Leave meeting
        leaveMeetingStart: (state) => {
            state.isLeaving = true
        },

        leaveMeetingSuccess: (state) => {
            // Reset meeting state
            state.currentMeeting = null
            state.participants = {}
            state.participantOrder = []
            state.messages = []
            state.unreadCount = 0
            state.localParticipant = null
            state.isLeaving = false
            state.error = null
            state.connectionError = null

            // Reset controls
            state.isMuted = false
            state.isVideoOff = false
            state.isScreenSharing = false
            state.isHandRaised = false

            // Reset WebRTC state
            state.webrtc = {
                connections: {},
                connectionStates: {},
                iceConnectionStates: {},
                dataChannels: {},
            }

            // Reset recording
            state.isRecording = false
            state.recordingStartedAt = undefined
        },

        // Participant management
        participantJoined: (state, action: PayloadAction<MeetingParticipant>) => {
            const participant = action.payload
            state.participants[participant.id] = participant

            // Add to ordered list if not already present
            if (!state.participantOrder.includes(participant.id)) {
                state.participantOrder.push(participant.id)
            }

            // Update meeting participant count
            if (state.currentMeeting) {
                state.currentMeeting.currentParticipants = state.participantOrder.length
            }
        },

        participantLeft: (state, action: PayloadAction<string>) => {
            const participantId = action.payload

            // Remove from participants
            delete state.participants[participantId]

            // Remove from ordered list
            state.participantOrder = state.participantOrder.filter(id => id !== participantId)

            // Update meeting participant count
            if (state.currentMeeting) {
                state.currentMeeting.currentParticipants = state.participantOrder.length
            }

            // Clean up WebRTC connections
            delete state.webrtc.connections[participantId]
            delete state.webrtc.connectionStates[participantId]
            delete state.webrtc.iceConnectionStates[participantId]
            delete state.webrtc.dataChannels[participantId]
        },

        // Media state updates
        updateParticipantMedia: (state, action: PayloadAction<{
            participantId: string
            mediaState: Partial<MeetingParticipant['mediaState']>
        }>) => {
            const { participantId, mediaState } = action.payload
            const participant = state.participants[participantId]

            if (participant) {
                participant.mediaState = { ...participant.mediaState, ...mediaState }

                // Update local state if it's the local participant
                if (participant.isLocal) {
                    state.isMuted = !participant.mediaState.audioEnabled
                    state.isVideoOff = !participant.mediaState.videoEnabled
                    state.isScreenSharing = participant.mediaState.screenSharing
                    state.isHandRaised = participant.mediaState.handRaised
                }
            }
        },

        // Local media controls
        toggleMute: (state) => {
            state.isMuted = !state.isMuted

            // Update local participant media state
            if (state.localParticipant) {
                state.localParticipant.mediaState.audioEnabled = !state.isMuted
                state.participants[state.localParticipant.id] = state.localParticipant
            }
        },

        toggleVideo: (state) => {
            state.isVideoOff = !state.isVideoOff

            // Update local participant media state
            if (state.localParticipant) {
                state.localParticipant.mediaState.videoEnabled = !state.isVideoOff
                state.participants[state.localParticipant.id] = state.localParticipant
            }
        },

        toggleScreenShare: (state) => {
            state.isScreenSharing = !state.isScreenSharing

            // Update local participant media state
            if (state.localParticipant) {
                state.localParticipant.mediaState.screenSharing = state.isScreenSharing
                state.participants[state.localParticipant.id] = state.localParticipant
            }
        },

        toggleHandRaise: (state) => {
            state.isHandRaised = !state.isHandRaised

            // Update local participant media state
            if (state.localParticipant) {
                state.localParticipant.mediaState.handRaised = state.isHandRaised
                state.participants[state.localParticipant.id] = state.localParticipant
            }
        },

        // Chat management
        addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.messages.push(action.payload)

            // Increment unread count if chat panel is closed
            if (!state.chatPanelOpen) {
                state.unreadCount++
            }
        },

        clearUnreadMessages: (state) => {
            state.unreadCount = 0
        },

        // UI state management
        toggleChatPanel: (state) => {
            state.chatPanelOpen = !state.chatPanelOpen

            // Clear unread count when opening chat
            if (state.chatPanelOpen) {
                state.unreadCount = 0
            }
        },

        toggleParticipantsPanel: (state) => {
            state.showParticipants = !state.showParticipants
        },

        // Meeting settings
        updateMeetingSettings: (state, action: PayloadAction<Partial<MeetingSettings>>) => {
            if (state.currentMeeting) {
                state.currentMeeting.settings = {
                    ...state.currentMeeting.settings,
                    ...action.payload
                }
            }
        },

        // Connection quality
        updateConnectionQuality: (state, action: PayloadAction<{
            participantId: string
            quality: MeetingParticipant['connectionQuality']
        }>) => {
            const { participantId, quality } = action.payload
            const participant = state.participants[participantId]

            if (participant) {
                participant.connectionQuality = quality
            }
        },

        updateNetworkQuality: (state, action: PayloadAction<MeetingState['networkQuality']>) => {
            state.networkQuality = action.payload
        },

        // WebRTC connection management
        updateWebRTCConnection: (state, action: PayloadAction<{
            participantId: string
            connection: RTCPeerConnection
            state: RTCPeerConnectionState
        }>) => {
            const { participantId, connection, state: connectionState } = action.payload
            state.webrtc.connections[participantId] = connection
            state.webrtc.connectionStates[participantId] = connectionState
        },

        updateICEConnectionState: (state, action: PayloadAction<{
            participantId: string
            state: RTCIceConnectionState
        }>) => {
            const { participantId, state: iceState } = action.payload
            state.webrtc.iceConnectionStates[participantId] = iceState
        },

        // Recording management
        startRecording: (state) => {
            state.isRecording = true
            state.recordingStartedAt = new Date().toISOString()
        },

        stopRecording: (state) => {
            state.isRecording = false
            state.recordingStartedAt = undefined
        },

        // Meeting list management
        loadMeetingsStart: (state) => {
            state.meetingsLoading = true
        },

        loadMeetingsSuccess: (state, action: PayloadAction<Meeting[]>) => {
            state.meetings = action.payload
            state.meetingsLoading = false
        },

        loadMeetingsFailure: (state, action: PayloadAction<string>) => {
            state.meetingsLoading = false
            state.error = action.payload
        },

        // Error management
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload
        },

        setConnectionError: (state, action: PayloadAction<string>) => {
            state.connectionError = action.payload
        },

        clearErrors: (state) => {
            state.error = null
            state.connectionError = null
        },

        // Bandwidth tracking
        updateBandwidthUsage: (state, action: PayloadAction<number>) => {
            state.bandwidthUsage = action.payload
        },
    },
})

// Export actions
export const {
    createMeetingStart,
    createMeetingSuccess,
    createMeetingFailure,
    joinMeetingStart,
    joinMeetingSuccess,
    joinMeetingFailure,
    leaveMeetingStart,
    leaveMeetingSuccess,
    participantJoined,
    participantLeft,
    updateParticipantMedia,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
    addChatMessage,
    clearUnreadMessages,
    toggleChatPanel,
    toggleParticipantsPanel,
    updateMeetingSettings,
    updateConnectionQuality,
    updateNetworkQuality,
    updateWebRTCConnection,
    updateICEConnectionState,
    startRecording,
    stopRecording,
    loadMeetingsStart,
    loadMeetingsSuccess,
    loadMeetingsFailure,
    setError,
    setConnectionError,
    clearErrors,
    updateBandwidthUsage,
} = meetingSlice.actions

// Selectors
export const selectMeeting = (state: RootState) => state.meeting
export const selectCurrentMeeting = (state: RootState) => state.meeting.currentMeeting
export const selectParticipants = (state: RootState) => state.meeting.participants
export const selectParticipantOrder = (state: RootState) => state.meeting.participantOrder
export const selectLocalParticipant = (state: RootState) => state.meeting.localParticipant
export const selectChatMessages = (state: RootState) => state.meeting.messages
export const selectUnreadCount = (state: RootState) => state.meeting.unreadCount
export const selectIsInMeeting = (state: RootState) => !!state.meeting.currentMeeting
export const selectMeetingError = (state: RootState) => state.meeting.error
export const selectConnectionError = (state: RootState) => state.meeting.connectionError

// Complex selectors
export const selectOrderedParticipants = (state: RootState) => {
    const { participants, participantOrder } = state.meeting
    return participantOrder.map(id => participants[id]).filter(Boolean)
}

export const selectParticipantCount = (state: RootState) => {
    return state.meeting.participantOrder.length
}

export const selectIsHost = (state: RootState) => {
    const { currentMeeting, localParticipant } = state.meeting
    return currentMeeting?.hostId === localParticipant?.userId
}

export const selectCanModerate = (state: RootState) => {
    const localParticipant = state.meeting.localParticipant
    return localParticipant?.role === 'host' || localParticipant?.role === 'moderator'
}

export const selectMeetingDuration = (state: RootState) => {
    const meeting = state.meeting.currentMeeting
    if (!meeting?.startedAt) return 0

    const startTime = new Date(meeting.startedAt).getTime()
    const now = Date.now()
    return Math.floor((now - startTime) / 1000)
}

export const selectRecordingDuration = (state: RootState) => {
    const { isRecording, recordingStartedAt } = state.meeting
    if (!isRecording || !recordingStartedAt) return 0

    const startTime = new Date(recordingStartedAt).getTime()
    const now = Date.now()
    return Math.floor((now - startTime) / 1000)
}

// Export reducer
export default meetingSlice.reducer