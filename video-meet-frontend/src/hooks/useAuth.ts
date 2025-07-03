import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
    useAppDispatch,
    useAuthState,
    useAuthStatus,
    useUserData,
    useUserPermissions
} from '@/store/hooks'
import {
    loginStart,
    loginSuccess,
    loginFailure,
    registerStart,
    refreshTokenStart,
    refreshTokenSuccess,
    refreshTokenFailure,
    logout,
    updateProfile,
    updatePreferences,
    clearError,
    updateActivity,
    type User
} from '@/store/authSlice'
import { apiClient } from '@/lib/api'

// Types for authentication requests
interface LoginCredentials {
    emailOrUsername: string
    password: string
    rememberMe?: boolean
}

interface RegisterData {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
    rememberMe?: boolean
}

interface AuthResponse {
    user: User
    accessToken: string
    refreshToken: string
    expiresIn: number
}

interface ChangePasswordData {
    currentPassword: string
    newPassword: string
}

interface ForgotPasswordData {
    email: string
}

interface ResetPasswordData {
    token: string
    newPassword: string
}

export const useAuth = () => {
    const dispatch = useAppDispatch()
    const router = useRouter()

    // Get auth state from Redux
    const authState = useAuthState()
    const authStatus = useAuthStatus()
    const userData = useUserData()
    const checkPermission = useUserPermissions()

    /**
     * Login user with credentials
     */
    const login = useCallback(async (credentials: LoginCredentials) => {
        try {
            dispatch(loginStart())

            const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
                '/auth/login',
                {
                    emailOrUsername: credentials.emailOrUsername,
                    password: credentials.password
                }
            )

            if (response.data.success) {
                const { user, accessToken, refreshToken, expiresIn } = response.data.data

                // Update Redux store (this will handle persistence automatically)
                dispatch(loginSuccess({
                    user,
                    accessToken,
                    refreshToken,
                    expiresIn,
                    rememberMe: credentials.rememberMe || false
                }))

                // Show success message
                toast.success(`Welcome back, ${user.firstName}!`)

                // Redirect to dashboard
                router.push('/dashboard')

                return { success: true, user }
            } else {
                throw new Error('Login failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Login failed. Please try again.'
            dispatch(loginFailure(errorMessage))
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [dispatch, router])

    /**
     * Register new user
     */
    const register = useCallback(async (userData: RegisterData) => {
        try {
            dispatch(registerStart())

            const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
                '/auth/register',
                {
                    email: userData.email,
                    username: userData.username,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    password: userData.password
                }
            )

            if (response.data.success) {
                const { user, accessToken, refreshToken, expiresIn } = response.data.data

                // Update Redux store
                dispatch(loginSuccess({
                    user,
                    accessToken,
                    refreshToken,
                    expiresIn,
                    rememberMe: userData.rememberMe || false
                }))

                // Show success message
                toast.success(`Welcome to Video Meet, ${user.firstName}!`)

                // Redirect to dashboard
                router.push('/dashboard')

                return { success: true, user }
            } else {
                throw new Error('Registration failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.'
            dispatch(loginFailure(errorMessage))
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [dispatch, router])

    /**
     * Logout user and cleanup
     */
    const logoutUser = useCallback(async (showMessage = true) => {
        try {
            // Optional: Call logout endpoint to invalidate refresh token
            if (authState.refreshToken) {
                await apiClient.post('/auth/logout', {
                    refreshToken: authState.refreshToken
                })
            }
        } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed:', error)
        } finally {
            // Clear Redux store (this will handle localStorage cleanup)
            dispatch(logout())

            // Show message
            if (showMessage) {
                toast.success('Logged out successfully')
            }

            // Redirect to login
            router.push('/login')
        }
    }, [dispatch, router, authState.refreshToken])

    /**
     * Refresh access token
     */
    const refreshAccessToken = useCallback(async () => {
        try {
            if (!authState.refreshToken) {
                throw new Error('No refresh token available')
            }

            dispatch(refreshTokenStart())

            const response = await apiClient.post<{
                success: boolean
                data: { accessToken: string; expiresIn: number }
            }>('/auth/refresh-token', {
                refreshToken: authState.refreshToken
            })

            if (response.data.success) {
                const { accessToken, expiresIn } = response.data.data

                // Update Redux store
                dispatch(refreshTokenSuccess({ accessToken, expiresIn }))

                return accessToken
            } else {
                throw new Error('Token refresh failed')
            }
        } catch (error: any) {
            console.error('Token refresh failed:', error)
            dispatch(refreshTokenFailure())

            // If refresh fails, logout user
            logoutUser(false)

            return null
        }
    }, [dispatch, authState.refreshToken, logoutUser])

    /**
     * Update user profile
     */
    const updateUserProfile = useCallback(async (profileData: Partial<User>) => {
        try {
            const response = await apiClient.put<{
                success: boolean
                data: { user: User }
            }>('/auth/profile', profileData)

            if (response.data.success) {
                // Update Redux store
                dispatch(updateProfile(response.data.data.user))

                toast.success('Profile updated successfully')
                return { success: true, user: response.data.data.user }
            } else {
                throw new Error('Profile update failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Profile update failed'
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [dispatch])

    /**
     * Update user preferences
     */
    const updateUserPreferences = useCallback(async (preferences: Partial<User['preferences']>) => {
        try {
            const response = await apiClient.put<{
                success: boolean
                data: { user: User }
            }>('/auth/preferences', { preferences })

            if (response.data.success) {
                // Update Redux store
                dispatch(updateProfile(response.data.data.user))

                toast.success('Preferences updated successfully')
                return { success: true, preferences: response.data.data.user.preferences }
            } else {
                throw new Error('Preferences update failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Preferences update failed'
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [dispatch])

    /**
     * Change password
     */
    const changePassword = useCallback(async (passwordData: ChangePasswordData) => {
        try {
            const response = await apiClient.put<{ success: boolean; message: string }>(
                '/auth/change-password',
                passwordData
            )

            if (response.data.success) {
                toast.success('Password changed successfully')
                return { success: true }
            } else {
                throw new Error('Password change failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Password change failed'
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [])

    /**
     * Request password reset
     */
    const forgotPassword = useCallback(async (data: ForgotPasswordData) => {
        try {
            const response = await apiClient.post<{ success: boolean; message: string }>(
                '/auth/forgot-password',
                data
            )

            if (response.data.success) {
                toast.success('Password reset email sent')
                return { success: true }
            } else {
                throw new Error('Password reset request failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Password reset request failed'
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [])

    /**
     * Reset password with token
     */
    const resetPassword = useCallback(async (data: ResetPasswordData) => {
        try {
            const response = await apiClient.post<{ success: boolean; message: string }>(
                '/auth/reset-password',
                data
            )

            if (response.data.success) {
                toast.success('Password reset successfully')
                router.push('/login')
                return { success: true }
            } else {
                throw new Error('Password reset failed')
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Password reset failed'
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    }, [router])

    /**
     * Get current user profile from server
     */
    const getCurrentUser = useCallback(async () => {
        try {
            const response = await apiClient.get<{
                success: boolean
                data: { user: User }
            }>('/auth/me')

            if (response.data.success) {
                dispatch(updateProfile(response.data.data.user))
                return response.data.data.user
            }
            return null
        } catch (error) {
            console.error('Failed to get current user:', error)
            return null
        }
    }, [dispatch])

    /**
     * Update user activity
     */
    const updateUserActivity = useCallback(() => {
        if (authState.isAuthenticated) {
            dispatch(updateActivity())
        }
    }, [dispatch, authState.isAuthenticated])

    /**
     * Clear authentication error
     */
    const clearAuthError = useCallback(() => {
        dispatch(clearError())
    }, [dispatch])

    /**
     * Auto-refresh token when it's about to expire
     */
    useEffect(() => {
        if (!authStatus.isAuthenticated || authStatus.isRefreshing) {
            return
        }

        // Check if token is expiring soon (within 2 minutes)
        if (authStatus.isTokenExpiringSoon && !authStatus.isTokenExpired) {
            refreshAccessToken()
        }
    }, [authStatus.isAuthenticated, authStatus.isTokenExpiringSoon, authStatus.isTokenExpired, authStatus.isRefreshing, refreshAccessToken])

    /**
     * Auto-logout on session expiry
     */
    useEffect(() => {
        if (authStatus.isAuthenticated && authStatus.isSessionExpired) {
            toast.error('Session expired. Please login again.')
            logoutUser(false)
        }
    }, [authStatus.isAuthenticated, authStatus.isSessionExpired, logoutUser])

    // Return comprehensive auth interface
    return {
        // State
        user: userData,
        isAuthenticated: authStatus.isAuthenticated,
        isLoading: authStatus.isLoading,
        isInitializing: authStatus.isInitializing,
        isRefreshing: authStatus.isRefreshing,
        error: authStatus.error,
        hasError: authStatus.hasError,

        // Computed states
        isTokenExpired: authStatus.isTokenExpired,
        isTokenExpiringSoon: authStatus.isTokenExpiringSoon,
        isSessionExpired: authStatus.isSessionExpired,
        timeUntilExpiry: authStatus.timeUntilExpiry,
        sessionAge: authStatus.sessionAge,
        rememberMe: authStatus.rememberMe,

        // Actions
        login,
        register,
        logout: logoutUser,
        refreshToken: refreshAccessToken,
        updateProfile: updateUserProfile,
        updatePreferences: updateUserPreferences,
        changePassword,
        forgotPassword,
        resetPassword,
        getCurrentUser,
        updateActivity: updateUserActivity,
        clearError: clearAuthError,

        // Utilities
        hasPermission: checkPermission,
        hasRole: (role: string) => userData?.role === role,
        isEmailVerified: userData?.isEmailVerified || false,
        displayName: userData?.displayName || 'User',
        initials: userData?.initials || '??',
        hasAvatar: userData?.hasAvatar || false,
    }
}

export default useAuth