/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";
import { FC, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useMeeting } from "@/hooks/useMeeting";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import { 
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  Filter,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocalVideoProps {
  className?: string;
  showControls?: boolean;
  isMinimized?: boolean;
  onToggleSize?: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9,
    y: 20
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20
    }
  }
};

const controlsVariants = {
  hidden: { 
    opacity: 0, 
    y: 10
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const
    }
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as const
    }
  }
};

const overlayVariants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as const
    }
  }
};

const settingsPanelVariants = {
  hidden: { 
    opacity: 0, 
    y: 10, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const
    }
  },
  exit: { 
    opacity: 0, 
    y: 10, 
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as const
    }
  }
};

const LocalVideo: FC<LocalVideoProps> = ({ 
  className = "",
  showControls = true,
  isMinimized = false,
  onToggleSize
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  
  // Component state
  const [isHovered, setIsHovered] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTogglingMedia, setIsTogglingMedia] = useState({ video: false, audio: false });

  // Hooks
  const { user } = useAuth();
  const { meeting } = useMeeting();
  const { 
    localStream, 
    isLocalVideoEnabled,
    isLocalAudioEnabled,
    toggleVideo, 
    toggleAudio,
    error: webrtcError,
    isInitialized,
    initializeMedia
  } = useWebRTC();

  // Safely get connection quality with fallback
  const connectionQuality = 'good';

  // Derived state
  const userName = user?.firstName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.username || 'You';

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : user?.username?.charAt(0).toUpperCase() || 'U';

  // Check if meeting has recording capability (not status)
  const isRecording = meeting?.settings?.recording || false;

  // Set up video stream
  useEffect(() => {
    if (!videoRef.current) return;

    if (localStream && isLocalVideoEnabled) {
      try {
        videoRef.current.srcObject = localStream;
        setHasVideoError(false);
        
        // Cleanup previous stream reference
        if (streamCleanupRef.current) {
          streamCleanupRef.current();
        }

        // Store cleanup function
        streamCleanupRef.current = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        };
      } catch (error) {
        console.error('Failed to set video stream:', error);
        setHasVideoError(true);
      }
    } else {
      videoRef.current.srcObject = null;
      setHasVideoError(false);
    }
  }, [localStream, isLocalVideoEnabled]);

  // Handle video element errors
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleError = (event: Event) => {
      console.error('Video element error:', event);
      setHasVideoError(true);
    };

    const handleLoadedData = () => {
      setHasVideoError(false);
    };

    const handleLoadStart = () => {
      setHasVideoError(false);
    };

    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('loadstart', handleLoadStart);

    return () => {
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, []);

  // Connection quality icon
  const getConnectionIcon = useCallback(() => {
    switch (connectionQuality) {
      // case 'excellent':
      // case 'good':
      //   return <Wifi className="w-3 h-3 text-green-400" />;
      // case 'fair':
      //   return <Wifi className="w-3 h-3 text-yellow-400" />;
      // case 'poor':
      //   return <WifiOff className="w-3 h-3 text-red-400" />;
      default:
        return <Wifi className="w-3 h-3 text-gray-400" />;
    }
  }, [connectionQuality]);

  // Media control handlers
  const handleToggleVideo = useCallback(async () => {
    if (isTogglingMedia.video) return;
    
    setIsTogglingMedia(prev => ({ ...prev, video: true }));
    try {
      await toggleVideo();
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('Failed to toggle camera');
    } finally {
      setIsTogglingMedia(prev => ({ ...prev, video: false }));
    }
  }, [toggleVideo, isTogglingMedia.video]);

  const handleToggleAudio = useCallback(async () => {
    if (isTogglingMedia.audio) return;
    
    setIsTogglingMedia(prev => ({ ...prev, audio: true }));
    try {
      await toggleAudio();
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Failed to toggle microphone');
    } finally {
      setIsTogglingMedia(prev => ({ ...prev, audio: false }));
    }
  }, [toggleAudio, isTogglingMedia.audio]);

  const handleRetryMedia = useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    try {
      await initializeMedia();
      toast.success('Camera reinitialized successfully');
    } catch (error) {
      console.error('Failed to retry media initialization:', error);
      toast.error('Failed to reinitialize camera');
    } finally {
      setIsRetrying(false);
    }
  }, [initializeMedia, isRetrying]);

  const toggleMirror = useCallback(() => {
    setIsMirrored(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    onToggleSize?.();
  }, [onToggleSize]);

  const toggleBackgroundBlur = useCallback(() => {
    setBackgroundBlur(prev => !prev);
    // Note: Actual background blur would require canvas processing or WebGL
    toast.success(backgroundBlur ? 'Background blur disabled' : 'Background blur enabled');
  }, [backgroundBlur]);

  // Render video content
  const renderVideoContent = () => {
    if (hasVideoError) {
      return (
        <motion.div
          className="text-center text-slate-400"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-sm font-medium">Camera Error</p>
          <p className="text-xs mt-1 mb-3">Failed to access camera</p>
          <Button
            onClick={handleRetryMedia}
            disabled={isRetrying}
            size="sm"
            variant="outline"
            className="text-xs bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600/50"
          >
            {isRetrying ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Retry
          </Button>
        </motion.div>
      );
    }

    if (!isLocalVideoEnabled) {
      return (
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {user?.avatar ? (
            <img 
              src={user.avatar}
              alt={userName}
              className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-slate-600 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl mx-auto mb-2">
              {userInitials}
            </div>
          )}
          <p className="text-sm font-medium text-white">{userName}</p>
          <p className="text-xs text-slate-400 mt-1">Camera is off</p>
        </motion.div>
      );
    }

    if (!localStream) {
      return (
        <motion.div
          className="text-center text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-8 h-8" />
          </motion.div>
          <p className="text-xs mt-2">Initializing camera...</p>
        </motion.div>
      );
    }

    return (
      <motion.video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`
          w-full h-full object-cover transition-all duration-300
          ${isMirrored ? 'scale-x-[-1]' : ''}
        `}
        style={{
          filter: backgroundBlur ? 'blur(8px)' : 'none'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    );
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl border border-slate-700/50 
        bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800
        shadow-lg group
        ${isMinimized ? 'aspect-square w-32' : 'aspect-video w-full'}
        ${className}
      `}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: isMinimized ? 1.05 : 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Video Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {renderVideoContent()}
      </div>

      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Recording Indicator */}
      {isRecording && (
        <motion.div
          className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-2 h-2 bg-white rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          REC
        </motion.div>
      )}

      {/* Connection Quality Indicator */}
      <motion.div
        className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        title={`Connection: ${connectionQuality}`}
      >
        {getConnectionIcon()}
      </motion.div>

      {/* WebRTC Error Indicator */}
      {webrtcError && (
        <motion.div
          className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {webrtcError}
        </motion.div>
      )}

      {/* Bottom Info Bar */}
      <motion.div
        className="absolute bottom-3 left-3 right-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between">
          {/* User Name */}
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm truncate">
              {userName} {!isMinimized && "(You)"}
            </span>
          </div>

          {/* Media Status Icons */}
          <div className="flex items-center gap-1">
            <motion.div
              className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                isLocalAudioEnabled 
                  ? 'bg-green-500/80 text-white' 
                  : 'bg-red-500/80 text-white'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isTogglingMedia.audio ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isLocalAudioEnabled ? (
                <Mic className="w-3 h-3" />
              ) : (
                <MicOff className="w-3 h-3" />
              )}
            </motion.div>

            <motion.div
              className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                isLocalVideoEnabled 
                  ? 'bg-blue-500/80 text-white' 
                  : 'bg-gray-500/80 text-white'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isTogglingMedia.video ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isLocalVideoEnabled ? (
                <Camera className="w-3 h-3" />
              ) : (
                <CameraOff className="w-3 h-3" />
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Hover Controls */}
      {showControls && (
        <AnimatePresence>
          {(isHovered || showSettings) && !isMinimized && (
            <motion.div
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Top Controls */}
              <motion.div
                className="absolute top-3 left-1/2 transform -translate-x-1/2"
                variants={controlsVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleVideo}
                    disabled={isTogglingMedia.video}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    title="Toggle Camera"
                  >
                    {isTogglingMedia.video ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isLocalVideoEnabled ? (
                      <Camera className="w-4 h-4" />
                    ) : (
                      <CameraOff className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleAudio}
                    disabled={isTogglingMedia.audio}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    title="Toggle Microphone"
                  >
                    {isTogglingMedia.audio ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isLocalAudioEnabled ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <MicOff className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <div className="w-px h-6 bg-white/20" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMirror}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    title="Toggle Mirror"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  {onToggleSize && (
                    <>
                      <div className="w-px h-6 bg-white/20" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        title={isFullscreen ? "Minimize" : "Maximize"}
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 min-w-[200px]"
                    variants={settingsPanelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">Mirror Video</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleMirror}
                          className={`h-6 w-10 p-0 rounded-full transition-colors ${
                            isMirrored ? 'bg-blue-500' : 'bg-slate-600'
                          }`}
                        >
                          <motion.div
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                            animate={{ x: isMirrored ? 16 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">Background Blur</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleBackgroundBlur}
                          className={`h-6 w-10 p-0 rounded-full transition-colors ${
                            backgroundBlur ? 'bg-blue-500' : 'bg-slate-600'
                          }`}
                        >
                          <motion.div
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                            animate={{ x: backgroundBlur ? 16 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* "You" Badge for minimized view */}
      {isMinimized && (
        <motion.div
          className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-blue-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          You
        </motion.div>
      )}
    </motion.div>
  );
};

export default LocalVideo;