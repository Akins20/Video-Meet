import { Types } from "mongoose";
import { APIResponse } from "../types/models";
import fs from "fs";
import path from "path";
import { promisify } from "util";

// For production, you would use a proper recording service like AWS MediaLive, Azure Media Services, etc.
// This is a basic implementation for demonstration purposes

interface RecordingMetadata {
  meetingId: string;
  participantId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  fileName?: string;
  fileSize?: number;
  status: 'starting' | 'recording' | 'stopping' | 'completed' | 'failed';
  participants: Array<{
    id: string;
    name: string;
    joinTime: Date;
    leaveTime?: Date;
  }>;
  settings: {
    includeAudio: boolean;
    includeVideo: boolean;
    includeScreenShare: boolean;
    quality: 'low' | 'medium' | 'high';
  };
}

/**
 * Recording Service
 * Handles meeting recording functionality
 */
export class RecordingService {
  private static activeRecordings: Map<string, RecordingMetadata> = new Map();
  private static recordingsDir = path.join(process.cwd(), 'recordings');

  /**
   * Initialize recordings directory
   */
  static async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.recordingsDir)) {
        fs.mkdirSync(this.recordingsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize recordings directory:', error);
    }
  }

  /**
   * Start recording a meeting
   */
  static async startRecording(
    meetingId: string,
    participantId: string,
    settings: RecordingMetadata['settings'] = {
      includeAudio: true,
      includeVideo: true,
      includeScreenShare: true,
      quality: 'medium'
    }
  ): Promise<APIResponse<{ recordingId: string }>> {
    try {
      const { Meeting } = await import("../models/Meeting");
      const { Participant } = await import("../models/Participant");

      // Find meeting and verify it exists
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return {
          success: false,
          message: "Meeting not found",
          error: { code: "MEETING_NOT_FOUND" },
        };
      }

      // Check if recording is already active
      if (this.activeRecordings.has(meetingId)) {
        return {
          success: false,
          message: "Recording is already active for this meeting",
          error: { code: "RECORDING_ALREADY_ACTIVE" },
        };
      }

      // Verify participant has permission to start recording
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      if (!participant.hasPermission('canManageRecording')) {
        return {
          success: false,
          message: "Insufficient permissions to start recording",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // Get all current participants
      const participants = await Participant.find({
        meetingId: meetingId,
        leftAt: { $exists: false }
      });

      const recordingId = `rec_${meetingId}_${Date.now()}`;
      const fileName = `recording_${recordingId}.webm`;
      const filePath = path.join(this.recordingsDir, fileName);

      // Create recording metadata
      const recordingMetadata: RecordingMetadata = {
        meetingId,
        participantId,
        startTime: new Date(),
        fileName,
        status: 'starting',
        participants: participants.map(p => ({
          id: p._id.toString(),
          name: p.displayName,
          joinTime: p.joinedAt,
        })),
        settings,
      };

      // Store recording metadata
      this.activeRecordings.set(meetingId, recordingMetadata);

      // In a real implementation, you would:
      // 1. Start a media recording server/service
      // 2. Configure it to capture audio/video streams
      // 3. Handle multiple participants and screen sharing
      // 4. Use a proper media processing pipeline

      // For this demo, we'll simulate starting the recording
      setTimeout(() => {
        const recording = this.activeRecordings.get(meetingId);
        if (recording) {
          recording.status = 'recording';
          this.activeRecordings.set(meetingId, recording);
        }
      }, 2000);

      // Update meeting with recording info
      meeting.settings.recording = true;
      await meeting.save();

      return {
        success: true,
        message: "Recording started successfully",
        data: { recordingId },
      };
    } catch (error) {
      console.error("Start recording error:", error);
      return {
        success: false,
        message: "Failed to start recording",
        error: { code: "RECORDING_START_FAILED" },
      };
    }
  }

  /**
   * Stop recording a meeting
   */
  static async stopRecording(
    meetingId: string,
    participantId: string
  ): Promise<APIResponse<{ recordingId: string; fileUrl?: string }>> {
    try {
      const { Meeting } = await import("../models/Meeting");
      const { Participant } = await import("../models/Participant");

      // Check if recording is active
      const recordingMetadata = this.activeRecordings.get(meetingId);
      if (!recordingMetadata) {
        return {
          success: false,
          message: "No active recording found for this meeting",
          error: { code: "NO_ACTIVE_RECORDING" },
        };
      }

      // Verify participant has permission to stop recording
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      if (!participant.hasPermission('canManageRecording')) {
        return {
          success: false,
          message: "Insufficient permissions to stop recording",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // Update recording metadata
      recordingMetadata.status = 'stopping';
      recordingMetadata.endTime = new Date();
      recordingMetadata.duration = Math.floor(
        (recordingMetadata.endTime.getTime() - recordingMetadata.startTime.getTime()) / 1000
      );

      // In a real implementation, you would:
      // 1. Stop the media recording server/service
      // 2. Process and finalize the recording file
      // 3. Upload to cloud storage
      // 4. Generate thumbnails, transcripts, etc.

      // For this demo, we'll simulate stopping the recording
      setTimeout(() => {
        const recording = this.activeRecordings.get(meetingId);
        if (recording) {
          recording.status = 'completed';
          // Generate a mock file URL
          const fileUrl = `/api/v1/recordings/${meetingId}/${recording.fileName}`;
          
          // In production, you would save this to a database
          console.log(`Recording completed: ${fileUrl}`);
          
          // Clean up active recording
          this.activeRecordings.delete(meetingId);
        }
      }, 3000);

      // Update meeting
      const meeting = await Meeting.findById(meetingId);
      if (meeting) {
        meeting.settings.recording = false;
        await meeting.save();
      }

      const recordingId = `rec_${meetingId}_${recordingMetadata.startTime.getTime()}`;
      
      return {
        success: true,
        message: "Recording stopped successfully",
        data: { 
          recordingId,
          fileUrl: `/api/v1/recordings/${meetingId}/${recordingMetadata.fileName}`
        },
      };
    } catch (error) {
      console.error("Stop recording error:", error);
      return {
        success: false,
        message: "Failed to stop recording",
        error: { code: "RECORDING_STOP_FAILED" },
      };
    }
  }

  /**
   * Get recording status for a meeting
   */
  static async getRecordingStatus(
    meetingId: string
  ): Promise<APIResponse<{ 
    isRecording: boolean; 
    recordingId?: string; 
    startTime?: Date; 
    duration?: number;
    participantCount?: number;
  }>> {
    try {
      const recordingMetadata = this.activeRecordings.get(meetingId);
      
      if (!recordingMetadata) {
        return {
          success: true,
          message: "No active recording",
          data: { isRecording: false },
        };
      }

      const duration = recordingMetadata.endTime 
        ? recordingMetadata.duration
        : Math.floor((Date.now() - recordingMetadata.startTime.getTime()) / 1000);

      return {
        success: true,
        message: "Recording status retrieved successfully",
        data: {
          isRecording: recordingMetadata.status === 'recording',
          recordingId: `rec_${meetingId}_${recordingMetadata.startTime.getTime()}`,
          startTime: recordingMetadata.startTime,
          duration,
          participantCount: recordingMetadata.participants.length,
        },
      };
    } catch (error) {
      console.error("Get recording status error:", error);
      return {
        success: false,
        message: "Failed to get recording status",
        error: { code: "RECORDING_STATUS_FAILED" },
      };
    }
  }

  /**
   * Get all recordings for a meeting
   */
  static async getMeetingRecordings(
    meetingId: string
  ): Promise<APIResponse<Array<{
    id: string;
    fileName: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    participantCount: number;
    fileSize?: number;
    downloadUrl: string;
  }>>> {
    try {
      // In a real implementation, you would query a database
      // For now, we'll return mock data
      return {
        success: true,
        message: "Meeting recordings retrieved successfully",
        data: [],
      };
    } catch (error) {
      console.error("Get meeting recordings error:", error);
      return {
        success: false,
        message: "Failed to get meeting recordings",
        error: { code: "RECORDINGS_FETCH_FAILED" },
      };
    }
  }

  /**
   * Delete a recording
   */
  static async deleteRecording(
    recordingId: string,
    participantId: string
  ): Promise<APIResponse<void>> {
    try {
      const { Participant } = await import("../models/Participant");

      // Verify participant has permission to delete recordings
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return {
          success: false,
          message: "Participant not found",
          error: { code: "PARTICIPANT_NOT_FOUND" },
        };
      }

      if (!participant.hasPermission('canManageRecording')) {
        return {
          success: false,
          message: "Insufficient permissions to delete recording",
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        };
      }

      // In a real implementation, you would:
      // 1. Delete the file from storage
      // 2. Remove database record
      // 3. Clean up any related data

      return {
        success: true,
        message: "Recording deleted successfully",
        data: undefined,
      };
    } catch (error) {
      console.error("Delete recording error:", error);
      return {
        success: false,
        message: "Failed to delete recording",
        error: { code: "RECORDING_DELETE_FAILED" },
      };
    }
  }

  /**
   * Clean up stale recordings
   */
  static async cleanupStaleRecordings(): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [meetingId, recording] of this.activeRecordings) {
        if (now - recording.startTime.getTime() > maxAge) {
          console.log(`Cleaning up stale recording for meeting ${meetingId}`);
          this.activeRecordings.delete(meetingId);
        }
      }
    } catch (error) {
      console.error("Cleanup stale recordings error:", error);
    }
  }

  /**
   * Get all active recordings
   */
  static getActiveRecordings(): Map<string, RecordingMetadata> {
    return new Map(this.activeRecordings);
  }
}

export default RecordingService;