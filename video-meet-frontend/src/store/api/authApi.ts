import { api, ApiResponse, commonQueryOptions } from './baseApi'
import { User } from '../authSlice'

// Auth request/response types
export interface LoginRequest {
    emailOrUsername: string
    password: string
}

export interface RegisterRequest {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
}

export interface AuthResponse {
    user: User
    accessToken: string
    refreshToken: string
    expiresIn: number
}

export interface RefreshTokenRequest {
    refreshToken: string
}

export interface RefreshTokenResponse {
    accessToken: string
    expiresIn: number
}

export interface ChangePasswordRequest {
    currentPassword: string
    newPassword: string
}

export interface ForgotPasswordRequest {
    email: string
}

export interface ResetPasswordRequest {
    token: string
    newPassword: string
}

export interface UpdateProfileRequest {
    firstName?: string
    lastName?: string
    bio?: string
    avatar?: string
}

export interface UpdatePreferencesRequest {
    preferences: Partial<User['preferences']>
}

export interface VerifyEmailRequest {
    token: string
}

export interface ResendVerificationRequest {
    email: string
}

// Inject auth endpoints into the main API
export const authApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // User registration
        register: builder.mutation<ApiResponse<AuthResponse>, RegisterRequest>({
            query: (data) => ({
                url: '/auth/register',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
            // Transform response to extract data
            transformResponse: (response: ApiResponse<AuthResponse>) => response,
            // Handle registration errors
            transformErrorResponse: (response: any) => {
                return {
                    status: response.status,
                    message: response.data?.message || 'Registration failed',
                    errors: response.data?.error?.details || []
                }
            },
        }),

        // User login
        login: builder.mutation<ApiResponse<AuthResponse>, LoginRequest>({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
            transformResponse: (response: ApiResponse<AuthResponse>) => response,
            transformErrorResponse: (response: any) => ({
                status: response.status,
                message: response.data?.message || 'Login failed',
                errors: response.data?.error?.details || []
            }),
        }),

        // Logout user
        logout: builder.mutation<ApiResponse<{ message: string }>, { refreshToken: string }>({
            query: (data) => ({
                url: '/auth/logout',
                method: 'POST',
                body: data,
            }),
            // Clear all cache on logout
            invalidatesTags: ['User', 'Meeting', 'Participant', 'Contact'],
            ...commonQueryOptions,
        }),

        // Refresh access token
        refreshToken: builder.mutation<ApiResponse<RefreshTokenResponse>, RefreshTokenRequest>({
            query: (data) => ({
                url: '/auth/refresh-token',
                method: 'POST',
                body: data,
            }),
            ...commonQueryOptions,
            // Don't show error toast for refresh failures (handled by baseQuery)
            transformErrorResponse: (response: any) => ({
                status: response.status,
                message: response.data?.message || 'Token refresh failed',
                silent: true // Flag to prevent error toast
            }),
        }),

        // Get current user profile
        getCurrentUser: builder.query<ApiResponse<{ user: User }>, void>({
            query: () => '/auth/me',
            providesTags: ['User'],
            ...commonQueryOptions,
            // Keep this data for longer since it's frequently accessed
            keepUnusedDataFor: 300, // 5 minutes
        }),

        // Update user profile
        updateProfile: builder.mutation<ApiResponse<{ user: User }>, UpdateProfileRequest>({
            query: (data) => ({
                url: '/auth/profile',
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
            // Optimistic update
            async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
                // Update cache optimistically
                const patchResult = dispatch(
                    authApi.util.updateQueryData('getCurrentUser', undefined, (draft) => {
                        if (draft.data?.user) {
                            Object.assign(draft.data.user, arg)
                        }
                    })
                )

                try {
                    await queryFulfilled
                } catch {
                    // Revert optimistic update on error
                    patchResult.undo()
                }
            },
        }),

        // Update user preferences
        updatePreferences: builder.mutation<ApiResponse<{ user: User }>, UpdatePreferencesRequest>({
            query: (data) => ({
                url: '/auth/preferences',
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
            // Optimistic update for preferences
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    authApi.util.updateQueryData('getCurrentUser', undefined, (draft) => {
                        if (draft.data?.user?.preferences) {
                            Object.assign(draft.data.user.preferences, arg.preferences)
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

        // Change password
        changePassword: builder.mutation<ApiResponse<{ message: string }>, ChangePasswordRequest>({
            query: (data) => ({
                url: '/auth/change-password',
                method: 'PUT',
                body: data,
            }),
            ...commonQueryOptions,
        }),

        // Forgot password
        forgotPassword: builder.mutation<ApiResponse<{ message: string }>, ForgotPasswordRequest>({
            query: (data) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body: data,
            }),
            ...commonQueryOptions,
        }),

        // Reset password
        resetPassword: builder.mutation<ApiResponse<{ message: string }>, ResetPasswordRequest>({
            query: (data) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body: data,
            }),
            ...commonQueryOptions,
        }),

        // Verify email
        verifyEmail: builder.mutation<ApiResponse<{ message: string }>, VerifyEmailRequest>({
            query: (data) => ({
                url: '/auth/verify-email',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
        }),

        // Resend email verification
        resendEmailVerification: builder.mutation<ApiResponse<{ message: string }>, ResendVerificationRequest>({
            query: (data) => ({
                url: '/auth/resend-verification',
                method: 'POST',
                body: data,
            }),
            ...commonQueryOptions,
        }),

        // Delete account
        deleteAccount: builder.mutation<ApiResponse<{ message: string }>, { password: string }>({
            query: (data) => ({
                url: '/auth/delete-account',
                method: 'DELETE',
                body: data,
            }),
            // Clear all cache on account deletion
            invalidatesTags: ['User', 'Meeting', 'Participant', 'Contact', 'History'],
            ...commonQueryOptions,
        }),

        // Check username availability
        checkUsernameAvailability: builder.query<ApiResponse<{ available: boolean }>, string>({
            query: (username) => `/auth/check-username/${encodeURIComponent(username)}`,
            ...commonQueryOptions,
            // Cache username checks for a short time
            keepUnusedDataFor: 30,
        }),

        // Check email availability
        checkEmailAvailability: builder.query<ApiResponse<{ available: boolean }>, string>({
            query: (email) => `/auth/check-email/${encodeURIComponent(email)}`,
            ...commonQueryOptions,
            keepUnusedDataFor: 30,
        }),

        // Get user sessions (for security page)
        getUserSessions: builder.query<ApiResponse<{
            sessions: Array<{
                id: string
                deviceName: string
                deviceType: string
                ipAddress: string
                location: string
                lastActivity: string
                isCurrent: boolean
            }>
        }>, void>({
            query: () => '/auth/sessions',
            providesTags: ['User'],
            ...commonQueryOptions,
        }),

        // Revoke user session
        revokeSession: builder.mutation<ApiResponse<{ message: string }>, { sessionId: string }>({
            query: (data) => ({
                url: '/auth/revoke-session',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
        }),

        // Enable/disable two-factor authentication
        toggleTwoFactor: builder.mutation<ApiResponse<{
            enabled: boolean
            qrCode?: string
            backupCodes?: string[]
        }>, {
            enable: boolean
            password?: string
            totpCode?: string
        }>({
            query: (data) => ({
                url: '/auth/two-factor',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['User'],
            ...commonQueryOptions,
        }),
    }),

    overrideExisting: false,
})

// Export hooks for use in components
export const {
    useRegisterMutation,
    useLoginMutation,
    useLogoutMutation,
    useRefreshTokenMutation,
    useGetCurrentUserQuery,
    useLazyGetCurrentUserQuery,
    useUpdateProfileMutation,
    useUpdatePreferencesMutation,
    useChangePasswordMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useVerifyEmailMutation,
    useResendEmailVerificationMutation,
    useDeleteAccountMutation,
    useCheckUsernameAvailabilityQuery,
    useLazyCheckUsernameAvailabilityQuery,
    useCheckEmailAvailabilityQuery,
    useLazyCheckEmailAvailabilityQuery,
    useGetUserSessionsQuery,
    useRevokeSessionMutation,
    useToggleTwoFactorMutation,
} = authApi

// Export additional utilities
export const authApiUtils = {
    // Prefetch user data
    prefetchUserData: () => authApi.util.prefetch('getCurrentUser', undefined, { force: false }),

    // Get cached user data
    getCachedUser: () => authApi.endpoints.getCurrentUser.select(undefined),

    // Reset auth cache
    resetAuthCache: () => {
        authApi.util.resetApiState()
    },

    // Invalidate user cache
    invalidateUserCache: () => {
        authApi.util.invalidateTags(['User'])
    },

    // Check if username is available (with debouncing)
    checkUsernameDebounced: (() => {
        let timeoutId: NodeJS.Timeout
        return (username: string, callback: (available: boolean) => void) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                try {
                    // @ts-ignore
                    const result = await (await import('../store')).default.dispatch(authApi.endpoints.checkUsernameAvailability.initiate(username)).unwrap()
                    callback(result.data?.available || false)
                } catch {
                    callback(false)
                }
            }, 300)
        }
    })(),

    // Check if email is available (with debouncing)
    checkEmailDebounced: (() => {
        let timeoutId: NodeJS.Timeout
        return (email: string, callback: (available: boolean) => void) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                try {
                    // @ts-ignore
                    const result = await (await import('../store')).default.dispatch(authApi.endpoints.checkEmailAvailability.initiate(email)).unwrap()
                    callback(result.data?.available || false)
                } catch {
                    callback(false)
                }
            }, 300)
        }
    })(),
}

export default authApi