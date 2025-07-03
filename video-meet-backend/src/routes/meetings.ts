import { Router } from "express";
import MeetingController from "../controllers/MeetingController";
import ParticipantController from "../controllers/ParticipantController";
import {
  requireAuth,
  optionalAuth,
  requireMeetingHost,
  requireMeetingParticipant,
  requireModerator,
  requirePermission,
  requireSelfOrModerator,
} from "../middleware/auth";
import {
  validateMeetingCreation,
  validateMeetingJoin,
  validateMeetingUpdate,
  validateMediaStateUpdate,
  validateConnectionQualityUpdate,
  validateRoleChange,
  validateParticipantRemoval,
  validatePagination,
  validateObjectIdParam,
  validateRoomIdParam,
  sanitizeInput,
} from "../middleware/validation";
import {
  meetingCreationRateLimit,
  generalRateLimit,
  signalingRateLimit,
} from "../middleware/security";

const router = Router();

/**
 * Meeting Routes
 * Base path: /api/v1/meetings
 */

/**
 * @route   POST /api/v1/meetings
 * @desc    Create a new meeting
 * @access  Private
 * @middleware requireAuth, meetingCreationRateLimit, sanitizeInput, validateMeetingCreation
 */
router.post(
  "/",
  requireAuth, // Require authentication
  meetingCreationRateLimit, // Rate limit: 50 meetings per hour
  sanitizeInput, // Sanitize input data
  validateMeetingCreation, // Validate meeting data
  MeetingController.createMeeting // Create meeting
);

/**
 * @route   GET /api/v1/meetings
 * @desc    Get user's meetings
 * @access  Private
 * @middleware requireAuth, validatePagination
 */
router.get(
  "/",
  requireAuth, // Require authentication
  validatePagination, // Validate page/limit params
  MeetingController.getUserMeetings // Get user meetings
);

/**
 * @route   GET /api/v1/meetings/search
 * @desc    Search public meetings
 * @access  Public
 * @middleware optionalAuth, generalRateLimit, validatePagination
 */
router.get(
  "/search",
  optionalAuth, // Optional authentication
  generalRateLimit, // General rate limiting
  validatePagination, // Validate pagination
  MeetingController.searchMeetings // Search meetings
);

/**
 * @route   GET /api/v1/meetings/:roomId
 * @desc    Get meeting details by room ID
 * @access  Public
 * @middleware optionalAuth, validateRoomIdParam
 */
router.get(
  "/:roomId",
  optionalAuth, // Optional authentication
  validateRoomIdParam, // Validate room ID format
  MeetingController.getMeeting // Get meeting details
);

/**
 * @route   POST /api/v1/meetings/:roomId/join
 * @desc    Join a meeting
 * @access  Public (supports guests)
 * @middleware optionalAuth, sanitizeInput, validateMeetingJoin
 */
router.post(
  "/:roomId/join",
  optionalAuth, // Optional authentication (supports guests)
  sanitizeInput, // Sanitize input data
  validateMeetingJoin, // Validate join data
  MeetingController.joinMeeting // Join meeting
);

/**
 * @route   PUT /api/v1/meetings/:meetingId
 * @desc    Update meeting settings
 * @access  Private (Host only)
 * @middleware requireAuth, requireMeetingHost, sanitizeInput, validateMeetingUpdate
 */
router.put(
  "/:meetingId",
  requireAuth, // Require authentication
  requireMeetingHost, // Require meeting host
  sanitizeInput, // Sanitize input data
  validateMeetingUpdate, // Validate update data
  MeetingController.updateMeeting // Update meeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/end
 * @desc    End a meeting
 * @access  Private (Host only)
 * @middleware requireAuth, requireMeetingHost
 */
router.post(
  "/:meetingId/end",
  requireAuth, // Require authentication
  requireMeetingHost, // Require meeting host
  MeetingController.endMeeting // End meeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/leave
 * @desc    Leave a meeting
 * @access  Private (Participants only)
 * @middleware requireMeetingParticipant
 */
router.post(
  "/:meetingId/leave",
  requireMeetingParticipant, // Require meeting participant
  MeetingController.leaveMeeting // Leave meeting
);

/**
 * @route   GET /api/v1/meetings/:meetingId/participants
 * @desc    Get meeting participants
 * @access  Private (Participants only)
 * @middleware requireMeetingParticipant
 */
router.get(
  "/:meetingId/participants",
  requireMeetingParticipant, // Require meeting participant
  MeetingController.getMeetingParticipants // Get participants
);

/**
 * @route   GET /api/v1/meetings/:meetingId/stats
 * @desc    Get meeting statistics
 * @access  Private (Participants only)
 * @middleware requireMeetingParticipant
 */
router.get(
  "/:meetingId/stats",
  requireMeetingParticipant, // Require meeting participant
  MeetingController.getMeetingStats // Get meeting statistics
);

/**
 * @route   GET /api/v1/meetings/:meetingId/health
 * @desc    Get meeting health status
 * @access  Private (Participants only)
 * @middleware requireMeetingParticipant
 */
router.get(
  "/:meetingId/health",
  requireMeetingParticipant, // Require meeting participant
  MeetingController.getMeetingHealth // Get meeting health
);

/**
 * @route   DELETE /api/v1/meetings/:meetingId/participants/:participantId
 * @desc    Remove participant from meeting
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, requirePermission('canRemoveParticipants'), sanitizeInput, validateParticipantRemoval
 */
router.delete(
  "/:meetingId/participants/:participantId",
  requireMeetingParticipant, // Require meeting participant
  requirePermission("canRemoveParticipants"), // Check permissions
  sanitizeInput, // Sanitize input data
  validateParticipantRemoval, // Validate removal data
  MeetingController.removeParticipant // Remove participant
);

/**
 * @route   PUT /api/v1/meetings/:meetingId/participants/:participantId/role
 * @desc    Change participant role
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, requireModerator, sanitizeInput, validateRoleChange
 */
router.put(
  "/:meetingId/participants/:participantId/role",
  requireMeetingParticipant, // Require meeting participant
  requireModerator, // Require moderator role
  sanitizeInput, // Sanitize input data
  validateRoleChange, // Validate role change
  MeetingController.changeParticipantRole // Change role
);

/**
 * @route   PUT /api/v1/meetings/:meetingId/participants/:participantId/mute
 * @desc    Mute/unmute participant
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, requirePermission('canMuteOthers'), sanitizeInput
 */
router.put(
  "/:meetingId/participants/:participantId/mute",
  requireMeetingParticipant, // Require meeting participant
  requirePermission("canMuteOthers"), // Check mute permissions
  sanitizeInput, // Sanitize input data
  MeetingController.muteParticipant // Mute participant
);

/**
 * @route   PUT /api/v1/meetings/:meetingId/participants/:participantId/media
 * @desc    Update participant media state
 * @access  Private (Self or Moderator)
 * @middleware requireMeetingParticipant, requireSelfOrModerator, sanitizeInput, validateMediaStateUpdate
 */
router.put(
  "/:meetingId/participants/:participantId/media",
  requireMeetingParticipant, // Require meeting participant
  requireSelfOrModerator, // Self-service or moderator
  sanitizeInput, // Sanitize input data
  validateMediaStateUpdate, // Validate media state
  MeetingController.updateMediaState // Update media state
);

/**
 * @route   PUT /api/v1/meetings/:meetingId/participants/:participantId/quality
 * @desc    Update connection quality
 * @access  Private (Self only)
 * @middleware requireMeetingParticipant, sanitizeInput, validateConnectionQualityUpdate
 */
router.put(
  "/:meetingId/participants/:participantId/quality",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  validateConnectionQualityUpdate, // Validate quality data
  MeetingController.updateConnectionQuality // Update quality
);

/**
 * WebRTC Signaling Routes
 * These routes handle real-time communication signaling
 */

/**
 * @route   POST /api/v1/meetings/signal
 * @desc    Handle WebRTC signaling
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, signalingRateLimit, sanitizeInput
 */
router.post(
  "/signal",
  requireMeetingParticipant, // Require meeting participant
  signalingRateLimit, // Rate limit signaling
  sanitizeInput, // Sanitize input data
  ParticipantController.handleWebRTCSignaling // Handle signaling
);

export default router;
