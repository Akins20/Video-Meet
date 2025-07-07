/* eslint-disable @typescript-eslint/no-explicit-any */

import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // localStorage
import { encryptTransform as createEncryptTransform } from 'redux-persist-transform-encrypt'

// Import reducers
import authReducer from './authSlice'
import meetingReducer from './meetingSlice'
import participantReducer from './participantSlice'

// 🔥 Import your existing meetingApi
import { meetingApi } from './api/meetingApi'

// Future reducers will be imported here:
// import uiReducer from './uiSlice'

// Encryption transform for sensitive data
const encryptTransform = createEncryptTransform({
    secretKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'video-meet-default-key-change-in-production',
    onError: (error) => {
        console.error('Redux persist encryption error:', error)
    },
})

// Auth persist configuration
const authPersistConfig = {
    key: 'auth',
    storage,
    // Only persist essential auth data
    whitelist: [
        'user',
        'accessToken',
        'refreshToken',
        'tokenExpiresAt',
        'isAuthenticated',
        'rememberMe'
    ],
    // Don't persist loading/error states
    blacklist: [
        'isLoading',
        'isInitializing',
        'isRefreshing',
        'error'
    ],
    transforms: [encryptTransform], // Encrypt sensitive data
}

// Participant persist configuration
const participantPersistConfig = {
    key: 'participant',
    storage,
    // Only persist essential participant data
    whitelist: [
        'contacts',
        'meetingHistory',
        'sentInvitations',
        'receivedInvitations'
    ],
    // Don't persist loading/search states
    blacklist: [
        'contactsLoading',
        'historyLoading',
        'invitationsLoading',
        'searchResults',
        'searchLoading',
        'searchQuery',
        'selectedParticipants',
        'activeParticipantId',
        'analyticsLoading',
        'bulkOperationLoading'
    ],
    transforms: [encryptTransform], // Encrypt contact data
}

// Root persist configuration
const rootPersistConfig = {
    key: 'root',
    storage,
    // Only persist specific slices
    whitelist: ['auth', 'participant'], // Add other slices as needed: 'ui', 'settings'
    // 🔥 Don't persist RTK Query API cache
    blacklist: ['meeting', 'api'], // Don't persist real-time meeting data
}

// Combine reducers
const rootReducer = combineReducers({
    auth: persistReducer(authPersistConfig, authReducer),
    meeting: meetingReducer, // No persistence for real-time meeting data
    participant: persistReducer(participantPersistConfig, participantReducer),
    // 🔥 Add RTK Query API reducer (this line is the key addition)
    [meetingApi.reducerPath]: meetingApi.reducer,
    // Add future reducers here:
    // ui: uiReducer,
})

// Create persisted reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer)

// Custom middleware for auth state management
const authMiddleware = (store: any) => (next: any) => (action: any) => {
    const result = next(action)

    // Auto-update activity on specific actions
    if (action.type.startsWith('auth/') &&
        !action.type.includes('updateActivity') &&
        !action.type.includes('logout')) {
        store.dispatch({ type: 'auth/updateActivity' })
    }

    return result
}

// Meeting cleanup middleware
const meetingMiddleware = (store: any) => (next: any) => (action: any) => {
    const result = next(action)

    // Clean up meeting state on auth logout
    if (action.type === 'auth/logout') {
        store.dispatch({ type: 'meeting/leaveMeetingSuccess' })
    }

    // Auto-update participant last interaction
    if (action.type.startsWith('meeting/') && action.type.includes('participantJoined')) {
        const { payload } = action
        if (payload?.userId) {
            store.dispatch({
                type: 'participant/updateContact',
                payload: {
                    contactId: payload.userId,
                    updates: {
                        lastInteraction: new Date().toISOString()
                    }
                }
            })
        }
    }

    return result
}

// Token expiration middleware
const tokenExpirationMiddleware = (store: any) => (next: any) => (action: any) => {
    const result = next(action)

    // Check token expiration after each action
    const state = store.getState()
    if (state.auth.isAuthenticated && state.auth.tokenExpiresAt) {
        if (Date.now() > state.auth.tokenExpiresAt - 60000) { // 1 minute before expiry
            // Dispatch token refresh action if needed
            if (!state.auth.isRefreshing) {
                // This will be handled by useAuth hook
                console.log('Token expiring soon, refresh needed')
            }
        }
    }

    return result
}

// Configure store
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    FLUSH, 
                    REHYDRATE, 
                    PAUSE, 
                    PERSIST, 
                    PURGE, 
                    REGISTER,
                    // 🔥 Add RTK Query ignored actions
                    'api/executeMutation/pending',
                    'api/executeMutation/fulfilled',
                    'api/executeMutation/rejected',
                    'api/executeQuery/pending',
                    'api/executeQuery/fulfilled',
                    'api/executeQuery/rejected',
                ],
                // Ignore these field paths in all actions
                ignoredActionsPaths: [
                    'meta.arg', 
                    'payload.timestamp',
                    'meta.baseQueryMeta'
                ],
                // Ignore these paths in the state
                ignoredPaths: [
                    'items.dates',
                    'api.queries',
                    'api.mutations',
                    'api.provided',
                    'api.subscriptions',
                    'api.config'
                ],
            },
            // Disable immutability check in production for performance
            immutableCheck: process.env.NODE_ENV !== 'production',
        })
            // 🔥 THIS IS THE CRUCIAL LINE - Add RTK Query middleware
            .concat(meetingApi.middleware)
            .concat(authMiddleware)
            .concat(meetingMiddleware)
            .concat(tokenExpirationMiddleware),

    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== 'production' && {
        name: 'Video Meet App',
        trace: true,
        traceLimit: 25,
    },
})

// Create persistor
export const persistor = persistStore(store)

// Infer types from store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Store helper functions
export const getAuthState = () => store.getState().auth
export const getMeetingState = () => store.getState().meeting
export const getParticipantState = () => store.getState().participant
export const isUserAuthenticated = () => store.getState().auth.isAuthenticated
export const getCurrentUser = () => store.getState().auth.user
export const getAccessToken = () => store.getState().auth.accessToken
export const getCurrentMeeting = () => store.getState().meeting.currentMeeting
export const isInMeeting = () => !!store.getState().meeting.currentMeeting

// Purge store data (useful for logout)
export const purgeStore = () => {
    persistor.purge()
}

// Reset specific slice
export const resetAuthSlice = () => {
    store.dispatch({ type: 'auth/logout' })
}

export const resetMeetingSlice = () => {
    store.dispatch({ type: 'meeting/leaveMeetingSuccess' })
}

export const resetParticipantSlice = () => {
    store.dispatch({ type: 'participant/clearErrors' })
}

// Development utilities
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Add store to global window for debugging
    (window as any).store = store
        ; (window as any).persistor = persistor

    // Log store changes in development
    store.subscribe(() => {
        const state = store.getState()
        console.group('🔄 Store Updated')
        console.log('Auth State:', state.auth)
        console.log('Meeting State:', state.meeting)
        console.log('Participant State:', state.participant)
        console.groupEnd()
    })
}

// Store initialization helper
export const initializeStore = () => {
    return new Promise((resolve) => {
        const unsubscribe = persistor.subscribe(() => {
            const { bootstrapped } = persistor.getState()
            if (bootstrapped) {
                unsubscribe()
                resolve(store)
            }
        })
    })
}

// Export store instance
export default store