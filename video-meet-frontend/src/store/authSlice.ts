import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from './index'

// User interface matching your backend API
export interface User {
    id: string
    email: string
    username: string
    firstName: string
    lastName: string
    fullName: string
    avatar?: string
    bio?: string
    isEmailVerified: boolean
    preferences: {
        notifications: {
            email: boolean
            push: boolean
            meetingInvites: boolean
        }
        privacy: {
            allowDiscovery: boolean
            showOnlineStatus: boolean
        }
        meeting: {
            defaultMicMuted: boolean
            defaultVideoOff: boolean
            preferredQuality: 'low' | 'medium' | 'high' | 'auto'
        }
    }
    createdAt: string
    lastLogin?: string
}

// Authentication state interface
export interface AuthState {
    // User data
    user: User | null

    // Authentication tokens
    accessToken: string | null
    refreshToken: string | null
    tokenExpiresAt: number | null

    // Loading states
    isLoading: boolean
    isInitializing: boolean
    isRefreshing: boolean

    // Error handling
    error: string | null

    // Authentication status
    isAuthenticated: boolean
    lastActivity: number

    // Session management
    sessionTimeout: number // 15 minutes in milliseconds
    rememberMe: boolean
}

// Initial state
const initialState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    isLoading: false,
    isInitializing: true,
    isRefreshing: false,
    error: null,
    isAuthenticated: false,
    lastActivity: Date.now(),
    sessionTimeout: 15 * 60 * 1000, // 15 minutes
    rememberMe: false,
}

// Auth slice
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Authentication start actions
        loginStart: (state) => {
            state.isLoading = true
            state.error = null
        },

        registerStart: (state) => {
            state.isLoading = true
            state.error = null
        },

        // Authentication success
        loginSuccess: (state, action: PayloadAction<{
            user: User
            accessToken: string
            refreshToken: string
            expiresIn?: number
            rememberMe?: boolean
        }>) => {
            const { user, accessToken, refreshToken, expiresIn = 900, rememberMe = false } = action.payload

            state.user = user
            state.accessToken = accessToken
            state.refreshToken = refreshToken
            state.tokenExpiresAt = Date.now() + (expiresIn * 1000)
            state.isAuthenticated = true
            state.isLoading = false
            state.isInitializing = false
            state.error = null
            state.lastActivity = Date.now()
            state.rememberMe = rememberMe
        },

        // Authentication failure
        loginFailure: (state, action: PayloadAction<string>) => {
            state.user = null
            state.accessToken = null
            state.refreshToken = null
            state.tokenExpiresAt = null
            state.isAuthenticated = false
            state.isLoading = false
            state.isInitializing = false
            state.error = action.payload
        },

        // Token refresh actions
        refreshTokenStart: (state) => {
            state.isRefreshing = true
            state.error = null
        },

        refreshTokenSuccess: (state, action: PayloadAction<{
            accessToken: string
            expiresIn?: number
        }>) => {
            const { accessToken, expiresIn = 900 } = action.payload

            state.accessToken = accessToken
            state.tokenExpiresAt = Date.now() + (expiresIn * 1000)
            state.isRefreshing = false
            state.error = null
            state.lastActivity = Date.now()
        },

        refreshTokenFailure: (state) => {
            state.user = null
            state.accessToken = null
            state.refreshToken = null
            state.tokenExpiresAt = null
            state.isAuthenticated = false
            state.isRefreshing = false
            state.error = 'Session expired. Please login again.'
        },

        // Logout action
        logout: (state) => {
            state.user = null
            state.accessToken = null
            state.refreshToken = null
            state.tokenExpiresAt = null
            state.isAuthenticated = false
            state.isLoading = false
            state.isInitializing = false
            state.isRefreshing = false
            state.error = null
            state.rememberMe = false
        },

        // Update user profile
        updateProfile: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload }
            }
        },

        // Update user preferences
        updatePreferences: (state, action: PayloadAction<Partial<User['preferences']>>) => {
            if (state.user) {
                state.user.preferences = {
                    ...state.user.preferences,
                    ...action.payload,
                    // Deep merge for nested objects
                    notifications: {
                        ...state.user.preferences.notifications,
                        ...action.payload.notifications,
                    },
                    privacy: {
                        ...state.user.preferences.privacy,
                        ...action.payload.privacy,
                    },
                    meeting: {
                        ...state.user.preferences.meeting,
                        ...action.payload.meeting,
                    },
                }
            }
        },

        // Clear error
        clearError: (state) => {
            state.error = null
        },

        // Update last activity (for session management)
        updateActivity: (state) => {
            state.lastActivity = Date.now()
        },

        // Check if token is expired
        checkTokenExpiration: (state) => {
            if (state.tokenExpiresAt && Date.now() > state.tokenExpiresAt) {
                // Token expired, but don't logout immediately - let refresh handle it
                state.error = 'Token expired'
            }
        },

        // Initialize auth state (called on app startup)
        initializeAuth: (state) => {
            state.isInitializing = false
        },

        // Set session timeout
        setSessionTimeout: (state, action: PayloadAction<number>) => {
            state.sessionTimeout = action.payload
        },

        // Toggle remember me
        setRememberMe: (state, action: PayloadAction<boolean>) => {
            state.rememberMe = action.payload
        },
    },
})

// Export actions
export const {
    loginStart,
    registerStart,
    loginSuccess,
    loginFailure,
    refreshTokenStart,
    refreshTokenSuccess,
    refreshTokenFailure,
    logout,
    updateProfile,
    updatePreferences,
    clearError,
    updateActivity,
    checkTokenExpiration,
    initializeAuth,
    setSessionTimeout,
    setRememberMe,
} = authSlice.actions

// Selectors
export const selectAuth = (state: RootState) => state.auth
export const selectUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectIsLoading = (state: RootState) => state.auth.isLoading
export const selectIsInitializing = (state: RootState) => state.auth.isInitializing
export const selectIsRefreshing = (state: RootState) => state.auth.isRefreshing
export const selectError = (state: RootState) => state.auth.error
export const selectAccessToken = (state: RootState) => state.auth.accessToken
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken
export const selectTokenExpiresAt = (state: RootState) => state.auth.tokenExpiresAt
export const selectLastActivity = (state: RootState) => state.auth.lastActivity
export const selectSessionTimeout = (state: RootState) => state.auth.sessionTimeout
export const selectRememberMe = (state: RootState) => state.auth.rememberMe

// Complex selectors
export const selectIsTokenExpired = (state: RootState) => {
    const { tokenExpiresAt } = state.auth
    return tokenExpiresAt ? Date.now() > tokenExpiresAt : false
}

export const selectIsSessionExpired = (state: RootState) => {
    const { lastActivity, sessionTimeout, rememberMe } = state.auth
    if (rememberMe) return false // Never expire if remember me is enabled
    return Date.now() - lastActivity > sessionTimeout
}

export const selectTimeUntilTokenExpiry = (state: RootState) => {
    const { tokenExpiresAt } = state.auth
    return tokenExpiresAt ? Math.max(0, tokenExpiresAt - Date.now()) : 0
}

export const selectUserDisplayName = (state: RootState) => {
    const user = state.auth.user
    if (!user) return null
    return user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.username
}

export const selectUserInitials = (state: RootState) => {
    const user = state.auth.user
    if (!user) return ''
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || ''
}

// Export reducer
export default authSlice.reducer