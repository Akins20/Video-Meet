/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Crown,
  Shield,
  User,
  UserCheck,
  Volume2,
  Wifi,
  WifiOff,
  MoreVertical,
  Pin,
  UserMinus,
  Hand,
  HandMetal,
  Headphones,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParticipantTileProps {
  name: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
  role?: 'host' | 'moderator' | 'participant' | 'guest';
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  isLocal?: boolean;
  isPinned?: boolean;
  joinedAt?: Date;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showControls?: boolean;
  onPin?: () => void;
  onMute?: () => void;
  onRemove?: () => void;
  onClick?: () => void;
}

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
      damping: 20,
      staggerChildren: 0.05
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

const speakingVariants = {
  speaking: {
    boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.2)",
    scale: 1.02,
    transition: { 
      duration: 0.2,
      boxShadow: {
        duration: 1,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  },
  notSpeaking: {
    boxShadow: "0 0 0 0px rgba(34, 197, 94, 0), 0 0 0px rgba(34, 197, 94, 0)",
    scale: 1,
    transition: { duration: 0.3 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25
    }
  }
};

const ParticipantTile: FC<ParticipantTileProps> = ({
  name,
  avatar,
  isAudioEnabled,
  isVideoEnabled,
  isSpeaking = false,
  isHandRaised = false,
  role = 'participant',
  connectionQuality = 'good',
  isLocal = false,
  isPinned = false,
  joinedAt,
  className = "",
  size = 'medium',
  showControls = false,
  onPin,
  onMute,
  onRemove,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-16 px-3 py-2';
      case 'large':
        return 'h-24 px-5 py-4';
      default:
        return 'h-20 px-4 py-3';
    }
  };

  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return 'w-10 h-10';
      case 'large':
        return 'w-14 h-14';
      default:
        return 'w-12 h-12';
    }
  };

  const getRoleIcon = () => {
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

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
      case 'good':
        return <Wifi className="w-3 h-3 text-green-400" />;
      case 'fair':
        return <Wifi className="w-3 h-3 text-yellow-400" />;
      case 'poor':
        return <WifiOff className="w-3 h-3 text-red-400" />;
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinTime = (date: Date): string => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just joined';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ${diffMinutes % 60}m ago`;
  };

  return (
    <motion.div
      className={`
        relative group cursor-pointer rounded-xl overflow-hidden
        bg-slate-700/50 backdrop-blur-sm border border-slate-600/50
        hover:border-slate-500/70 hover:bg-slate-700/60
        transition-all duration-200
        ${getSizeClasses()}
        ${className}
      `}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Speaking indicator animation */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        variants={speakingVariants}
        animate={isSpeaking ? "speaking" : "notSpeaking"}
      />

      {/* Pinned indicator */}
      {isPinned && (
        <motion.div
          className="absolute top-2 left-2 w-5 h-5 bg-blue-500/90 rounded-full flex items-center justify-center z-10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Pin className="w-2.5 h-2.5 text-white" />
        </motion.div>
      )}

      {/* Hand raised indicator */}
      {isHandRaised && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 bg-yellow-500/90 rounded-full flex items-center justify-center z-10"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0] 
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Hand className="w-3 h-3 text-white" />
        </motion.div>
      )}

      <div className="flex items-center gap-3 h-full">
        {/* Avatar Section */}
        <div className="relative flex-shrink-0">
          {avatar ? (
            <motion.img 
              src={avatar}
              alt={name}
              className={`${getAvatarSize()} rounded-full object-cover border-2 border-slate-600`}
              variants={itemVariants}
            />
          ) : (
            <motion.div
              className={`
                ${getAvatarSize()} rounded-full 
                bg-gradient-to-br from-blue-500 to-purple-600 
                flex items-center justify-center text-white font-semibold
                ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'}
              `}
              variants={itemVariants}
            >
              {getInitials(name)}
            </motion.div>
          )}
          
          {/* Role badge */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600"
            variants={itemVariants}
          >
            {getRoleIcon()}
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <motion.h4
              className={`
                font-medium text-white truncate
                ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-base' : 'text-sm'}
              `}
              variants={itemVariants}
            >
              {name}
              {isLocal && (
                <span className="text-blue-400 font-normal"> (You)</span>
              )}
            </motion.h4>

            {/* Speaking indicator */}
            {isSpeaking && (
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1, repeat: Infinity }}
                variants={itemVariants}
              >
                <Volume2 className="w-3 h-3 text-green-400" />
                {size !== 'small' && (
                  <span className="text-xs text-green-400">Speaking</span>
                )}
              </motion.div>
            )}

            {/* Role badge for host */}
            {role === 'host' && size !== 'small' && (
              <motion.span
                className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30"
                variants={itemVariants}
              >
                Host
              </motion.span>
            )}
          </div>
          
          {/* Secondary info */}
          <motion.div
            className="flex items-center gap-2 mt-1"
            variants={itemVariants}
          >
            {/* Connection quality */}
            {getConnectionIcon()}
            
            {size !== 'small' && (
              <>
                {!isSpeaking && (
                  <span className="text-xs text-slate-400 capitalize">
                    {connectionQuality}
                  </span>
                )}
                
                {joinedAt && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">
                      {formatJoinTime(joinedAt)}
                    </span>
                  </>
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* Media Status */}
        <motion.div
          className="flex items-center gap-1 flex-shrink-0"
          variants={itemVariants}
        >
          <motion.div
            className={`
              p-1.5 rounded-lg backdrop-blur-sm transition-all duration-200
              ${isAudioEnabled 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isAudioEnabled ? (
              <Mic className="w-3 h-3" />
            ) : (
              <MicOff className="w-3 h-3" />
            )}
          </motion.div>

          <motion.div
            className={`
              p-1.5 rounded-lg backdrop-blur-sm transition-all duration-200
              ${isVideoEnabled 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isVideoEnabled ? (
              <Video className="w-3 h-3" />
            ) : (
              <VideoOff className="w-3 h-3" />
            )}
          </motion.div>
        </motion.div>

        {/* Actions Menu */}
        {showControls && !isLocal && (
          <motion.div
            className="flex-shrink-0"
            variants={itemVariants}
          >
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className={`
                  h-8 w-8 p-0 transition-all duration-200
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                  text-slate-400 hover:text-white hover:bg-slate-600/50
                `}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>

              {/* Actions Dropdown */}
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    className="absolute right-0 top-full mt-1 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl z-20 min-w-[120px]"
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="py-1">
                      {onPin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPin();
                            setShowActions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <Pin className="w-3 h-3" />
                          {isPinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}
                      
                      {onMute && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMute();
                            setShowActions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <MicOff className="w-3 h-3" />
                          Mute
                        </button>
                      )}
                      
                      {onRemove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                            setShowActions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center gap-2"
                        >
                          <UserMinus className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>

      {/* Local user indicator */}
      {isLocal && size !== 'small' && (
        <motion.div
          className="absolute bottom-2 right-2 bg-blue-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          You
        </motion.div>
      )}
    </motion.div>
  );
};

export default ParticipantTile;