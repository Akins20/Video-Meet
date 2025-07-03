import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from './index'

// Participant contact interface
export interface ParticipantContact {
    id: string
    userId: string
    email: string
    username: string
    firstName: string
    lastName: string
    fullName: string
    displayName: string
    avatar?: string
    bio?: string

    // Contact relationship
    contactType: 'friend' | 'colleague' | 'recent' | 'suggested' | 'blocked'
    addedAt: string
    lastInteraction: string

    // Contact preferences
    isFavorite: boolean
    allowDirectCall: boolean
    notificationsEnabled: boolean

    // Status information
    isOnline: boolean
    lastSeen: string
    status: 'available' | 'busy' | 'away' | 'offline'
    statusMessage?: string

    // Meeting statistics
    totalMeetings: number
    totalDuration: number // in seconds
    averageRating?: number // 1-5 rating for meeting quality
}

// Participant meeting history
export interface ParticipantMeetingHistory {
    id: string
    meetingId: string
    participantId: string
    userId?: string
    displayName: string

    // Meeting details
    meetingTitle: string
    roomId: string
    hostId: string
    isHost: boolean

    // Participation details
    joinedAt: string
    leftAt?: string
    duration: number // in seconds
    role: 'host' | 'moderator' | 'participant' | 'guest'

    // Connection quality during meeting
    averageQuality: 'poor' | 'fair' | 'good' | 'excellent'
    connectionIssues: number

    // Meeting rating (optional)
    rating?: number // 1-5 stars
    feedback?: string

    // Technical metrics
    audioMinutes: number
    videoMinutes: number
    screenShareMinutes: number
    chatMessages: number
}

// Participant invitation
export interface ParticipantInvitation {
    id: string
    fromUserId: string
    fromUserName: string
    toEmail: string
    toUserId?: string // null if recipient not registered

    // Invitation details
    meetingId?: string
    meetingTitle?: string
    roomId?: string

    // Invitation type
    type: 'meeting' | 'contact_request' | 'platform_invite'

    // Status and timing
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
    sentAt: string
    respondedAt?: string
    expiresAt: string

    // Message
    message?: string

    // Meeting details (if type is meeting)
    scheduledAt?: string
    meetingPassword?: string
}

// Participant search result
export interface ParticipantSearchResult {
    id: string
    userId: string
    username: string
    displayName: string
    email: string
    avatar?: string
    bio?: string

    // Search relevance
    relevanceScore: number
    matchType: 'username' | 'email' | 'name' | 'bio'

    // Relationship status
    isContact: boolean
    contactType?: ParticipantContact['contactType']

    // Activity
    isOnline: boolean
    lastSeen: string
    totalMeetings: number
}

// Participant analytics
export interface ParticipantAnalytics {
    userId: string

    // Meeting statistics
    totalMeetings: number
    totalDuration: number
    averageMeetingDuration: number

    // Time-based stats
    thisWeek: {
        meetings: number
        duration: number
    }
    thisMonth: {
        meetings: number
        duration: number
    }

    // Quality metrics
    averageConnectionQuality: number // 1-4 scale
    connectionIssueRate: number // percentage
    averageMeetingRating: number // 1-5 scale

    // Participation patterns
    preferredMeetingTimes: string[] // hour ranges
    averageParticipants: number
    hostRatio: number // percentage of meetings where user was host

    // Device and network stats
    primaryDevice: 'web' | 'desktop' | 'mobile'
    averageBandwidth: number
    commonIssues: string[]
}

// Participant slice state
export interface ParticipantState {
    // Contacts management
    contacts: Record<string, ParticipantContact>
    contactsLoading: boolean
    contactsError: string | null

    // Meeting history
    meetingHistory: ParticipantMeetingHistory[]
    historyLoading: boolean
    historyError: string | null
    historyPage: number
    historyHasMore: boolean

    // Invitations
    sentInvitations: ParticipantInvitation[]
    receivedInvitations: ParticipantInvitation[]
    invitationsLoading: boolean
    invitationsError: string | null

    // Search functionality
    searchResults: ParticipantSearchResult[]
    searchQuery: string
    searchLoading: boolean
    searchError: string | null

    // Current selections
    selectedParticipants: string[] // for bulk operations
    activeParticipantId: string | null // for detailed view

    // Analytics
    analytics: ParticipantAnalytics | null
    analyticsLoading: boolean
    analyticsError: string | null

    // UI state
    contactsFilter: 'all' | 'friends' | 'colleagues' | 'recent' | 'favorites' | 'blocked'
    sortBy: 'name' | 'recent' | 'meetings' | 'status'
    showOfflineContacts: boolean

    // Bulk operations
    bulkOperationLoading: boolean
    bulkOperationError: string | null
}

// Initial state
const initialState: ParticipantState = {
    contacts: {},
    contactsLoading: false,
    contactsError: null,

    meetingHistory: [],
    historyLoading: false,
    historyError: null,
    historyPage: 1,
    historyHasMore: true,

    sentInvitations: [],
    receivedInvitations: [],
    invitationsLoading: false,
    invitationsError: null,

    searchResults: [],
    searchQuery: '',
    searchLoading: false,
    searchError: null,

    selectedParticipants: [],
    activeParticipantId: null,

    analytics: null,
    analyticsLoading: false,
    analyticsError: null,

    contactsFilter: 'all',
    sortBy: 'recent',
    showOfflineContacts: true,

    bulkOperationLoading: false,
    bulkOperationError: null,
}

const participantSlice = createSlice({
    name: 'participant',
    initialState,
    reducers: {
        // Contacts management
        loadContactsStart: (state) => {
            state.contactsLoading = true
            state.contactsError = null
        },

        loadContactsSuccess: (state, action: PayloadAction<ParticipantContact[]>) => {
            state.contactsLoading = false
            state.contacts = {}

            // Convert array to dictionary for efficient lookups
            action.payload.forEach(contact => {
                state.contacts[contact.id] = contact
            })
        },

        loadContactsFailure: (state, action: PayloadAction<string>) => {
            state.contactsLoading = false
            state.contactsError = action.payload
        },

        // Add/update single contact
        addContact: (state, action: PayloadAction<ParticipantContact>) => {
            const contact = action.payload
            state.contacts[contact.id] = contact
        },

        updateContact: (state, action: PayloadAction<{
            contactId: string
            updates: Partial<ParticipantContact>
        }>) => {
            const { contactId, updates } = action.payload
            const contact = state.contacts[contactId]

            if (contact) {
                state.contacts[contactId] = { ...contact, ...updates }
            }
        },

        removeContact: (state, action: PayloadAction<string>) => {
            delete state.contacts[action.payload]
        },

        // Contact status updates
        updateContactStatus: (state, action: PayloadAction<{
            contactId: string
            isOnline: boolean
            status: ParticipantContact['status']
            statusMessage?: string
            lastSeen: string
        }>) => {
            const { contactId, isOnline, status, statusMessage, lastSeen } = action.payload
            const contact = state.contacts[contactId]

            if (contact) {
                contact.isOnline = isOnline
                contact.status = status
                contact.statusMessage = statusMessage
                contact.lastSeen = lastSeen
            }
        },

        // Bulk contact operations
        toggleContactFavorite: (state, action: PayloadAction<string>) => {
            const contact = state.contacts[action.payload]
            if (contact) {
                contact.isFavorite = !contact.isFavorite
            }
        },

        blockContact: (state, action: PayloadAction<string>) => {
            const contact = state.contacts[action.payload]
            if (contact) {
                contact.contactType = 'blocked'
                contact.allowDirectCall = false
                contact.notificationsEnabled = false
            }
        },

        unblockContact: (state, action: PayloadAction<string>) => {
            const contact = state.contacts[action.payload]
            if (contact) {
                contact.contactType = 'colleague' // default unblock type
                contact.allowDirectCall = true
                contact.notificationsEnabled = true
            }
        },

        // Meeting history
        loadHistoryStart: (state) => {
            state.historyLoading = true
            state.historyError = null
        },

        loadHistorySuccess: (state, action: PayloadAction<{
            history: ParticipantMeetingHistory[]
            page: number
            hasMore: boolean
        }>) => {
            const { history, page, hasMore } = action.payload

            state.historyLoading = false
            state.historyPage = page
            state.historyHasMore = hasMore

            if (page === 1) {
                // Replace history for first page
                state.meetingHistory = history
            } else {
                // Append for pagination
                state.meetingHistory.push(...history)
            }
        },

        loadHistoryFailure: (state, action: PayloadAction<string>) => {
            state.historyLoading = false
            state.historyError = action.payload
        },

        addMeetingHistory: (state, action: PayloadAction<ParticipantMeetingHistory>) => {
            state.meetingHistory.unshift(action.payload) // Add to beginning
        },

        // Search functionality
        searchParticipantsStart: (state, action: PayloadAction<string>) => {
            state.searchLoading = true
            state.searchError = null
            state.searchQuery = action.payload
        },

        searchParticipantsSuccess: (state, action: PayloadAction<ParticipantSearchResult[]>) => {
            state.searchLoading = false
            state.searchResults = action.payload
        },

        searchParticipantsFailure: (state, action: PayloadAction<string>) => {
            state.searchLoading = false
            state.searchError = action.payload
        },

        clearSearch: (state) => {
            state.searchResults = []
            state.searchQuery = ''
            state.searchError = null
        },

        // Invitations
        loadInvitationsStart: (state) => {
            state.invitationsLoading = true
            state.invitationsError = null
        },

        loadInvitationsSuccess: (state, action: PayloadAction<{
            sent: ParticipantInvitation[]
            received: ParticipantInvitation[]
        }>) => {
            const { sent, received } = action.payload
            state.invitationsLoading = false
            state.sentInvitations = sent
            state.receivedInvitations = received
        },

        loadInvitationsFailure: (state, action: PayloadAction<string>) => {
            state.invitationsLoading = false
            state.invitationsError = action.payload
        },

        addInvitation: (state, action: PayloadAction<ParticipantInvitation>) => {
            const invitation = action.payload
            state.sentInvitations.unshift(invitation)
        },

        updateInvitationStatus: (state, action: PayloadAction<{
            invitationId: string
            status: ParticipantInvitation['status']
            respondedAt?: string
        }>) => {
            const { invitationId, status, respondedAt } = action.payload

            // Update in sent invitations
            const sentInvitation = state.sentInvitations.find(inv => inv.id === invitationId)
            if (sentInvitation) {
                sentInvitation.status = status
                if (respondedAt) sentInvitation.respondedAt = respondedAt
            }

            // Update in received invitations
            const receivedInvitation = state.receivedInvitations.find(inv => inv.id === invitationId)
            if (receivedInvitation) {
                receivedInvitation.status = status
                if (respondedAt) receivedInvitation.respondedAt = respondedAt
            }
        },

        // Analytics
        loadAnalyticsStart: (state) => {
            state.analyticsLoading = true
            state.analyticsError = null
        },

        loadAnalyticsSuccess: (state, action: PayloadAction<ParticipantAnalytics>) => {
            state.analyticsLoading = false
            state.analytics = action.payload
        },

        loadAnalyticsFailure: (state, action: PayloadAction<string>) => {
            state.analyticsLoading = false
            state.analyticsError = action.payload
        },

        // Selection management
        selectParticipant: (state, action: PayloadAction<string>) => {
            const participantId = action.payload
            if (!state.selectedParticipants.includes(participantId)) {
                state.selectedParticipants.push(participantId)
            }
        },

        deselectParticipant: (state, action: PayloadAction<string>) => {
            state.selectedParticipants = state.selectedParticipants.filter(
                id => id !== action.payload
            )
        },

        selectAllParticipants: (state) => {
            state.selectedParticipants = Object.keys(state.contacts)
        },

        clearSelection: (state) => {
            state.selectedParticipants = []
        },

        setActiveParticipant: (state, action: PayloadAction<string | null>) => {
            state.activeParticipantId = action.payload
        },

        // UI state management
        setContactsFilter: (state, action: PayloadAction<ParticipantState['contactsFilter']>) => {
            state.contactsFilter = action.payload
        },

        setSortBy: (state, action: PayloadAction<ParticipantState['sortBy']>) => {
            state.sortBy = action.payload
        },

        toggleShowOfflineContacts: (state) => {
            state.showOfflineContacts = !state.showOfflineContacts
        },

        // Bulk operations
        bulkOperationStart: (state) => {
            state.bulkOperationLoading = true
            state.bulkOperationError = null
        },

        bulkOperationSuccess: (state) => {
            state.bulkOperationLoading = false
            state.selectedParticipants = [] // Clear selection after bulk operation
        },

        bulkOperationFailure: (state, action: PayloadAction<string>) => {
            state.bulkOperationLoading = false
            state.bulkOperationError = action.payload
        },

        // Error clearing
        clearErrors: (state) => {
            state.contactsError = null
            state.historyError = null
            state.invitationsError = null
            state.searchError = null
            state.analyticsError = null
            state.bulkOperationError = null
        },
    },
})

// Export actions
export const {
    loadContactsStart,
    loadContactsSuccess,
    loadContactsFailure,
    addContact,
    updateContact,
    removeContact,
    updateContactStatus,
    toggleContactFavorite,
    blockContact,
    unblockContact,
    loadHistoryStart,
    loadHistorySuccess,
    loadHistoryFailure,
    addMeetingHistory,
    searchParticipantsStart,
    searchParticipantsSuccess,
    searchParticipantsFailure,
    clearSearch,
    loadInvitationsStart,
    loadInvitationsSuccess,
    loadInvitationsFailure,
    addInvitation,
    updateInvitationStatus,
    loadAnalyticsStart,
    loadAnalyticsSuccess,
    loadAnalyticsFailure,
    selectParticipant,
    deselectParticipant,
    selectAllParticipants,
    clearSelection,
    setActiveParticipant,
    setContactsFilter,
    setSortBy,
    toggleShowOfflineContacts,
    bulkOperationStart,
    bulkOperationSuccess,
    bulkOperationFailure,
    clearErrors,
} = participantSlice.actions

// Selectors
export const selectParticipantState = (state: RootState) => state.participant
export const selectContacts = (state: RootState) => state.participant.contacts
export const selectContactsArray = (state: RootState) => Object.values(state.participant.contacts)
export const selectMeetingHistory = (state: RootState) => state.participant.meetingHistory
export const selectSearchResults = (state: RootState) => state.participant.searchResults
export const selectSelectedParticipants = (state: RootState) => state.participant.selectedParticipants
export const selectActiveParticipant = (state: RootState) => state.participant.activeParticipantId
export const selectAnalytics = (state: RootState) => state.participant.analytics

// Complex selectors
export const selectFilteredContacts = (state: RootState) => {
    const { contacts, contactsFilter, showOfflineContacts, sortBy } = state.participant
    let filtered = Object.values(contacts)

    // Apply filter
    switch (contactsFilter) {
        case 'friends':
            filtered = filtered.filter(c => c.contactType === 'friend')
            break
        case 'colleagues':
            filtered = filtered.filter(c => c.contactType === 'colleague')
            break
        case 'recent':
            filtered = filtered.filter(c => c.contactType === 'recent')
            break
        case 'favorites':
            filtered = filtered.filter(c => c.isFavorite)
            break
        case 'blocked':
            filtered = filtered.filter(c => c.contactType === 'blocked')
            break
    }

    // Filter offline contacts if needed
    if (!showOfflineContacts) {
        filtered = filtered.filter(c => c.isOnline)
    }

    // Apply sorting
    switch (sortBy) {
        case 'name':
            filtered.sort((a, b) => a.displayName.localeCompare(b.displayName))
            break
        case 'recent':
            filtered.sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime())
            break
        case 'meetings':
            filtered.sort((a, b) => b.totalMeetings - a.totalMeetings)
            break
        case 'status':
            filtered.sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1
                if (!a.isOnline && b.isOnline) return 1
                return a.displayName.localeCompare(b.displayName)
            })
            break
    }

    return filtered
}

export const selectOnlineContacts = (state: RootState) => {
    return Object.values(state.participant.contacts).filter(contact => contact.isOnline)
}

export const selectFavoriteContacts = (state: RootState) => {
    return Object.values(state.participant.contacts).filter(contact => contact.isFavorite)
}

export const selectPendingInvitations = (state: RootState) => {
    return state.participant.receivedInvitations.filter(inv => inv.status === 'pending')
}

export const selectContactById = (contactId: string) => (state: RootState) => {
    return state.participant.contacts[contactId]
}

// Export reducer
export default participantSlice.reducer