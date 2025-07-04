import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    InternalAxiosRequestConfig
} from 'axios'
import { toast } from 'react-hot-toast'
import { ENV_CONFIG, TIME_CONFIG, ERROR_MESSAGES } from '@/utils/constants'
import { errorUtils } from '@/utils/helpers'
import type { ApiResponse, ApiError, NetworkError } from '@/types/api'

// Request queue for token refresh
interface QueuedRequest {
    resolve: (value: any) => void
    reject: (reason: any) => void
    config: AxiosRequestConfig
}

class ApiClient {
    private client: AxiosInstance
    private isRefreshing = false
    private failedQueue: QueuedRequest[] = []

    constructor() {
        // Create axios instance with CORS-friendly configuration
        this.client = axios.create({
            baseURL: ENV_CONFIG.apiUrl,
            timeout: TIME_CONFIG.timeouts.apiRequest,
            
            // 🔥 CORS-friendly headers - only include essential ones
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            
            // 🔥 Enable credentials for CORS
            withCredentials: true,
            
            // Enable automatic request/response compression
            decompress: true,
            
            // Set max content length (100MB)
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            
            // 🔥 Disable automatic JSON parsing for better error handling
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        // Request interceptor - Add auth token and minimal headers
        this.client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // 🔥 Only add custom headers if absolutely necessary
                // Removed X-Request-ID to avoid CORS preflight issues
                
                // Add timestamp for performance monitoring (commented out to avoid CORS issues)
                // config.metadata = { startTime: Date.now() }

                // Add auth token if available
                const token = this.getAccessToken()
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                
                // 🔥 Ensure proper Content-Type for different request types
                if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
                    config.headers['Content-Type'] = 'application/json'
                }

                // Log request in development
                if (ENV_CONFIG.isDevelopment) {
                    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                        headers: config.headers,
                        data: config.data,
                    })
                }

                return config
            },
            (error) => {
                return Promise.reject(this.handleRequestError(error))
            }
        )

        // Response interceptor - Handle auth and errors
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                // Log response in development
                if (ENV_CONFIG.isDevelopment) {
                    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                        status: response.status,
                        data: response.data,
                    })
                }

                // Transform response data
                return this.transformSuccessResponse(response)
            },
            async (error: AxiosError) => {
                return this.handleResponseError(error)
            }
        )
    }

    private async handleResponseError(error: AxiosError): Promise<never> {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Network errors
        if (!error.response) {
            const networkError = this.createNetworkError(error)
            this.showErrorToast(networkError.message)
            throw networkError
        }

        // Log error in development
        if (ENV_CONFIG.isDevelopment) {
            console.error(`❌ API Error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`, {
                status: error.response.status,
                data: error.response.data,
                error: error.message,
            })
        }

        // Handle 401 - Token expired
        if (error.response.status === 401 && !originalRequest._retry) {
            if (this.isRefreshing) {
                // Queue the request while token is being refreshed
                return new Promise((resolve, reject) => {
                    this.failedQueue.push({ resolve, reject, config: originalRequest })
                })
            }

            originalRequest._retry = true
            this.isRefreshing = true

            try {
                await this.refreshToken()
                this.processQueue(null)
                return this.client(originalRequest)
            } catch (refreshError) {
                this.processQueue(refreshError)
                this.handleAuthFailure()
                throw refreshError
            }
        }

        // Handle other status codes
        const apiError = this.transformErrorResponse(error)

        // Don't show toast for validation errors (handled by forms)
        if (error.response.status !== 422) {
            this.showErrorToast(apiError.message)
        }

        throw apiError
    }

    private async refreshToken(): Promise<void> {
        try {
            const refreshToken = this.getRefreshToken()
            if (!refreshToken) {
                throw new Error('No refresh token available')
            }

            // 🔥 Use the same client instance for token refresh to inherit CORS settings
            const response = await this.client.post('/auth/refresh-token', {
                refreshToken,
            })

            if (response.data.success) {
                const { accessToken, expiresIn } = response.data.data
                this.storeTokens(accessToken, refreshToken, expiresIn)

                // Dispatch success action to Redux store
                this.dispatchTokenRefreshSuccess(accessToken, expiresIn)
            } else {
                throw new Error('Token refresh failed')
            }
        } catch (error) {
            console.error('Token refresh failed:', error)
            this.dispatchTokenRefreshFailure()
            throw error
        } finally {
            this.isRefreshing = false
        }
    }

    private processQueue(error: any) {
        this.failedQueue.forEach(({ resolve, reject, config }) => {
            if (error) {
                reject(error)
            } else {
                resolve(this.client(config))
            }
        })

        this.failedQueue = []
    }

    private handleRequestError(error: any): NetworkError {
        return {
            type: 'FETCH_ERROR',
            message: ERROR_MESSAGES.network.serverError,
            originalError: error,
        }
    }

    private createNetworkError(error: AxiosError): NetworkError {
        // 🔥 Enhanced CORS error detection
        if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
            return {
                type: 'CORS_ERROR',
                message: 'Cross-origin request blocked. Please check server configuration.',
                originalError: error,
            }
        }

        if (error.code === 'ECONNABORTED') {
            return {
                type: 'TIMEOUT_ERROR',
                message: ERROR_MESSAGES.network.timeout,
                originalError: error,
            }
        }

        if (error.message === 'Network Error') {
            return {
                type: 'NETWORK_ERROR',
                message: ERROR_MESSAGES.network.offline,
                originalError: error,
            }
        }

        return {
            type: 'FETCH_ERROR',
            message: ERROR_MESSAGES.network.serverError,
            originalError: error,
        }
    }

    private transformSuccessResponse(response: AxiosResponse): AxiosResponse {
        // 🔥 Simplified response transformation to avoid CORS issues
        response.data._meta = {
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString(),
        }

        return response
    }

    private transformErrorResponse(error: AxiosError): ApiError {
        const response = error.response!
        const data = response.data as any

        return {
            success: false,
            message: data?.message || this.getDefaultErrorMessage(response.status),
            error: {
                code: data?.error?.code || `HTTP_${response.status}`,
                details: data?.error?.details || data,
            },
            timestamp: new Date().toISOString(),
            // Removed requestId to avoid CORS issues
        }
    }

    private getDefaultErrorMessage(status: number): string {
        switch (status) {
            case 400:
                return ERROR_MESSAGES.general.validation
            case 401:
                return ERROR_MESSAGES.auth.sessionExpired
            case 403:
                return ERROR_MESSAGES.network.forbidden
            case 404:
                return ERROR_MESSAGES.network.notFound
            case 409:
                return 'A conflict occurred. Please try again.'
            case 422:
                return ERROR_MESSAGES.general.validation
            case 429:
                return ERROR_MESSAGES.network.rateLimited
            case 500:
                return ERROR_MESSAGES.network.serverError
            case 503:
                return ERROR_MESSAGES.general.maintenance
            default:
                return ERROR_MESSAGES.general.unknown
        }
    }

    private showErrorToast(message: string) {
        // Debounce error toasts to prevent spam
        if (!this.lastErrorToast || Date.now() - this.lastErrorToast > 3000) {
            toast.error(message)
            this.lastErrorToast = Date.now()
        }
    }

    private lastErrorToast = 0

    private getAccessToken(): string | null {
        // This will be replaced with Redux store access
        return localStorage.getItem('accessToken')
    }

    private getRefreshToken(): string | null {
        // This will be replaced with Redux store access
        return localStorage.getItem('refreshToken')
    }

    private storeTokens(accessToken: string, refreshToken: string, expiresIn: number) {
        // This will be replaced with Redux store dispatch
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('tokenExpiresAt', (Date.now() + expiresIn * 1000).toString())
    }

    private dispatchTokenRefreshSuccess(accessToken: string, expiresIn: number) {
        // This will dispatch to Redux store
        console.log('Token refreshed successfully')
    }

    private dispatchTokenRefreshFailure() {
        // This will dispatch to Redux store
        console.log('Token refresh failed - logging out user')
    }

    private handleAuthFailure() {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('tokenExpiresAt')

        // This will be replaced with Redux logout action
        if (typeof window !== 'undefined') {
            window.location.href = '/login'
        }
    }

    // Public API methods
    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.get(url, config)
        return response.data
    }

    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.post(url, data, config)
        return response.data
    }

    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.put(url, data, config)
        return response.data
    }

    public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.patch(url, data, config)
        return response.data
    }

    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.delete(url, config)
        return response.data
    }

    // 🔥 Fixed file upload method with proper CORS handling
    public async uploadFile<T = any>(
        url: string,
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<ApiResponse<T>> {
        const formData = new FormData()
        formData.append('file', file)

        const config: AxiosRequestConfig = {
            // 🔥 Don't set Content-Type header - let browser set it automatically
            // This is crucial for multipart/form-data CORS requests
            headers: {
                // Remove Content-Type header to avoid CORS issues
                // Browser will set it automatically with boundary
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    onProgress(progress)
                }
            },
        }

        const response = await this.client.post(url, formData, config)
        return response.data
    }

    // Download file method
    public async downloadFile(url: string, filename?: string): Promise<void> {
        const response = await this.client.get(url, {
            responseType: 'blob',
        })

        // Create blob URL and trigger download
        const blob = new Blob([response.data])
        const downloadUrl = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename || 'download'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up blob URL
        window.URL.revokeObjectURL(downloadUrl)
    }

    // Health check method
    public async healthCheck(): Promise<boolean> {
        try {
            await this.client.get('/health', { timeout: 5000 })
            return true
        } catch {
            return false
        }
    }

    // Cancel all pending requests
    public cancelAllRequests() {
        // Clear the failed queue
        this.failedQueue.forEach(({ reject }) => {
            reject(new Error('Request cancelled'))
        })
        this.failedQueue = []
    }

    // Get client instance for advanced usage
    public getClient(): AxiosInstance {
        return this.client
    }

    // 🔥 Method to test CORS connectivity
    public async testCors(): Promise<boolean> {
        try {
            console.log('🔍 Testing CORS connectivity...')
            const response = await this.client.get('/health', { 
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
            console.log('✅ CORS test successful:', response.status)
            return true
        } catch (error) {
            console.error('❌ CORS test failed:', error)
            if (error instanceof AxiosError) {
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    response: error.response?.data,
                    status: error.response?.status
                })
            }
            return false
        }
    }
}

// Create and export singleton instance
export const apiClient = new ApiClient()

// Export default instance
export default apiClient

// Export typed request methods for convenience
export const api = {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    patch: apiClient.patch.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
    uploadFile: apiClient.uploadFile.bind(apiClient),
    downloadFile: apiClient.downloadFile.bind(apiClient),
    healthCheck: apiClient.healthCheck.bind(apiClient),
    testCors: apiClient.testCors.bind(apiClient),
}

// Utility functions for common API patterns
export const apiUtils = {
    /**
     * Create URL with query parameters
     */
    createUrl: (baseUrl: string, params?: Record<string, any>): string => {
        if (!params) return baseUrl

        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value))
            }
        })

        return `${baseUrl}?${searchParams.toString()}`
    },

    /**
     * Retry failed requests
     */
    retry: async <T>(
        requestFn: () => Promise<T>,
        options: {
            maxAttempts?: number
            delay?: number
            backoff?: number
        } = {}
    ): Promise<T> => {
        const { maxAttempts = 3, delay = 1000, backoff = 2 } = options

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await requestFn()
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error
                }

                // Don't retry auth errors
                if (errorUtils.isAuthError(error)) {
                    throw error
                }

                // Don't retry CORS errors
                if (typeof error === 'object' && error !== null && 'type' in error && (error as any).type === 'CORS_ERROR') {
                    throw error
                }

                // Wait before retry with exponential backoff
                await new Promise(resolve =>
                    setTimeout(resolve, delay * Math.pow(backoff, attempt - 1))
                )
            }
        }

        throw new Error('Max retry attempts exceeded')
    },

    /**
     * Batch requests with concurrency control
     */
    batch: async <T>(
        requests: Array<() => Promise<T>>,
        concurrency = 5
    ): Promise<T[]> => {
        const results: T[] = []

        for (let i = 0; i < requests.length; i += concurrency) {
            const batch = requests.slice(i, i + concurrency)
            const batchResults = await Promise.all(batch.map(req => req()))
            results.push(...batchResults)
        }

        return results
    },

    /**
     * Check if error is retryable
     */
    isRetryableError: (error: any): boolean => {
        if (errorUtils.isAuthError(error)) return false
        if (error.type === 'CORS_ERROR') return false
        if (errorUtils.isNetworkError(error)) return true

        // Check HTTP status codes
        if (error.response?.status) {
            const status = error.response.status
            return status >= 500 || status === 408 || status === 429
        }

        return false
    },

    /**
     * 🔥 CORS debugging helper
     */
    debugCors: async (): Promise<void> => {
        console.log('🔍 CORS Debug Information:')
        console.log('API Base URL:', ENV_CONFIG.apiUrl)
        console.log('Current Origin:', window.location.origin)
        console.log('User Agent:', navigator.userAgent)
        
        // Test basic connectivity
        const corsTest = await api.testCors()
        console.log('CORS Test Result:', corsTest ? '✅ PASS' : '❌ FAIL')
        
        // Test different request types
        const tests = [
            { method: 'GET', url: '/health', description: 'Simple GET request' },
            { method: 'POST', url: '/auth/login', description: 'POST request with JSON' },
            { method: 'OPTIONS', url: '/health', description: 'Preflight OPTIONS request' },
        ]
        
        for (const test of tests) {
            try {
                console.log(`Testing ${test.description}...`)
                if (test.method === 'OPTIONS') {
                    // Test OPTIONS request directly
                    await fetch(`${ENV_CONFIG.apiUrl}${test.url}`, {
                        method: 'OPTIONS',
                        headers: {
                            'Access-Control-Request-Method': 'GET',
                            'Access-Control-Request-Headers': 'authorization,content-type',
                        }
                    })
                } else {
                    await apiClient.getClient().request({
                        method: test.method.toLowerCase(),
                        url: test.url,
                        timeout: 5000,
                    })
                }
                console.log(`✅ ${test.description} - SUCCESS`)
            } catch (error) {
                console.log(`❌ ${test.description} - FAILED:`, error)
            }
        }
    }
}

// Request interceptor for adding custom headers
export const addRequestInterceptor = (
    onFulfilled?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig,
    onRejected?: (error: any) => any
) => {
    return apiClient.getClient().interceptors.request.use(onFulfilled, onRejected)
}

// Response interceptor for custom handling
export const addResponseInterceptor = (
    onFulfilled?: (response: AxiosResponse) => AxiosResponse,
    onRejected?: (error: any) => any
) => {
    return apiClient.getClient().interceptors.response.use(onFulfilled, onRejected)
}