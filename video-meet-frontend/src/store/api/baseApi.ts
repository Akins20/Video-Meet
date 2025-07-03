import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { RootState } from '../index'
import { logout, refreshTokenSuccess, refreshTokenFailure } from '../authSlice'
import { toast } from 'react-hot-toast'

// API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// Enhanced base query with authentication and token refresh
const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken

        // Add authentication token if available
        if (token) {
            headers.set('authorization', `Bearer ${token}`)
        }

        // Add common headers
        headers.set('content-type', 'application/json')
        headers.set('accept', 'application/json')

        // Add request ID for tracking
        headers.set('x-request-id', crypto.randomUUID())

        return headers
    },
})

// Base query with automatic token refresh
const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // Attempt the initial request
    let result = await baseQuery(args, api, extraOptions)

    // If we get a 401 Unauthorized error, try to refresh the token
    if (result.error && result.error.status === 401) {
        const state = api.getState() as RootState
        const refreshToken = state.auth.refreshToken

        if (refreshToken && !state.auth.isRefreshing) {
            console.log('🔄 Access token expired, attempting refresh...')

            // Attempt to refresh the token
            const refreshResult = await baseQuery(
                {
                    url: '/auth/refresh-token',
                    method: 'POST',
                    body: { refreshToken },
                },
                api,
                extraOptions
            )

            if (refreshResult.data) {
                // Refresh successful
                const { accessToken, expiresIn } = (refreshResult.data as any).data

                // Update the store with new token
                api.dispatch(refreshTokenSuccess({ accessToken, expiresIn }))

                console.log('✅ Token refreshed successfully')

                // Retry the original request with new token
                result = await baseQuery(args, api, extraOptions)
            } else {
                // Refresh failed - logout user
                console.log('❌ Token refresh failed, logging out user')
                api.dispatch(refreshTokenFailure())
                api.dispatch(logout())

                // Show user-friendly message
                toast.error('Session expired. Please login again.')
            }
        } else if (!refreshToken) {
            // No refresh token available - logout
            api.dispatch(logout())
            toast.error('Authentication required. Please login.')
        }
    }

    // Handle other API errors
    if (result.error && result.error.status !== 401) {
        handleApiError(result.error, api)
    }

    return result
}

// Global API error handler
const handleApiError = (error: FetchBaseQueryError, api: any) => {
    let message = 'An unexpected error occurred'

    if (error.status === 'FETCH_ERROR') {
        message = 'Network error. Please check your connection.'
    } else if (error.status === 'PARSING_ERROR') {
        message = 'Invalid response from server.'
    } else if (error.status === 'TIMEOUT_ERROR') {
        message = 'Request timeout. Please try again.'
    } else if (typeof error.status === 'number') {
        // HTTP status errors
        switch (error.status) {
            case 400:
                message = (error.data as any)?.message || 'Invalid request'
                break
            case 403:
                message = 'Access forbidden'
                break
            case 404:
                message = 'Resource not found'
                break
            case 409:
                message = (error.data as any)?.message || 'Conflict occurred'
                break
            case 422:
                message = 'Validation error'
                break
            case 429:
                message = 'Too many requests. Please slow down.'
                break
            case 500:
                message = 'Server error. Please try again later.'
                break
            case 503:
                message = 'Service temporarily unavailable'
                break
            default:
                message = `Error ${error.status}: ${(error.data as any)?.message || 'Unknown error'}`
        }
    }

    // Log error for debugging
    console.error('API Error:', {
        status: error.status,
        data: error.data,
        message,
    })

    // Don't show toast for validation errors (422) - let components handle them
    if (error.status !== 422) {
        toast.error(message)
    }
}

// Tag types for cache invalidation
export const tagTypes = [
    'User',
    'Meeting',
    'Participant',
    'Contact',
    'Invitation',
    'Message',
    'Analytics',
    'History',
] as const

// Main API slice
export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes,
    endpoints: () => ({}), // Endpoints will be injected from separate files

    // Keep unused data for 60 seconds
    keepUnusedDataFor: 60,

    // Refetch on mount if data is older than 5 minutes
    refetchOnMountOrArgChange: 300,

    // Refetch when window regains focus
    refetchOnFocus: true,

    // Refetch when network reconnects
    refetchOnReconnect: true,
})

// Enhanced API utilities
export const apiUtils = {
    /**
     * Reset all API cache
     */
    resetApiState: () => api.util.resetApiState(),

    /**
     * Invalidate specific tags
     */
    invalidateTags: (tags: typeof tagTypes[number][]) =>
        api.util.invalidateTags(
            tags.map((tag) => ({ type: tag }))
        ),

    /**
     * Prefetch data
     */
    prefetch: (endpointName: never, arg: never, options?: any) =>
        api.util.prefetch(endpointName, arg, options),

    /**
     * Get cached data
     */
    getCache: (endpointName: string, arg: any) => {
        const endpoint = (api.endpoints as Record<string, any>)[endpointName]
        return endpoint?.select ? endpoint.select(arg) : undefined
    },

    /**
     * Update cached data optimistically
     */
    updateCache: (endpointName: never, arg: never, updateFn: (draft: any) => void) => {
        // Warn if using a string for endpoints that expect an object
        if (
            (endpointName === 'getChatMessages' || endpointName === 'getMeetings') &&
            typeof arg === 'string'
        ) {
            console.warn(
                `[apiUtils.updateCache] Warning: '${endpointName}' expects an object argument (e.g., { meetingId }), but received a string. This may cause runtime or type errors.`
            )
        }
        return api.util.updateQueryData(endpointName, arg, updateFn)
    },

    /**
     * Subscribe to cache changes
     */
    subscribeToCache: (endpointName: string, arg: any, callback: (data: any) => void) => {
        // Implementation would depend on specific use case
        console.log(`Subscribing to ${endpointName} cache changes`)
    },
}

// Export base API for injection
export default api

// Type helpers
export type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export type ApiError = {
    success: false
    message: string
    error: {
        code: string
        details?: any
    }
}

// Common query options
export const commonQueryOptions = {
    // Retry failed requests up to 3 times
    retry: (failureCount: number, error: any) => {
        // Don't retry on auth errors
        if (error.status === 401 || error.status === 403) return false

        // Don't retry on validation errors
        if (error.status === 422) return false

        // Retry up to 3 times for other errors
        return failureCount < 3
    },

    // Exponential backoff for retries
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
}

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
    // Monitor API performance in development
    const originalBaseQuery = baseQuery

    // Wrap base query with performance monitoring
    const monitoredBaseQuery: typeof baseQuery = async (args, api, extraOptions) => {
        const start = performance.now()
        const result = await originalBaseQuery(args, api, extraOptions)
        const duration = performance.now() - start

        const url = typeof args === 'string' ? args : args.url
        console.log(`🚀 API Call: ${url} took ${duration.toFixed(2)}ms`)

        if (duration > 2000) {
            console.warn(`⚠️ Slow API call detected: ${url} (${duration.toFixed(2)}ms)`)
        }

        return result
    }
}

// Request deduplication helper
export const createDedupedEndpoint = <Args, Result>(
    endpointName: string,
    queryFn: (args: Args) => string | FetchArgs
) => {
    const pendingRequests = new Map<string, Promise<any>>()

    return {
        query: (args: Args) => {
            const key = JSON.stringify(args)

            if (pendingRequests.has(key)) {
                return pendingRequests.get(key)!
            }

            // Type assertion to allow dynamic endpoint access
            const request = (api.endpoints as Record<string, any>)[endpointName].initiate(args)
            pendingRequests.set(key, request)

            // Clean up after request completes
            request.finally(() => {
                pendingRequests.delete(key)
            })

            return request
        }
    }
}