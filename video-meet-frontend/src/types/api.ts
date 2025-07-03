// Base API response structure
export interface ApiResponse<T = any> {
    success: boolean
    message: string
    data: T
    timestamp?: string
    requestId?: string
}

// Paginated response structure
export interface PaginatedResponse<T = any> {
    success: boolean
    message: string
    data: T
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
    timestamp?: string
}

// API error response structure
export interface ApiError {
    success: false
    message: string
    error: {
        code: string
        details?: any
        field?: string // For validation errors
        stack?: string // Only in development
    }
    timestamp?: string
    requestId?: string
}

// Validation error details
export interface ValidationError {
    field: string
    message: string
    value?: any
    code: string
}

// Enhanced API error with validation details
export interface ApiValidationError extends ApiError {
    error: {
        code: 'VALIDATION_ERROR'
        details: ValidationError[]
    }
}

// Network/Connection errors
export interface NetworkError {
    type: 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'FETCH_ERROR' | 'PARSING_ERROR'
    message: string
    status?: number
    originalError?: any
}

// Authentication error types
export interface AuthError extends ApiError {
    error: {
        code: 'AUTH_REQUIRED' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'INSUFFICIENT_PERMISSIONS'
        details?: {
            tokenExpired?: boolean
            requiredRole?: string
            requiredPermission?: string
        }
    }
}

// Rate limiting error
export interface RateLimitError extends ApiError {
    error: {
        code: 'RATE_LIMIT_EXCEEDED'
        details: {
            limit: number
            remaining: number
            resetTime: string
            retryAfter: number
        }
    }
}

// Generic API operation result
export type ApiResult<T = any> =
    | { success: true; data: T }
    | { success: false; error: string }

// HTTP status codes enum
export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
}

// API endpoint categories
export type ApiEndpoint =
    | 'auth'
    | 'meetings'
    | 'participants'
    | 'contacts'
    | 'invitations'
    | 'files'
    | 'analytics'

// Request method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// API request configuration
export interface ApiRequestConfig {
    url: string
    method: HttpMethod
    headers?: Record<string, string>
    params?: Record<string, any>
    body?: any
    timeout?: number
    retries?: number
    cache?: boolean
    authenticate?: boolean
}

// API response metadata
export interface ResponseMetadata {
    status: number
    statusText: string
    headers: Record<string, string>
    duration: number
    cached: boolean
    retries: number
}

// Enhanced API response with metadata
export interface ApiResponseWithMeta<T = any> extends ApiResponse<T> {
    meta: ResponseMetadata
}

// File upload response
export interface FileUploadResponse {
    fileId: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    url: string
    downloadUrl: string
    thumbnailUrl?: string
    metadata?: Record<string, any>
    uploadedAt: string
}

// File upload progress
export interface FileUploadProgress {
    fileId: string
    filename: string
    loaded: number
    total: number
    percentage: number
    speed: number // bytes per second
    estimatedTime: number // seconds remaining
    status: 'uploading' | 'processing' | 'completed' | 'error'
    error?: string
}

// Bulk operation response
export interface BulkOperationResponse<T = any> {
    total: number
    processed: number
    successful: number
    failed: number
    results: Array<{
        id: string
        success: boolean
        data?: T
        error?: string
    }>
    errors: Array<{
        id: string
        error: string
        code?: string
    }>
}

// Search/query parameters
export interface SearchParams {
    query?: string
    filters?: Record<string, any>
    sort?: {
        field: string
        order: 'asc' | 'desc'
    }
    page?: number
    limit?: number
    includeTotal?: boolean
}

// Search response with highlighting
export interface SearchResponse<T = any> {
    results: T[]
    total: number
    page: number
    limit: number
    query: string
    suggestions?: string[]
    highlights?: Record<string, string[]>
    facets?: Record<string, Array<{ value: string; count: number }>>
    timing: {
        query: number
        total: number
    }
}

// WebSocket message types
export interface WebSocketMessage<T = any> {
    type: string
    data: T
    timestamp: string
    id: string
    event?: string
}

// WebSocket error message
export interface WebSocketError {
    type: 'error'
    error: {
        code: string
        message: string
        details?: any
    }
    timestamp: string
}

// Real-time event types for WebSocket
export type WebSocketEventType =
    | 'meeting_joined'
    | 'meeting_left'
    | 'participant_joined'
    | 'participant_left'
    | 'media_state_changed'
    | 'chat_message'
    | 'connection_quality_changed'
    | 'recording_started'
    | 'recording_stopped'
    | 'status_changed'
    | 'invitation_received'

// Health check response
export interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    version: string
    services: {
        database: 'up' | 'down' | 'degraded'
        redis: 'up' | 'down' | 'degraded'
        storage: 'up' | 'down' | 'degraded'
        websocket: 'up' | 'down' | 'degraded'
    }
    metrics: {
        memory: {
            used: number
            total: number
            percentage: number
        }
        cpu: {
            usage: number
        }
        requests: {
            total: number
            rate: number
            errors: number
        }
    }
}

// API rate limit headers
export interface RateLimitHeaders {
    'x-ratelimit-limit': number
    'x-ratelimit-remaining': number
    'x-ratelimit-reset': string
    'x-ratelimit-retry-after'?: number
}

// Cache control options
export interface CacheOptions {
    maxAge?: number // seconds
    staleWhileRevalidate?: number // seconds
    tags?: string[]
    key?: string
    vary?: string[]
}

// API request retry configuration
export interface RetryConfig {
    maxRetries: number
    baseDelay: number // milliseconds
    maxDelay: number // milliseconds
    backoffFactor: number
    retryCondition: (error: any) => boolean
}

// Background sync status
export interface SyncStatus {
    isOnline: boolean
    lastSync: string
    pendingOperations: number
    syncInProgress: boolean
    syncErrors: Array<{
        operation: string
        error: string
        timestamp: string
        retryCount: number
    }>
}

// Export/import data formats
export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf'
export type ImportFormat = 'json' | 'csv' | 'xlsx'

export interface ExportRequest {
    format: ExportFormat
    filters?: Record<string, any>
    fields?: string[]
    includeRelated?: boolean
}

export interface ImportRequest {
    format: ImportFormat
    data: any
    options?: {
        skipDuplicates?: boolean
        updateExisting?: boolean
        validateOnly?: boolean
    }
}

// Analytics data structures
export interface AnalyticsMetric {
    name: string
    value: number
    unit?: string
    change?: {
        value: number
        percentage: number
        period: string
    }
    trend?: 'up' | 'down' | 'stable'
}

export interface AnalyticsTimeSeriesData {
    timestamp: string
    value: number
    label?: string
}

export interface AnalyticsReport {
    title: string
    description?: string
    period: {
        start: string
        end: string
    }
    metrics: AnalyticsMetric[]
    charts: Array<{
        type: 'line' | 'bar' | 'pie' | 'area'
        title: string
        data: AnalyticsTimeSeriesData[]
        config?: Record<string, any>
    }>
    summary: string
    recommendations?: string[]
}

// Geographic data for analytics
export interface GeographicData {
    country: string
    countryCode: string
    region?: string
    city?: string
    coordinates?: {
        latitude: number
        longitude: number
    }
    timezone: string
}

// Device information
export interface DeviceInfo {
    type: 'web' | 'desktop' | 'mobile'
    platform: string
    browser?: string
    browserVersion?: string
    os: string
    osVersion?: string
    screenResolution?: string
    userAgent: string
    capabilities: {
        webrtc: boolean
        camera: boolean
        microphone: boolean
        screenShare: boolean
        notifications: boolean
    }
}

// Network information
export interface NetworkInfo {
    type: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
    effectiveType: '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown'
    downlink: number // Mbps
    rtt: number // milliseconds
    quality: 'poor' | 'fair' | 'good' | 'excellent'
}

// Location data (with privacy controls)
export interface LocationData {
    country?: string
    region?: string
    city?: string
    timezone: string
    // No precise coordinates for privacy
}

// User preferences for API behavior
export interface ApiPreferences {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: '12h' | '24h'
    numberFormat: string
    currency?: string
    notifications: {
        email: boolean
        push: boolean
        sms: boolean
    }
    privacy: {
        shareAnalytics: boolean
        allowTracking: boolean
        shareUsageData: boolean
    }
}

// Type guards for API responses
export const isApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
    return typeof obj === 'object' &&
        typeof obj.success === 'boolean' &&
        typeof obj.message === 'string' &&
        'data' in obj
}

export const isApiError = (obj: any): obj is ApiError => {
    return typeof obj === 'object' &&
        obj.success === false &&
        typeof obj.message === 'string' &&
        typeof obj.error === 'object' &&
        typeof obj.error.code === 'string'
}

export const isValidationError = (obj: any): obj is ApiValidationError => {
    return isApiError(obj) &&
        obj.error.code === 'VALIDATION_ERROR' &&
        Array.isArray(obj.error.details)
}

export const isNetworkError = (obj: any): obj is NetworkError => {
    return typeof obj === 'object' &&
        typeof obj.type === 'string' &&
        typeof obj.message === 'string' &&
        ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'FETCH_ERROR', 'PARSING_ERROR'].includes(obj.type)
}