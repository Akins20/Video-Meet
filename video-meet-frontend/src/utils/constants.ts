// Application metadata
export const APP_CONFIG = {
    name: 'Video Meet',
    version: '2.0.0',
    description: 'Professional video calling platform with advanced features',
    author: 'Video Meet Team',
    website: 'https://videomeet.app',
    supportEmail: 'support@videomeet.app',
    privacyPolicy: 'https://videomeet.app/privacy',
    termsOfService: 'https://videomeet.app/terms',
    documentation: 'https://docs.videomeet.app',
} as const

// Environment configuration
export const ENV_CONFIG = {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',

    // API URLs
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://video-meet-g90z.onrender.com/api/v1',
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://video-meet-g90z.onrender.com',

    // External services
    turnServer: process.env.NEXT_PUBLIC_TURN_SERVER || 'turn:localhost:3478',
    stunServer: process.env.NEXT_PUBLIC_STUN_SERVER || 'stun:stun.l.google.com:19302',

    // Feature flags
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableRecording: process.env.NEXT_PUBLIC_ENABLE_RECORDING === 'true',
    enableFileSharing: process.env.NEXT_PUBLIC_ENABLE_FILE_SHARING === 'true',
    enableBreakoutRooms: process.env.NEXT_PUBLIC_ENABLE_BREAKOUT_ROOMS === 'true',

    // Security
    encryptionKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-dev-key',
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
} as const

// API endpoints
export const API_ENDPOINTS = {
    // Authentication
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        refreshToken: '/auth/refresh-token',
        me: '/auth/me',
        updateProfile: '/auth/profile',
        updatePreferences: '/auth/preferences',
        changePassword: '/auth/change-password',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password',
        verifyEmail: '/auth/verify-email',
        resendVerification: '/auth/resend-verification',
        deleteAccount: '/auth/delete-account',
        checkUsername: '/auth/check-username',
        checkEmail: '/auth/check-email',
        sessions: '/auth/sessions',
        revokeSession: '/auth/revoke-session',
        twoFactor: '/auth/two-factor',
    },

    // Meetings
    meetings: {
        base: '/meetings',
        create: '/meetings',
        getByRoomId: (roomId: string) => `/meetings/${roomId}`,
        join: (roomId: string) => `/meetings/${roomId}/join`,
        leave: (meetingId: string) => `/meetings/${meetingId}/leave`,
        end: (meetingId: string) => `/meetings/${meetingId}/end`,
        update: (meetingId: string) => `/meetings/${meetingId}`,
        participants: (meetingId: string) => `/meetings/${meetingId}/participants`,
        updateMedia: (meetingId: string, participantId: string) =>
            `/meetings/${meetingId}/participants/${participantId}/media`,
        removeParticipant: (meetingId: string, participantId: string) =>
            `/meetings/${meetingId}/participants/${participantId}`,
        chat: (meetingId: string) => `/meetings/${meetingId}/chat`,
        files: (meetingId: string) => `/meetings/${meetingId}/files`,
        uploadFile: (meetingId: string) => `/meetings/${meetingId}/files/upload`,
        recording: {
            start: (meetingId: string) => `/meetings/${meetingId}/recording/start`,
            stop: (meetingId: string) => `/meetings/${meetingId}/recording/stop`,
            status: (meetingId: string) => `/meetings/${meetingId}/recording/status`,
        },
        analytics: (meetingId: string) => `/meetings/${meetingId}/analytics`,
        networkStatus: (meetingId: string) => `/meetings/${meetingId}/network-status`,
    },

    // Participants
    participants: {
        contacts: '/participants/contacts',
        addContact: '/participants/contacts',
        updateContact: (contactId: string) => `/participants/contacts/${contactId}`,
        removeContact: (contactId: string) => `/participants/contacts/${contactId}`,
        blockContact: (contactId: string) => `/participants/contacts/${contactId}/block`,
        bulkOperation: '/participants/contacts/bulk',
        search: '/participants/search',
        suggestions: '/participants/suggestions',
        invitations: '/participants/invitations',
        sendInvitation: '/participants/invitations/send',
        respondToInvitation: (invitationId: string) =>
            `/participants/invitations/${invitationId}/respond`,
        cancelInvitation: (invitationId: string) =>
            `/participants/invitations/${invitationId}/cancel`,
        history: '/participants/history',
        rateMeeting: (meetingId: string) => `/participants/history/${meetingId}/rate`,
        analytics: '/participants/analytics',
        status: '/participants/status',
        statusBatch: '/participants/status/batch',
        import: '/participants/import',
        export: '/participants/export',
        profile: (userId: string) => `/participants/${userId}/profile`,
    },
} as const

// WebSocket events
export const WS_EVENTS = {
    // Connection events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',

    // Meeting events
    JOIN_MEETING: 'join-meeting',
    LEAVE_MEETING: 'leave-meeting',
    PARTICIPANT_JOINED: 'participant-joined',
    PARTICIPANT_LEFT: 'participant-left',
    MEETING_ENDED: 'meeting-ended',

    // Media events
    MEDIA_STATE_CHANGE: 'media-state-change',
    SCREEN_SHARE_START: 'screen-share-start',
    SCREEN_SHARE_STOP: 'screen-share-stop',

    // WebRTC signaling
    WEBRTC_OFFER: 'webrtc-offer',
    WEBRTC_ANSWER: 'webrtc-answer',
    WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
    WEBRTC_SIGNAL: 'webrtc-signal',

    // Chat events
    CHAT_MESSAGE: 'chat-message',
    CHAT_MESSAGE_EDIT: 'chat-message-edit',
    CHAT_MESSAGE_DELETE: 'chat-message-delete',
    TYPING_START: 'typing-start',
    TYPING_STOP: 'typing-stop',

    // Status events
    STATUS_CHANGE: 'status-change',
    CONNECTION_QUALITY: 'connection-quality',
    NETWORK_STATUS: 'network-status',

    // Recording events
    RECORDING_START: 'recording-start',
    RECORDING_STOP: 'recording-stop',
    RECORDING_STATUS: 'recording-status',

    // Invitation events
    INVITATION_RECEIVED: 'invitation-received',
    INVITATION_ACCEPTED: 'invitation-accepted',
    INVITATION_DECLINED: 'invitation-declined',

    // File sharing events
    FILE_SHARE_OFFER: 'file-share-offer',
    FILE_TRANSFER_PROGRESS: 'file-transfer-progress',
    FILE_TRANSFER_COMPLETE: 'file-transfer-complete',

    // System events
    SYSTEM_NOTIFICATION: 'system-notification',
    MAINTENANCE_MODE: 'maintenance-mode',
} as const

// Meeting limits and restrictions
export const MEETING_LIMITS = {
    // Participant limits by account type
    participants: {
        free: 3,
        pro: 25,
        business: 100,
        enterprise: 500,
    },

    // Duration limits (in minutes)
    duration: {
        free: 40,
        pro: 480, // 8 hours
        business: 1440, // 24 hours
        enterprise: -1, // unlimited
    },

    // Recording limits (minutes per month)
    recording: {
        free: 0,
        pro: 120, // 2 hours
        business: 600, // 10 hours
        enterprise: -1, // unlimited
    },

    // File sharing limits (MB per file)
    fileSize: {
        free: 10,
        pro: 100,
        business: 500,
        enterprise: 1000,
    },

    // Storage limits (GB total)
    storage: {
        free: 1,
        pro: 10,
        business: 100,
        enterprise: 1000,
    },

    // Feature access
    features: {
        free: ['basic_video', 'basic_audio', 'chat', 'screen_share'],
        pro: ['all_basic', 'recording', 'file_sharing', 'virtual_backgrounds'],
        business: ['all_pro', 'analytics', 'admin_controls', 'integrations'],
        enterprise: ['all_business', 'sso', 'custom_branding', 'api_access'],
    },
} as const

// Media configuration
export const MEDIA_CONFIG = {
    // Video constraints
    video: {
        low: { width: 320, height: 240, frameRate: 15 },
        medium: { width: 640, height: 480, frameRate: 24 },
        high: { width: 1280, height: 720, frameRate: 30 },
        hd: { width: 1920, height: 1080, frameRate: 30 },
    },

    // Audio constraints
    audio: {
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },

    // Screen sharing constraints
    screenShare: {
        video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
    },

    // Codec preferences
    codecs: {
        video: ['VP9', 'VP8', 'H264'],
        audio: ['OPUS', 'G722', 'PCMU'],
    },

    // Bandwidth limits (kbps)
    bandwidth: {
        audio: { min: 32, max: 128 },
        video: {
            low: { min: 150, max: 300 },
            medium: { min: 300, max: 600 },
            high: { min: 600, max: 1200 },
            hd: { min: 1200, max: 2500 },
        },
    },
} as const

// UI constants
export const UI_CONFIG = {
    // Breakpoints (matches Tailwind CSS)
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    },

    // Animation durations (ms)
    animations: {
        fast: 150,
        normal: 300,
        slow: 500,
    },

    // Z-index layers
    zIndex: {
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        backdrop: 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
        toast: 1080,
    },

    // Grid layouts
    videoGrid: {
        maxColumns: 4,
        maxRows: 4,
        aspectRatio: 16 / 9,
    },

    // Color scheme
    themes: {
        light: 'light',
        dark: 'dark',
        auto: 'system',
    },
} as const

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
    // Meeting controls
    toggleMute: 'cmd+d',
    toggleVideo: 'cmd+e',
    toggleScreenShare: 'cmd+shift+s',
    toggleChat: 'cmd+shift+c',
    toggleParticipants: 'cmd+shift+p',
    leaveMeeting: 'cmd+shift+l',

    // UI navigation
    openSettings: 'cmd+,',
    search: 'cmd+k',
    help: '?',

    // Chat shortcuts
    sendMessage: 'enter',
    newLine: 'shift+enter',

    // Accessibility
    focusNext: 'tab',
    focusPrevious: 'shift+tab',
    activate: 'space',
} as const

// Storage keys
export const STORAGE_KEYS = {
    // Authentication
    accessToken: 'videomeet_access_token',
    refreshToken: 'videomeet_refresh_token',
    user: 'videomeet_user',

    // Preferences
    theme: 'videomeet_theme',
    language: 'videomeet_language',
    mediaSettings: 'videomeet_media_settings',

    // Meeting
    recentMeetings: 'videomeet_recent_meetings',
    draftMeeting: 'videomeet_draft_meeting',

    // UI state
    sidebarCollapsed: 'videomeet_sidebar_collapsed',
    chatPanelOpen: 'videomeet_chat_panel_open',

    // Development
    devMode: 'videomeet_dev_mode',
    debugLogs: 'videomeet_debug_logs',
} as const

// File types and extensions
export const FILE_CONFIG = {
    // Allowed file types for upload
    allowedTypes: {
        images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        documents: [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        archives: ['application/zip', 'application/x-rar-compressed'],
    },

    // File size limits (bytes)
    maxSizes: {
        avatar: 5 * 1024 * 1024, // 5MB
        chatFile: 25 * 1024 * 1024, // 25MB
        meetingFile: 100 * 1024 * 1024, // 100MB
    },

    // File extensions
    extensions: {
        images: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
        documents: ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
        archives: ['.zip', '.rar'],
    },
} as const

// Error messages
export const ERROR_MESSAGES = {
    // Network errors
    network: {
        offline: 'You are currently offline. Please check your internet connection.',
        timeout: 'Request timed out. Please try again.',
        serverError: 'Server error. Please try again later.',
        notFound: 'The requested resource was not found.',
        forbidden: 'You do not have permission to access this resource.',
        rateLimited: 'Too many requests. Please slow down and try again.',
    },

    // Authentication errors
    auth: {
        invalidCredentials: 'Invalid email or password.',
        accountLocked: 'Account temporarily locked due to too many failed attempts.',
        emailNotVerified: 'Please verify your email address before continuing.',
        sessionExpired: 'Your session has expired. Please login again.',
        twoFactorRequired: 'Two-factor authentication code required.',
        invalidTwoFactor: 'Invalid two-factor authentication code.',
    },

    // Meeting errors
    meeting: {
        notFound: 'Meeting not found or has ended.',
        roomFull: 'This meeting is full. Cannot join.',
        invalidPassword: 'Incorrect meeting password.',
        hostNotJoined: 'Waiting for the host to start the meeting.',
        permissionDenied: 'You do not have permission to perform this action.',
        alreadyInMeeting: 'You are already in a meeting.',
    },

    // Media errors
    media: {
        microphoneAccess: 'Microphone access denied. Please enable microphone permissions.',
        cameraAccess: 'Camera access denied. Please enable camera permissions.',
        screenShareDenied: 'Screen sharing permission denied.',
        mediaNotSupported: 'Your browser does not support this media feature.',
        connectionFailed: 'Failed to establish media connection.',
    },

    // File errors
    file: {
        tooLarge: 'File is too large. Please choose a smaller file.',
        invalidType: 'File type not supported.',
        uploadFailed: 'File upload failed. Please try again.',
        scanningFailed: 'File security scan failed.',
        downloadFailed: 'File download failed.',
    },

    // General errors
    general: {
        unknown: 'An unexpected error occurred. Please try again.',
        validation: 'Please check your input and try again.',
        maintenance: 'Service temporarily unavailable for maintenance.',
        browserNotSupported: 'Your browser is not supported. Please update or use a different browser.',
    },
} as const

// Success messages
export const SUCCESS_MESSAGES = {
    auth: {
        loginSuccessful: 'Successfully logged in!',
        registrationSuccessful: 'Account created successfully!',
        passwordChanged: 'Password changed successfully.',
        emailVerified: 'Email verified successfully.',
        profileUpdated: 'Profile updated successfully.',
    },

    meeting: {
        created: 'Meeting created successfully!',
        joined: 'Joined meeting successfully.',
        ended: 'Meeting ended.',
        recordingStarted: 'Recording started.',
        recordingStopped: 'Recording stopped.',
    },

    contact: {
        added: 'Contact added successfully.',
        removed: 'Contact removed.',
        invitationSent: 'Invitation sent successfully.',
        invitationAccepted: 'Invitation accepted.',
    },

    file: {
        uploaded: 'File uploaded successfully.',
        shared: 'File shared with participants.',
        downloaded: 'File downloaded successfully.',
    },
} as const

// Time constants
export const TIME_CONFIG = {
    // Durations in milliseconds
    intervals: {
        heartbeat: 30000, // 30 seconds
        statusUpdate: 60000, // 1 minute
        tokenRefresh: 300000, // 5 minutes
        connectionQuality: 5000, // 5 seconds
        typing: 3000, // 3 seconds
    },

    // Timeouts in milliseconds
    timeouts: {
        apiRequest: 30000, // 30 seconds
        webrtcConnection: 10000, // 10 seconds
        fileUpload: 300000, // 5 minutes
        toast: 5000, // 5 seconds
    },

    // Retry configurations
    retry: {
        maxAttempts: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 10000, // 10 seconds
        backoffFactor: 2,
    },
} as const

// Feature flags
export const FEATURE_FLAGS = {
    // New features (gradual rollout)
    enableBreakoutRooms: ENV_CONFIG.enableBreakoutRooms,
    enableVirtualBackgrounds: true,
    enableWhiteboard: false,
    enablePolls: false,
    enableTranscription: false,

    // Experimental features (development only)
    enableAIFeatures: ENV_CONFIG.isDevelopment,
    enableAdvancedAnalytics: ENV_CONFIG.isDevelopment,
    enableCustomBranding: false,

    // Platform features
    enableMobileApp: false,
    enableDesktopApp: true,
    enableWebPWA: true,

    // Integration features
    enableGoogleCalendar: true,
    enableOutlookCalendar: true,
    enableSlackIntegration: false,
    enableZapierIntegration: false,
} as const

// Regular expressions
export const REGEX_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    username: /^[a-zA-Z0-9_-]{3,20}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    phone: /^\+?[1-9]\d{1,14}$/,
    roomId: /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const

// Browser and device detection
export const BROWSER_CONFIG = {
    // Supported browsers
    supported: {
        chrome: { min: 80, name: 'Chrome' },
        firefox: { min: 75, name: 'Firefox' },
        safari: { min: 13, name: 'Safari' },
        edge: { min: 80, name: 'Edge' },
    },

    // WebRTC support requirements
    webrtcRequirements: {
        getUserMedia: true,
        rtcPeerConnection: true,
        mediaRecorder: true,
        screenCapture: true,
    },

    // Mobile detection
    mobile: {
        userAgentPatterns: [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPad/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i,
        ],
    },
} as const

// Export all constants as a single object for easy importing
export const CONSTANTS = {
    APP_CONFIG,
    ENV_CONFIG,
    API_ENDPOINTS,
    WS_EVENTS,
    MEETING_LIMITS,
    MEDIA_CONFIG,
    UI_CONFIG,
    KEYBOARD_SHORTCUTS,
    STORAGE_KEYS,
    FILE_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    TIME_CONFIG,
    FEATURE_FLAGS,
    REGEX_PATTERNS,
    BROWSER_CONFIG,
} as const

export default CONSTANTS