import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { RootState } from '../index'
import { logout, refreshTokenSuccess, refreshTokenFailure } from '../authSlice'
import { toast } from 'react-hot-toast'

// API base URL from environment with fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://video-meet-g90z.onrender.com/api/v1'

// Enhanced base query with authentication and CORS handling
const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken

        // Add authentication token if available
        if (token) {
            headers.set('authorization', `Bearer ${token}`)
        }

        // Add CORS-friendly headers
        headers.set('content-type', 'application/json')
        headers.set('accept', 'application/json')
        
        // Remove problematic headers that might cause CORS preflight issues
        // headers.set('x-request-id', crypto.randomUUID()) // Comment out for now

        return headers
    },
    // Add fetch options for CORS
    fetchFn: async (input, init) => {
        // Add CORS mode explicitly
        const modifiedInit = {
            ...init,
            mode: 'cors' as RequestMode,
            // credentials: 'include' as RequestCredentials,
        }
        
        try {
            const response = await fetch(input, modifiedInit)
            
            // Handle CORS errors specifically
            if (!response.ok && response.status === 0) {
                throw new Error('CORS_ERROR')
            }
            
            return response
        } catch (error) {
            // Handle network errors that might be CORS-related
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('🚨 Network Error - Possible CORS issue:', error)
                throw new Error('NETWORK_ERROR')
            }
            throw error
        }
    },
})

// Base query with automatic token refresh and better error handling
const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // Attempt the initial request
    let result = await baseQuery(args, api, extraOptions)

    // Handle CORS and network errors
    if (result.error && result.error.status === 'FETCH_ERROR') {
        const errorMessage = (result.error as any).error
        
        if (errorMessage === 'CORS_ERROR') {
            console.error('🚨 CORS Error detected')
            toast.error('Connection blocked by CORS policy. Please check server configuration.')
            return result
        }
        
        if (errorMessage === 'NETWORK_ERROR') {
            console.error('🚨 Network Error detected')
            toast.error('Network error. Please check your connection and server status.')
            return result
        }
    }

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

// Enhanced API error handler with better CORS handling
const handleApiError = (error: FetchBaseQueryError, api: any) => {
    let message = 'An unexpected error occurred'

    if (error.status === 'FETCH_ERROR') {
        const errorMessage = (error as any).error || 'Unknown fetch error'
        
        if (errorMessage === 'CORS_ERROR') {
            message = 'Connection blocked by CORS policy. Please contact support.'
        } else if (errorMessage === 'NETWORK_ERROR') {
            message = 'Network error. Please check your connection.'
        } else if (errorMessage.includes('Failed to fetch')) {
            message = 'Unable to connect to server. Please check your internet connection.'
        } else {
            message = 'Network error. Please check your connection and try again.'
        }
    } else if (error.status === 'PARSING_ERROR') {
        message = 'Invalid response from server.'
    } else if (error.status === 'TIMEOUT_ERROR') {
        message = 'Request timeout. Please try again.'
    } else if (typeof error.status === 'number') {
        // HTTP status errors
        switch (error.status) {
            case 0:
                message = 'Connection failed. Please check if the server is running.'
                break
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

    // Log error for debugging with more details
    console.error('API Error:', {
        status: error.status,
        data: error.data,
        message,
        originalError: error,
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

// Enhanced API utilities with better error handling
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
     * Test API connection
     */
    testConnection: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                // credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            
            if (response.ok) {
                console.log('✅ API connection successful')
                return true
            } else {
                console.error('❌ API connection failed:', response.status)
                return false
            }
        } catch (error) {
            console.error('❌ API connection error:', error)
            return false
        }
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

// Common query options with better retry logic
export const commonQueryOptions = {
    // Retry failed requests up to 3 times
    retry: (failureCount: number, error: any) => {
        // Don't retry on auth errors
        if (error.status === 401 || error.status === 403) return false

        // Don't retry on validation errors
        if (error.status === 422) return false

        // Don't retry on CORS errors
        if (error.status === 'FETCH_ERROR' && 
            (error.error === 'CORS_ERROR' || error.error === 'NETWORK_ERROR')) {
            return false
        }

        // Retry up to 3 times for other errors
        return failureCount < 3
    },

    // Exponential backoff for retries
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
}

// Development environment helpers
if (process.env.NODE_ENV === 'development') {
    // Log API base URL for debugging
    console.log('🔗 API Base URL:', API_BASE_URL)
    
    // Test connection on app start
    apiUtils.testConnection().then(success => {
        if (!success) {
            console.error('⚠️ API connection test failed. Please check:')
            console.error('   1. Server is running')
            console.error('   2. CORS is properly configured')
            console.error('   3. API_BASE_URL is correct')
        }
    })
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