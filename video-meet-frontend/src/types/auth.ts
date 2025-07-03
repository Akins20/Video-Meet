// Base authentication types
export type AuthProvider = 'email' | 'google' | 'microsoft' | 'apple' | 'github'
export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin'
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification'
export type OnlineStatus = 'available' | 'busy' | 'away' | 'offline' | 'do_not_disturb'
export type AccountType = 'free' | 'pro' | 'business' | 'enterprise'

// Core user interface
export interface User {
    id: string
    email: string
    username: string

    // Personal information
    firstName: string
    lastName: string
    fullName: string
    displayName: string
    bio?: string
    avatar?: string

    // Account information
    role: UserRole
    status: UserStatus
    accountType: AccountType
    isEmailVerified: boolean
    isPhoneVerified: boolean

    // Timestamps
    createdAt: string
    updatedAt: string
    lastLoginAt?: string
    lastSeenAt?: string
    emailVerifiedAt?: string

    // Preferences
    preferences: UserPreferences

    // Security settings
    security: SecuritySettings

    // Usage statistics
    statistics: UserStatistics

    // Subscription information (for paid accounts)
    subscription?: UserSubscription
}

// User preferences
export interface UserPreferences {
    // Notification preferences
    notifications: {
        email: {
            meetingInvites: boolean
            meetingReminders: boolean
            meetingUpdates: boolean
            chatMessages: boolean
            contactRequests: boolean
            systemUpdates: boolean
            marketing: boolean
        }
        push: {
            meetingInvites: boolean
            meetingReminders: boolean
            meetingStarted: boolean
            chatMessages: boolean
            contactRequests: boolean
            mentions: boolean
        }
        desktop: {
            enabled: boolean
            sound: boolean
            showPreview: boolean
            persistentNotifications: boolean
        }
        mobile: {
            enabled: boolean
            sound: boolean
            vibration: boolean
            badge: boolean
        }
    }

    // Privacy preferences
    privacy: {
        allowDiscovery: boolean
        showOnlineStatus: boolean
        showLastSeen: boolean
        allowDirectCalls: boolean
        allowContactRequests: boolean
        shareAnalytics: boolean
        indexProfile: boolean // For search engines
        allowDataExport: boolean
    }

    // Meeting preferences
    meeting: {
        // Default media settings
        defaultMicMuted: boolean
        defaultVideoOff: boolean
        defaultSpeakerVolume: number

        // Quality preferences
        preferredVideoQuality: 'low' | 'medium' | 'high' | 'auto'
        preferredAudioQuality: 'low' | 'medium' | 'high'
        adaptiveQuality: boolean
        bandwidthLimit?: number // Mbps

        // UI preferences
        defaultLayout: 'grid' | 'speaker' | 'presentation'
        showParticipantNames: boolean
        showConnectionQuality: boolean
        enableKeyboardShortcuts: boolean

        // Advanced features
        backgroundBlur: boolean
        noiseCancellation: boolean
        echoCancellation: boolean
        autoGainControl: boolean

        // Auto-join settings
        autoJoinAudio: boolean
        autoJoinVideo: boolean
        skipPreview: boolean
    }

    // Accessibility preferences
    accessibility: {
        highContrast: boolean
        largeText: boolean
        reduceMotion: boolean
        screenReader: boolean
        keyboardNavigation: boolean
        captions: {
            enabled: boolean
            fontSize: number
            fontFamily: string
            backgroundColor: string
            textColor: string
        }
    }

    // Appearance preferences
    appearance: {
        theme: 'light' | 'dark' | 'auto'
        language: string
        timezone: string
        dateFormat: string
        timeFormat: '12h' | '24h'
        firstDayOfWeek: 0 | 1 // 0 = Sunday, 1 = Monday
    }

    // Integration preferences
    integrations: {
        calendar: {
            provider?: 'google' | 'outlook' | 'apple'
            syncEnabled: boolean
            createEvents: boolean
            updateEvents: boolean
            deleteEvents: boolean
        }
        contacts: {
            syncEnabled: boolean
            autoImport: boolean
            provider?: 'google' | 'outlook' | 'apple'
        }
    }
}

// Security settings
export interface SecuritySettings {
    // Two-factor authentication
    twoFactorAuth: {
        enabled: boolean
        method?: 'totp' | 'sms' | 'email'
        backupCodes: string[]
        lastUsed?: string
        qrCodeUrl?: string // For TOTP setup
    }

    // Password settings
    password: {
        lastChanged: string
        requireChange: boolean
        strength: 'weak' | 'medium' | 'strong'
        hasBreached: boolean // Check against known breaches
    }

    // Session management
    sessions: {
        maxConcurrentSessions: number
        sessionTimeout: number // minutes
        rememberDevices: boolean
        trustedDevices: TrustedDevice[]
    }

    // Login security
    loginSecurity: {
        failedAttempts: number
        lockedUntil?: string
        requireEmailVerification: boolean
        requireDeviceVerification: boolean
        allowedCountries?: string[] // ISO country codes
        blockedIPs: string[]
    }

    // Data security
    dataSecurity: {
        encryptLocalData: boolean
        autoLogout: boolean
        autoLogoutTime: number // minutes
        clearDataOnLogout: boolean
    }

    // Privacy controls
    privacyControls: {
        dataRetention: number // days, 0 = forever
        allowAnalytics: boolean
        allowCrashReports: boolean
        allowUsageTracking: boolean
        gdprCompliant: boolean
    }
}

// Trusted device information
export interface TrustedDevice {
    id: string
    name: string
    type: 'web' | 'desktop' | 'mobile'
    platform: string
    browser?: string
    location: string
    ipAddress: string
    userAgent: string
    trustedAt: string
    lastUsed: string
    isActive: boolean
}

// User statistics
export interface UserStatistics {
    // Account metrics
    accountAge: number // days since registration
    totalLogins: number
    totalMeetings: number
    totalMeetingTime: number // minutes

    // Meeting statistics
    meetingsHosted: number
    meetingsJoined: number
    averageMeetingDuration: number // minutes
    longestMeeting: number // minutes

    // Social metrics
    totalContacts: number
    invitationsSent: number
    invitationsReceived: number
    invitationsAccepted: number

    // Usage patterns
    mostActiveDay: string // ISO day name
    mostActiveHour: number // 0-23
    averageSessionDuration: number // minutes
    featuresUsed: string[]

    // Quality metrics
    averageConnectionQuality: number // 1-5 scale
    issuesReported: number
    feedbackProvided: number
    ratingGiven: number // average rating given to meetings

    // Recent activity
    lastActivity: {
        meeting?: string
        action: string
        timestamp: string
    }
}

// User subscription information
export interface UserSubscription {
    id: string
    plan: AccountType
    status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing'

    // Billing information
    billingCycle: 'monthly' | 'yearly'
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean

    // Usage limits
    limits: {
        maxMeetingDuration: number // minutes, 0 = unlimited
        maxParticipants: number
        maxMeetingsPerMonth: number
        storageLimit: number // GB
        recordingMinutes: number // per month
        features: string[] // Available features
    }

    // Usage tracking
    usage: {
        meetingsThisMonth: number
        meetingMinutesThisMonth: number
        recordingMinutesThisMonth: number
        storageUsed: number // GB
    }

    // Payment information
    paymentMethod?: {
        type: 'card' | 'paypal' | 'bank_transfer'
        last4?: string
        brand?: string
        expiryMonth?: number
        expiryYear?: number
    }

    // Subscription history
    invoices: SubscriptionInvoice[]
}

// Subscription invoice
export interface SubscriptionInvoice {
    id: string
    amount: number
    currency: string
    status: 'paid' | 'pending' | 'failed' | 'refunded'
    periodStart: string
    periodEnd: string
    paidAt?: string
    downloadUrl?: string
}

// Authentication request/response types
export interface LoginRequest {
    emailOrUsername: string
    password: string
    rememberMe?: boolean
    deviceInfo?: DeviceInfo
    turnstileToken?: string // For bot protection
}

export interface LoginResponse {
    user: User
    tokens: AuthTokens
    requiresTwoFactor?: boolean
    twoFactorMethods?: string[]
}

export interface RegisterRequest {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
    confirmPassword: string
    acceptTerms: boolean
    acceptPrivacy: boolean
    marketingConsent?: boolean
    referralCode?: string
    deviceInfo?: DeviceInfo
    turnstileToken?: string
}

export interface AuthTokens {
    accessToken: string
    refreshToken: string
    tokenType: 'Bearer'
    expiresIn: number // seconds
    scope?: string
}

// Two-factor authentication types
export interface TwoFactorSetupRequest {
    password: string
    method: 'totp' | 'sms' | 'email'
    phoneNumber?: string // For SMS
}

export interface TwoFactorSetupResponse {
    secret?: string // For TOTP
    qrCodeUrl?: string // For TOTP
    backupCodes: string[]
}

export interface TwoFactorVerifyRequest {
    code: string
    method: 'totp' | 'sms' | 'email' | 'backup'
    rememberDevice?: boolean
}

// Password management types
export interface PasswordChangeRequest {
    currentPassword: string
    newPassword: string
    confirmPassword: string
    logoutOtherSessions?: boolean
}

export interface PasswordResetRequest {
    email: string
    turnstileToken?: string
}

export interface PasswordResetConfirmRequest {
    token: string
    newPassword: string
    confirmPassword: string
}

// Email verification types
export interface EmailVerificationRequest {
    token: string
}

export interface ResendVerificationRequest {
    email: string
    turnstileToken?: string
}

// Social authentication types
export interface SocialAuthRequest {
    provider: AuthProvider
    code: string
    redirectUri: string
    state?: string
}

export interface SocialAuthResponse {
    user: User
    tokens: AuthTokens
    isNewUser: boolean
}

// Device management types
export interface DeviceInfo {
    deviceId: string
    name: string
    type: 'web' | 'desktop' | 'mobile'
    platform: string
    browser?: string
    browserVersion?: string
    os: string
    osVersion?: string
    userAgent: string
    ipAddress?: string
    location?: string
    fingerprint?: string
}

export interface UserSession {
    id: string
    deviceInfo: DeviceInfo
    createdAt: string
    lastActivityAt: string
    expiresAt: string
    isActive: boolean
    isCurrent: boolean
}

// Account management types
export interface UpdateProfileRequest {
    firstName?: string
    lastName?: string
    bio?: string
    avatar?: string | File
    username?: string
}

export interface UpdateEmailRequest {
    newEmail: string
    password: string
}

export interface DeactivateAccountRequest {
    password: string
    reason?: string
    feedback?: string
}

export interface DeleteAccountRequest {
    password: string
    confirmText: string
    reason?: string
    feedback?: string
    downloadData?: boolean
}

// Privacy and data export types
export interface DataExportRequest {
    types: Array<'profile' | 'meetings' | 'contacts' | 'messages' | 'files'>
    format: 'json' | 'csv' | 'xml'
    includeDeleted?: boolean
}

export interface DataExportResponse {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    downloadUrl?: string
    expiresAt?: string
    fileSize?: number
    createdAt: string
}

// Privacy settings types
export interface PrivacySettings {
    profileVisibility: 'public' | 'contacts' | 'private'
    contactDiscovery: boolean
    meetingHistory: 'public' | 'contacts' | 'private'
    onlineStatus: 'visible' | 'contacts' | 'hidden'
    lastSeen: 'visible' | 'contacts' | 'hidden'
    readReceipts: boolean
    typingIndicators: boolean
}

// Admin-specific types (for user management)
export interface AdminUserInfo extends User {
    // Additional admin fields
    signupMethod: AuthProvider
    signupIP: string
    lastLoginIP: string
    totalSessions: number
    warningsIssued: number
    suspensionHistory: Array<{
        reason: string
        startDate: string
        endDate?: string
        issuedBy: string
    }>

    // Billing information (for paid accounts)
    billingInfo?: {
        customerId: string
        subscriptionId: string
        totalPaid: number
        currency: string
        lifetimeValue: number
    }
}

// User roles and permissions
export interface RolePermissions {
    // User management
    canViewUsers: boolean
    canEditUsers: boolean
    canDeleteUsers: boolean
    canSuspendUsers: boolean

    // Meeting management
    canViewAllMeetings: boolean
    canEndAnyMeeting: boolean
    canAccessRecordings: boolean

    // System administration
    canViewAnalytics: boolean
    canManageSettings: boolean
    canViewLogs: boolean
    canManageIntegrations: boolean

    // Content moderation
    canModerateContent: boolean
    canManageReports: boolean
    canIssueWarnings: boolean
}

// Type guards and utility functions
export const isEmailVerified = (user: User): boolean => {
    return user.isEmailVerified && !!user.emailVerifiedAt
}

export const hasActiveSubscription = (user: User): boolean => {
    return !!user.subscription && user.subscription.status === 'active'
}

export const canAccessFeature = (user: User, feature: string): boolean => {
    if (!user.subscription) return false
    return user.subscription.limits.features.includes(feature)
}

export const isAccountActive = (user: User): boolean => {
    return user.status === 'active' && isEmailVerified(user)
}

export const isTwoFactorEnabled = (user: User): boolean => {
    return user.security.twoFactorAuth.enabled
}

export const getDisplayName = (user: User): string => {
    return user.displayName || user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.username
}

export const getUserInitials = (user: User): string => {
    if (user.firstName && user.lastName) {
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    return user.username.slice(0, 2).toUpperCase()
}

export const isOnline = (user: User): boolean => {
    if (!user.lastSeenAt) return false
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return new Date(user.lastSeenAt) > fiveMinutesAgo
}

export const getSubscriptionStatus = (subscription?: UserSubscription): string => {
    if (!subscription) return 'free'
    if (subscription.status === 'active') return subscription.plan
    if (subscription.status === 'trialing') return 'trial'
    return 'expired'
}

// Authentication state types (for Redux)
export interface AuthState {
    user: User | null
    tokens: AuthTokens | null
    isAuthenticated: boolean
    isLoading: boolean
    isInitializing: boolean
    error: string | null

    // Two-factor authentication state
    requiresTwoFactor: boolean
    twoFactorMethods: string[]

    // Session management
    lastActivity: number
    sessionExpiry: number
    rememberMe: boolean
}