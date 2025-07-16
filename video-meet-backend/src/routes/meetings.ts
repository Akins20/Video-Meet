import { Router } from "express";
import MeetingController from "../controllers/MeetingController";
import ParticipantController from "../controllers/ParticipantController";
import ChatController from "../controllers/ChatController";
import RecordingController from "../controllers/RecordingController";
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
  requireAuth,
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
 * Chat Routes
 * These routes handle meeting chat functionality
 */

/**
 * @route   POST /api/v1/meetings/:meetingId/chat
 * @desc    Send a chat message
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, generalRateLimit, sanitizeInput
 */
router.post(
  "/:meetingId/chat",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit chat messages
  sanitizeInput, // Sanitize input data
  ChatController.sendMessage // Send message
);

/**
 * @route   GET /api/v1/meetings/:meetingId/chat
 * @desc    Get chat messages for a meeting
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, generalRateLimit
 */
router.get(
  "/:meetingId/chat",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  ChatController.getMessages // Get messages
);

/**
 * @route   PUT /api/v1/meetings/:meetingId/chat/:messageId
 * @desc    Edit a chat message
 * @access  Private (Message owner only)
 * @middleware requireMeetingParticipant, generalRateLimit, sanitizeInput
 */
router.put(
  "/:meetingId/chat/:messageId",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  sanitizeInput, // Sanitize input data
  ChatController.editMessage // Edit message
);

/**
 * @route   DELETE /api/v1/meetings/:meetingId/chat/:messageId
 * @desc    Delete a chat message
 * @access  Private (Message owner or moderator)
 * @middleware requireMeetingParticipant, generalRateLimit
 */
router.delete(
  "/:meetingId/chat/:messageId",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  ChatController.deleteMessage // Delete message
);

/**
 * @route   POST /api/v1/meetings/:meetingId/chat/:messageId/reactions
 * @desc    Add reaction to a message
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, generalRateLimit, sanitizeInput
 */
router.post(
  "/:meetingId/chat/:messageId/reactions",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  sanitizeInput, // Sanitize input data
  ChatController.addReaction // Add reaction
);

/**
 * @route   GET /api/v1/meetings/:meetingId/chat/stats
 * @desc    Get chat statistics
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, generalRateLimit
 */
router.get(
  "/:meetingId/chat/stats",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  ChatController.getChatStats // Get stats
);

/**
 * @route   DELETE /api/v1/meetings/:meetingId/chat
 * @desc    Clear all chat messages (host only)
 * @access  Private (Host only)
 * @middleware requireMeetingHost, generalRateLimit
 */
router.delete(
  "/:meetingId/chat",
  requireMeetingHost, // Require meeting host
  generalRateLimit, // Rate limit
  ChatController.clearChat // Clear chat
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

/**
 * Recording Routes
 * These routes handle meeting recording functionality
 */

/**
 * @route   POST /api/v1/meetings/:meetingId/recording/start
 * @desc    Start recording a meeting
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, requirePermission('canManageRecording'), generalRateLimit, sanitizeInput
 */
router.post(
  "/:meetingId/recording/start",
  requireMeetingParticipant, // Require meeting participant
  requirePermission("canManageRecording"), // Check recording permissions
  generalRateLimit, // Rate limit
  sanitizeInput, // Sanitize input data
  RecordingController.startRecording // Start recording
);

/**
 * @route   POST /api/v1/meetings/:meetingId/recording/stop
 * @desc    Stop recording a meeting
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, requirePermission('canManageRecording'), generalRateLimit
 */
router.post(
  "/:meetingId/recording/stop",
  requireMeetingParticipant, // Require meeting participant
  requirePermission("canManageRecording"), // Check recording permissions
  generalRateLimit, // Rate limit
  RecordingController.stopRecording // Stop recording
);

/**
 * @route   GET /api/v1/meetings/:meetingId/recording/status
 * @desc    Get recording status for a meeting
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, generalRateLimit
 */
router.get(
  "/:meetingId/recording/status",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  RecordingController.getRecordingStatus // Get recording status
);

/**
 * @route   GET /api/v1/meetings/:meetingId/recordings
 * @desc    Get all recordings for a meeting
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, generalRateLimit
 */
router.get(
  "/:meetingId/recordings",
  requireMeetingParticipant, // Require meeting participant
  generalRateLimit, // Rate limit
  RecordingController.getMeetingRecordings // Get meeting recordings
);

/**
 * @route   DELETE /api/v1/recordings/:recordingId
 * @desc    Delete a recording
 * @access  Private (Host/Moderator only)
 * @middleware requireAuth, generalRateLimit
 */
router.delete(
  "/recordings/:recordingId",
  requireAuth, // Require authentication
  generalRateLimit, // Rate limit
  RecordingController.deleteRecording // Delete recording
);

/**
 * @route   GET /api/v1/recordings/:recordingId/download
 * @desc    Download a recording
 * @access  Private (Meeting participants only)
 * @middleware requireAuth, generalRateLimit
 */
router.get(
  "/recordings/:recordingId/download",
  requireAuth, // Require authentication
  generalRateLimit, // Rate limit
  RecordingController.downloadRecording // Download recording
);

export default router;
