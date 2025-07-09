"use client";
import { FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  MoreVertical,
  Crown,
  Shield,
  User,
  UserCheck,
  Wifi,
  WifiOff,
  Pin,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Use the interface from meetingSlice.ts
interface MeetingParticipant {
  id: string;
  userId?: string;
  displayName: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'participant' | 'guest';
  socketId?: string;
  peerId?: string;
  isLocal: boolean;
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    handRaised: boolean;
  };
  connectionQuality: {
    latency?: number;
    bandwidth?: number;
    packetLoss?: number;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    lastUpdated: string;
  };
  joinedAt: string;
  lastSeen: string;
}

interface ParticipantCardProps {
  participant: MeetingParticipant;
  isSelected?: boolean;
  onSelect?: (participantId: string) => void;
  onAction?: (participantId: string, action: string) => void;
  showActions?: boolean;
}

const participantVariants = {
  hidden: { 
    opacity: 0, 
    x: -20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20
    }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  }
};

const ParticipantCard: FC<ParticipantCardProps> = ({ 
  participant, 
  isSelected = false, 
  onSelect, 
  onAction, 
  showActions = true 
}) => {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host':
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case 'moderator':
        return <Shield className="w-3 h-3 text-blue-400" />;
      case 'guest':
        return <UserCheck className="w-3 h-3 text-slate-400" />;
      default:
        return <User className="w-3 h-3 text-slate-400" />;
    }
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

  const handleActionClick = (action: string) => {
    if (onAction) {
      onAction(participant.id, action);
    }
  };

  return (
    <motion.div
      layout
      layoutId={participant.id}
      variants={participantVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <motion.div
        className={`relative p-3 rounded-xl bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/70 transition-all duration-200 ${
          participant.mediaState.handRaised ? 'ring-2 ring-yellow-400/50' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Left side - Avatar and info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {participant.avatar ? (
                <img 
                  src={participant.avatar} 
                  alt={participant.displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {participant.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              
              {/* Role badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
                {getRoleIcon(participant.role)}
              </div>

              {/* Hand raised indicator */}
              {participant.mediaState.handRaised && (
                <motion.div
                  className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ✋
                </motion.div>
              )}
            </div>

            {/* Name and status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white truncate">
                  {participant.displayName}
                  {participant.isLocal && " (You)"}
                </h4>
                {participant.role === 'host' && (
                  <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                    Host
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                {/* Connection quality */}
                {getConnectionIcon(participant.connectionQuality.quality)}
                
                {/* Status text */}
                <span className="text-xs text-slate-400 capitalize">
                  {participant.connectionQuality.quality}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Media status */}
            <div className="flex items-center gap-1">
              <motion.div
                className={`p-1.5 rounded-lg ${
                  participant.mediaState.audioEnabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {participant.mediaState.audioEnabled ? (
                  <Mic className="w-3 h-3" />
                ) : (
                  <MicOff className="w-3 h-3" />
                )}
              </motion.div>

              <motion.div
                className={`p-1.5 rounded-lg ${
                  participant.mediaState.videoEnabled 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {participant.mediaState.videoEnabled ? (
                  <Video className="w-3 h-3" />
                ) : (
                  <VideoOff className="w-3 h-3" />
                )}
              </motion.div>
            </div>

            {/* More options - only show on hover and if actions enabled */}
            {showActions && (
              <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600/50"
                  onClick={() => onSelect && onSelect(participant.id)}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Participant Actions Menu */}
        {showActions && (
          <AnimatePresence>
            {isSelected && !participant.isLocal && (
              <motion.div
                className="mt-3 pt-3 border-t border-slate-600/50"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-300 hover:text-white hover:bg-slate-600/50"
                    onClick={() => handleActionClick('pin')}
                  >
                    <Pin className="w-3 h-3 mr-1" />
                    Pin
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-300 hover:text-white hover:bg-slate-600/50"
                    onClick={() => handleActionClick('mute')}
                  >
                    <MicOff className="w-3 h-3 mr-1" />
                    Mute
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    onClick={() => handleActionClick('remove')}
                  >
                    <UserMinus className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ParticipantCard;