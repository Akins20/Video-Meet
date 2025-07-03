import { Request, Response, NextFunction } from "express";
import {
  body,
  param,
  query,
  validationResult,
  ValidationChain,
} from "express-validator";
import { Types } from "mongoose";

/**
 * Validation result handler
 * Processes validation results and returns formatted errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === "field" ? error.path : "unknown",
      message: error.msg,
      value: error.type === "field" ? error.value : undefined,
    }));

    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: {
        code: "VALIDATION_ERROR",
        details: formattedErrors,
      },
    });
    return;
  }

  next();
};

/**
 * Custom validator for MongoDB ObjectId
 */
const isValidObjectId = (value: string): boolean => {
  return Types.ObjectId.isValid(value);
};

/**
 * Custom validator for room ID format (ABC-123-XYZ)
 */
const isValidRoomId = (value: string): boolean => {
  return /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(value);
};

/**
 * Custom validator for strong password
 */
const isStrongPassword = (value: string): boolean => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
    value
  );
};

/**
 * User Registration Validation
 */
export const validateUserRegistration = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),

  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .toLowerCase(),

  body("firstName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("lastName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .custom(isStrongPassword)
    .withMessage(
      "Password must contain at least 8 characters with uppercase, lowercase, number, and special character"
    ),

  handleValidationErrors,
];

/**
 * User Login Validation
 */
export const validateUserLogin = [
  body("emailOrUsername")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Email or username must be at least 3 characters")
    .toLowerCase(),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

/**
 * Password Reset Request Validation
 */
export const validatePasswordResetRequest = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),

  handleValidationErrors,
];

/**
 * Password Reset Validation
 */
export const validatePasswordReset = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid reset token format"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .custom(isStrongPassword)
    .withMessage(
      "Password must contain at least 8 characters with uppercase, lowercase, number, and special character"
    ),

  handleValidationErrors,
];

/**
 * Meeting Creation Validation
 */
export const validateMeetingCreation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Meeting title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Meeting description cannot exceed 500 characters"),

  body("password")
    .optional()
    .isLength({ min: 4 })
    .withMessage("Meeting password must be at least 4 characters"),

  body("type")
    .optional()
    .isIn(["instant", "scheduled", "recurring"])
    .withMessage("Meeting type must be instant, scheduled, or recurring"),

  body("scheduledAt")
    .optional()
    .isISO8601()
    .withMessage("Scheduled time must be a valid ISO 8601 date")
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error("Scheduled time must be in the future");
      }
      return true;
    }),

  body("timezone")
    .optional()
    .matches(/^[A-Za-z]+\/[A-Za-z_]+$/)
    .withMessage("Invalid timezone format"),

  body("maxParticipants")
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage("Maximum participants must be between 2 and 100"),

  // Recurring meeting validation
  body("recurring.frequency")
    .if(body("type").equals("recurring"))
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("Recurring frequency must be daily, weekly, or monthly"),

  body("recurring.interval")
    .if(body("type").equals("recurring"))
    .isInt({ min: 1, max: 12 })
    .withMessage("Recurring interval must be between 1 and 12"),

  body("recurring.daysOfWeek")
    .if(body("recurring.frequency").equals("weekly"))
    .isArray({ min: 1, max: 7 })
    .withMessage("Weekly meetings must specify at least one day of week")
    .custom((days: number[]) => {
      if (!days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
        throw new Error(
          "Days of week must be integers between 0 (Sunday) and 6 (Saturday)"
        );
      }
      return true;
    }),

  body("recurring.maxOccurrences")
    .if(body("type").equals("recurring"))
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Max occurrences must be between 1 and 100"),

  // Settings validation
  body("settings.maxVideoQuality")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Max video quality must be low, medium, or high"),

  handleValidationErrors,
];

/**
 * Meeting Join Validation
 */
export const validateMeetingJoin = [
  param("roomId")
    .custom(isValidRoomId)
    .withMessage("Invalid room ID format. Expected format: ABC-123-XYZ"),

  body("password")
    .optional()
    .isString()
    .withMessage("Password must be a string"),

  body("guestName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Guest name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s'-]+$/)
    .withMessage(
      "Guest name can only contain letters, numbers, spaces, hyphens, and apostrophes"
    ),

  body("deviceInfo.userAgent")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("User agent cannot exceed 500 characters"),

  body("deviceInfo.deviceType")
    .optional()
    .isIn(["web", "mobile", "desktop"])
    .withMessage("Device type must be web, mobile, or desktop"),

  handleValidationErrors,
];

/**
 * Meeting Update Validation
 */
export const validateMeetingUpdate = [
  param("meetingId").custom(isValidObjectId).withMessage("Invalid meeting ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Meeting title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Meeting description cannot exceed 500 characters"),

  body("password")
    .optional()
    .isLength({ min: 4 })
    .withMessage("Meeting password must be at least 4 characters"),

  body("maxParticipants")
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage("Maximum participants must be between 2 and 100"),

  handleValidationErrors,
];

/**
 * Participant Media State Update Validation
 */
export const validateMediaStateUpdate = [
  param("participantId")
    .custom(isValidObjectId)
    .withMessage("Invalid participant ID"),

  body("audioEnabled")
    .optional()
    .isBoolean()
    .withMessage("Audio enabled must be a boolean"),

  body("videoEnabled")
    .optional()
    .isBoolean()
    .withMessage("Video enabled must be a boolean"),

  body("screenSharing")
    .optional()
    .isBoolean()
    .withMessage("Screen sharing must be a boolean"),

  body("handRaised")
    .optional()
    .isBoolean()
    .withMessage("Hand raised must be a boolean"),

  handleValidationErrors,
];

/**
 * Connection Quality Update Validation
 */
export const validateConnectionQualityUpdate = [
  param("participantId")
    .custom(isValidObjectId)
    .withMessage("Invalid participant ID"),

  body("latency")
    .optional()
    .isFloat({ min: 0, max: 5000 })
    .withMessage("Latency must be between 0 and 5000 milliseconds"),

  body("bandwidth")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bandwidth must be a positive number"),

  body("packetLoss")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Packet loss must be between 0 and 100 percent"),

  body("quality")
    .optional()
    .isIn(["poor", "fair", "good", "excellent"])
    .withMessage("Quality must be poor, fair, good, or excellent"),

  handleValidationErrors,
];

/**
 * Participant Role Change Validation
 */
export const validateRoleChange = [
  param("participantId")
    .custom(isValidObjectId)
    .withMessage("Invalid participant ID"),

  body("newRole")
    .isIn(["host", "moderator", "participant", "guest"])
    .withMessage("Role must be host, moderator, participant, or guest"),

  handleValidationErrors,
];

/**
 * Participant Removal Validation
 */
export const validateParticipantRemoval = [
  param("participantId")
    .custom(isValidObjectId)
    .withMessage("Invalid participant ID"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),

  handleValidationErrors,
];

/**
 * Pagination Validation
 */
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  handleValidationErrors,
];

/**
 * ObjectId Parameter Validation
 */
export const validateObjectIdParam = (paramName: string) => [
  param(paramName).custom(isValidObjectId).withMessage(`Invalid ${paramName}`),

  handleValidationErrors,
];

/**
 * Room ID Parameter Validation
 */
export const validateRoomIdParam = [
  param("roomId")
    .custom(isValidRoomId)
    .withMessage("Invalid room ID format. Expected format: ABC-123-XYZ"),

  handleValidationErrors,
];

/**
 * Socket ID Update Validation
 */
export const validateSocketIdUpdate = [
  param("participantId")
    .custom(isValidObjectId)
    .withMessage("Invalid participant ID"),

  body("socketId")
    .isString()
    .isLength({ min: 10, max: 50 })
    .withMessage("Socket ID must be between 10 and 50 characters"),

  handleValidationErrors,
];

/**
 * WebRTC Signaling Validation
 */
export const validateWebRTCSignaling = [
  body("to").notEmpty().withMessage("Target participant ID is required"),

  body("from").notEmpty().withMessage("Source participant ID is required"),

  body("type")
    .isIn(["offer", "answer", "ice-candidate"])
    .withMessage("Signal type must be offer, answer, or ice-candidate"),

  // Validate offer/answer SDP
  body("offer")
    .if(body("type").equals("offer"))
    .isObject()
    .withMessage("Offer must be an object"),

  body("offer.type")
    .if(body("type").equals("offer"))
    .equals("offer")
    .withMessage('Offer type must be "offer"'),

  body("offer.sdp")
    .if(body("type").equals("offer"))
    .isString()
    .withMessage("Offer SDP must be a string"),

  body("answer")
    .if(body("type").equals("answer"))
    .isObject()
    .withMessage("Answer must be an object"),

  body("answer.type")
    .if(body("type").equals("answer"))
    .equals("answer")
    .withMessage('Answer type must be "answer"'),

  body("answer.sdp")
    .if(body("type").equals("answer"))
    .isString()
    .withMessage("Answer SDP must be a string"),

  // Validate ICE candidate
  body("candidate")
    .if(body("type").equals("ice-candidate"))
    .isObject()
    .withMessage("ICE candidate must be an object"),

  handleValidationErrors,
];

/**
 * Chat Message Validation
 */
export const validateChatMessage = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message content must be between 1 and 1000 characters"),

  body("type")
    .optional()
    .isIn(["text", "emoji", "file"])
    .withMessage("Message type must be text, emoji, or file"),

  body("fileInfo")
    .if(body("type").equals("file"))
    .isObject()
    .withMessage("File info is required for file messages"),

  body("fileInfo.filename")
    .if(body("type").equals("file"))
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage("Filename must be between 1 and 255 characters"),

  body("fileInfo.fileSize")
    .if(body("type").equals("file"))
    .isInt({ min: 1 })
    .withMessage("File size must be a positive integer"),

  body("fileInfo.mimeType")
    .if(body("type").equals("file"))
    .isString()
    .withMessage("MIME type is required for file messages"),

  handleValidationErrors,
];

/**
 * Generic sanitization middleware
 * Trims string fields and sanitizes input
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Recursively trim string values in request body
  const trimStrings = (obj: any): any => {
    if (typeof obj === "string") {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(trimStrings);
    }
    if (obj && typeof obj === "object") {
      const trimmedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        trimmedObj[key] = trimStrings(value);
      }
      return trimmedObj;
    }
    return obj;
  };

  if (req.body && typeof req.body === "object") {
    req.body = trimStrings(req.body);
  }

  next();
};

/**
 * File upload validation
 */
export const validateFileUpload = [
  body("fileSize")
    .isInt({ min: 1, max: 50 * 1024 * 1024 }) // Max 50MB
    .withMessage("File size must be between 1 byte and 50MB"),

  body("mimeType")
    .isIn([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ])
    .withMessage("File type not allowed"),

  body("filename")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage("Filename contains invalid characters"),

  handleValidationErrors,
];

export default {
  // Authentication validations
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,

  // Meeting validations
  validateMeetingCreation,
  validateMeetingJoin,
  validateMeetingUpdate,

  // Participant validations
  validateMediaStateUpdate,
  validateConnectionQualityUpdate,
  validateRoleChange,
  validateParticipantRemoval,
  validateSocketIdUpdate,

  // Communication validations
  validateWebRTCSignaling,
  validateChatMessage,
  validateFileUpload,

  // Utility validations
  validatePagination,
  validateObjectIdParam,
  validateRoomIdParam,

  // Middleware
  handleValidationErrors,
  sanitizeInput,
};
