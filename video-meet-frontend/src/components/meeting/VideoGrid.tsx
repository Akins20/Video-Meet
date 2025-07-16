/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { FC, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useMeetingCore } from "@/hooks/meeting/useMeetingCore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { MeetingParticipant } from "@/types/meeting";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Wifi, 
  WifiOff, 
  Pin,
  MoreVertical,
  Volume2,
  VolumeX,
  UserPlus,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
  isPinned: boolean;
  isLocal: boolean;
  streamId?: string;
}

interface VideoGridProps {
  className?: string;
}

const gridLayoutClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-2",
  5: "grid-cols-2 lg:grid-cols-3",
  6: "grid-cols-2 lg:grid-cols-3",
  7: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  8: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  9: "grid-cols-3 lg:grid-cols-3",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const participantVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    rotateY: -15
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    rotateY: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    rotateY: 15,
    transition: {
      duration: 0.3
    }
  }
};

const speakingVariants = {
  speaking: {
    scale: 1.02,
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.5)",
    transition: {
      duration: 0.2
    }
  },
  notSpeaking: {
    scale: 1,
    boxShadow: "0 0 0 0px rgba(59, 130, 246, 0)",
    transition: {
      duration: 0.3
    }
  }
};

const VideoGrid: FC<VideoGridProps> = ({ className }) => {
  // Hooks
  const { user } = useAuth();
  const { 
    participants: meetingParticipants,
    localParticipant,
    participantCount,
    getMeetingLink
  } = useMeetingCore();
  
  const { 
    localStream,
    participants: webrtcParticipants,
    mediaState
  } = useWebRTC();

  const { getConnectionQuality } = useSocket();

  // State
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);

  // Convert meeting participants to array format with proper typing
  const participantsArray: MeetingParticipant[] = Array.isArray(meetingParticipants) 
    ? meetingParticipants 
    : Object.values(meetingParticipants || {});

  // Create local participant object
  const localParticipantData: Participant = {
    id: 'local',
    name: localParticipant?.displayName || 
          (user?.firstName ? `${user.firstName} ${user.lastName}` : 'You'),
    avatar: user?.avatar,
    isAudioEnabled: mediaState.audioEnabled,
    isVideoEnabled: mediaState.videoEnabled,
    isSpeaking: false, // TODO: Implement speaking detection
    connectionQuality: getConnectionQuality ? getConnectionQuality() : 'good',
    isPinned: pinnedParticipant === 'local',
    isLocal: true,
    streamId: 'local-stream'
  };

  // Convert remote participants to our format with proper typing
  const remoteParticipants: Participant[] = participantsArray.map((participant: MeetingParticipant) => ({
    id: participant.id,
    name: participant.displayName || 'Unknown',
    avatar: participant.avatar,
    isAudioEnabled: participant.mediaState?.audioEnabled || false,
    isVideoEnabled: participant.mediaState?.videoEnabled || false,
    isSpeaking: false, // TODO: Implement speaking detection
    connectionQuality: participant.connectionQuality?.latency < 100 ? 'good' : 'poor',
    isPinned: pinnedParticipant === participant.id,
    isLocal: false,
    streamId: participant.id
  }));

  // Combine all participants
  const allParticipants = [localParticipantData, ...remoteParticipants];
  const totalParticipants = allParticipants.length;
  
  // Determine grid layout
  const getGridCols = (count: number): string => {
    if (count <= 9) return gridLayoutClasses[count as keyof typeof gridLayoutClasses];
    return "grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  };

  const getConnectionIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
      case 'good':
        return <Wifi className="w-3 h-3 text-green-400" />;
      case 'fair':
        return <Wifi className="w-3 h-3 text-yellow-400" />;
      case 'poor':
        return <WifiOff className="w-3 h-3 text-red-400" />;
      default:
        return <Wifi className="w-3 h-3 text-gray-400" />;
    }
  };

  const handlePinParticipant = (participantId: string) => {
    setPinnedParticipant(prev => prev === participantId ? null : participantId);
  };

  const handleInviteUsers = () => {
    const link = getMeetingLink();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success('Meeting link copied to clipboard!');
    } else {
      toast.success('Share this link: ' + link);
    }
  };

  const ParticipantTile: FC<{ participant: Participant; index: number }> = ({ 
    participant, 
    index 
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Set up video stream for this participant
    useEffect(() => {
      if (!videoRef.current) return;

      if (participant.isLocal && localStream && participant.isVideoEnabled) {
        videoRef.current.srcObject = localStream;
      } else if (!participant.isLocal) {
        // Get remote stream from WebRTC participants
        const webrtcParticipant = webrtcParticipants.get(participant.id);
        if (webrtcParticipant?.stream && participant.isVideoEnabled) {
          videoRef.current.srcObject = webrtcParticipant.stream;
        }
      }
    }, [participant, localStream, webrtcParticipants]);

    return (
      <motion.div
        layout
        layoutId={participant.id}
        variants={participantVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        className={`
          relative aspect-video rounded-xl overflow-hidden
          bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800
          border border-slate-700/50
          shadow-lg group cursor-pointer
          ${participant.isPinned ? 'ring-2 ring-blue-400/50' : ''}
        `}
        onClick={() => handlePinParticipant(participant.id)}
      >
        {/* Speaking indicator border */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          variants={speakingVariants}
          animate={participant.isSpeaking ? "speaking" : "notSpeaking"}
        />

        {/* Video element or avatar placeholder */}
        <div className="absolute inset-0">
          {participant.isVideoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={participant.isLocal}
              className={`w-full h-full object-cover ${
                participant.isLocal ? 'scale-x-[-1]' : ''
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              {participant.avatar ? (
                <motion.img
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                />
              ) : (
                <motion.div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Top controls */}
        <motion.div
          className="absolute top-3 left-3 right-3 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0, y: -10 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          {/* Connection quality */}
          <div 
            className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg"
            title={`Connection: ${participant.connectionQuality}`}
          >
            {getConnectionIcon(participant.connectionQuality)}
          </div>

          {/* Actions menu */}
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white"
            onClick={(e) => {
              e.stopPropagation();
              toast.success('Participant options coming soon');
            }}
          >
            <MoreVertical className="w-3 h-3" />
          </Button>
        </motion.div>

        {/* Bottom info bar */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 + 0.2 }}
        >
          <div className="flex items-center justify-between">
            {/* Participant name */}
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm truncate max-w-[120px]">
                {participant.name}
                {participant.isLocal && " (You)"}
              </span>
              
              {participant.isPinned && (
                <Pin className="w-3 h-3 text-blue-400" />
              )}
            </div>

            {/* Media controls */}
            <div className="flex items-center gap-1">
              {/* Audio indicator */}
              <motion.div
                className={`p-1.5 rounded-lg ${
                  participant.isAudioEnabled 
                    ? 'bg-green-500/80 text-white' 
                    : 'bg-red-500/80 text-white'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {participant.isAudioEnabled ? (
                  <Mic className="w-3 h-3" />
                ) : (
                  <MicOff className="w-3 h-3" />
                )}
              </motion.div>

              {/* Video indicator */}
              <motion.div
                className={`p-1.5 rounded-lg ${
                  participant.isVideoEnabled 
                    ? 'bg-blue-500/80 text-white' 
                    : 'bg-gray-500/80 text-white'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {participant.isVideoEnabled ? (
                  <Video className="w-3 h-3" />
                ) : (
                  <VideoOff className="w-3 h-3" />
                )}
              </motion.div>

              {/* Speaking indicator */}
              {participant.isSpeaking && (
                <motion.div
                  className="p-1.5 rounded-lg bg-blue-500/80 text-white"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    ease: [0.4, 0, 0.6, 1] as const
                  }}
                >
                  <Volume2 className="w-3 h-3" />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Local user indicator */}
        {participant.isLocal && (
          <motion.div
            className="absolute top-3 left-1/2 transform -translate-x-1/2 pointer-events-none"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-blue-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
              You
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`h-full p-6 relative ${className}`}>
      <LayoutGroup>
        <motion.div
          className={`
            grid gap-4 h-full auto-rows-fr
            ${getGridCols(totalParticipants)}
          `}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {allParticipants.map((participant, index) => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                index={index}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Empty state for solo participant */}
      {totalParticipants === 1 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="text-center text-slate-400 max-w-md">
            <UserPlus className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-lg font-medium mb-2">Waiting for others to join</p>
            <p className="text-sm mb-4">Share the meeting link to invite participants</p>
            <Button
              onClick={handleInviteUsers}
              variant="outline"
              className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 pointer-events-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Copy Meeting Link
            </Button>
          </div>
        </motion.div>
      )}

      {/* Participant count indicator */}
      {totalParticipants > 1 && (
        <motion.div
          className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
        </motion.div>
      )}
    </div>
  );
};

export default VideoGrid;