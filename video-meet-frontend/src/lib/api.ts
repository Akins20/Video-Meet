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
        // Create axios instance with Render-compatible configuration
        this.client = axios.create({
            baseURL: ENV_CONFIG.apiUrl,
            timeout: TIME_CONFIG.timeouts.apiRequest,
            
            // 🔥 Render-compatible headers
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                // Add origin header for CORS
                'Origin': typeof window !== 'undefined' ? window.location.origin : undefined,
            },
            
            // 🔥 CORS configuration for Render
            withCredentials: false, // Disable for Render CORS
            
            // Enable automatic request/response compression
            decompress: true,
            
            // Set max content length (100MB)
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            
            // Don't throw on 4xx errors
            validateStatus: (status) => status < 500,
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // Add auth token if available
                const token = this.getAccessToken()
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                
                // Ensure proper Content-Type
                if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
                    config.headers['Content-Type'] = 'application/json'
                }

                // Always log requests for debugging
                console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                    baseURL: config.baseURL,
                    headers: config.headers,
                    data: config.data,
                })

                return config
            },
            (error) => {
                console.error('Request interceptor error:', error)
                return Promise.reject(this.handleRequestError(error))
            }
        )

        // Response interceptor
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                // Always log responses for debugging
                console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                })

                return this.transformSuccessResponse(response)
            },
            async (error: AxiosError) => {
                // Always log errors for debugging
                console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message,
                    code: error.code,
                })

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

            const response = await this.client.post('/auth/refresh-token', {
                refreshToken,
            })

            if (response.data.success) {
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
            message: ERROR_MESSAGES.network.serverError,
            originalError: error,
        }
    }

    private createNetworkError(error: AxiosError): NetworkError {
        console.error('Network error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
        })

        // Enhanced error detection
        if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
            return {
                type: 'CORS_ERROR',
                message: 'CORS error: Server not allowing requests from this origin.',
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

        if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
            return {
                type: 'NETWORK_ERROR',
                message: 'Network error: Unable to connect to server.',
                originalError: error,
            }
        }

        if (error.message.includes('ERR_FAILED')) {
            return {
                type: 'FETCH_ERROR',
                message: 'Connection failed: Server may be down or blocking requests.',
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
        if (!this.lastErrorToast || Date.now() - this.lastErrorToast > 3000) {
            toast.error(message)
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
        console.log('Token refreshed successfully')
    }

    private dispatchTokenRefreshFailure() {
        console.log('Token refresh failed - logging out user')
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
                // Let browser set Content-Type automatically
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

    public async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health', { timeout: 10000 })
            return response.status === 200
        } catch (error) {
            console.error('Health check failed:', error)
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

    // Enhanced CORS testing
    public async testCors(): Promise<boolean> {
        try {
            console.log('🔍 Testing CORS connectivity to:', ENV_CONFIG.apiUrl)
            
            // Test with fetch first (simpler)
            const healthUrl = `${ENV_CONFIG.apiUrl.replace('/api/v1', '')}/health`
            const fetchResponse = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
            })
            
            if (fetchResponse.ok) {
                console.log('✅ Fetch CORS test successful:', fetchResponse.status)
                
                // Now test with axios
                const axiosResponse = await this.client.get('/health', { timeout: 10000 })
                console.log('✅ Axios CORS test successful:', axiosResponse.status)
                return true
            } else {
                console.log('❌ Fetch CORS test failed:', fetchResponse.status)
                return false
            }
        } catch (error) {
            console.error('❌ CORS test failed:', error)
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

// Debug utilities
export const apiUtils = {
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

    debugCors: async (): Promise<void> => {
        console.group('🔍 CORS Debug Information')
        console.log('API Base URL:', ENV_CONFIG.apiUrl)
        console.log('Current Origin:', window.location.origin)
        console.log('Current URL:', window.location.href)
        console.log('User Agent:', navigator.userAgent)
        
        // Test basic connectivity
        const corsTest = await api.testCors()
        console.log('CORS Test Result:', corsTest ? '✅ PASS' : '❌ FAIL')
        
        // Test OPTIONS request
        try {
            const optionsResponse = await fetch(`${ENV_CONFIG.apiUrl.replace('/api/v1', '')}/health`, {
                method: 'OPTIONS',
                headers: {
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'content-type,authorization',
                },
                mode: 'cors',
            })
            console.log('OPTIONS preflight test:', optionsResponse.status)
        } catch (error) {
            console.log('OPTIONS preflight failed:', error)
        }
        
        console.groupEnd()
    },

    isRetryableError: (error: any): boolean => {
        if (error.response?.status) {
            const status = error.response.status
            return status >= 500 || status === 408 || status === 429
        }
        return false
    }
}