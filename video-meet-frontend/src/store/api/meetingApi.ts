/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { api, ApiResponse, commonQueryOptions } from './baseApi'
import { Meeting, MeetingSettings, MeetingParticipant, ChatMessage } from '../meetingSlice'

// Meeting request/response types
export interface CreateMeetingRequest {
    title: string
    description?: string
    type: 'instant' | 'scheduled' | 'recurring'
    maxParticipants?: number
    password?: string
    scheduledAt?: string
    settings?: Partial<MeetingSettings>
}

// Enhanced JoinMeetingRequest with session management
export interface JoinMeetingRequest {
    roomId: string
    password?: string
    guestName?: string
    deviceInfo: {
        deviceType: 'web' | 'desktop' | 'mobile'
        deviceId?: string // Unique device identifier (persistent per device)
        sessionId?: string // Unique session identifier (per join)
        userAgent: string
        ipAddress?: string // Will be set by backend if not provided
        capabilities: {
            supportsVideo: boolean
            supportsAudio: boolean
            supportsScreenShare: boolean
        }
        // Additional device capabilities
        browserInfo?: {
            name: string
            version: string
            platform: string
        }
        screenInfo?: {
            width: number
            height: number
            colorDepth: number
        }
    }
    // Session management options
    forceJoin?: boolean // Force join by ending existing sessions
    allowMultipleSessions?: boolean // Allow multiple sessions from same user/device
}

// Enhanced JoinMeetingResponse with session info
export interface JoinMeetingResponse {
    meeting: Meeting
    participant: MeetingParticipant
    existingParticipants: MeetingParticipant[]
    // Session management response data
    sessionInfo?: {
        sessionId: string
        deviceId: string
        replacedSessions?: number
        sessionToken?: string
    }
    warnings?: Array<{
        code: string
        message: string
        details?: any
    }>
}

export interface UpdateMeetingRequest {
    meetingId: string
    updates: {
        title?: string
        description?: string
        maxParticipants?: number
        settings?: Partial<MeetingSettings>
    }
}

export interface MeetingListQuery {
    page?: number
    limit?: number
    status?: 'waiting' | 'active' | 'ended' | 'cancelled'
    type?: 'instant' | 'scheduled' | 'recurring'
    search?: string
    sortBy?: 'createdAt' | 'startedAt' | 'title' | 'duration'
    sortOrder?: 'asc' | 'desc'
}

export interface MeetingListResponse {
    meetings: Meeting[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface SendChatMessageRequest {
    meetingId: string
    content: string
    type: 'text' | 'emoji'
}

export interface MeetingAnalyticsResponse {
    meetingId: string
    analytics: {
        totalDuration: number
        peakParticipants: number
        averageParticipants: number
        participantEngagement: {
            totalJoins: number
            averageStayDuration: number
            dropOffRate: number
        }
        qualityMetrics: {
            averageConnectionQuality: number
            connectionIssues: number
            audioQuality: number
            videoQuality: number
        }
        chatActivity: {
            totalMessages: number
            activeParticipants: number
            messagesPerMinute: number
        }
        networkStats: {
            averageBandwidth: number
            peakBandwidth: number
            dataTransferred: number
        }
        // Enhanced session analytics
        sessionBreakdown: {
            totalSessions: number
            replacedSessions: number
            staleCleanups: number
            deviceTypeDistribution: {
                web: number
                desktop: number
                mobile: number
            }
            averageSessionDuration: number
        }
    }
}

export interface UpdateParticipantMediaRequest {
    meetingId: string
    participantId: string
    mediaState: Partial<MeetingParticipant['mediaState']>
}

export interface RemoveParticipantRequest {
    meetingId: string
    participantId: string
    reason?: string
}

export interface StartRecordingRequest {
    meetingId: string
    settings: {
        includeAudio: boolean
        includeVideo: boolean
        includeScreenShare: boolean
        quality: 'low' | 'medium' | 'high'
    }
}

export interface StopRecordingRequest {
    meetingId: string
}

export interface RecordingResponse {
    recordingId: string
    status: 'starting' | 'recording' | 'processing' | 'completed' | 'failed'
    downloadUrl?: string
    duration?: number
    fileSize?: number
}

// Enhanced session management endpoints
export interface ForceEndSessionRequest {
    meetingId: string
    participantId: string
    reason?: string
}

export interface CleanupStaleSessionsRequest {
    maxInactiveMinutes?: number
}

export interface SessionCleanupResponse {
    staleSessions: number
    totalCleaned: number
    affectedMeetings: string[]
}

// Device utilities for generating required session data
export const generateDeviceInfo = async (): Promise<JoinMeetingRequest['deviceInfo']> => {
    // Generate persistent device ID
    const generateDeviceId = (): string => {
        const existing = localStorage.getItem('videomeet_device_id')
        if (existing) return existing
        
        const deviceId = crypto.randomUUID()
        localStorage.setItem('videomeet_device_id', deviceId)
        return deviceId
    }

    // Detect device type
    const detectDeviceType = (): 'web' | 'desktop' | 'mobile' => {
        const userAgent = navigator.userAgent.toLowerCase()
        if (/mobile|android|ios|iphone|ipad/.test(userAgent)) {
            return 'mobile'
        }
        // Detect if running in Electron or similar desktop app
        if (window.navigator.userAgent.includes('Electron')) {
            return 'desktop'
        }
        return 'web'
    }

    // Get device capabilities
    const getCapabilities = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const hasVideo = devices.some(device => device.kind === 'videoinput')
            const hasAudio = devices.some(device => device.kind === 'audioinput')
            
            return {
                supportsVideo: hasVideo,
                supportsAudio: hasAudio,
                supportsScreenShare: !!navigator.mediaDevices.getDisplayMedia,
            }
        } catch (error) {
            console.warn('Could not get device capabilities:', error)
            return {
                supportsVideo: true,
                supportsAudio: true,
                supportsScreenShare: true,
            }
        }
    }

    // Get browser info
    const getBrowserInfo = () => {
        const userAgent = navigator.userAgent
        let browserName = 'Unknown'
        let browserVersion = 'Unknown'

        if (userAgent.includes('Chrome')) {
            browserName = 'Chrome'
            const match = userAgent.match(/Chrome\/([0-9.]+)/)
            if (match) browserVersion = match[1]
        } else if (userAgent.includes('Firefox')) {
            browserName = 'Firefox'
            const match = userAgent.match(/Firefox\/([0-9.]+)/)
            if (match) browserVersion = match[1]
        } else if (userAgent.includes('Safari')) {
            browserName = 'Safari'
            const match = userAgent.match(/Safari\/([0-9.]+)/)
            if (match) browserVersion = match[1]
        } else if (userAgent.includes('Edge')) {
            browserName = 'Edge'
            const match = userAgent.match(/Edge\/([0-9.]+)/)
            if (match) browserVersion = match[1]
        }

        return {
            name: browserName,
            version: browserVersion,
            platform: navigator.platform,
        }
    }

    const capabilities = await getCapabilities()
    const browserInfo = getBrowserInfo()

    return {
        deviceType: detectDeviceType(),
        deviceId: generateDeviceId(),
        sessionId: crypto.randomUUID(),
        userAgent: navigator.userAgent,
        capabilities,
        browserInfo,
        screenInfo: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
        },
    }
}

// Inject meeting endpoints into the main API
export const meetingApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Create new meeting
        createMeeting: builder.mutation<ApiResponse<{ meeting: Meeting }>, CreateMeetingRequest>({
            query: (data) => ({
                url: '/meetings',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Meeting'],
            ...commonQueryOptions,
            // Optimistically add to meeting list
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled
                    // Invalidate meeting list to refresh
                    dispatch(meetingApi.util.invalidateTags(['Meeting']))
                } catch {
                    // Error handled by base query
                }
            },
        }),

        // Get meeting details by room ID
        getMeeting: builder.query<ApiResponse<{ meeting: Meeting }>, string>({
            query: (roomId) => `/meetings/${roomId}`,
            providesTags: (result, error, roomId) => [
                { type: 'Meeting', id: roomId },
                { type: 'Meeting', id: 'LIST' },
            ],
            ...commonQueryOptions,
            keepUnusedDataFor: 300, // 5 minutes
        }),

        // Enhanced join meeting with session management
        joinMeeting: builder.mutation<ApiResponse<JoinMeetingResponse>, JoinMeetingRequest>({
            query: (data) => ({
                url: `/meetings/${data.roomId}/join`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.roomId },
                'Participant',
            ],
            ...commonQueryOptions,
            // Handle session management errors
            transformErrorResponse: (response: any) => {
                if (response.data?.error?.code === 'ALREADY_IN_MEETING') {
                    return {
                        ...response,
                        data: {
                            ...response.data,
                            meta: {
                                suggestForceJoin: true,
                                existingSessions: response.data.error.details?.existingSessions || 0,
                            },
                        },
                    }
                }
                return response
            },
        }),

        // Join meeting with force (convenience method)
        forceJoinMeeting: builder.mutation<ApiResponse<JoinMeetingResponse>, Omit<JoinMeetingRequest, 'forceJoin'>>({
            query: (data) => ({
                url: `/meetings/${data.roomId}/join`,
                method: 'POST',
                body: { ...data, forceJoin: true },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.roomId },
                'Participant',
            ],
            ...commonQueryOptions,
        }),

        // Leave meeting
        leaveMeeting: builder.mutation<ApiResponse<{ message: string }>, { meetingId: string }>({
            query: (data) => ({
                url: `/meetings/${data.meetingId}/leave`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
                'Participant',
            ],
            ...commonQueryOptions,
        }),

        // End meeting (host only)
        endMeeting: builder.mutation<ApiResponse<{ message: string }>, { meetingId: string }>({
            query: (data) => ({
                url: `/meetings/${data.meetingId}/end`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
                'Meeting',
                'Participant',
            ],
            ...commonQueryOptions,
        }),

        // Force end participant session
        forceEndSession: builder.mutation<ApiResponse<{ message: string }>, ForceEndSessionRequest>({
            query: ({ meetingId, participantId, reason }) => ({
                url: `/meetings/${meetingId}/participants/${participantId}/end-session`,
                method: 'POST',
                body: { reason: reason || 'forced_by_moderator' },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
                'Participant',
            ],
            ...commonQueryOptions,
        }),

        // Cleanup stale sessions
        cleanupStaleSessions: builder.mutation<ApiResponse<SessionCleanupResponse>, CleanupStaleSessionsRequest>({
            query: (data) => ({
                url: '/meetings/cleanup-stale-sessions',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Meeting', 'Participant'],
            ...commonQueryOptions,
        }),

        // Update meeting settings
        updateMeeting: builder.mutation<ApiResponse<{ meeting: Meeting }>, UpdateMeetingRequest>({
            query: ({ meetingId, updates }) => ({
                url: `/meetings/${meetingId}`,
                method: 'PUT',
                body: updates,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
            ],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted({ meetingId, updates }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    meetingApi.util.updateQueryData('getMeeting', meetingId, (draft) => {
                        if (draft.data?.meeting) {
                            Object.assign(draft.data.meeting, updates)
                        }
                    })
                )

                try {
                    await queryFulfilled
                } catch {
                    patchResult.undo()
                }
            },
        }),

        // Get user's meetings
        getMeetings: builder.query<ApiResponse<MeetingListResponse>, MeetingListQuery>({
            query: (params = {}) => ({
                url: '/meetings',
                params,
            }),
            providesTags: ['Meeting'],
            ...commonQueryOptions,
            // Transform response to handle pagination
            transformResponse: (response: ApiResponse<MeetingListResponse>) => response,
            // Merge pages for infinite scroll
            serializeQueryArgs: ({ queryArgs }) => {
                const { page, ...otherArgs } = queryArgs
                return otherArgs
            },
            merge: (currentCache, newItems, { arg }) => {
                if (arg.page === 1) {
                    return newItems
                }
                return {
                    ...newItems,
                    data: {
                        ...newItems.data,
                        meetings: [...currentCache.data.meetings, ...newItems.data.meetings],
                    },
                }
            },
            forceRefetch: ({ currentArg, previousArg }) => {
                return currentArg?.page === 1
            },
        }),

        // Get meeting participants with session info
        getMeetingParticipants: builder.query<ApiResponse<{
            participants: MeetingParticipant[]
            count: number
            sessionStats: {
                totalSessions: number
                activeSessions: number
                deviceTypes: Record<string, number>
                averageSessionDuration: number
            }
        }>, string>({
            query: (meetingId) => `/meetings/${meetingId}/participants`,
            providesTags: (result, error, meetingId) => [
                { type: 'Participant', id: meetingId },
                'Participant',
            ],
            ...commonQueryOptions,
            // Polling for real-time updates (fallback if WebSocket fails)
            // pollingInterval: 5000,
        }),

        // Update participant media state
        updateParticipantMedia: builder.mutation<ApiResponse<{ participant: MeetingParticipant }>, UpdateParticipantMediaRequest>({
            query: ({ meetingId, participantId, mediaState }) => ({
                url: `/meetings/${meetingId}/participants/${participantId}/media`,
                method: 'PUT',
                body: mediaState,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Participant', id: arg.meetingId },
            ],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted({ meetingId, participantId, mediaState }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    meetingApi.util.updateQueryData('getMeetingParticipants', meetingId, (draft) => {
                        const participant = draft.data?.participants.find(p => p.id === participantId)
                        if (participant) {
                            Object.assign(participant.mediaState, mediaState)
                        }
                    })
                )

                try {
                    await queryFulfilled
                } catch {
                    patchResult.undo()
                }
            },
        }),

        // Remove participant from meeting
        removeParticipant: builder.mutation<ApiResponse<{ message: string }>, RemoveParticipantRequest>({
            query: ({ meetingId, participantId, reason }) => ({
                url: `/meetings/${meetingId}/participants/${participantId}`,
                method: 'DELETE',
                body: { reason },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Participant', id: arg.meetingId },
                { type: 'Meeting', id: arg.meetingId },
            ],
            ...commonQueryOptions,
        }),

        // Send chat message
        sendChatMessage: builder.mutation<ApiResponse<{ message: ChatMessage }>, SendChatMessageRequest>({
            query: ({ meetingId, ...data }) => ({
                url: `/meetings/${meetingId}/chat`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Message', id: arg.meetingId },
            ],
            ...commonQueryOptions,
            // Optimistic update for chat
            async onQueryStarted({ meetingId, content, type }, { dispatch, queryFulfilled, getState }) {
                // Create optimistic message
                const optimisticMessage: ChatMessage = {
                    id: `temp-${Date.now()}`,
                    senderId: 'current-user', // This would come from auth state
                    senderName: 'You',
                    content,
                    type,
                    timestamp: new Date().toISOString(),
                }

                // Add optimistic message to cache
                const patchResult = dispatch(
                    meetingApi.util.updateQueryData('getChatMessages', { meetingId }, (draft) => {
                        draft.data?.messages.push(optimisticMessage)
                    })
                )

                try {
                    await queryFulfilled
                } catch {
                    patchResult.undo()
                }
            },
        }),

        // Get chat messages
        getChatMessages: builder.query<ApiResponse<{
            messages: ChatMessage[]
            count: number
        }>, { meetingId: string; page?: number; limit?: number }>({
            query: ({ meetingId, page = 1, limit = 50 }) => ({
                url: `/meetings/${meetingId}/chat`,
                params: { page, limit },
            }),
            providesTags: (result, error, arg) => [
                { type: 'Message', id: arg.meetingId },
            ],
            ...commonQueryOptions,
            // Merge pages for chat history
            serializeQueryArgs: ({ queryArgs }) => {
                const { page, ...otherArgs } = queryArgs
                return otherArgs
            },
            merge: (currentCache, newItems, { arg }) => {
                if (arg.page === 1) {
                    return newItems
                }
                return {
                    ...newItems,
                    data: {
                        ...newItems.data,
                        messages: [...currentCache.data.messages, ...newItems.data.messages],
                    },
                }
            },
        }),

        // Start recording
        startRecording: builder.mutation<ApiResponse<RecordingResponse>, StartRecordingRequest>({
            query: ({ meetingId, settings }) => ({
                url: `/meetings/${meetingId}/recording/start`,
                method: 'POST',
                body: settings,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
            ],
            ...commonQueryOptions,
        }),

        // Stop recording
        stopRecording: builder.mutation<ApiResponse<RecordingResponse>, StopRecordingRequest>({
            query: ({ meetingId }) => ({
                url: `/meetings/${meetingId}/recording/stop`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
            ],
            ...commonQueryOptions,
        }),

        // Get recording status
        getRecordingStatus: builder.query<ApiResponse<RecordingResponse>, string>({
            query: (meetingId) => `/meetings/${meetingId}/recording/status`,
            ...commonQueryOptions,
            // Poll recording status
            // pollingInterval: 2000,
        }),

        // Get meeting analytics with session data
        getMeetingAnalytics: builder.query<ApiResponse<MeetingAnalyticsResponse>, string>({
            query: (meetingId) => `/meetings/${meetingId}/analytics`,
            providesTags: (result, error, meetingId) => [
                { type: 'Analytics', id: meetingId },
            ],
            ...commonQueryOptions,
        }),

        // Get meeting network status
        getMeetingNetworkStatus: builder.query<ApiResponse<{
            topology: {
                totalParticipants: number
                localParticipants: number
                cloudParticipants: number
                connectionMatrix: Array<{
                    participantId: string
                    connectionType: 'direct' | 'relayed'
                    latency: number
                    bandwidth: number
                }>
            }
            networkHealth: {
                overallQuality: number
                avgLatency: number
                totalBandwidth: number
                connectionStability: number
            }
        }>, string>({
            query: (meetingId) => `/meetings/${meetingId}/network-status`,
            ...commonQueryOptions,
            // pollingInterval: 5000, // Poll network status every 5 seconds
        }),

        // Share file in meeting
        shareFile: builder.mutation<ApiResponse<{
            fileId: string
            filename: string
            fileSize: number
            downloadUrl: string
        }>, {
            meetingId: string
            file: File
            allowedParticipants?: string[]
        }>({
            query: ({ meetingId, file, allowedParticipants }) => {
                const formData = new FormData()
                formData.append('file', file)
                if (allowedParticipants) {
                    formData.append('allowedParticipants', JSON.stringify(allowedParticipants))
                }

                return {
                    url: `/meetings/${meetingId}/files/upload`,
                    method: 'POST',
                    body: formData,
                    formData: true,
                }
            },
            invalidatesTags: (result, error, arg) => [
                { type: 'Meeting', id: arg.meetingId },
            ],
            ...commonQueryOptions,
        }),

        // Get shared files
        getSharedFiles: builder.query<ApiResponse<{
            files: Array<{
                id: string
                filename: string
                fileSize: number
                mimeType: string
                uploadedBy: string
                uploadedAt: string
                downloadUrl: string
            }>
        }>, string>({
            query: (meetingId) => `/meetings/${meetingId}/files`,
            providesTags: (result, error, meetingId) => [
                { type: 'Meeting', id: meetingId },
            ],
            ...commonQueryOptions,
        }),
    }),

    overrideExisting: false,
})

// Export hooks for use in components
export const {
    useCreateMeetingMutation,
    useGetMeetingQuery,
    useLazyGetMeetingQuery,
    useJoinMeetingMutation,
    useForceJoinMeetingMutation,
    useLeaveMeetingMutation,
    useEndMeetingMutation,
    useForceEndSessionMutation,
    useCleanupStaleSessionsMutation,
    useUpdateMeetingMutation,
    useGetMeetingsQuery,
    useLazyGetMeetingsQuery,
    useGetMeetingParticipantsQuery,
    useUpdateParticipantMediaMutation,
    useRemoveParticipantMutation,
    useSendChatMessageMutation,
    useGetChatMessagesQuery,
    useLazyGetChatMessagesQuery,
    useStartRecordingMutation,
    useStopRecordingMutation,
    useGetRecordingStatusQuery,
    useGetMeetingAnalyticsQuery,
    useGetMeetingNetworkStatusQuery,
    useShareFileMutation,
    useGetSharedFilesQuery,
} = meetingApi

// Export utilities
export const meetingApiUtils = {
    // Generate device info for joining
    generateDeviceInfo,

    // Prefetch meeting data
    prefetchMeeting: (roomId: string) =>
        meetingApi.util.prefetch('getMeeting', roomId, { force: false }),

    // Prefetch user meetings
    prefetchMeetings: () =>
        meetingApi.util.prefetch('getMeetings', {}, { force: false }),

    // Get cached meeting
    getCachedMeeting: (roomId: string) =>
        meetingApi.endpoints.getMeeting.select(roomId),

    // Invalidate meeting cache
    invalidateMeetingCache: (meetingId: string) => {
        meetingApi.util.invalidateTags([{ type: 'Meeting', id: meetingId }])
    },

    // Reset meeting API state
    resetMeetingCache: () => {
        meetingApi.util.invalidateTags(['Meeting', 'Participant', 'Message'])
    },

    // Update meeting cache optimistically
    updateMeetingCache: (roomId: string, updates: Partial<Meeting>) => {
        meetingApi.util.updateQueryData('getMeeting', roomId, (draft) => {
            if (draft.data?.meeting) {
                Object.assign(draft.data.meeting, updates)
            }
        })
    },

    // Helper to handle join meeting with automatic device info
    joinMeetingWithDeviceInfo: async (params: Omit<JoinMeetingRequest, 'deviceInfo'>) => {
        const deviceInfo = await generateDeviceInfo()
        return {
            ...params,
            deviceInfo,
        }
    },

    // Helper to handle force join scenario
    handleForceJoin: async (params: Omit<JoinMeetingRequest, 'deviceInfo' | 'forceJoin'>) => {
        const deviceInfo = await generateDeviceInfo()
        return {
            ...params,
            deviceInfo,
            forceJoin: true,
        }
    },
}

export default meetingApi