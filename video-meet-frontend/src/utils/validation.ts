import { z } from 'zod'

// Common validation helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
const phoneRegex = /^\+?[1-9]\d{1,14}$/
const roomIdRegex = /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/

// Custom error messages
const errorMessages = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    username: 'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens',
    password: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
    passwordMatch: 'Passwords do not match',
    phone: 'Please enter a valid phone number',
    roomId: 'Room ID must be in format ABC-123-XYZ',
    minLength: (min: number) => `Must be at least ${min} characters`,
    maxLength: (max: number) => `Must be no more than ${max} characters`,
    min: (min: number) => `Must be at least ${min}`,
    max: (max: number) => `Must be no more than ${max}`,
    url: 'Please enter a valid URL',
    future: 'Date must be in the future',
    past: 'Date must be in the past',
}

// Basic field schemas
export const emailSchema = z
    .string()
    .min(1, errorMessages.required)
    .email(errorMessages.email)
    .max(254, 'Email address is too long')

export const usernameSchema = z
    .string()
    .min(1, errorMessages.required)
    .regex(usernameRegex, errorMessages.username)
    .transform(val => val.toLowerCase())

export const passwordSchema = z
    .string()
    .min(1, errorMessages.required)
    .min(8, errorMessages.minLength(8))
    .regex(passwordRegex, errorMessages.password)

export const strongPasswordSchema = z
    .string()
    .min(1, errorMessages.required)
    .min(12, errorMessages.minLength(12))
    .regex(passwordRegex, errorMessages.password)
    .refine(
        (password) => {
            // Additional strength checks
            const hasMultipleUppercase = (password.match(/[A-Z]/g) || []).length >= 2
            const hasMultipleLowercase = (password.match(/[a-z]/g) || []).length >= 2
            const hasMultipleNumbers = (password.match(/\d/g) || []).length >= 2
            const hasMultipleSpecial = (password.match(/[@$!%*?&]/g) || []).length >= 2

            return hasMultipleUppercase && hasMultipleLowercase && hasMultipleNumbers && hasMultipleSpecial
        },
        'Password must have multiple uppercase, lowercase, numbers, and special characters'
    )

export const phoneSchema = z
    .string()
    .optional()
    .refine(
        (val) => !val || phoneRegex.test(val),
        errorMessages.phone
    )

export const nameSchema = z
    .string()
    .min(1, errorMessages.required)
    .min(2, errorMessages.minLength(2))
    .max(50, errorMessages.maxLength(50))
    .trim()

export const bioSchema = z
    .string()
    .max(500, errorMessages.maxLength(500))
    .optional()

export const urlSchema = z
    .string()
    .url(errorMessages.url)
    .optional()
    .or(z.literal(''))

export const roomIdSchema = z
    .string()
    .min(1, errorMessages.required)
    .regex(roomIdRegex, errorMessages.roomId)
    .transform(val => val.toUpperCase())

// Authentication schemas
export const loginSchema = z.object({
    emailOrUsername: z
        .string()
        .min(1, errorMessages.required)
        .refine(
            (val) => emailRegex.test(val) || usernameRegex.test(val),
            'Please enter a valid email or username'
        ),
    password: z
        .string()
        .min(1, errorMessages.required),
    rememberMe: z.boolean().optional().default(false),
})

export const registerSchema = z.object({
    email: emailSchema,
    username: usernameSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, errorMessages.required),
    acceptTerms: z
        .boolean()
        .refine(val => val === true, 'You must accept the terms and conditions'),
    acceptPrivacy: z
        .boolean()
        .refine(val => val === true, 'You must accept the privacy policy'),
    marketingConsent: z.boolean().optional().default(false),
    referralCode: z.string().optional(),
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: errorMessages.passwordMatch,
        path: ['confirmPassword'],
    }
)

export const forgotPasswordSchema = z.object({
    email: emailSchema,
})

export const resetPasswordSchema = z.object({
    token: z.string().min(1, errorMessages.required),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, errorMessages.required),
}).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
        message: errorMessages.passwordMatch,
        path: ['confirmPassword'],
    }
)

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, errorMessages.required),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, errorMessages.required),
    logoutOtherSessions: z.boolean().optional().default(false),
}).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
        message: errorMessages.passwordMatch,
        path: ['confirmPassword'],
    }
).refine(
    (data) => data.currentPassword !== data.newPassword,
    {
        message: 'New password must be different from current password',
        path: ['newPassword'],
    }
)

// Two-factor authentication schemas
export const twoFactorSetupSchema = z.object({
    password: z.string().min(1, errorMessages.required),
    method: z.enum(['totp', 'sms', 'email']),
    phoneNumber: z
        .string()
        .optional()
        .refine(
            (val, ctx) => {
                if (ctx.parent.method === 'sms' && !val) {
                    return false
                }
                return !val || phoneRegex.test(val)
            },
            'Phone number is required for SMS authentication'
        ),
})

export const twoFactorVerifySchema = z.object({
    code: z
        .string()
        .min(1, errorMessages.required)
        .length(6, 'Code must be 6 digits')
        .regex(/^\d{6}$/, 'Code must contain only numbers'),
    method: z.enum(['totp', 'sms', 'email', 'backup']),
    rememberDevice: z.boolean().optional().default(false),
})

// Profile schemas
export const updateProfileSchema = z.object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    bio: bioSchema,
    username: usernameSchema.optional(),
    avatar: z
        .instanceof(File)
        .optional()
        .refine(
            (file) => !file || file.size <= 5 * 1024 * 1024,
            'Avatar must be less than 5MB'
        )
        .refine(
            (file) => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
            'Avatar must be a JPEG, PNG, or WebP image'
        ),
})

export const updateEmailSchema = z.object({
    newEmail: emailSchema,
    password: z.string().min(1, errorMessages.required),
})

// Meeting schemas
export const createMeetingSchema = z.object({
    title: z
        .string()
        .min(1, errorMessages.required)
        .min(3, errorMessages.minLength(3))
        .max(100, errorMessages.maxLength(100))
        .trim(),
    description: z
        .string()
        .max(500, errorMessages.maxLength(500))
        .optional(),
    type: z.enum(['instant', 'scheduled', 'recurring']),
    maxParticipants: z
        .number()
        .min(2, errorMessages.min(2))
        .max(100, errorMessages.max(100)),
    password: z
        .string()
        .min(6, errorMessages.minLength(6))
        .max(50, errorMessages.maxLength(50))
        .optional()
        .or(z.literal('')),
    scheduledAt: z
        .string()
        .optional()
        .refine(
            (val) => !val || new Date(val) > new Date(),
            errorMessages.future
        ),
    settings: z.object({
        allowGuests: z.boolean().default(true),
        muteOnJoin: z.boolean().default(false),
        videoOnJoin: z.boolean().default(true),
        waitingRoom: z.boolean().default(false),
        chat: z.boolean().default(true),
        screenShare: z.boolean().default(true),
        fileSharing: z.boolean().default(true),
        recording: z.boolean().default(false),
        maxVideoQuality: z.enum(['low', 'medium', 'high']).default('high'),
    }).optional().default({}),
})

export const joinMeetingSchema = z.object({
    roomId: roomIdSchema,
    password: z.string().optional(),
    guestName: z
        .string()
        .min(2, errorMessages.minLength(2))
        .max(50, errorMessages.maxLength(50))
        .optional(),
})

export const updateMeetingSchema = z.object({
    title: z
        .string()
        .min(3, errorMessages.minLength(3))
        .max(100, errorMessages.maxLength(100))
        .trim()
        .optional(),
    description: z
        .string()
        .max(500, errorMessages.maxLength(500))
        .optional(),
    maxParticipants: z
        .number()
        .min(2, errorMessages.min(2))
        .max(100, errorMessages.max(100))
        .optional(),
    settings: z.object({
        allowGuests: z.boolean().optional(),
        muteOnJoin: z.boolean().optional(),
        videoOnJoin: z.boolean().optional(),
        waitingRoom: z.boolean().optional(),
        chat: z.boolean().optional(),
        screenShare: z.boolean().optional(),
        fileSharing: z.boolean().optional(),
        recording: z.boolean().optional(),
        maxVideoQuality: z.enum(['low', 'medium', 'high']).optional(),
    }).optional(),
})

// Chat schemas
export const sendMessageSchema = z.object({
    content: z
        .string()
        .min(1, errorMessages.required)
        .max(1000, errorMessages.maxLength(1000))
        .trim(),
    type: z.enum(['text', 'emoji']).default('text'),
    replyTo: z.string().optional(),
})

export const editMessageSchema = z.object({
    content: z
        .string()
        .min(1, errorMessages.required)
        .max(1000, errorMessages.maxLength(1000))
        .trim(),
})

// Contact schemas
export const addContactSchema = z.object({
    userId: z.string().min(1, errorMessages.required),
    contactType: z.enum(['friend', 'colleague']).default('colleague'),
    message: z
        .string()
        .max(200, errorMessages.maxLength(200))
        .optional(),
})

export const updateContactSchema = z.object({
    contactType: z.enum(['friend', 'colleague', 'recent', 'blocked']).optional(),
    isFavorite: z.boolean().optional(),
    allowDirectCall: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    notes: z
        .string()
        .max(500, errorMessages.maxLength(500))
        .optional(),
})

// Search schemas
export const searchSchema = z.object({
    query: z
        .string()
        .min(1, errorMessages.required)
        .min(2, errorMessages.minLength(2))
        .max(100, errorMessages.maxLength(100))
        .trim(),
    filters: z.object({
        includeUsers: z.boolean().optional().default(true),
        includeContacts: z.boolean().optional().default(true),
        onlineOnly: z.boolean().optional().default(false),
        hasAvatar: z.boolean().optional().default(false),
    }).optional().default({}),
    limit: z
        .number()
        .min(1, errorMessages.min(1))
        .max(50, errorMessages.max(50))
        .optional()
        .default(20),
})

// Invitation schemas
export const sendInvitationSchema = z.object({
    type: z.enum(['meeting', 'contact_request', 'platform_invite']),
    recipients: z
        .array(
            z.object({
                email: emailSchema,
                userId: z.string().optional(),
                name: z.string().optional(),
            })
        )
        .min(1, 'At least one recipient is required')
        .max(50, 'Cannot send to more than 50 recipients at once'),
    meetingId: z.string().optional(),
    message: z
        .string()
        .max(500, errorMessages.maxLength(500))
        .optional(),
    expiresIn: z
        .number()
        .min(1, errorMessages.min(1))
        .max(168, errorMessages.max(168)) // Max 1 week
        .optional()
        .default(24),
})

export const respondToInvitationSchema = z.object({
    response: z.enum(['accept', 'decline']),
    message: z
        .string()
        .max(200, errorMessages.maxLength(200))
        .optional(),
})

// File upload schemas
export const fileUploadSchema = z.object({
    file: z
        .instanceof(File)
        .refine(
            (file) => file.size <= 100 * 1024 * 1024,
            'File must be less than 100MB'
        )
        .refine(
            (file) => {
                const allowedTypes = [
                    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                    'application/pdf', 'text/plain', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-powerpoint',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                ]
                return allowedTypes.includes(file.type)
            },
            'File type not allowed'
        ),
    allowedParticipants: z
        .array(z.string())
        .optional(),
})

// Preferences schemas
export const updatePreferencesSchema = z.object({
    notifications: z.object({
        email: z.object({
            meetingInvites: z.boolean().optional(),
            meetingReminders: z.boolean().optional(),
            meetingUpdates: z.boolean().optional(),
            chatMessages: z.boolean().optional(),
            contactRequests: z.boolean().optional(),
            systemUpdates: z.boolean().optional(),
            marketing: z.boolean().optional(),
        }).optional(),
        push: z.object({
            meetingInvites: z.boolean().optional(),
            meetingReminders: z.boolean().optional(),
            meetingStarted: z.boolean().optional(),
            chatMessages: z.boolean().optional(),
            contactRequests: z.boolean().optional(),
            mentions: z.boolean().optional(),
        }).optional(),
        desktop: z.object({
            enabled: z.boolean().optional(),
            sound: z.boolean().optional(),
            showPreview: z.boolean().optional(),
            persistentNotifications: z.boolean().optional(),
        }).optional(),
    }).optional(),
    privacy: z.object({
        allowDiscovery: z.boolean().optional(),
        showOnlineStatus: z.boolean().optional(),
        showLastSeen: z.boolean().optional(),
        allowDirectCalls: z.boolean().optional(),
        allowContactRequests: z.boolean().optional(),
        shareAnalytics: z.boolean().optional(),
    }).optional(),
    meeting: z.object({
        defaultMicMuted: z.boolean().optional(),
        defaultVideoOff: z.boolean().optional(),
        preferredVideoQuality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
        defaultLayout: z.enum(['grid', 'speaker', 'presentation']).optional(),
        backgroundBlur: z.boolean().optional(),
        noiseCancellation: z.boolean().optional(),
    }).optional(),
    appearance: z.object({
        theme: z.enum(['light', 'dark', 'auto']).optional(),
        language: z.string().optional(),
        timezone: z.string().optional(),
        dateFormat: z.string().optional(),
        timeFormat: z.enum(['12h', '24h']).optional(),
    }).optional(),
})

// Feedback and rating schemas
export const feedbackSchema = z.object({
    rating: z
        .number()
        .min(1, errorMessages.min(1))
        .max(5, errorMessages.max(5)),
    feedback: z
        .string()
        .min(10, errorMessages.minLength(10))
        .max(1000, errorMessages.maxLength(1000))
        .optional(),
    categories: z.object({
        audioQuality: z.number().min(1).max(5).optional(),
        videoQuality: z.number().min(1).max(5).optional(),
        reliability: z.number().min(1).max(5).optional(),
        easeOfUse: z.number().min(1).max(5).optional(),
    }).optional(),
    improvementSuggestions: z
        .string()
        .max(500, errorMessages.maxLength(500))
        .optional(),
})

// Type inference helpers
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type CreateMeetingFormData = z.infer<typeof createMeetingSchema>
export type JoinMeetingFormData = z.infer<typeof joinMeetingSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type SendMessageFormData = z.infer<typeof sendMessageSchema>
export type AddContactFormData = z.infer<typeof addContactSchema>
export type SearchFormData = z.infer<typeof searchSchema>
export type SendInvitationFormData = z.infer<typeof sendInvitationSchema>
export type UpdatePreferencesFormData = z.infer<typeof updatePreferencesSchema>
export type FeedbackFormData = z.infer<typeof feedbackSchema>

// Validation utility functions
export const validateField = <T>(schema: z.ZodSchema<T>, value: unknown) => {
    try {
        schema.parse(value)
        return { success: true, error: null }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors[0]?.message || 'Validation failed'
            }
        }
        return { success: false, error: 'Validation failed' }
    }
}

export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown) => {
    try {
        const result = schema.parse(data)
        return { success: true, data: result, errors: null }
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.errors.reduce((acc, err) => {
                const path = err.path.join('.')
                acc[path] = err.message
                return acc
            }, {} as Record<string, string>)
            return { success: false, data: null, errors }
        }
        return { success: false, data: null, errors: { general: 'Validation failed' } }
    }
}

// Password strength checker
export const checkPasswordStrength = (password: string) => {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[@$!%*?&]/.test(password),
        noCommon: !['password', '12345678', 'qwerty'].includes(password.toLowerCase()),
    }

    const score = Object.values(checks).filter(Boolean).length
    const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'

    return { checks, score, strength }
}

// Email validation helper
export const isValidEmail = (email: string): boolean => {
    return emailRegex.test(email)
}

// Username validation helper
export const isValidUsername = (username: string): boolean => {
    return usernameRegex.test(username)
}

// Room ID validation helper
export const isValidRoomId = (roomId: string): boolean => {
    return roomIdRegex.test(roomId)
}