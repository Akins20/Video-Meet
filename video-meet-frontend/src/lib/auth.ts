/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { jwtDecode } from 'jwt-decode'
import { STORAGE_KEYS, TIME_CONFIG } from '@/utils/constants'
import type { User } from '@/types/auth'

// JWT token payload interface
interface JWTPayload {
    userId: string
    email: string
    username: string
    iat: number // issued at
    exp: number // expires at
    [key: string]: any
}

// Token storage interface
interface TokenStorage {
    accessToken: string
    refreshToken: string
    expiresAt: number
    rememberMe: boolean
}

// Auth utilities class
export class AuthUtils {
    private static readonly ACCESS_TOKEN_KEY = STORAGE_KEYS.accessToken
    private static readonly REFRESH_TOKEN_KEY = STORAGE_KEYS.refreshToken
    private static readonly USER_KEY = STORAGE_KEYS.user

    /**
     * Store authentication tokens securely
     */
    public static storeTokens(
        accessToken: string,
        refreshToken: string,
        expiresIn: number,
        rememberMe: boolean = false
    ): void {
        const expiresAt = Date.now() + (expiresIn * 1000)

        const tokenData: TokenStorage = {
            accessToken,
            refreshToken,
            expiresAt,
            rememberMe,
        }

        try {
            if (typeof window !== 'undefined') {
                const storage = rememberMe ? localStorage : sessionStorage

                // Store tokens separately for easier access
                storage.setItem(this.ACCESS_TOKEN_KEY, accessToken)
                storage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)

                // Store complete token data
                storage.setItem('videomeet_token_data', JSON.stringify(tokenData))

                console.log('🔑 Tokens stored successfully')
            }
        } catch (error) {
            console.error('Failed to store tokens:', error)
        }
    }

    /**
     * Retrieve stored access token
     */
    public static getAccessToken(): string | null {
        try {
            if (typeof window === 'undefined') return null

            // Try localStorage first, then sessionStorage
            return localStorage.getItem(this.ACCESS_TOKEN_KEY) ||
                sessionStorage.getItem(this.ACCESS_TOKEN_KEY)
        } catch (error) {
            console.error('Failed to get access token:', error)
            return null
        }
    }

    /**
     * Retrieve stored refresh token
     */
    public static getRefreshToken(): string | null {
        try {
            if (typeof window === 'undefined') return null

            // Try localStorage first, then sessionStorage
            return localStorage.getItem(this.REFRESH_TOKEN_KEY) ||
                sessionStorage.getItem(this.REFRESH_TOKEN_KEY)
        } catch (error) {
            console.error('Failed to get refresh token:', error)
            return null
        }
    }

    /**
     * Retrieve complete token data
     */
    public static getTokenData(): TokenStorage | null {
        try {
            if (typeof window === 'undefined') return null

            const tokenDataStr = localStorage.getItem('videomeet_token_data') ||
                sessionStorage.getItem('videomeet_token_data')

            if (!tokenDataStr) return null

            return JSON.parse(tokenDataStr) as TokenStorage
        } catch (error) {
            console.error('Failed to get token data:', error)
            return null
        }
    }

    /**
     * Store user data
     */
    public static storeUser(user: User): void {
        try {
            if (typeof window !== 'undefined') {
                const tokenData = this.getTokenData()
                const storage = tokenData?.rememberMe ? localStorage : sessionStorage

                storage.setItem(this.USER_KEY, JSON.stringify(user))
                console.log('👤 User data stored successfully')
            }
        } catch (error) {
            console.error('Failed to store user:', error)
        }
    }

    /**
     * Retrieve stored user data
     */
    public static getStoredUser(): User | null {
        try {
            if (typeof window === 'undefined') return null

            const userStr = localStorage.getItem(this.USER_KEY) ||
                sessionStorage.getItem(this.USER_KEY)

            if (!userStr) return null

            return JSON.parse(userStr) as User
        } catch (error) {
            console.error('Failed to get stored user:', error)
            return null
        }
    }

    /**
     * Clear all stored authentication data
     */
    public static clearAuthData(): void {
        try {
            if (typeof window !== 'undefined') {
                // Clear from both localStorage and sessionStorage
                const keysToRemove = [
                    this.ACCESS_TOKEN_KEY,
                    this.REFRESH_TOKEN_KEY,
                    this.USER_KEY,
                    'videomeet_token_data',
                ]

                keysToRemove.forEach(key => {
                    localStorage.removeItem(key)
                    sessionStorage.removeItem(key)
                })

                console.log('🧹 Auth data cleared successfully')
            }
        } catch (error) {
            console.error('Failed to clear auth data:', error)
        }
    }

    /**
     * Decode JWT token without verification
     */
    public static decodeToken(token: string): JWTPayload | null {
        try {
            return jwtDecode<JWTPayload>(token)
        } catch (error) {
            console.error('Failed to decode token:', error)
            return null
        }
    }

    /**
     * Check if token is expired
     */
    public static isTokenExpired(token: string): boolean {
        try {
            const decoded = this.decodeToken(token)
            if (!decoded || !decoded.exp) return true

            // Add 30 second buffer to account for clock skew
            const expirationTime = decoded.exp * 1000
            const currentTime = Date.now() + 30000

            return currentTime >= expirationTime
        } catch (error) {
            console.error('Failed to check token expiration:', error)
            return true
        }
    }

    /**
     * Check if token is expiring soon (within 2 minutes)
     */
    public static isTokenExpiringSoon(token: string): boolean {
        try {
            const decoded = this.decodeToken(token)
            if (!decoded || !decoded.exp) return true

            const expirationTime = decoded.exp * 1000
            const currentTime = Date.now()
            const twoMinutes = 2 * 60 * 1000

            return (expirationTime - currentTime) <= twoMinutes
        } catch (error) {
            console.error('Failed to check token expiration:', error)
            return true
        }
    }

    /**
     * Get time until token expires (in milliseconds)
     */
    public static getTimeUntilExpiry(token: string): number {
        try {
            const decoded = this.decodeToken(token)
            if (!decoded || !decoded.exp) return 0

            const expirationTime = decoded.exp * 1000
            const currentTime = Date.now()

            return Math.max(0, expirationTime - currentTime)
        } catch (error) {
            console.error('Failed to get time until expiry:', error)
            return 0
        }
    }

    /**
     * Validate token format and structure
     */
    public static isValidTokenFormat(token: string): boolean {
        if (!token || typeof token !== 'string') return false

        // JWT tokens have 3 parts separated by dots
        const parts = token.split('.')
        if (parts.length !== 3) return false

        // Each part should be base64 encoded
        try {
            parts.forEach(part => {
                // Add padding if needed
                const padded = part + '==='.slice(0, (4 - part.length % 4) % 4)
                atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
            })
            return true
        } catch {
            return false
        }
    }

    /**
     * Extract user ID from token
     */
    public static getUserIdFromToken(token: string): string | null {
        try {
            const decoded = this.decodeToken(token)
            return decoded?.userId || decoded?.sub || null
        } catch (error) {
            console.error('Failed to get user ID from token:', error)
            return null
        }
    }

    /**
     * Check if user has permission
     */
    public static hasPermission(user: User | null, permission: string): boolean {
        if (!user) return false

        // Basic permission check based on user role
        switch (permission) {
            case 'create_meeting':
                return user.isEmailVerified
            case 'join_meeting':
                return true
            case 'moderate_meeting':
                return user.role === 'moderator' || user.role === 'admin'
            case 'admin_access':
                return user.role === 'admin' || user.role === 'super_admin'
            case 'manage_users':
                return user.role === 'admin' || user.role === 'super_admin'
            default:
                return false
        }
    }

    /**
     * Check if user has specific role
     */
    public static hasRole(user: User | null, role: string): boolean {
        if (!user) return false
        return user.role === role
    }

    /**
     * Check if user account is active and verified
     */
    public static isAccountActive(user: User | null): boolean {
        if (!user) return false
        return user.status === 'active' && user.isEmailVerified
    }

    /**
     * Get user's display name
     */
    public static getDisplayName(user: User | null): string {
        if (!user) return 'Unknown User'

        if (user.displayName) return user.displayName
        if (user.fullName) return user.fullName
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
        if (user.firstName) return user.firstName
        if (user.username) return user.username

        return 'Unknown User'
    }

    /**
     * Get user's initials
     */
    public static getUserInitials(user: User | null): string {
        if (!user) return '??'

        const displayName = this.getDisplayName(user)
        const words = displayName.split(' ')

        if (words.length >= 2) {
            return `${words[0][0]}${words[1][0]}`.toUpperCase()
        } else if (words.length === 1 && words[0].length >= 2) {
            return words[0].slice(0, 2).toUpperCase()
        } else {
            return displayName.slice(0, 2).toUpperCase()
        }
    }

    /**
     * Generate avatar URL for user
     */
    public static getAvatarUrl(user: User | null): string {
        if (!user) {
            return 'https://ui-avatars.com/api/?name=??&background=6B7280&color=fff&size=128&rounded=true'
        }

        if (user.avatar) return user.avatar

        const initials = this.getUserInitials(user)
        const displayName = this.getDisplayName(user)

        // Generate a consistent color based on user ID or name
        const colors = [
            'EF4444', 'F97316', 'EAB308', 'CA8A04', '65A30D',
            '16A34A', '059669', '0891B2', '0284C7', '2563EB',
            '4F46E5', '7C3AED', '9333EA', 'C026D3', 'DB2777'
        ]

        const colorIndex = (user.id?.charCodeAt(0) || displayName.charCodeAt(0)) % colors.length
        const backgroundColor = colors[colorIndex]

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=fff&size=128&rounded=true`
    }

    /**
     * Check if authentication data exists
     */
    public static hasAuthData(): boolean {
        const accessToken = this.getAccessToken()
        const refreshToken = this.getRefreshToken()
        const user = this.getStoredUser()

        return !!(accessToken && refreshToken && user)
    }

    /**
     * Check if stored session is valid
     */
    public static isValidSession(): boolean {
        const tokenData = this.getTokenData()
        const user = this.getStoredUser()

        if (!tokenData || !user) return false

        // Check if tokens exist
        if (!tokenData.accessToken || !tokenData.refreshToken) return false

        // Check token format
        if (!this.isValidTokenFormat(tokenData.accessToken) ||
            !this.isValidTokenFormat(tokenData.refreshToken)) {
            return false
        }

        // Check if refresh token is expired
        if (this.isTokenExpired(tokenData.refreshToken)) return false

        // Check if user account is active
        if (!this.isAccountActive(user)) return false

        return true
    }

    /**
     * Auto-logout if session is invalid
     */
    public static validateAndCleanupSession(): boolean {
        if (!this.isValidSession()) {
            this.clearAuthData()
            return false
        }
        return true
    }

    /**
     * Create device fingerprint for security
     */
    public static createDeviceFingerprint(): string {
        if (typeof window === 'undefined') return 'server'

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.textBaseline = 'top'
            ctx.font = '14px Arial'
            ctx.fillText('Device fingerprint', 2, 2)
        }

        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            canvas: canvas.toDataURL(),
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
        }

        // Simple hash function
        const str = JSON.stringify(fingerprint)
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32-bit integer
        }

        return Math.abs(hash).toString(16)
    }

    /**
     * Get device information for security logging
     */
    public static getDeviceInfo(): {
        type: 'web' | 'mobile' | 'desktop'
        platform: string
        browser: string
        userAgent: string
        fingerprint: string
    } {
        if (typeof window === 'undefined') {
            return {
                type: 'web',
                platform: 'server',
                browser: 'server',
                userAgent: 'server',
                fingerprint: 'server',
            }
        }

        const userAgent = navigator.userAgent
        let deviceType: 'web' | 'mobile' | 'desktop' = 'web'
        let browser = 'Unknown'
        const platform = navigator.platform

        // Detect device type
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            deviceType = 'mobile'
        } else if ((window as any).electron) {
            deviceType = 'desktop'
        }

        // Detect browser
        if (userAgent.includes('Chrome')) browser = 'Chrome'
        else if (userAgent.includes('Firefox')) browser = 'Firefox'
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari'
        else if (userAgent.includes('Edge')) browser = 'Edge'
        else if (userAgent.includes('Opera')) browser = 'Opera'

        return {
            type: deviceType,
            platform,
            browser,
            userAgent,
            fingerprint: this.createDeviceFingerprint(),
        }
    }

    /**
     * Security check for suspicious activity
     */
    public static checkSuspiciousActivity(): {
        isSuspicious: boolean
        reasons: string[]
    } {
        const reasons: string[] = []

        try {
            // Check for multiple rapid login attempts
            const loginAttempts = localStorage.getItem('videomeet_login_attempts')
            if (loginAttempts) {
                const attempts = JSON.parse(loginAttempts)
                const recentAttempts = attempts.filter((timestamp: number) =>
                    Date.now() - timestamp < 15 * 60 * 1000 // 15 minutes
                )

                if (recentAttempts.length > 5) {
                    reasons.push('Multiple rapid login attempts detected')
                }
            }

            // Check for unusual device fingerprint changes
            const lastFingerprint = localStorage.getItem('videomeet_device_fingerprint')
            const currentFingerprint = this.createDeviceFingerprint()

            if (lastFingerprint && lastFingerprint !== currentFingerprint) {
                reasons.push('Device fingerprint changed')
            }

            // Store current fingerprint
            localStorage.setItem('videomeet_device_fingerprint', currentFingerprint)

        } catch (error) {
            console.warn('Failed to check suspicious activity:', error)
        }

        return {
            isSuspicious: reasons.length > 0,
            reasons,
        }
    }

    /**
     * Log security event
     */
    public static logSecurityEvent(event: string, details?: any): void {
        try {
            const securityLog = {
                event,
                details,
                timestamp: new Date().toISOString(),
                deviceInfo: this.getDeviceInfo(),
                userAgent: navigator.userAgent,
            }

            console.log('🔒 Security Event:', securityLog)

            // In production, you might want to send this to a security monitoring service
            if (process.env.NODE_ENV === 'production') {
                // Example: SecurityService.logEvent(securityLog)
            }
        } catch (error) {
            console.error('Failed to log security event:', error)
        }
    }

    /**
     * Rate limit login attempts
     */
    public static recordLoginAttempt(): void {
        try {
            const attempts = JSON.parse(localStorage.getItem('videomeet_login_attempts') || '[]')
            attempts.push(Date.now())

            // Keep only attempts from the last hour
            const oneHourAgo = Date.now() - 60 * 60 * 1000
            const recentAttempts = attempts.filter((timestamp: number) => timestamp > oneHourAgo)

            localStorage.setItem('videomeet_login_attempts', JSON.stringify(recentAttempts))
        } catch (error) {
            console.error('Failed to record login attempt:', error)
        }
    }

    /**
     * Check if login attempts are rate limited
     */
    public static isLoginRateLimited(): boolean {
        try {
            const attempts = JSON.parse(localStorage.getItem('videomeet_login_attempts') || '[]')
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
            const recentAttempts = attempts.filter((timestamp: number) => timestamp > fifteenMinutesAgo)

            return recentAttempts.length >= 5
        } catch (error) {
            console.error('Failed to check login rate limit:', error)
            return false
        }
    }

    /**
     * Clear login attempts (on successful login)
     */
    public static clearLoginAttempts(): void {
        try {
            localStorage.removeItem('videomeet_login_attempts')
        } catch (error) {
            console.error('Failed to clear login attempts:', error)
        }
    }
}

// Export default instance
export default AuthUtils

// Additional utility functions
export const authHelpers = {
    /**
     * Check if user is authenticated
     */
    isAuthenticated: (): boolean => {
        return AuthUtils.hasAuthData() && AuthUtils.isValidSession()
    },

    /**
     * Get current user
     */
    getCurrentUser: (): User | null => {
        return AuthUtils.getStoredUser()
    },

    /**
     * Check user permission
     */
    can: (permission: string): boolean => {
        const user = AuthUtils.getStoredUser()
        return AuthUtils.hasPermission(user, permission)
    },

    /**
     * Check user role
     */
    is: (role: string): boolean => {
        const user = AuthUtils.getStoredUser()
        return AuthUtils.hasRole(user, role)
    },

    /**
     * Get auth header for API requests
     */
    getAuthHeader: (): Record<string, string> => {
        const token = AuthUtils.getAccessToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    },

    /**
     * Format user name for display
     */
    formatUserName: (user: User | null): string => {
        return AuthUtils.getDisplayName(user)
    },

    /**
     * Check if account needs verification
     */
    needsVerification: (): boolean => {
        const user = AuthUtils.getStoredUser()
        return !!(user && !user.isEmailVerified)
    },

    /**
     * Check if session is expiring soon
     */
    isSessionExpiringSoon: (): boolean => {
        const token = AuthUtils.getAccessToken()
        return token ? AuthUtils.isTokenExpiringSoon(token) : true
    },

    /**
     * Get time until session expires
     */
    getSessionTimeRemaining: (): number => {
        const token = AuthUtils.getAccessToken()
        return token ? AuthUtils.getTimeUntilExpiry(token) : 0
    },
}