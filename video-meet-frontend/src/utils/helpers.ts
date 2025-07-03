import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { REGEX_PATTERNS, TIME_CONFIG, MEETING_LIMITS } from './constants'
import type { User, MeetingParticipant, ConnectionQuality } from '../types'

// Tailwind CSS class merging utility
export const cn = (...inputs: ClassValue[]) => {
    return twMerge(clsx(inputs))
}

// String utilities
export const stringUtils = {
    /**
     * Capitalize first letter of a string
     */
    capitalize: (str: string): string => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    },

    /**
     * Convert string to title case
     */
    titleCase: (str: string): string => {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    },

    /**
     * Convert string to slug format
     */
    slugify: (str: string): string => {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    },

    /**
     * Truncate string with ellipsis
     */
    truncate: (str: string, length: number, suffix = '...'): string => {
        if (str.length <= length) return str
        return str.slice(0, length - suffix.length) + suffix
    },

    /**
     * Generate random string
     */
    randomString: (length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string => {
        let result = ''
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length))
        }
        return result
    },

    /**
     * Extract initials from name
     */
    getInitials: (name: string): string => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    },

    /**
     * Mask sensitive information
     */
    maskString: (str: string, visibleChars = 4, maskChar = '*'): string => {
        if (str.length <= visibleChars) return str
        const visible = str.slice(-visibleChars)
        const masked = maskChar.repeat(str.length - visibleChars)
        return masked + visible
    },

    /**
     * Check if string contains only whitespace
     */
    isWhitespace: (str: string): boolean => {
        return /^\s*$/.test(str)
    },

    /**
     * Remove HTML tags from string
     */
    stripHtml: (str: string): string => {
        return str.replace(/<[^>]*>/g, '')
    },
}

// Date and time utilities
export const dateUtils = {
    /**
     * Format date relative to now (e.g., "2 hours ago")
     */
    formatRelativeTime: (date: string | Date): string => {
        const now = new Date()
        const targetDate = new Date(date)
        const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

        if (diffInSeconds < 60) return 'just now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
        return `${Math.floor(diffInSeconds / 31536000)} years ago`
    },

    /**
     * Format duration in seconds to human readable format
     */
    formatDuration: (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`

        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const remainingSeconds = seconds % 60

        if (hours < 24) {
            return `${hours}h ${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`
        }

        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24
        return `${days}d ${remainingHours}h ${minutes}m`
    },

    /**
     * Format time for display (e.g., "2:30 PM")
     */
    formatTime: (date: string | Date, format24h = false): string => {
        const targetDate = new Date(date)
        return targetDate.toLocaleTimeString('en-US', {
            hour12: !format24h,
            hour: 'numeric',
            minute: '2-digit',
        })
    },

    /**
     * Format date for display
     */
    formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
        const targetDate = new Date(date)
        return targetDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options,
        })
    },

    /**
     * Check if date is today
     */
    isToday: (date: string | Date): boolean => {
        const today = new Date()
        const targetDate = new Date(date)
        return today.toDateString() === targetDate.toDateString()
    },

    /**
     * Check if date is this week
     */
    isThisWeek: (date: string | Date): boolean => {
        const now = new Date()
        const targetDate = new Date(date)
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        startOfWeek.setHours(0, 0, 0, 0)

        return targetDate >= startOfWeek
    },

    /**
     * Add time to date
     */
    addTime: (date: Date, amount: number, unit: 'minutes' | 'hours' | 'days'): Date => {
        const result = new Date(date)
        switch (unit) {
            case 'minutes':
                result.setMinutes(result.getMinutes() + amount)
                break
            case 'hours':
                result.setHours(result.getHours() + amount)
                break
            case 'days':
                result.setDate(result.getDate() + amount)
                break
        }
        return result
    },
}

// Number and formatting utilities
export const formatUtils = {
    /**
     * Format file size in human readable format
     */
    formatFileSize: (bytes: number): string => {
        if (bytes === 0) return '0 B'

        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    },

    /**
     * Format number with commas
     */
    formatNumber: (num: number): string => {
        return num.toLocaleString('en-US')
    },

    /**
     * Format percentage
     */
    formatPercentage: (value: number, decimals = 1): string => {
        return `${value.toFixed(decimals)}%`
    },

    /**
     * Format bandwidth
     */
    formatBandwidth: (kbps: number): string => {
        if (kbps < 1000) return `${kbps} kbps`
        return `${(kbps / 1000).toFixed(1)} Mbps`
    },

    /**
     * Format latency
     */
    formatLatency: (ms: number): string => {
        return `${ms}ms`
    },

    /**
     * Format currency
     */
    formatCurrency: (amount: number, currency = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount)
    },

    /**
     * Format phone number
     */
    formatPhoneNumber: (phone: string): string => {
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
        }
        if (cleaned.length === 11 && cleaned[0] === '1') {
            return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
        }
        return phone
    },
}

// Array and object utilities
export const arrayUtils = {
    /**
     * Remove duplicates from array
     */
    unique: <T>(array: T[]): T[] => {
        return [...new Set(array)]
    },

    /**
     * Group array by key
     */
    groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
        return array.reduce((groups, item) => {
            const groupKey = String(item[key])
            if (!groups[groupKey]) {
                groups[groupKey] = []
            }
            groups[groupKey].push(item)
            return groups
        }, {} as Record<string, T[]>)
    },

    /**
     * Shuffle array
     */
    shuffle: <T>(array: T[]): T[] => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    },

    /**
     * Chunk array into smaller arrays
     */
    chunk: <T>(array: T[], size: number): T[][] => {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size))
        }
        return chunks
    },

    /**
     * Get random item from array
     */
    randomItem: <T>(array: T[]): T | undefined => {
        return array[Math.floor(Math.random() * array.length)]
    },

    /**
     * Sort array by multiple criteria
     */
    multiSort: <T>(array: T[], ...sortFns: Array<(a: T, b: T) => number>): T[] => {
        return [...array].sort((a, b) => {
            for (const sortFn of sortFns) {
                const result = sortFn(a, b)
                if (result !== 0) return result
            }
            return 0
        })
    },
}

// Validation utilities
export const validationUtils = {
    /**
     * Check if email is valid
     */
    isValidEmail: (email: string): boolean => {
        return REGEX_PATTERNS.email.test(email)
    },

    /**
     * Check if URL is valid
     */
    isValidUrl: (url: string): boolean => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    },

    /**
     * Check if room ID is valid
     */
    isValidRoomId: (roomId: string): boolean => {
        return REGEX_PATTERNS.roomId.test(roomId)
    },

    /**
     * Generate room ID
     */
    generateRoomId: (): string => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const numbers = '0123456789'

        const randomLetter = () => letters[Math.floor(Math.random() * letters.length)]
        const randomNumber = () => numbers[Math.floor(Math.random() * numbers.length)]

        return `${randomLetter()}${randomLetter()}${randomLetter()}-${randomNumber()}${randomNumber()}${randomNumber()}-${randomLetter()}${randomLetter()}${randomLetter()}`
    },

    /**
     * Check password strength
     */
    checkPasswordStrength: (password: string): {
        score: number
        strength: 'weak' | 'medium' | 'strong'
        feedback: string[]
    } => {
        const feedback: string[] = []
        let score = 0

        if (password.length >= 8) score++
        else feedback.push('Password should be at least 8 characters long')

        if (/[a-z]/.test(password)) score++
        else feedback.push('Password should contain lowercase letters')

        if (/[A-Z]/.test(password)) score++
        else feedback.push('Password should contain uppercase letters')

        if (/\d/.test(password)) score++
        else feedback.push('Password should contain numbers')

        if (/[^a-zA-Z\d]/.test(password)) score++
        else feedback.push('Password should contain special characters')

        const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'

        return { score, strength, feedback }
    },
}

// User and meeting utilities
export const userUtils = {
    /**
     * Get user display name
     */
    getDisplayName: (user: Partial<User>): string => {
        if (user.displayName) return user.displayName
        if (user.fullName) return user.fullName
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
        if (user.firstName) return user.firstName
        if (user.username) return user.username
        return 'Unknown User'
    },

    /**
     * Get user initials
     */
    getUserInitials: (user: Partial<User>): string => {
        const displayName = userUtils.getDisplayName(user)
        return stringUtils.getInitials(displayName)
    },

    /**
     * Check if user is online
     */
    isUserOnline: (user: Partial<User>): boolean => {
        if (!user.lastSeenAt) return false
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        return new Date(user.lastSeenAt) > fiveMinutesAgo
    },

    /**
     * Get user avatar URL or fallback
     */
    getAvatarUrl: (user: Partial<User>): string => {
        if (user.avatar) return user.avatar

        // Generate avatar based on initials
        const initials = userUtils.getUserInitials(user)
        const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899']
        const colorIndex = initials.charCodeAt(0) % colors.length
        const color = colors[colorIndex]

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.slice(1)}&color=fff&size=128&rounded=true`
    },

    /**
     * Check if user can access feature
     */
    canAccessFeature: (user: Partial<User>, feature: string): boolean => {
        if (!user.accountType) return false
        const userFeatures = MEETING_LIMITS.features[user.accountType as keyof typeof MEETING_LIMITS.features] || []
        return userFeatures.includes(feature) || userFeatures.includes('all_' + feature.split('_')[0])
    },
}

// Meeting utilities
export const meetingUtils = {
    /**
     * Get meeting status color
     */
    getStatusColor: (status: string): string => {
        switch (status) {
            case 'waiting': return 'text-yellow-600'
            case 'active': return 'text-green-600'
            case 'ended': return 'text-gray-600'
            case 'cancelled': return 'text-red-600'
            default: return 'text-gray-600'
        }
    },

    /**
     * Get connection quality indicator
     */
    getQualityIndicator: (quality: ConnectionQuality): {
        color: string
        icon: string
        label: string
    } => {
        switch (quality) {
            case 'excellent':
                return { color: 'text-green-600', icon: '●●●●', label: 'Excellent' }
            case 'good':
                return { color: 'text-green-500', icon: '●●●○', label: 'Good' }
            case 'fair':
                return { color: 'text-yellow-500', icon: '●●○○', label: 'Fair' }
            case 'poor':
                return { color: 'text-red-500', icon: '●○○○', label: 'Poor' }
            default:
                return { color: 'text-gray-500', icon: '○○○○', label: 'Unknown' }
        }
    },

    /**
     * Calculate meeting duration
     */
    getMeetingDuration: (startedAt?: string, endedAt?: string): number => {
        if (!startedAt) return 0
        const start = new Date(startedAt)
        const end = endedAt ? new Date(endedAt) : new Date()
        return Math.floor((end.getTime() - start.getTime()) / 1000)
    },

    /**
     * Check if meeting is active
     */
    isMeetingActive: (meeting: { status: string; startedAt?: string; endedAt?: string }): boolean => {
        return meeting.status === 'active' && !!meeting.startedAt && !meeting.endedAt
    },

    /**
     * Get participant role badge
     */
    getRoleBadge: (role: string): { color: string; label: string } => {
        switch (role) {
            case 'host':
                return { color: 'bg-blue-100 text-blue-800', label: 'Host' }
            case 'moderator':
                return { color: 'bg-purple-100 text-purple-800', label: 'Moderator' }
            case 'participant':
                return { color: 'bg-gray-100 text-gray-800', label: 'Participant' }
            case 'guest':
                return { color: 'bg-orange-100 text-orange-800', label: 'Guest' }
            default:
                return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' }
        }
    },
}

// Error handling utilities
export const errorUtils = {
    /**
     * Extract error message from various error types
     */
    getErrorMessage: (error: unknown): string => {
        if (typeof error === 'string') return error

        if (error && typeof error === 'object') {
            if ('message' in error && typeof error.message === 'string') {
                return error.message
            }

            if ('error' in error && typeof error.error === 'object' && error.error) {
                if ('message' in error.error && typeof error.error.message === 'string') {
                    return error.error.message
                }
            }

            if ('data' in error && typeof error.data === 'object' && error.data) {
                if ('message' in error.data && typeof error.data.message === 'string') {
                    return error.data.message
                }
            }
        }

        return 'An unexpected error occurred'
    },

    /**
     * Check if error is network related
     */
    isNetworkError: (error: unknown): boolean => {
        const message = errorUtils.getErrorMessage(error).toLowerCase()
        return message.includes('network') ||
            message.includes('offline') ||
            message.includes('connection') ||
            message.includes('timeout')
    },

    /**
     * Check if error is authentication related
     */
    isAuthError: (error: unknown): boolean => {
        if (error && typeof error === 'object' && 'status' in error) {
            return error.status === 401 || error.status === 403
        }
        return false
    },
}

// Async utilities
export const asyncUtils = {
    /**
     * Delay execution
     */
    delay: (ms: number): Promise<void> => {
        return new Promise(resolve => setTimeout(resolve, ms))
    },

    /**
     * Retry function with exponential backoff
     */
    retry: async <T>(
        fn: () => Promise<T>,
        options: {
            maxAttempts?: number
            baseDelay?: number
            maxDelay?: number
            backoffFactor?: number
        } = {}
    ): Promise<T> => {
        const {
            maxAttempts = TIME_CONFIG.retry.maxAttempts,
            baseDelay = TIME_CONFIG.retry.baseDelay,
            maxDelay = TIME_CONFIG.retry.maxDelay,
            backoffFactor = TIME_CONFIG.retry.backoffFactor,
        } = options

        let lastError: unknown

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn()
            } catch (error) {
                lastError = error

                if (attempt === maxAttempts) {
                    throw error
                }

                const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)
                await asyncUtils.delay(delay)
            }
        }

        throw lastError
    },

    /**
     * Debounce function
     */
    debounce: <T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void => {
        let timeout: NodeJS.Timeout | null = null

        return (...args: Parameters<T>) => {
            if (timeout) {
                clearTimeout(timeout)
            }

            timeout = setTimeout(() => {
                func(...args)
            }, wait)
        }
    },

    /**
     * Throttle function
     */
    throttle: <T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void => {
        let inThrottle: boolean = false

        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args)
                inThrottle = true
                setTimeout(() => (inThrottle = false), limit)
            }
        }
    },
}

// Device and browser utilities
export const deviceUtils = {
    /**
     * Check if device is mobile
     */
    isMobile: (): boolean => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    },

    /**
     * Check if device is tablet
     */
    isTablet: (): boolean => {
        return /iPad|Android(?=.*Mobile)/i.test(navigator.userAgent)
    },

    /**
     * Get device type
     */
    getDeviceType: (): 'mobile' | 'tablet' | 'desktop' => {
        if (deviceUtils.isMobile()) return 'mobile'
        if (deviceUtils.isTablet()) return 'tablet'
        return 'desktop'
    },

    /**
     * Check if WebRTC is supported
     */
    supportsWebRTC: (): boolean => {
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            window.RTCPeerConnection
        )
    },

    /**
     * Check if screen sharing is supported
     */
    supportsScreenShare: (): boolean => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
    },

    /**
     * Get browser info
     */
    getBrowserInfo: (): { name: string; version: string } => {
        const ua = navigator.userAgent
        let name = 'Unknown'
        let version = 'Unknown'

        if (ua.includes('Chrome')) {
            name = 'Chrome'
            version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'
        } else if (ua.includes('Firefox')) {
            name = 'Firefox'
            version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown'
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            name = 'Safari'
            version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown'
        } else if (ua.includes('Edge')) {
            name = 'Edge'
            version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown'
        }

        return { name, version }
    },
}

// Color utilities
export const colorUtils = {
    /**
     * Generate color from string (consistent)
     */
    stringToColor: (str: string): string => {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash)
        }

        const hue = hash % 360
        return `hsl(${hue}, 70%, 50%)`
    },

    /**
     * Get contrast color (black or white)
     */
    getContrastColor: (hexColor: string): '#000000' | '#ffffff' => {
        const r = parseInt(hexColor.slice(1, 3), 16)
        const g = parseInt(hexColor.slice(3, 5), 16)
        const b = parseInt(hexColor.slice(5, 7), 16)

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance > 0.5 ? '#000000' : '#ffffff'
    },
}

// Default export with all utilities grouped
export default {
    string: stringUtils,
    date: dateUtils,
    format: formatUtils,
    array: arrayUtils,
    validation: validationUtils,
    user: userUtils,
    meeting: meetingUtils,
    error: errorUtils,
    async: asyncUtils,
    device: deviceUtils,
    color: colorUtils,
    cn,
}