/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { api, ApiResponse, commonQueryOptions } from './baseApi'
import {
    ParticipantContact,
    ParticipantMeetingHistory,
    ParticipantInvitation,
    ParticipantSearchResult,
    ParticipantAnalytics
} from '../participantSlice'

// Contact management types
export interface AddContactRequest {
    userId: string
    contactType: 'friend' | 'colleague'
    message?: string
}

export interface UpdateContactRequest {
    contactId: string
    updates: {
        contactType?: ParticipantContact['contactType']
        isFavorite?: boolean
        allowDirectCall?: boolean
        notificationsEnabled?: boolean
        notes?: string
    }
}

export interface ContactListQuery {
    filter?: 'all' | 'friends' | 'colleagues' | 'recent' | 'favorites' | 'blocked'
    sortBy?: 'name' | 'recent' | 'meetings' | 'status'
    sortOrder?: 'asc' | 'desc'
    showOffline?: boolean
    search?: string
    page?: number
    limit?: number
}

export interface ContactListResponse {
    contacts: ParticipantContact[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
    summary: {
        totalContacts: number
        onlineContacts: number
        favorites: number
        recentlyActive: number
    }
}

// Search types
export interface SearchParticipantsQuery {
    query: string
    filters?: {
        includeUsers?: boolean
        includeContacts?: boolean
        onlineOnly?: boolean
        hasAvatar?: boolean
    }
    limit?: number
}

export interface SearchParticipantsResponse {
    results: ParticipantSearchResult[]
    suggestions: string[]
    count: number
}

// Invitation types
export interface SendInvitationRequest {
    type: 'meeting' | 'contact_request' | 'platform_invite'
    recipients: Array<{
        email: string
        userId?: string
        name?: string
    }>
    meetingId?: string
    message?: string
    expiresIn?: number // hours
}

export interface InvitationListQuery {
    type?: 'sent' | 'received'
    status?: 'pending' | 'accepted' | 'declined' | 'expired'
    page?: number
    limit?: number
}

export interface InvitationListResponse {
    invitations: ParticipantInvitation[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
    summary: {
        pending: number
        accepted: number
        declined: number
        expired: number
    }
}

// History types
export interface MeetingHistoryQuery {
    userId?: string
    startDate?: string
    endDate?: string
    meetingType?: 'hosted' | 'participated'
    page?: number
    limit?: number
    sortBy?: 'date' | 'duration' | 'participants'
    sortOrder?: 'asc' | 'desc'
}

export interface MeetingHistoryResponse {
    history: ParticipantMeetingHistory[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
    statistics: {
        totalMeetings: number
        totalDuration: number
        averageDuration: number
        hostedMeetings: number
        participatedMeetings: number
    }
}

// Analytics types
export interface AnalyticsQuery {
    userId?: string
    period: 'week' | 'month' | 'quarter' | 'year'
    startDate?: string
    endDate?: string
}

export interface BulkContactOperationRequest {
    contactIds: string[]
    operation: 'delete' | 'block' | 'unblock' | 'favorite' | 'unfavorite' | 'export'
    reason?: string
}

// Status update types
export interface UpdateStatusRequest {
    status: 'available' | 'busy' | 'away' | 'offline'
    statusMessage?: string
    autoAwayEnabled?: boolean
}

// Inject participant endpoints into the main API
export const participantApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Contact Management
        getContacts: builder.query<ApiResponse<ContactListResponse>, ContactListQuery>({
            query: (params = {}) => ({
                url: '/participants/contacts',
                params,
            }),
            providesTags: ['Contact'],
            ...commonQueryOptions,
            keepUnusedDataFor: 300, // 5 minutes
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
                        contacts: [...currentCache.data.contacts, ...newItems.data.contacts],
                    },
                }
            },
        }),

        // Add contact
        addContact: builder.mutation<ApiResponse<{ contact: ParticipantContact }>, AddContactRequest>({
            query: (data) => ({
                url: '/participants/contacts',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled
                    // Invalidate to refresh the full list
                    dispatch(participantApi.util.invalidateTags(['Contact']))
                } catch {
                    // Error handled by base query
                }
            },
        }),

        // Update contact
        updateContact: builder.mutation<ApiResponse<{ contact: ParticipantContact }>, UpdateContactRequest>({
            query: ({ contactId, updates }) => ({
                url: `/participants/contacts/${contactId}`,
                method: 'PUT',
                body: updates,
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted({ contactId, updates }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    participantApi.util.updateQueryData('getContacts', {}, (draft) => {
                        const contact = draft.data?.contacts.find(c => c.id === contactId)
                        if (contact) {
                            Object.assign(contact, updates)
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

        // Remove contact
        removeContact: builder.mutation<ApiResponse<{ message: string }>, string>({
            query: (contactId) => ({
                url: `/participants/contacts/${contactId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
            // Optimistic removal
            async onQueryStarted(contactId, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    participantApi.util.updateQueryData('getContacts', {}, (draft) => {
                        if (draft.data?.contacts) {
                            draft.data.contacts = draft.data.contacts.filter(c => c.id !== contactId)
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

        // Block/unblock contact
        blockContact: builder.mutation<ApiResponse<{ contact: ParticipantContact }>, {
            contactId: string
            block: boolean
            reason?: string
        }>({
            query: ({ contactId, block, reason }) => ({
                url: `/participants/contacts/${contactId}/block`,
                method: 'POST',
                body: { block, reason },
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
        }),

        // Bulk contact operations
        bulkContactOperation: builder.mutation<ApiResponse<{
            processed: number
            errors: Array<{ contactId: string; error: string }>
        }>, BulkContactOperationRequest>({
            query: (data) => ({
                url: '/participants/contacts/bulk',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
        }),

        // Search participants
        searchParticipants: builder.query<ApiResponse<SearchParticipantsResponse>, SearchParticipantsQuery>({
            query: ({ query, filters, limit = 20 }) => ({
                url: '/participants/search',
                params: { q: query, ...filters, limit },
            }),
            ...commonQueryOptions,
            keepUnusedDataFor: 30, // Short cache for search results
            // Debounce search requests
            transformResponse: (response: ApiResponse<SearchParticipantsResponse>) => response,
        }),

        // Get contact suggestions
        getContactSuggestions: builder.query<ApiResponse<{
            suggestions: ParticipantSearchResult[]
            reasons: Record<string, string> // Why each person is suggested
        }>, { limit?: number }>({
            query: ({ limit = 10 }) => ({
                url: '/participants/suggestions',
                params: { limit },
            }),
            providesTags: ['Contact'],
            ...commonQueryOptions,
            keepUnusedDataFor: 600, // 10 minutes
        }),

        // Invitation Management
        getInvitations: builder.query<ApiResponse<InvitationListResponse>, InvitationListQuery>({
            query: (params = {}) => ({
                url: '/participants/invitations',
                params,
            }),
            providesTags: ['Invitation'],
            ...commonQueryOptions,
            keepUnusedDataFor: 180, // 3 minutes
        }),

        // Send invitation
        sendInvitation: builder.mutation<ApiResponse<{
            invitations: ParticipantInvitation[]
            sent: number
            failed: number
        }>, SendInvitationRequest>({
            query: (data) => ({
                url: '/participants/invitations/send',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Invitation'],
            ...commonQueryOptions,
        }),

        // Respond to invitation
        respondToInvitation: builder.mutation<ApiResponse<{ invitation: ParticipantInvitation }>, {
            invitationId: string
            response: 'accept' | 'decline'
            message?: string
        }>({
            query: ({ invitationId, ...data }) => ({
                url: `/participants/invitations/${invitationId}/respond`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Invitation', 'Contact'],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted({ invitationId, response }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    participantApi.util.updateQueryData('getInvitations', {}, (draft) => {
                        const invitation = draft.data?.invitations.find(inv => inv.id === invitationId)
                        if (invitation) {
                            invitation.status = response === 'accept' ? 'accepted' : 'declined'
                            invitation.respondedAt = new Date().toISOString()
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

        // Cancel invitation
        cancelInvitation: builder.mutation<ApiResponse<{ message: string }>, string>({
            query: (invitationId) => ({
                url: `/participants/invitations/${invitationId}/cancel`,
                method: 'POST',
            }),
            invalidatesTags: ['Invitation'],
            ...commonQueryOptions,
        }),

        // Meeting History
        getMeetingHistory: builder.query<ApiResponse<MeetingHistoryResponse>, MeetingHistoryQuery>({
            query: (params = {}) => ({
                url: '/participants/history',
                params,
            }),
            providesTags: ['History'],
            ...commonQueryOptions,
            keepUnusedDataFor: 600, // 10 minutes
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
                        history: [...currentCache.data.history, ...newItems.data.history],
                    },
                }
            },
        }),

        // Rate meeting experience
        rateMeeting: builder.mutation<ApiResponse<{ message: string }>, {
            meetingId: string
            rating: number
            feedback?: string
            categories?: {
                audioQuality: number
                videoQuality: number
                reliability: number
                easeOfUse: number
            }
        }>({
            query: ({ meetingId, ...data }) => ({
                url: `/participants/history/${meetingId}/rate`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['History', 'Analytics'],
            ...commonQueryOptions,
        }),

        // Analytics
        getParticipantAnalytics: builder.query<ApiResponse<ParticipantAnalytics>, AnalyticsQuery>({
            query: (params) => ({
                url: '/participants/analytics',
                params,
            }),
            providesTags: ['Analytics'],
            ...commonQueryOptions,
            keepUnusedDataFor: 900, // 15 minutes
        }),

        // Status Management
        updateStatus: builder.mutation<ApiResponse<{ status: string; statusMessage?: string }>, UpdateStatusRequest>({
            query: (data) => ({
                url: '/participants/status',
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                // Update all contacts to reflect new status
                const patchResult = dispatch(
                    participantApi.util.updateQueryData('getContacts', {}, (draft) => {
                        if (draft.data?.contacts) {
                            draft.data.contacts.forEach(contact => {
                                if (contact.userId === 'current-user') { // This would be the actual user ID
                                    contact.status = arg.status
                                    contact.statusMessage = arg.statusMessage
                                    contact.isOnline = arg.status !== 'offline'
                                }
                            })
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

        // Get online status of contacts
        getContactsStatus: builder.query<ApiResponse<{
            statuses: Record<string, {
                isOnline: boolean
                status: string
                statusMessage?: string
                lastSeen: string
            }>
        }>, string[]>({
            query: (contactIds) => ({
                url: '/participants/status/batch',
                method: 'POST',
                body: { contactIds },
            }),
            ...commonQueryOptions,
            keepUnusedDataFor: 60, // 1 minute
            // Poll for status updates
        }),

        // Import contacts from external sources
        importContacts: builder.mutation<ApiResponse<{
            imported: number
            skipped: number
            errors: Array<{ email: string; error: string }>
        }>, {
            source: 'google' | 'outlook' | 'csv'
            data: any
            autoAdd?: boolean
        }>({
            query: (data) => ({
                url: '/participants/import',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Contact'],
            ...commonQueryOptions,
        }),

        // Export contacts
        exportContacts: builder.mutation<ApiResponse<{
            downloadUrl: string
            filename: string
            count: number
        }>, {
            format: 'csv' | 'vcf' | 'json'
            filters?: ContactListQuery
        }>({
            query: (data) => ({
                url: '/participants/export',
                method: 'POST',
                body: data,
            }),
            ...commonQueryOptions,
        }),

        // Get participant profile
        getParticipantProfile: builder.query<ApiResponse<{
            profile: ParticipantContact
            mutualContacts: ParticipantContact[]
            recentMeetings: ParticipantMeetingHistory[]
            isContact: boolean
        }>, string>({
            query: (userId) => `/participants/${userId}/profile`,
            providesTags: (result, error, userId) => [
                { type: 'Participant', id: userId },
            ],
            ...commonQueryOptions,
            keepUnusedDataFor: 300, // 5 minutes
        }),
    }),

    overrideExisting: false,
})

// Export hooks for use in components
export const {
    useGetContactsQuery,
    useLazyGetContactsQuery,
    useAddContactMutation,
    useUpdateContactMutation,
    useRemoveContactMutation,
    useBlockContactMutation,
    useBulkContactOperationMutation,
    useSearchParticipantsQuery,
    useLazySearchParticipantsQuery,
    useGetContactSuggestionsQuery,
    useGetInvitationsQuery,
    useSendInvitationMutation,
    useRespondToInvitationMutation,
    useCancelInvitationMutation,
    useGetMeetingHistoryQuery,
    useLazyGetMeetingHistoryQuery,
    useRateMeetingMutation,
    useGetParticipantAnalyticsQuery,
    useUpdateStatusMutation,
    useGetContactsStatusQuery,
    useImportContactsMutation,
    useExportContactsMutation,
    useGetParticipantProfileQuery,
    useLazyGetParticipantProfileQuery,
} = participantApi

// Export utilities
export const participantApiUtils = {
    // Prefetch contacts
    prefetchContacts: (query: ContactListQuery = {}) =>
        participantApi.util.prefetch('getContacts', query, { force: false }),

    // Prefetch search results
    prefetchSearch: (query: string) =>
        participantApi.util.prefetch('searchParticipants', { query }, { force: false }),

    // Get cached contacts
    getCachedContacts: (query: ContactListQuery = {}) =>
        participantApi.endpoints.getContacts.select(query),

    // Invalidate contact cache
    invalidateContactCache: () => {
        participantApi.util.invalidateTags(['Contact'])
    },

    // Update contact cache
    updateContactInCache: (contactId: string, updates: Partial<ParticipantContact>) => {
        participantApi.util.updateQueryData('getContacts', {}, (draft) => {
            const contact = draft.data?.contacts.find(c => c.id === contactId)
            if (contact) {
                Object.assign(contact, updates)
            }
        })
    },

    // Debounced search function
    searchDebounced: (() => {
        let timeoutId: NodeJS.Timeout
        return (query: string, callback: (results: ParticipantSearchResult[]) => void, dispatch?: any) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                try {
                    if (!dispatch) throw new Error('Dispatch function is required')
                    const result = await dispatch(participantApi.endpoints.searchParticipants.initiate({ query })).unwrap()
                    callback(result.data?.results || [])
                } catch {
                    callback([])
                }
            }, 300)
        }
    })(),

    // Reset participant cache
    resetParticipantCache: () => {
        participantApi.util.invalidateTags(['Contact', 'Invitation', 'History', 'Analytics', 'Participant'])
    },
}

export default participantApi