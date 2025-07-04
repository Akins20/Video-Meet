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
        // Create axios instance with minimal, compatible configuration
        this.client = axios.create({
            baseURL: ENV_CONFIG.apiUrl,
            timeout: TIME_CONFIG.timeouts.apiRequest,
            
            // 🔥 MINIMAL headers to avoid CORS issues
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            
            // 🔥 DISABLE credentials - this is often the culprit
            withCredentials: false,
            
            // Enable compression
            decompress: true,
            
            // Set reasonable limits
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            
            // Don't throw on 4xx errors
            validateStatus: (status) => status < 500,
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        // Request interceptor - Keep it simple
        this.client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // Add auth token if available
                const token = this.getAccessToken()
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                
                // Only set Content-Type for non-FormData
                if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
                    config.headers['Content-Type'] = 'application/json'
                }

                // Enhanced logging
                console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
                    method: config.method,
                    url: config.url,
                    baseURL: config.baseURL,
                    fullURL: `${config.baseURL}${config.url}`,
                    headers: config.headers,
                    data: config.data,
                })

                return config
            },
            (error) => {
                console.error('❌ Request interceptor error:', error)
                return Promise.reject(this.handleRequestError(error))
            }
        )

        // Response interceptor - Enhanced error handling
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                })

                return this.transformSuccessResponse(response)
            },
            async (error: AxiosError) => {
                console.error(`❌ API Error Details:`, {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    config: {
                        method: error.config?.method,
                        url: error.config?.url,
                        baseURL: error.config?.baseURL,
                        headers: error.config?.headers,
                    }
                })

                return this.handleResponseError(error)
            }
        )
    }

    private async handleResponseError(error: AxiosError): Promise<never> {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Network errors (no response received)
        if (!error.response) {
            const networkError = this.createNetworkError(error)
            this.showErrorToast(networkError.message)
            throw networkError
        }

        // Handle 401 - Token expired
        if (error.response.status === 401 && !originalRequest._retry) {
            if (this.isRefreshing) {
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

        // Don't show toast for validation errors
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

            // 🔥 Use correct endpoint for token refresh
            const response = await this.client.post('/auth/refresh-token', {
                refreshToken,
            })

            if (response.data?.success) {
                const { accessToken, expiresIn } = response.data.data
                this.storeTokens(accessToken, refreshToken, expiresIn)
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
            message: 'Request setup failed',
            originalError: error,
        }
    }

    private createNetworkError(error: AxiosError): NetworkError {
        console.error('🔍 Network error analysis:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            request: error.request,
            response: error.response,
        })

        // Check for specific error types
        if (error.code === 'ERR_NETWORK') {
            return {
                type: 'NETWORK_ERROR',
                message: 'Network connection failed. Please check your internet connection and try again.',
                originalError: error,
            }
        }

        if (error.code === 'ECONNABORTED') {
            return {
                type: 'TIMEOUT_ERROR',
                message: 'Request timed out. Please try again.',
                originalError: error,
            }
        }

        if (error.message.includes('ERR_FAILED')) {
            return {
                type: 'FETCH_ERROR',
                message: 'Connection failed. The server may be temporarily unavailable.',
                originalError: error,
            }
        }

        if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
            return {
                type: 'CORS_ERROR',
                message: 'CORS policy blocked the request. Please check server configuration.',
                originalError: error,
            }
        }

        // Generic network error
        return {
            type: 'NETWORK_ERROR',
            message: 'Unable to connect to the server. Please check your connection and try again.',
            originalError: error,
        }
    }

    private transformSuccessResponse(response: AxiosResponse): AxiosResponse {
        // Add minimal metadata
        if (response.data && typeof response.data === 'object') {
            response.data._meta = {
                status: response.status,
                timestamp: new Date().toISOString(),
            }
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
        }
    }

    private getDefaultErrorMessage(status: number): string {
        switch (status) {
            case 400:
                return 'Bad request. Please check your input.'
            case 401:
                return 'Authentication required. Please log in again.'
            case 403:
                return 'Access forbidden. You don\'t have permission.'
            case 404:
                return 'Resource not found.'
            case 409:
                return 'Conflict occurred. Please try again.'
            case 422:
                return 'Validation error. Please check your input.'
            case 429:
                return 'Too many requests. Please slow down.'
            case 500:
                return 'Server error. Please try again later.'
            case 503:
                return 'Service unavailable. Please try again later.'
            default:
                return 'An unexpected error occurred.'
        }
    }

    private showErrorToast(message: string) {
        // Debounce error toasts
        if (!this.lastErrorToast || Date.now() - this.lastErrorToast > 3000) {
            toast.error(message, {
                duration: 4000,
                position: 'top-right',
            })
            this.lastErrorToast = Date.now()
        }
    }

    private lastErrorToast = 0

    private getAccessToken(): string | null {
        return localStorage.getItem('accessToken')
    }

    private getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken')
    }

    private storeTokens(accessToken: string, refreshToken: string, expiresIn: number) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('tokenExpiresAt', (Date.now() + expiresIn * 1000).toString())
    }

    private dispatchTokenRefreshSuccess(accessToken: string, expiresIn: number) {
        console.log('✅ Token refreshed successfully')
    }

    private dispatchTokenRefreshFailure() {
        console.log('❌ Token refresh failed - logging out user')
    }

    private handleAuthFailure() {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('tokenExpiresAt')

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

    public async uploadFile<T = any>(
        url: string,
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<ApiResponse<T>> {
        const formData = new FormData()
        formData.append('file', file)

        const config: AxiosRequestConfig = {
            headers: {
                // Let browser set Content-Type for FormData
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

    public async downloadFile(url: string, filename?: string): Promise<void> {
        const response = await this.client.get(url, {
            responseType: 'blob',
        })

        const blob = new Blob([response.data])
        const downloadUrl = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename || 'download'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        window.URL.revokeObjectURL(downloadUrl)
    }

    // 🔥 Fixed health check - use correct endpoint
    public async healthCheck(): Promise<boolean> {
        try {
            // Use the health endpoint correctly
            const healthUrl = ENV_CONFIG.apiUrl.replace('/api/v1', '/health')
            const response = await axios.get(healthUrl, { 
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                }
            })
            console.log('✅ Health check successful:', response.status)
            return response.status === 200
        } catch (error) {
            console.error('❌ Health check failed:', error)
            return false
        }
    }

    public cancelAllRequests() {
        this.failedQueue.forEach(({ reject }) => {
            reject(new Error('Request cancelled'))
        })
        this.failedQueue = []
    }

    public getClient(): AxiosInstance {
        return this.client
    }

    // 🔥 Enhanced connectivity testing
    public async testConnectivity(): Promise<boolean> {
        try {
            console.log('🔍 Testing connectivity to:', ENV_CONFIG.apiUrl)
            
            // Test 1: Simple fetch to health endpoint
            const healthUrl = ENV_CONFIG.apiUrl.replace('/api/v1', '/health')
            console.log('Health URL:', healthUrl)
            
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors',
            })
            
            console.log('Connectivity test result:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
            })
            
            return response.ok
        } catch (error) {
            console.error('❌ Connectivity test failed:', error)
            return false
        }
    }

    // 🔥 Test specific API endpoint
    public async testLoginEndpoint(): Promise<boolean> {
        try {
            console.log('🔍 Testing login endpoint...')
            
            // Make a test request to login endpoint (should return 400 or 422 for empty data)
            const response = await this.client.post('/auth/login', {
                test: 'connectivity'
            })
            
            console.log('Login endpoint test:', response.status)
            return true
        } catch (error) {
            console.error('❌ Login endpoint test failed:', error)
            // Even if it fails with 400/422, it means the endpoint is reachable
            if (error instanceof AxiosError && error.response) {
                console.log('Login endpoint is reachable (status:', error.response.status, ')')
                return true
            }
            return false
        }
    }
}

// Create and export singleton instance
export const apiClient = new ApiClient()

// Export default instance
export default apiClient

// Export typed request methods
export const api = {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    patch: apiClient.patch.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
    uploadFile: apiClient.uploadFile.bind(apiClient),
    downloadFile: apiClient.downloadFile.bind(apiClient),
    healthCheck: apiClient.healthCheck.bind(apiClient),
    testConnectivity: apiClient.testConnectivity.bind(apiClient),
    testLoginEndpoint: apiClient.testLoginEndpoint.bind(apiClient),
}

// Debugging utilities
export const apiUtils = {
    debugRequest: async (url: string, options: any = {}) => {
        console.group('🔍 API Debug Request')
        console.log('URL:', url)
        console.log('Options:', options)
        console.log('Full URL:', `${ENV_CONFIG.apiUrl}${url}`)
        
        try {
            const response = await apiClient.post(url, options)
            console.log('✅ Success:', response)
            console.groupEnd()
            return response
        } catch (error) {
            console.error('❌ Error:', error)
            console.groupEnd()
            throw error
        }
    },

    testAllEndpoints: async () => {
        console.group('🔍 Testing All Endpoints')
        
        const tests = [
            { name: 'Health Check', fn: api.healthCheck },
            { name: 'Connectivity Test', fn: api.testConnectivity },
            { name: 'Login Endpoint', fn: api.testLoginEndpoint },
        ]
        
        for (const test of tests) {
            try {
                console.log(`Testing ${test.name}...`)
                const result = await test.fn()
                console.log(`✅ ${test.name}:`, result)
            } catch (error) {
                console.error(`❌ ${test.name}:`, error)
            }
        }
        
        console.groupEnd()
    }
}