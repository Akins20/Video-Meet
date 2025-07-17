/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";
import { FC, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Phone,
  PhoneOff,
  Settings,
  MessageSquare,
  Users,
  MoreHorizontal,
  Hand,
  HandMetal,
  Camera,
  Volume2,
  Share,
  Loader2,
  Circle,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMeetingCore } from "@/hooks/meeting/useMeetingCore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useMeetingRecording } from "@/hooks/meeting/useMeetingRecording";
import { toast } from "react-hot-toast";

interface ControlButtonProps {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  isActive: boolean;
  isEnabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  tooltip?: string;
  className?: string;
  badge?: number;
}

const containerVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
      staggerChildren: 0.05
    }
  }
};

const buttonVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 10
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25
    }
  }
};

const ControlButton: FC<ControlButtonProps> = ({
  icon,
  activeIcon,
  isActive,
  isEnabled = true,
  isLoading = false,
  onClick,
  variant = 'secondary',
  tooltip,
  className,
  badge
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getButtonStyles = () => {
    if (!isEnabled || isLoading) {
      return "bg-slate-700/50 text-slate-500 cursor-not-allowed";
    }

    switch (variant) {
      case 'primary':
        return isActive 
          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25" 
          : "bg-slate-700/80 text-slate-300 hover:bg-blue-500/20 hover:text-blue-400";
      case 'danger':
        return isActive 
          ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25" 
          : "bg-slate-700/80 text-slate-300 hover:bg-red-500/20 hover:text-red-400";
      default:
        return isActive 
          ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25" 
          : "bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 hover:text-white";
    }
  };

  return (
    <motion.div
      className="relative"
      variants={buttonVariants}
      whileHover={{ scale: isEnabled && !isLoading ? 1.05 : 1 }}
      whileTap={{ scale: isEnabled && !isLoading ? 0.95 : 1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Button
        onClick={isEnabled && !isLoading ? onClick : undefined}
        className={`
          relative h-12 w-12 rounded-xl border border-slate-600/50 
          backdrop-blur-sm transition-all duration-200
          ${getButtonStyles()}
          ${className}
        `}
        disabled={!isEnabled || isLoading}
      >
        {/* Icon with smooth transition */}
        <motion.div
          className="relative"
          animate={{ 
            scale: isActive ? 1.1 : 1,
            rotate: isActive ? 5 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            isActive && activeIcon ? activeIcon : icon
          )}
        </motion.div>

        {/* Badge for participant count, etc. */}
        {badge !== undefined && badge > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {badge > 99 ? '99+' : badge}
          </motion.div>
        )}

        {/* Active state glow */}
        {isActive && !isLoading && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 -z-10"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: [0.4, 0, 0.6, 1] as const
            }}
          />
        )}
      </Button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && tooltip && !isLoading && (
          <motion.div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800/90 backdrop-blur-sm text-white text-xs rounded-lg border border-slate-700/50 whitespace-nowrap"
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800/90" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface MeetingControlsProps {
  onToggleSidebar?: (panel: "chat" | "participants" | "settings") => void;
  sidebarOpen?: boolean;
  activePanel?: "chat" | "participants" | "settings";
}

const MeetingControls: FC<MeetingControlsProps> = ({ 
  onToggleSidebar,
  sidebarOpen = false,
  activePanel = "chat"
}) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isOperating, setIsOperating] = useState({
    audio: false,
    video: false,
    screen: false,
    recording: false,
    leaving: false
  });
  
  const { 
    leaveMeeting,
    isHost,
    participantCount,
    canPerformAction,
    meeting
  } = useMeetingCore();
  
  const {
    mediaState,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  } = useWebRTC(meeting?.roomId);

  const {
    isRecording,
    recordingStatus,
    startRecording,
    stopRecording
  } = useMeetingRecording();

  // Handle audio toggle with loading state
  const handleToggleAudio = useCallback(async () => {
    if (isOperating.audio) return;

    setIsOperating(prev => ({ ...prev, audio: true }));
    try {
      await toggleAudio();
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Failed to toggle microphone');
    } finally {
      setIsOperating(prev => ({ ...prev, audio: false }));
    }
  }, [toggleAudio, isOperating.audio]);

  // Handle video toggle with loading state
  const handleToggleVideo = useCallback(async () => {
    if (isOperating.video) return;

    setIsOperating(prev => ({ ...prev, video: true }));
    try {
      await toggleVideo();
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('Failed to toggle camera');
    } finally {
      setIsOperating(prev => ({ ...prev, video: false }));
    }
  }, [toggleVideo, isOperating.video]);

  // Handle screen share with loading state
  const handleScreenShare = useCallback(async () => {
    if (isOperating.screen) return;

    // Check if screen sharing is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast.error('Screen sharing is not supported in this browser');
      return;
    }

    if (!canPerformAction('share_screen')) {
      toast.error('You do not have permission to share screen');
      return;
    }

    setIsOperating(prev => ({ ...prev, screen: true }));
    try {
      if (mediaState.screenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      toast.error('Failed to toggle screen sharing');
    } finally {
      setIsOperating(prev => ({ ...prev, screen: false }));
    }
  }, [
    mediaState.screenSharing, 
    startScreenShare, 
    stopScreenShare, 
    canPerformAction,
    isOperating.screen
  ]);

  // Handle recording toggle with loading state
  const handleToggleRecording = useCallback(async () => {
    if (isOperating.recording) return;

    if (!canPerformAction('start_recording')) {
      toast.error('You do not have permission to record this meeting');
      return;
    }

    setIsOperating(prev => ({ ...prev, recording: true }));
    try {
      if (isRecording) {
        const result = await stopRecording();
        if (result.success) {
          toast.success('Recording stopped');
        } else {
          toast.error(result.error || 'Failed to stop recording');
        }
      } else {
        const result = await startRecording();
        if (result.success) {
          toast.success('Recording started');
        } else {
          toast.error(result.error || 'Failed to start recording');
        }
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      toast.error('Failed to toggle recording');
    } finally {
      setIsOperating(prev => ({ ...prev, recording: false }));
    }
  }, [
    isRecording, 
    startRecording, 
    stopRecording, 
    canPerformAction,
    isOperating.recording
  ]);

  // Handle leave meeting
  const handleLeave = useCallback(async () => {
    if (isOperating.leaving) return;

    setIsOperating(prev => ({ ...prev, leaving: true }));
    try {
      await leaveMeeting();
    } catch (error) {
      console.error('Failed to leave meeting:', error);
      toast.error('Failed to leave meeting');
      setIsOperating(prev => ({ ...prev, leaving: false }));
    }
  }, [leaveMeeting, isOperating.leaving]);

  // Handle raise hand
  const handleRaiseHand = useCallback(() => {
    setHandRaised(prev => !prev);
    // TODO: Emit to other participants via socket
    // socket.emit('hand-raised', { meetingId: meeting?.id, raised: !handRaised });
    toast.success(handRaised ? 'Hand lowered' : 'Hand raised');
  }, [handRaised]);

  // Handle settings
  const handleSettings = useCallback(() => {
    setShowMoreOptions(false);
    onToggleSidebar?.("settings");
  }, [onToggleSidebar]);

  // Handle camera switch
  const handleCameraSwitch = useCallback(async () => {
    setShowMoreOptions(false);
    // This would cycle through available cameras
    try {
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      
      if (cameras.length > 1) {
        toast.success('Camera switching functionality would cycle through available cameras');
      } else {
        toast.success('Only one camera available');
      }
    } catch (error) {
      toast.error('Failed to enumerate cameras');
    }
  }, []);

  // Handle audio settings
  const handleAudioSettings = useCallback(() => {
    setShowMoreOptions(false);
    // This would open audio device selection
    toast.success('Audio settings would open here');
  }, []);

  // Handle share meeting
  const handleShareMeeting = useCallback(() => {
    setShowMoreOptions(false);
    // This would copy meeting link or show sharing options
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Meeting link copied to clipboard');
    } else {
      toast.success('Share meeting functionality would open here');
    }
  }, []);

  return (
    <motion.div
      className="relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Main Control Bar */}
      <div className="flex justify-center items-center py-4 px-6">
        <div className="flex items-center gap-3 bg-slate-800/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-6 py-3 shadow-2xl">
          
          {/* Audio Control */}
          <ControlButton
            icon={<Mic className="w-5 h-5" />}
            activeIcon={<MicOff className="w-5 h-5" />}
            isActive={!mediaState.audioEnabled}
            isLoading={isOperating.audio}
            onClick={handleToggleAudio}
            variant={mediaState.audioEnabled ? 'secondary' : 'danger'}
            tooltip={
              isOperating.audio 
                ? 'Processing...' 
                : mediaState.audioEnabled 
                  ? 'Mute microphone' 
                  : 'Unmute microphone'
            }
          />

          {/* Video Control */}
          <ControlButton
            icon={<Video className="w-5 h-5" />}
            activeIcon={<VideoOff className="w-5 h-5" />}
            isActive={!mediaState.videoEnabled}
            isLoading={isOperating.video}
            onClick={handleToggleVideo}
            variant={mediaState.videoEnabled ? 'secondary' : 'danger'}
            tooltip={
              isOperating.video 
                ? 'Processing...' 
                : mediaState.videoEnabled 
                  ? 'Turn off camera' 
                  : 'Turn on camera'
            }
          />

          {/* Screen Share */}
          <ControlButton
            icon={<Monitor className="w-5 h-5" />}
            activeIcon={<MonitorOff className="w-5 h-5" />}
            isActive={mediaState.screenSharing}
            isLoading={isOperating.screen}
            isEnabled={canPerformAction('share_screen')}
            onClick={handleScreenShare}
            variant="primary"
            tooltip={
              !navigator.mediaDevices?.getDisplayMedia 
                ? 'Screen sharing not supported'
                : !canPerformAction('share_screen')
                  ? 'No permission to share screen'
                  : isOperating.screen 
                    ? 'Processing...'
                    : mediaState.screenSharing 
                      ? 'Stop sharing' 
                      : 'Share screen'
            }
          />

          {/* Recording */}
          <ControlButton
            icon={<Circle className="w-5 h-5" />}
            activeIcon={<Square className="w-5 h-5" />}
            isActive={isRecording}
            isLoading={isOperating.recording || recordingStatus === 'starting' || recordingStatus === 'stopping'}
            isEnabled={canPerformAction('start_recording')}
            onClick={handleToggleRecording}
            variant={isRecording ? 'danger' : 'primary'}
            tooltip={
              !canPerformAction('start_recording')
                ? 'No permission to record meeting'
                : isOperating.recording 
                  ? 'Processing...'
                  : recordingStatus === 'starting'
                    ? 'Starting recording...'
                    : recordingStatus === 'stopping'
                      ? 'Stopping recording...'
                      : isRecording 
                        ? 'Stop recording' 
                        : 'Start recording'
            }
          />

          {/* Divider */}
          <div className="w-px h-8 bg-slate-600/50 mx-2" />

          {/* Raise Hand */}
          <ControlButton
            icon={<Hand className="w-5 h-5" />}
            activeIcon={<HandMetal className="w-5 h-5" />}
            isActive={handRaised}
            onClick={handleRaiseHand}
            variant="primary"
            tooltip={handRaised ? 'Lower hand' : 'Raise hand'}
          />

          {/* Participants Count */}
          <ControlButton
            icon={<Users className="w-5 h-5" />}
            isActive={sidebarOpen && activePanel === "participants"}
            onClick={() => onToggleSidebar?.("participants")}
            variant="secondary"
            tooltip="View participants"
            badge={participantCount}
          />

          {/* Chat */}
          <ControlButton
            icon={<MessageSquare className="w-5 h-5" />}
            isActive={sidebarOpen && activePanel === "chat"}
            onClick={() => onToggleSidebar?.("chat")}
            variant="secondary"
            tooltip="Open chat"
          />

          {/* More Options */}
          <ControlButton
            icon={<MoreHorizontal className="w-5 h-5" />}
            isActive={showMoreOptions}
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            variant="secondary"
            tooltip="More options"
          />

          {/* Divider */}
          <div className="w-px h-8 bg-slate-600/50 mx-2" />

          {/* Leave Meeting */}
          <ControlButton
            icon={<PhoneOff className="w-5 h-5" />}
            isActive={false}
            isLoading={isOperating.leaving}
            onClick={handleLeave}
            variant="danger"
            tooltip={isOperating.leaving ? 'Leaving...' : 'Leave meeting'}
            className="w-14"
          />
        </div>
      </div>

      {/* Secondary Controls - More Options */}
      <AnimatePresence>
        {showMoreOptions && (
          <motion.div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-xl px-4 py-2 shadow-xl">
              
              <ControlButton
                icon={<Settings className="w-4 h-4" />}
                isActive={false}
                onClick={handleSettings}
                variant="secondary"
                tooltip="Settings"
                className="h-10 w-10"
              />

              <ControlButton
                icon={<Camera className="w-4 h-4" />}
                isActive={false}
                onClick={handleCameraSwitch}
                variant="secondary"
                tooltip="Switch camera"
                className="h-10 w-10"
              />

              <ControlButton
                icon={<Volume2 className="w-4 h-4" />}
                isActive={false}
                onClick={handleAudioSettings}
                variant="secondary"
                tooltip="Audio settings"
                className="h-10 w-10"
              />

              <ControlButton
                icon={<Share className="w-4 h-4" />}
                isActive={false}
                onClick={handleShareMeeting}
                variant="secondary"
                tooltip="Share meeting"
                className="h-10 w-10"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
    </motion.div>
  );
};

export default MeetingControls;