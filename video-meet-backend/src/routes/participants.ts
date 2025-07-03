import { Router } from "express";
import ParticipantController from "../controllers/ParticipantController";
import {
  requireAuth,
  requireMeetingParticipant,
  requireSelfOrModerator,
} from "../middleware/auth";
import {
  validateMediaStateUpdate,
  validateConnectionQualityUpdate,
  validateSocketIdUpdate,
  validateWebRTCSignaling,
  validateObjectIdParam,
  validatePagination,
  sanitizeInput,
} from "../middleware/validation";
import { generalRateLimit, signalingRateLimit } from "../middleware/security";

const router = Router();

/**
 * Participant Routes
 * Base path: /api/v1/participants
 */

/**
 * @route   GET /api/v1/participants/:participantId
 * @desc    Get participant details
 * @access  Private (Participants only)
 * @middleware requireMeetingParticipant, validateObjectIdParam('participantId')
 */
router.get(
  "/:participantId",
  requireMeetingParticipant, // Require meeting participant
  validateObjectIdParam("participantId"), // Validate participant ID
  ParticipantController.getParticipant // Get participant details
);

/**
 * @route   GET /api/v1/participants/history
 * @desc    Get participant's meeting history
 * @access  Private
 * @middleware requireAuth, validatePagination
 */
router.get(
  "/history",
  requireAuth, // Require authentication
  validatePagination, // Validate pagination
  ParticipantController.getParticipantHistory // Get history
);

/**
 * @route   PUT /api/v1/participants/:participantId/media
 * @desc    Update participant media state (self-service)
 * @access  Private (Self only)
 * @middleware requireMeetingParticipant, requireSelfOrModerator, sanitizeInput, validateMediaStateUpdate
 */
router.put(
  "/:participantId/media",
  requireMeetingParticipant, // Require meeting participant
  requireSelfOrModerator, // Self-service or moderator
  sanitizeInput, // Sanitize input data
  validateMediaStateUpdate, // Validate media state
  ParticipantController.updateMediaState // Update media state
);

/**
 * @route   PUT /api/v1/participants/:participantId/quality
 * @desc    Update connection quality (self-service)
 * @access  Private (Self only)
 * @middleware requireMeetingParticipant, sanitizeInput, validateConnectionQualityUpdate
 */
router.put(
  "/:participantId/quality",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  validateConnectionQualityUpdate, // Validate quality data
  ParticipantController.updateConnectionQuality // Update quality
);

/**
 * @route   PUT /api/v1/participants/:participantId/socket
 * @desc    Update socket ID for real-time communication
 * @access  Private (Self only)
 * @middleware requireMeetingParticipant, sanitizeInput, validateSocketIdUpdate
 */
router.put(
  "/:participantId/socket",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  validateSocketIdUpdate, // Validate socket ID
  ParticipantController.updateSocketId // Update socket ID
);

/**
 * @route   PUT /api/v1/participants/:participantId/permissions
 * @desc    Update participant permissions (host/moderator only)
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, sanitizeInput
 */
router.put(
  "/:participantId/permissions",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  ParticipantController.updatePermissions // Update permissions
);

/**
 * @route   PUT /api/v1/participants/:participantId/hand
 * @desc    Raise/lower hand
 * @access  Private (Self only)
 * @middleware requireMeetingParticipant, sanitizeInput
 */
router.put(
  "/:participantId/hand",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  ParticipantController.toggleHand // Toggle hand state
);

/**
 * @route   PUT /api/v1/participants/:participantId/screen-share
 * @desc    Start/stop screen sharing
 * @access  Private (Self only)
 * @middleware requireMeetingParticipant, sanitizeInput
 */
router.put(
  "/:participantId/screen-share",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  ParticipantController.toggleScreenShare // Toggle screen sharing
);

/**
 * @route   GET /api/v1/participants/:participantId/status
 * @desc    Get participant status (online/offline/connection info)
 * @access  Private (Participants only)
 * @middleware requireMeetingParticipant, validateObjectIdParam('participantId')
 */
router.get(
  "/:participantId/status",
  requireMeetingParticipant, // Require meeting participant
  validateObjectIdParam("participantId"), // Validate participant ID
  ParticipantController.getParticipantStatus // Get status
);

/**
 * @route   PUT /api/v1/participants/batch
 * @desc    Batch update multiple participants (host/moderator only)
 * @access  Private (Host/Moderator only)
 * @middleware requireMeetingParticipant, sanitizeInput
 */
router.put(
  "/batch",
  requireMeetingParticipant, // Require meeting participant
  sanitizeInput, // Sanitize input data
  ParticipantController.batchUpdateParticipants // Batch update
);

/**
 * @route   GET /api/v1/participants/:participantId/export
 * @desc    Export participant data (for analytics/compliance)
 * @access  Private (Self or Moderator)
 * @middleware requireMeetingParticipant, requireSelfOrModerator, validateObjectIdParam('participantId')
 */
router.get(
  "/:participantId/export",
  requireMeetingParticipant, // Require meeting participant
  requireSelfOrModerator, // Self-service or moderator
  validateObjectIdParam("participantId"), // Validate participant ID
  ParticipantController.exportParticipantData // Export data
);

/**
 * WebRTC Signaling Routes
 * These routes handle real-time communication signaling
 */

/**
 * @route   POST /api/v1/participants/signal
 * @desc    Handle WebRTC signaling
 * @access  Private (Meeting participants only)
 * @middleware requireMeetingParticipant, signalingRateLimit, sanitizeInput, validateWebRTCSignaling
 */
router.post(
  "/signal",
  requireMeetingParticipant, // Require meeting participant
  signalingRateLimit, // Rate limit: 1000 signals per minute
  sanitizeInput, // Sanitize input data
  validateWebRTCSignaling, // Validate signaling data
  ParticipantController.handleWebRTCSignaling // Handle signaling
);

export default router;
