import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import RecordingService from "../services/RecordingService";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { APIResponse } from "../types/models";

/**
 * Recording Controller
 * Handles all recording-related HTTP requests
 */
export class RecordingController {
  /**
   * Start recording a meeting
   * POST /api/v1/meetings/:meetingId/recording/start
   */
  static startRecording = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      const participantId = req.participantId!;
      const { settings } = req.body;

      // Validate meeting ID
      if (!meetingId) {
        throw createError.validation("Meeting ID is required");
      }

      // Call recording service
      const result = await RecordingService.startRecording(
        meetingId,
        participantId,
        settings
      );

      if (!result.success) {
        switch (result.error?.code) {
          case "MEETING_NOT_FOUND":
            throw createError.notFound("Meeting not found");
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("Insufficient permissions to start recording");
          case "RECORDING_ALREADY_ACTIVE":
            throw createError.conflict("Recording is already active for this meeting");
          default:
            throw createError.internal("Failed to start recording");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Recording started successfully",
        data: result.data,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Stop recording a meeting
   * POST /api/v1/meetings/:meetingId/recording/stop
   */
  static stopRecording = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;
      const participantId = req.participantId!;

      // Validate meeting ID
      if (!meetingId) {
        throw createError.validation("Meeting ID is required");
      }

      // Call recording service
      const result = await RecordingService.stopRecording(meetingId, participantId);

      if (!result.success) {
        switch (result.error?.code) {
          case "NO_ACTIVE_RECORDING":
            throw createError.notFound("No active recording found for this meeting");
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("Insufficient permissions to stop recording");
          default:
            throw createError.internal("Failed to stop recording");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Recording stopped successfully",
        data: result.data,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get recording status for a meeting
   * GET /api/v1/meetings/:meetingId/recording/status
   */
  static getRecordingStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;

      // Validate meeting ID
      if (!meetingId) {
        throw createError.validation("Meeting ID is required");
      }

      // Call recording service
      const result = await RecordingService.getRecordingStatus(meetingId);

      if (!result.success) {
        throw createError.internal("Failed to get recording status");
      }

      const response: APIResponse = {
        success: true,
        message: "Recording status retrieved successfully",
        data: result.data,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get all recordings for a meeting
   * GET /api/v1/meetings/:meetingId/recordings
   */
  static getMeetingRecordings = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { meetingId } = req.params;

      // Validate meeting ID
      if (!meetingId) {
        throw createError.validation("Meeting ID is required");
      }

      // Call recording service
      const result = await RecordingService.getMeetingRecordings(meetingId);

      if (!result.success) {
        throw createError.internal("Failed to get meeting recordings");
      }

      const response: APIResponse = {
        success: true,
        message: "Meeting recordings retrieved successfully",
        data: result.data,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete a recording
   * DELETE /api/v1/recordings/:recordingId
   */
  static deleteRecording = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { recordingId } = req.params;
      const participantId = req.participantId!;

      // Validate recording ID
      if (!recordingId) {
        throw createError.validation("Recording ID is required");
      }

      // Call recording service
      const result = await RecordingService.deleteRecording(recordingId, participantId);

      if (!result.success) {
        switch (result.error?.code) {
          case "PARTICIPANT_NOT_FOUND":
            throw createError.notFound("Participant not found");
          case "INSUFFICIENT_PERMISSIONS":
            throw createError.authorization("Insufficient permissions to delete recording");
          default:
            throw createError.internal("Failed to delete recording");
        }
      }

      const response: APIResponse = {
        success: true,
        message: "Recording deleted successfully",
        data: null,
      };

      res.status(200).json(response);
    }
  );

  /**
   * Download a recording
   * GET /api/v1/recordings/:recordingId/download
   */
  static downloadRecording = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { recordingId } = req.params;

      // Validate recording ID
      if (!recordingId) {
        throw createError.validation("Recording ID is required");
      }

      // In a real implementation, you would:
      // 1. Verify user has permission to download
      // 2. Generate signed URL for cloud storage
      // 3. Stream file or redirect to download URL

      // For now, return a mock response
      const response: APIResponse = {
        success: true,
        message: "Recording download initiated",
        data: {
          downloadUrl: `/api/v1/recordings/${recordingId}/file`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      };

      res.status(200).json(response);
    }
  );
}

export default RecordingController;