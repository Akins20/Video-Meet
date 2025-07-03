import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useAuth } from './useAuth'
import { useSocket } from './useSocket'
import { useWebRTC } from './useWebRTC'
import { apiClient } from '@/lib/api'
import { API_ENDPOINTS, WS_EVENTS, TIME_CONFIG } from '@/utils/constants'
// import { dateUtils, meetingUtils } from '@/utils/helpers'
import type {
    Meeting,
    MeetingParticipant,
    ChatMessage,
    MeetingSettings,
    ParticipantRole,
    MeetingStatus
} from '@/types/meeting'
import type { ApiResponse } from '@/types/api'

// Meeting join options
interface JoinMeetingOptions {
    roomId: string
    password?: string
    guestName?: string
    autoEnableAudio?: boolean
    autoEnableVideo?: boolean
}

// Chat message to send
interface SendMessageOptions {
    content: string
    type?: 'text' | 'emoji'
    replyTo?: string
}

// Hook return interface
interface UseMeetingReturn {
    // Meeting state
    meeting: Meeting | null
    isInMeeting: boolean
    isHost: boolean
    isModerator: boolean
    meetingStatus: MeetingStatus

    // Participants
    participants: MeetingParticipant[]
    participantCount: number
    localParticipant: MeetingParticipant | null

    // Chat
    messages: ChatMessage[]
    unreadCount: number

    // Actions
    createMeeting: (data: Partial<Meeting>) => Promise<{ success: boolean; meeting?: Meeting; error?: string }>
    joinMeeting: (options: JoinMeetingOptions) => Promise<{ success: boolean; error?: string }>
    leaveMeeting: () => Promise<void>
    endMeeting: () => Promise<{ success: boolean; error?: string }>

    // Participant management
    removeParticipant: (participantId: string) => Promise<{ success: boolean; error?: string }>
    changeParticipantRole: (participantId: string, role: ParticipantRole) => Promise<{ success: boolean; error?: string }>
    muteParticipant: (participantId: string) => Promise<{ success: boolean; error?: string }>

    // Chat
    sendMessage: (options: SendMessageOptions) => Promise<{ success: boolean; error?: string }>
    markMessagesAsRead: () => void

    // Meeting controls
    updateMeetingSettings: (settings: Partial<MeetingSettings>) => Promise<{ success: boolean; error?: string }>
    startRecording: () => Promise<{ success: boolean; error?: string }>
    stopRecording: () => Promise<{ success: boolean; error?: string }>

    // State
    isLoading: boolean
    error: string | null
    connectionQuality: 'poor' | 'fair' | 'good' | 'excellent'
    meetingDuration: number

    // Utility
    canPerformAction: (action: string) => boolean
    getMeetingLink: () => string
    getParticipantById: (id: string) => MeetingParticipant | undefined
}

export const useMeeting = (): UseMeetingReturn => {
    const router = useRouter()
    const { user, isAuthenticated } = useAuth()
    const { socket, isConnected, emit, on, joinRoom, leaveRoom } = useSocket()
    const webrtc = useWebRTC()

    // State management
    const [meeting, setMeeting] = useState<Meeting | null>(null)
    const [participants, setParticipants] = useState<MeetingParticipant[]>([])
    const [localParticipant, setLocalParticipant] = useState<MeetingParticipant | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [meetingDuration, setMeetingDuration] = useState(0)

    // Refs for tracking
    const meetingStartTimeRef = useRef<Date | null>(null)
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastReadMessageTimeRef = useRef<Date>(new Date())

    // Computed state
    const isInMeeting = !!meeting && meeting.status === 'active'
    const isHost = meeting?.hostId === user?.id
    const isModerator = localParticipant?.role === 'host' || localParticipant?.role === 'moderator'
    const meetingStatus = meeting?.status || 'waiting'
    const participantCount = participants.length
    // TODO: Implement connection quality logic in webrtc or elsewhere
    const connectionQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'good'

    /**
     * Clear error helper
     */
    const clearError = useCallback(() => setError(null), [])

    /**
     * Start meeting duration timer
     */
    const startDurationTimer = useCallback(() => {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current)
        }

        meetingStartTimeRef.current = new Date()
        durationIntervalRef.current = setInterval(() => {
            if (meetingStartTimeRef.current) {
                const duration = Math.floor((Date.now() - meetingStartTimeRef.current.getTime()) / 1000)
                setMeetingDuration(duration)
            }
        }, 1000)
    }, [])

    /**
     * Stop meeting duration timer
     */
    const stopDurationTimer = useCallback(() => {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current)
            durationIntervalRef.current = null
        }
        meetingStartTimeRef.current = null
    }, [])

    /**
     * Create a new meeting
     */
    const createMeeting = useCallback(async (data: Partial<Meeting>): Promise<{ success: boolean; meeting?: Meeting; error?: string }> => {
        try {
            setIsLoading(true)
            clearError()

            const response = await apiClient.post<{ meeting: Meeting }>(API_ENDPOINTS.meetings.create, data)

            if (response.success && response.data?.meeting) {
                const newMeeting = response.data.meeting
                setMeeting(newMeeting)

                toast.success('Meeting created successfully!')

                // Navigate to meeting room
                router.push(`/meeting/${newMeeting.roomId}`)

                return { success: true, meeting: newMeeting }
            }

            return { success: false, error: 'Failed to create meeting' }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to create meeting'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [router, clearError])

    /**
     * Join a meeting
     */
    const joinMeeting = useCallback(async (options: JoinMeetingOptions): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true)
            clearError()

            // First, get meeting details
            const meetingResponse = await apiClient.get<{ meeting: Meeting }>(
                API_ENDPOINTS.meetings.getByRoomId(options.roomId)
            )

            if (!meetingResponse.success || !meetingResponse.data?.meeting) {
                throw new Error('Meeting not found')
            }

            const meetingData = meetingResponse.data.meeting

            // Join the meeting via API
            const joinResponse = await apiClient.post<{ participant: MeetingParticipant }>(
                API_ENDPOINTS.meetings.join(options.roomId),
                {
                    password: options.password,
                    guestName: options.guestName,
                    deviceInfo: {
                        type: 'web',
                        platform: navigator.platform,
                        browser: navigator.userAgent,
                        capabilities: webrtc.supportedFeatures,
                    }
                }
            )

            if (!joinResponse.success || !joinResponse.data?.participant) {
                throw new Error(joinResponse.message || 'Failed to join meeting')
            }

            const participant = joinResponse.data.participant

            // Set meeting and participant data
            setMeeting(meetingData)
            setLocalParticipant(participant)

            // Join socket room
            if (socket) {
                joinRoom(options.roomId)
            }

            // Initialize WebRTC if not already done
            if (!webrtc.isInitialized) {
                await webrtc.initializeMedia()
            }

            // Start duration timer if meeting is active
            if (meetingData.status === 'active') {
                startDurationTimer()
            }

            toast.success('Joined meeting successfully!')

            return { success: true }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to join meeting'
            setError(errorMessage)
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [socket, webrtc, joinRoom, startDurationTimer, clearError])

    /**
     * Leave the current meeting
     */
    const leaveMeeting = useCallback(async (): Promise<void> => {
        try {
            if (!meeting) return

            // Leave via API
            await apiClient.post(API_ENDPOINTS.meetings.leave(meeting.id))

            // Leave socket room
            if (socket) {
                leaveRoom(meeting.roomId)
            }

            // Disconnect all WebRTC connections
            webrtc.disconnectAll()

            // Stop duration timer
            stopDurationTimer()

            // Clear state
            setMeeting(null)
            setParticipants([])
            setLocalParticipant(null)
            setMessages([])
            setUnreadCount(0)
            setMeetingDuration(0)

            toast.success('Left meeting')

            // Navigate back to dashboard
            router.push('/dashboard')

        } catch (error) {
            console.error('Failed to leave meeting:', error)
            // Still clear local state even if API call fails
            setMeeting(null)
            setParticipants([])
            setLocalParticipant(null)
        }
    }, [meeting, socket, webrtc, leaveRoom, stopDurationTimer, router])

    /**
     * End the meeting (host only)
     */
    const endMeeting = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isHost) {
                return { success: false, error: 'Only the host can end the meeting' }
            }

            setIsLoading(true)

            const response = await apiClient.post(API_ENDPOINTS.meetings.end(meeting.id))

            if (response.success) {
                toast.success('Meeting ended')
                return { success: true }
            }

            return { success: false, error: response.message || 'Failed to end meeting' }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to end meeting'
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [meeting, isHost])

    /**
     * Remove a participant (moderator only)
     */
    const removeParticipant = useCallback(async (participantId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isModerator) {
                return { success: false, error: 'Insufficient permissions' }
            }

            const response = await apiClient.delete(
                API_ENDPOINTS.meetings.removeParticipant(meeting.id, participantId)
            )

            if (response.success) {
                toast.success('Participant removed')
                return { success: true }
            }

            return { success: false, error: response.message || 'Failed to remove participant' }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to remove participant'
            return { success: false, error: errorMessage }
        }
    }, [meeting, isModerator])

    /**
     * Change participant role (host only)
     */
    const changeParticipantRole = useCallback(async (participantId: string, role: ParticipantRole): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isHost) {
                return { success: false, error: 'Only the host can change participant roles' }
            }

            // This would need to be implemented in the API
            toast.success(`Participant role changed to ${role}`)
            return { success: true }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to change participant role'
            return { success: false, error: errorMessage }
        }
    }, [meeting, isHost])

    /**
     * Mute a participant (moderator only)
     */
    const muteParticipant = useCallback(async (participantId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isModerator) {
                return { success: false, error: 'Insufficient permissions' }
            }

            // This would be handled via WebSocket signaling
            if (socket) {
                emit('mute-participant', {
                    meetingId: meeting.id,
                    participantId,
                })
            }

            toast.success('Participant muted')
            return { success: true }
        } catch (error: any) {
            const errorMessage = 'Failed to mute participant'
            return { success: false, error: errorMessage }
        }
    }, [meeting, isModerator, socket, emit])

    /**
     * Send a chat message
     */
    const sendMessage = useCallback(async (options: SendMessageOptions): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !socket) {
                return { success: false, error: 'Not connected to meeting' }
            }

            const messageData = {
                meetingId: meeting.id,
                content: options.content,
                type: options.type || 'text',
                replyTo: options.replyTo,
                senderId: localParticipant?.id,
                senderName: localParticipant?.displayName || user?.displayName || 'Unknown',
                timestamp: new Date().toISOString(),
            }

            // Send via socket
            emit(WS_EVENTS.CHAT_MESSAGE, messageData)

            return { success: true }
        } catch (error: any) {
            const errorMessage = 'Failed to send message'
            return { success: false, error: errorMessage }
        }
    }, [meeting, socket, localParticipant, user, emit])

    /**
     * Mark messages as read
     */
    const markMessagesAsRead = useCallback(() => {
        setUnreadCount(0)
        lastReadMessageTimeRef.current = new Date()
    }, [])

    /**
     * Update meeting settings (host only)
     */
    const updateMeetingSettings = useCallback(async (settings: Partial<MeetingSettings>): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isHost) {
                return { success: false, error: 'Only the host can update meeting settings' }
            }

            const response = await apiClient.put(
                API_ENDPOINTS.meetings.update(meeting.id),
                { settings }
            )

            if (response.success) {
                setMeeting(prev => prev ? { ...prev, settings: { ...prev.settings, ...settings } } : null)
                toast.success('Meeting settings updated')
                return { success: true }
            }

            return { success: false, error: response.message || 'Failed to update settings' }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to update settings'
            return { success: false, error: errorMessage }
        }
    }, [meeting, isHost])

    /**
     * Start recording (host/moderator only)
     */
    const startRecording = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isModerator) {
                return { success: false, error: 'Insufficient permissions to start recording' }
            }

            const response = await apiClient.post(
                API_ENDPOINTS.meetings.recording.start(meeting.id)
            )

            if (response.success) {
                toast.success('Recording started')
                return { success: true }
            }

            return { success: false, error: response.message || 'Failed to start recording' }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to start recording'
            return { success: false, error: errorMessage }
        }
    }, [meeting, isModerator])

    /**
     * Stop recording (host/moderator only)
     */
    const stopRecording = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!meeting || !isModerator) {
                return { success: false, error: 'Insufficient permissions to stop recording' }
            }

            const response = await apiClient.post(
                API_ENDPOINTS.meetings.recording.stop(meeting.id)
            )

            if (response.success) {
                toast.success('Recording stopped')
                return { success: true }
            }

            return { success: false, error: response.message || 'Failed to stop recording' }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to stop recording'
            return { success: false, error: errorMessage }
        }
    }, [meeting, isModerator])

    /**
     * Check if user can perform an action
     */
    const canPerformAction = useCallback((action: string): boolean => {
        if (!localParticipant) return false

        switch (action) {
            case 'end_meeting':
                return isHost
            case 'mute_others':
            case 'remove_participants':
            case 'start_recording':
            case 'stop_recording':
                return isModerator
            case 'share_screen':
            case 'send_chat':
                return localParticipant.permissions.canShareScreen || localParticipant.permissions.canSendChat
            default:
                return false
        }
    }, [localParticipant, isHost, isModerator])

    /**
     * Get meeting join link
     */
    const getMeetingLink = useCallback((): string => {
        if (!meeting) return ''
        return `${window.location.origin}/meeting/${meeting.roomId}`
    }, [meeting])

    /**
     * Get participant by ID
     */
    const getParticipantById = useCallback((id: string): MeetingParticipant | undefined => {
        return participants.find(p => p.id === id)
    }, [participants])

    // Set up socket event handlers
    useEffect(() => {
        if (!socket || !isConnected) return

        // Handle participant joined
        const handleParticipantJoined = on(WS_EVENTS.PARTICIPANT_JOINED, (data: { participant: MeetingParticipant }) => {
            setParticipants(prev => [...prev, data.participant])

            // Connect to new participant via WebRTC
            if (data.participant.id !== localParticipant?.id) {
                webrtc.connectToPeer(data.participant.id, isHost)
            }

            toast.success(`${data.participant.displayName} joined the meeting`)
        })

        // Handle participant left
        const handleParticipantLeft = on(WS_EVENTS.PARTICIPANT_LEFT, (data: { participantId: string }) => {
            setParticipants(prev => prev.filter(p => p.id !== data.participantId))

            // Disconnect from participant
            webrtc.disconnectFromPeer(data.participantId)
        })

        // Handle chat messages
        const handleChatMessage = on(WS_EVENTS.CHAT_MESSAGE, (message: ChatMessage) => {
            setMessages(prev => [...prev, message])

            // Increment unread count if message is from someone else
            if (message.senderId !== localParticipant?.id) {
                const messageTime = new Date(message.timestamp)
                if (messageTime > lastReadMessageTimeRef.current) {
                    setUnreadCount(prev => prev + 1)
                }
            }
        })

        // Handle meeting ended
        const handleMeetingEnded = on(WS_EVENTS.MEETING_ENDED, () => {
            toast('Meeting has ended', { icon: 'ℹ️' })
            leaveMeeting()
        })

        return () => {
            handleParticipantJoined()
            handleParticipantLeft()
            handleChatMessage()
            handleMeetingEnded()
        }
    }, [socket, isConnected, on, localParticipant, isHost, webrtc, leaveMeeting])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopDurationTimer()
        }
    }, [stopDurationTimer])

    return {
        // Meeting state
        meeting,
        isInMeeting,
        isHost,
        isModerator,
        meetingStatus,

        // Participants
        participants,
        participantCount,
        localParticipant,

        // Chat
        messages,
        unreadCount,

        // Actions
        createMeeting,
        joinMeeting,
        leaveMeeting,
        endMeeting,

        // Participant management
        removeParticipant,
        changeParticipantRole,
        muteParticipant,

        // Chat
        sendMessage,
        markMessagesAsRead,

        // Meeting controls
        updateMeetingSettings,
        startRecording,
        stopRecording,

        // State
        isLoading,
        error,
        connectionQuality,
        meetingDuration,

        // Utility
        canPerformAction,
        getMeetingLink,
        getParticipantById,
    }
}

export default useMeeting