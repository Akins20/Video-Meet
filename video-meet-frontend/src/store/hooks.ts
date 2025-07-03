import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import { useCallback, useEffect, useRef } from 'react'
import type { RootState, AppDispatch } from './index'

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Enhanced selector hook with equality check
export const useAppSelectorWithComparison = <T>(
    selector: (state: RootState) => T,
    equalityFn?: (left: T, right: T) => boolean
) => {
    return useSelector(selector, equalityFn)
}

// Hook for dispatching actions with automatic loading states
export const useAppAction = () => {
    const dispatch = useAppDispatch()

    return useCallback(
        <T extends (...args: any[]) => any>(
            actionCreator: T,
            options?: {
                onSuccess?: (result: any) => void
                onError?: (error: any) => void
                showLoading?: boolean
            }
        ) => {
            return async (...args: Parameters<T>) => {
                try {
                    const result = await dispatch(actionCreator(...args))
                    options?.onSuccess?.(result)
                    return result
                } catch (error) {
                    options?.onError?.(error)
                    throw error
                }
            }
        },
        [dispatch]
    )
}

// Hook for selecting and watching auth state changes
export const useAuthState = () => {
    const authState = useAppSelector((state) => state.auth)

    return {
        user: authState.user,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        isInitializing: authState.isInitializing,
        isRefreshing: authState.isRefreshing,
        error: authState.error,
        accessToken: authState.accessToken,
        refreshToken: authState.refreshToken,
        tokenExpiresAt: authState.tokenExpiresAt,
        lastActivity: authState.lastActivity,
        rememberMe: authState.rememberMe,
    }
}

// Hook for selecting user data with computed properties
export const useUserData = () => {
    return useAppSelector((state) => {
        const { user } = state.auth

        if (!user) return null

        return {
            ...user,
            // Computed properties
            displayName: user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.username,
            initials: `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || '',
            isVerified: user.isEmailVerified,
            hasAvatar: !!user.avatar,
        }
    })
}

// Hook for authentication status with derived states
export const useAuthStatus = () => {
    return useAppSelector((state) => {
        const { auth } = state
        const now = Date.now()

        return {
            isAuthenticated: auth.isAuthenticated,
            isLoading: auth.isLoading,
            isInitializing: auth.isInitializing,
            isRefreshing: auth.isRefreshing,
            hasError: !!auth.error,
            error: auth.error,

            // Computed authentication states
            isTokenExpired: auth.tokenExpiresAt ? now > auth.tokenExpiresAt : false,
            isTokenExpiringSoon: auth.tokenExpiresAt ? now > (auth.tokenExpiresAt - 60000) : false, // 1 minute warning
            isSessionExpired: auth.rememberMe ? false : (now - auth.lastActivity) > auth.sessionTimeout,
            timeUntilExpiry: auth.tokenExpiresAt ? Math.max(0, auth.tokenExpiresAt - now) : 0,

            // Session info
            sessionAge: now - auth.lastActivity,
            rememberMe: auth.rememberMe,
        }
    })
}

// Hook for user permissions and roles
export const useUserPermissions = () => {
    const user = useAppSelector((state) => state.auth.user)

    return useCallback((permission: string) => {
        if (!user) return false

        // Add your permission logic here based on user roles/permissions
        // This is a placeholder implementation
        switch (permission) {
            case 'create_meeting':
                return user.isEmailVerified
            case 'join_meeting':
                return true
            case 'moderate_meeting':
                return user.isEmailVerified // Add actual role check
            default:
                return false
        }
    }, [user])
}

// Hook for comparing previous state values
export const usePrevious = <T>(value: T): T | undefined => {
    const ref = useRef<T>(undefined)

    useEffect(() => {
        ref.current = value
    })

    return ref.current
}

// Hook for detecting auth state changes
export const useAuthStateChanges = (
    callback: (current: RootState['auth'], previous?: RootState['auth']) => void
) => {
    const currentAuth = useAppSelector((state) => state.auth)
    const previousAuth = usePrevious(currentAuth)

    useEffect(() => {
        if (previousAuth) {
            callback(currentAuth, previousAuth)
        }
    }, [currentAuth, previousAuth, callback])
}

// Hook for periodic token refresh
export const useTokenRefresh = () => {
    const { isAuthenticated, isRefreshing } = useAuthStatus()
    const tokenExpiresAt = useAppSelector((state) => state.auth.tokenExpiresAt)
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (!isAuthenticated || !tokenExpiresAt || isRefreshing) {
            return
        }

        const timeUntilExpiry = tokenExpiresAt - Date.now()
        const refreshTime = Math.max(timeUntilExpiry - 120000, 30000) // Refresh 2 minutes before expiry, but at least after 30 seconds

        const timer = setTimeout(() => {
            dispatch({ type: 'auth/refreshTokenStart' })
        }, refreshTime)

        return () => clearTimeout(timer)
    }, [isAuthenticated, tokenExpiresAt, isRefreshing, dispatch])
}

// Hook for selecting store loading states
export const useLoadingStates = () => {
    return useAppSelector((state) => ({
        auth: {
            login: state.auth.isLoading,
            refresh: state.auth.isRefreshing,
            initialization: state.auth.isInitializing,
        },
        // Add other slice loading states as you add more slices
        // meeting: state.meeting?.isLoading,
        // participant: state.participant?.isLoading,
    }))
}

// Hook for selecting all error states
export const useErrorStates = () => {
    return useAppSelector((state) => ({
        auth: state.auth.error,
        // Add other slice errors as you add more slices
        // meeting: state.meeting?.error,
        // participant: state.participant?.error,
    }))
}

// Utility hook for conditional rendering based on auth state
export const useAuthConditional = () => {
    const { isAuthenticated, isInitializing } = useAuthStatus()

    return {
        // Show loading spinner
        showLoading: isInitializing,

        // Show authenticated content
        showAuthenticated: isAuthenticated && !isInitializing,

        // Show login form
        showLogin: !isAuthenticated && !isInitializing,

        // Helper functions
        ifAuthenticated: (component: React.ReactNode) =>
            isAuthenticated && !isInitializing ? component : null,

        ifNotAuthenticated: (component: React.ReactNode) =>
            !isAuthenticated && !isInitializing ? component : null,

        ifLoading: (component: React.ReactNode) =>
            isInitializing ? component : null,
    }
}

// Export common combinations for convenience
export const useAuth = () => ({
    ...useAuthState(),
    ...useAuthStatus(),
    permissions: useUserPermissions(),
    conditional: useAuthConditional(),
})

export default {
    useAppDispatch,
    useAppSelector,
    useAppAction,
    useAuthState,
    useUserData,
    useAuthStatus,
    useUserPermissions,
    useAuthStateChanges,
    useTokenRefresh,
    useLoadingStates,
    useErrorStates,
    useAuthConditional,
    useAuth,
}