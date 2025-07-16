import { useState, useCallback, useEffect } from "react";
import { useSocket } from "./useSocket";
import { WS_EVENTS } from "@/utils/constants";
import { toast } from "react-hot-toast";

interface RecordingState {
  isRecording: boolean;
  recordingId?: string;
  startTime?: Date;
  duration?: number;
  participantCount?: number;
  status: 'idle' | 'starting' | 'recording' | 'stopping' | 'error';
}

interface RecordingSettings {
  includeAudio: boolean;
  includeVideo: boolean;
  includeScreenShare: boolean;
  quality: 'low' | 'medium' | 'high';
}

interface UseRecordingReturn {
  recordingState: RecordingState;
  recordingSettings: RecordingSettings;
  startRecording: (settings?: Partial<RecordingSettings>) => Promise<boolean>;
  stopRecording: () => Promise<boolean>;
  getRecordingStatus: () => Promise<void>;
  updateRecordingSettings: (settings: Partial<RecordingSettings>) => void;
  getMeetingRecordings: () => Promise<unknown[]>;
  deleteRecording: (recordingId: string) => Promise<boolean>;
  downloadRecording: (recordingId: string) => Promise<string | null>;
}

export const useRecording = (meetingId?: string): UseRecordingReturn => {
  const { socket, emit } = useSocket();
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    status: 'idle',
  });

  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>({
    includeAudio: true,
    includeVideo: true,
    includeScreenShare: true,
    quality: 'medium',
  });

  /**
   * Start recording
   */
  const startRecording = useCallback(async (settings?: Partial<RecordingSettings>): Promise<boolean> => {
    if (!meetingId) {
      toast.error("No meeting ID provided");
      return false;
    }

    try {
      setRecordingState(prev => ({ ...prev, status: 'starting' }));

      const response = await fetch(`/api/v1/meetings/${meetingId}/recording/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('videomeet_access_token')}`,
        },
        body: JSON.stringify({
          settings: settings ? { ...recordingSettings, ...settings } : recordingSettings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start recording');
      }

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        recordingId: data.data.recordingId,
        startTime: new Date(),
        status: 'recording',
      }));

      // Emit recording start event
      if (socket) {
        emit(WS_EVENTS.RECORDING_START, {
          meetingId,
          participantId: socket.id,
        });
      }

      toast.success("Recording started successfully");
      return true;
    } catch (error: unknown) {
      console.error("Failed to start recording:", error);
      setRecordingState(prev => ({ ...prev, status: 'error' }));
      toast.error(error instanceof Error ? error.message : "Failed to start recording");
      return false;
    }
  }, [meetingId, socket, emit, recordingSettings]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async (): Promise<boolean> => {
    if (!meetingId) {
      toast.error("No meeting ID provided");
      return false;
    }

    try {
      setRecordingState(prev => ({ ...prev, status: 'stopping' }));

      const response = await fetch(`/api/v1/meetings/${meetingId}/recording/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('videomeet_access_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to stop recording');
      }

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        status: 'idle',
      }));

      // Emit recording stop event
      if (socket) {
        emit(WS_EVENTS.RECORDING_STOP, {
          meetingId,
          participantId: socket.id,
        });
      }

      toast.success("Recording stopped successfully");
      return true;
    } catch (error: unknown) {
      console.error("Failed to stop recording:", error);
      setRecordingState(prev => ({ ...prev, status: 'error' }));
      toast.error(error instanceof Error ? error.message : "Failed to stop recording");
      return false;
    }
  }, [meetingId, socket, emit]);

  /**
   * Get recording status
   */
  const getRecordingStatus = useCallback(async (): Promise<void> => {
    if (!meetingId) return;

    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/recording/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('videomeet_access_token')}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRecordingState(prev => ({
          ...prev,
          isRecording: data.data.isRecording,
          recordingId: data.data.recordingId,
          startTime: data.data.startTime ? new Date(data.data.startTime) : undefined,
          duration: data.data.duration,
          participantCount: data.data.participantCount,
          status: data.data.isRecording ? 'recording' : 'idle',
        }));
      }
    } catch (error: unknown) {
      console.error("Failed to get recording status:", error);
    }
  }, [meetingId]);

  /**
   * Update recording settings
   */
  const updateRecordingSettings = useCallback((settings: Partial<RecordingSettings>) => {
    setRecordingSettings(prev => ({ ...prev, ...settings }));
  }, []);

  /**
   * Get meeting recordings
   */
  const getMeetingRecordings = useCallback(async (): Promise<unknown[]> => {
    if (!meetingId) return [];

    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/recordings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('videomeet_access_token')}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return data.data || [];
      }
    } catch (error: unknown) {
      console.error("Failed to get meeting recordings:", error);
    }

    return [];
  }, [meetingId]);

  /**
   * Delete recording
   */
  const deleteRecording = useCallback(async (recordingId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/v1/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('videomeet_access_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete recording');
      }

      toast.success("Recording deleted successfully");
      return true;
    } catch (error: unknown) {
      console.error("Failed to delete recording:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete recording");
      return false;
    }
  }, []);

  /**
   * Download recording
   */
  const downloadRecording = useCallback(async (recordingId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/v1/recordings/${recordingId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('videomeet_access_token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get download URL');
      }

      return data.data.downloadUrl;
    } catch (error: unknown) {
      console.error("Failed to get download URL:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get download URL");
      return null;
    }
  }, []);

  /**
   * Set up WebSocket event listeners
   */
  useEffect(() => {
    if (!socket) return;

    // Listen for recording events from other participants
    socket.on(WS_EVENTS.RECORDING_STARTED, (data) => {
      console.log("Recording started by another participant:", data);
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        status: 'recording',
      }));
      toast.success("Recording started by meeting host");
    });

    socket.on(WS_EVENTS.RECORDING_STOPPED, (data) => {
      console.log("Recording stopped by another participant:", data);
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        status: 'idle',
      }));
      toast.success("Recording stopped by meeting host");
    });

    return () => {
      socket.off(WS_EVENTS.RECORDING_STARTED);
      socket.off(WS_EVENTS.RECORDING_STOPPED);
    };
  }, [socket]);

  /**
   * Update duration periodically while recording
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (recordingState.isRecording && recordingState.startTime) {
      interval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - prev.startTime!.getTime()) / 1000),
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recordingState.isRecording, recordingState.startTime]);

  return {
    recordingState,
    recordingSettings,
    startRecording,
    stopRecording,
    getRecordingStatus,
    updateRecordingSettings,
    getMeetingRecordings,
    deleteRecording,
    downloadRecording,
  };
};