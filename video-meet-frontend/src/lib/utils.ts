import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Generate a random ID
 */
export function generateId(prefix?: string): string {
    const id = Math.random().toString(36).substr(2, 9)
    return prefix ? `${prefix}_${id}` : id
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }

    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout)
        }

        timeout = setTimeout(() => {
            func(...args)
        }, wait)
    }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => (inThrottle = false), limit)
        }
    }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as unknown as T
    }

    if (typeof obj === 'object') {
        const clonedObj = {} as Record<string, any>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key])
            }
        }
        return clonedObj as T
    }

    return obj
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
    }

    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
        return a === b
    }

    if (a === null || a === undefined || b === null || b === undefined) {
        return false
    }

    if (a.prototype !== b.prototype) return false

    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) {
        return false
    }

    return keys.every(k => deepEqual(a[k], b[k]))
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert string to title case
 */
export function titleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => capitalize(word))
        .join(' ')
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number, suffix = '...'): string {
    if (str.length <= length) return str
    return str.slice(0, length - suffix.length) + suffix
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }

    return text.replace(/[&<>"']/g, char => map[char])
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
    return num.toLocaleString()
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    return `${hours}h ${remainingMinutes}m`
}

/**
 * Format time relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const now = new Date()
    const targetDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
    return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
    if (value == null) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
}

/**
 * Pick specific properties from an object
 */
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key]
        }
    })
    return result
}

/**
 * Omit specific properties from an object
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj } as any
    keys.forEach(key => {
        delete result[key]
    })
    return result
}

/**
 * Group array of objects by a property
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
    return array.reduce((groups, item) => {
        const groupKey = String(item[key])
        if (!groups[groupKey]) {
            groups[groupKey] = []
        }
        groups[groupKey].push(item)
        return groups
    }, {} as Record<string, T[]>)
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)]
}

/**
 * Remove duplicates from array of objects by a property
 */
export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
    const seen = new Set()
    return array.filter(item => {
        const value = item[key]
        if (seen.has(value)) {
            return false
        }
        seen.add(value)
        return true
    })
}

/**
 * Shuffle array
 */
export function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

/**
 * Get random item from array
 */
export function randomItem<T>(array: T[]): T | undefined {
    return array[Math.floor(Math.random() * array.length)]
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size))
    }
    return chunks
}

/**
 * Create a range of numbers
 */
export function range(start: number, end?: number, step = 1): number[] {
    if (end === undefined) {
        end = start
        start = 0
    }

    const result: number[] = []
    for (let i = start; i < end; i += step) {
        result.push(i)
    }
    return result
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

/**
 * Generate a random number between min and max (inclusive)
 */
export function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Convert bytes to human readable format
 */
export function bytesToSize(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Convert string to slug format
 */
export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '')             // Trim - from end of text
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
    if (typeof navigator === 'undefined') return false

    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
    if (typeof navigator === 'undefined') return false

    return /iPad|Android(?=.*Mobile)/i.test(navigator.userAgent)
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (isMobile()) return 'mobile'
    if (isTablet()) return 'tablet'
    return 'desktop'
}

/**
 * Check if browser supports WebRTC
 */
export function supportsWebRTC(): boolean {
    if (typeof window === 'undefined') return false

    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.RTCPeerConnection &&
        window.RTCSessionDescription &&
        window.RTCIceCandidate
    )
}

/**
 * Check if browser supports screen sharing
 */
export function supportsScreenShare(): boolean {
    if (typeof navigator === 'undefined') return false

    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
}

/**
 * Get browser information
 */
export function getBrowserInfo(): { name: string; version: string; mobile: boolean } {
    if (typeof navigator === 'undefined') {
        return { name: 'Unknown', version: 'Unknown', mobile: false }
    }

    const ua = navigator.userAgent
    let name = 'Unknown'
    let version = 'Unknown'
    const mobile = isMobile()

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
        name = 'Chrome'
        version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'
    } else if (ua.includes('Firefox')) {
        name = 'Firefox'
        version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown'
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        name = 'Safari'
        version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown'
    } else if (ua.includes('Edg')) {
        name = 'Edge'
        version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown'
    } else if (ua.includes('Opera') || ua.includes('OPR')) {
        name = 'Opera'
        version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || 'Unknown'
    }

    return { name, version, mobile }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
            return true
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea')
            textArea.value = text
            textArea.style.position = 'absolute'
            textArea.style.left = '-999999px'

            document.body.prepend(textArea)
            textArea.select()

            try {
                document.execCommand('copy')
            } finally {
                textArea.remove()
            }
            return true
        }
    } catch (error) {
        console.error('Failed to copy text to clipboard:', error)
        return false
    }
}

/**
 * Download data as file
 */
export function downloadFile(data: string | Blob, filename: string, type?: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the URL object
    URL.revokeObjectURL(url)
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            if (e.target?.result) {
                resolve(e.target.result as string)
            } else {
                reject(new Error('Failed to read file'))
            }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
    })
}

/**
 * Read file as data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            if (e.target?.result) {
                resolve(e.target.result as string)
            } else {
                reject(new Error('Failed to read file'))
            }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Generate color from string (consistent)
 */
export function stringToColor(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = hash % 360
    return `hsl(${hue}, 70%, 50%)`
}

/**
 * Get contrast color (black or white) for a given background color
 */
export function getContrastColor(hexColor: string): '#000000' | '#ffffff' {
    // Remove # if present
    const color = hexColor.replace('#', '')

    // Parse RGB
    const r = parseInt(color.substr(0, 2), 16)
    const g = parseInt(color.substr(2, 2), 16)
    const b = parseInt(color.substr(4, 2), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Parse query string parameters
 */
export function parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {}
    const searchParams = new URLSearchParams(queryString.replace(/^\?/, ''))

    for (const [key, value] of searchParams) {
        params[key] = value
    }

    return params
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value))
        }
    })

    return searchParams.toString()
}

/**
 * Get current URL parameters
 */
export function getUrlParams(): Record<string, string> {
    if (typeof window === 'undefined') return {}

    return parseQueryString(window.location.search)
}

/**
 * Update URL parameters without page reload
 */
export function updateUrlParams(params: Record<string, any>, replace = false): void {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)

    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key)
        } else {
            url.searchParams.set(key, String(value))
        }
    })

    const method = replace ? 'replaceState' : 'pushState'
    window.history[method]({}, '', url.toString())
}

/**
 * Scroll to element smoothly
 */
export function scrollToElement(
    element: HTMLElement | string,
    options: ScrollIntoViewOptions = { behavior: 'smooth' }
): void {
    const target = typeof element === 'string'
        ? document.querySelector(element) as HTMLElement
        : element

    if (target) {
        target.scrollIntoView(options)
    }
}

/**
 * Check if element is in viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect()
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
}

/**
 * Get element's offset from top of page
 */
export function getElementOffset(element: HTMLElement): { top: number; left: number } {
    let top = 0
    let left = 0
    let el: HTMLElement | null = element

    while (el) {
        top += el.offsetTop
        left += el.offsetLeft
        el = el.offsetParent as HTMLElement
    }

    return { top, left }
}

/**
 * Create event emitter
 */
export class EventEmitter<T extends Record<string, any> = Record<string, any>> {
    private events: Record<string, Function[]> = {}

    on<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void {
        const eventName = String(event)
        if (!this.events[eventName]) {
            this.events[eventName] = []
        }

        this.events[eventName].push(listener)

        // Return unsubscribe function
        return () => {
            this.off(event, listener)
        }
    }

    off<K extends keyof T>(event: K, listener?: (data: T[K]) => void): void {
        const eventName = String(event)
        if (!this.events[eventName]) return

        if (listener) {
            const index = this.events[eventName].indexOf(listener)
            if (index > -1) {
                this.events[eventName].splice(index, 1)
            }
        } else {
            delete this.events[eventName]
        }
    }

    emit<K extends keyof T>(event: K, data: T[K]): void {
        const eventName = String(event)
        if (!this.events[eventName]) return

        this.events[eventName].forEach(listener => {
            try {
                listener(data)
            } catch (error) {
                console.error('Error in event listener:', error)
            }
        })
    }

    once<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        const onceListener = (data: T[K]) => {
            listener(data)
            this.off(event, onceListener)
        }
        this.on(event, onceListener)
    }

    removeAllListeners(): void {
        this.events = {}
    }
}

/**
 * Local storage utilities with error handling
 */
export const storage = {
    set: (key: string, value: any): boolean => {
        try {
            localStorage.setItem(key, JSON.stringify(value))
            return true
        } catch (error) {
            console.error('Failed to set localStorage item:', error)
            return false
        }
    },

    get: <T = any>(key: string, defaultValue?: T): T | null => {
        try {
            const item = localStorage.getItem(key)
            return item ? JSON.parse(item) : defaultValue || null
        } catch (error) {
            console.error('Failed to get localStorage item:', error)
            return defaultValue || null
        }
    },

    remove: (key: string): boolean => {
        try {
            localStorage.removeItem(key)
            return true
        } catch (error) {
            console.error('Failed to remove localStorage item:', error)
            return false
        }
    },

    clear: (): boolean => {
        try {
            localStorage.clear()
            return true
        } catch (error) {
            console.error('Failed to clear localStorage:', error)
            return false
        }
    },

    exists: (key: string): boolean => {
        try {
            return localStorage.getItem(key) !== null
        } catch (error) {
            return false
        }
    },
}

/**
 * Session storage utilities with error handling
 */
export const sessionStorage = {
    set: (key: string, value: any): boolean => {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(value))
            return true
        } catch (error) {
            console.error('Failed to set sessionStorage item:', error)
            return false
        }
    },

    get: <T = any>(key: string, defaultValue?: T): T | null => {
        try {
            const item = window.sessionStorage.getItem(key)
            return item ? JSON.parse(item) : defaultValue || null
        } catch (error) {
            console.error('Failed to get sessionStorage item:', error)
            return defaultValue || null
        }
    },

    remove: (key: string): boolean => {
        try {
            window.sessionStorage.removeItem(key)
            return true
        } catch (error) {
            console.error('Failed to remove sessionStorage item:', error)
            return false
        }
    },

    clear: (): boolean => {
        try {
            window.sessionStorage.clear()
            return true
        } catch (error) {
            console.error('Failed to clear sessionStorage:', error)
            return false
        }
    },

    exists: (key: string): boolean => {
        try {
            return window.sessionStorage.getItem(key) !== null
        } catch (error) {
            return false
        }
    },
}

/**
 * Cookie utilities
 */
export const cookies = {
    set: (name: string, value: string, days = 7, path = '/'): void => {
        const expires = new Date()
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=${path}`
    },

    get: (name: string): string | null => {
        const nameEQ = name + '='
        const ca = document.cookie.split(';')

        for (let i = 0; i < ca.length; i++) {
            let c = ca[i]
            while (c.charAt(0) === ' ') c = c.substring(1, c.length)
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
        }

        return null
    },

    remove: (name: string, path = '/'): void => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=${path}`
    },

    exists: (name: string): boolean => {
        return cookies.get(name) !== null
    },
}

// Export commonly used utilities as named exports
export {
    formatFileSize as fileSize,
    formatDuration as duration,
    formatRelativeTime as timeAgo,
    formatNumber as number,
    generateId as id,
    generateUUID as uuid,
}

// Default export with all utilities
export default {
    // String utilities
    capitalize,
    titleCase,
    truncate,
    stripHtml,
    escapeHtml,
    slugify,

    // Number utilities
    formatNumber,
    formatFileSize,
    formatDuration,
    clamp,
    randomNumber,

    // Time utilities
    formatRelativeTime,

    // Array utilities
    unique,
    uniqueBy,
    shuffle,
    randomItem,
    chunk,
    range,
    groupBy,

    // Object utilities
    pick,
    omit,
    deepClone,
    deepEqual,
    isEmpty,

    // Function utilities
    debounce,
    throttle,
    sleep,

    // Device utilities
    isMobile,
    isTablet,
    getDeviceType,
    getBrowserInfo,
    supportsWebRTC,
    supportsScreenShare,

    // File utilities
    copyToClipboard,
    downloadFile,
    readFileAsText,
    readFileAsDataURL,

    // Validation utilities
    isValidEmail,
    isValidUrl,

    // Color utilities
    stringToColor,
    getContrastColor,

    // URL utilities
    parseQueryString,
    buildQueryString,
    getUrlParams,
    updateUrlParams,

    // DOM utilities
    scrollToElement,
    isElementInViewport,
    getElementOffset,

    // Storage utilities
    storage,
    sessionStorage,
    cookies,

    // Event system
    EventEmitter,

    // ID generation
    generateId,
    generateUUID,

    // CSS utilities
    cn,
}