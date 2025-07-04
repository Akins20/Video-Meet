"use client";
import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
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
  Volume2,
  Search,
  Pin,
  UserMinus,
  UserPlus,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Participant {
  id: string;
  name?: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'participant' | 'guest';
  isAudioEnabled?: boolean | false;
  isVideoEnabled?: boolean | false;
  isSpeaking?: boolean | false;
  isHandRaised?: boolean | false;
  connectionQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  joinedAt: Date;
  isLocal: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

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

const speakingVariants = {
  speaking: {
    boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.5)",
    transition: { duration: 0.2 }
  },
  notSpeaking: {
    boxShadow: "0 0 0 0px rgba(34, 197, 94, 0)",
    transition: { duration: 0.3 }
  }
};

const ParticipantList: FC = () => {
  const participants = useSelector((state: RootState) => state.meeting.participants || []);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  // Mock local participant - replace with actual logic
  const localParticipant: Participant = {
    id: 'local',
    name: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
    role: 'host',
    isAudioEnabled: true,
    isVideoEnabled: true,
    isSpeaking: false,
    isHandRaised: false,
    connectionQuality: 'excellent',
    joinedAt: new Date(),
    isLocal: true,
    avatar: currentUser?.avatar
  };

  // Combine local and remote participants
  const allParticipants = [localParticipant, ...Object.values(participants)];

  // Filter participants based on search
  const filteredParticipants = allParticipants.filter(p =>
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort participants: host first, then moderators, then participants, then guests
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    const roleOrder: Record<Participant["role"], number> = { host: 0, moderator: 1, participant: 2, guest: 3 };
    return roleOrder[a.role as Participant["role"]] - roleOrder[b.role as Participant["role"]];
  });

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

  const ParticipantCard: FC<{ participant: Participant }> = ({ participant }) => (
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
        className="relative p-3 rounded-xl bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/70 transition-all duration-200"
        variants={speakingVariants}
        animate={participant.isSpeaking ? "speaking" : "notSpeaking"}
      >
        {/* Speaking indicator */}
        {participant.isSpeaking && (
          <motion.div
            className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl -z-10"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        <div className="flex items-center justify-between">
          {/* Left side - Avatar and info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {participant.avatar ? (
                <img 
                  src={participant.avatar} 
                  alt={participant.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {participant?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              
              {/* Role badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
                {getRoleIcon(participant.role)}
              </div>

              {/* Hand raised indicator */}
              {participant.isHandRaised && (
                <motion.div
                  className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center"
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
                  {participant.name}
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
                {getConnectionIcon(participant.connectionQuality || 'good')}
                
                {/* Speaking indicator */}
                {participant.isSpeaking && (
                  <motion.div
                    className="flex items-center gap-1"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Volume2 className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Speaking</span>
                  </motion.div>
                )}
                
                {!participant.isSpeaking && (
                  <span className="text-xs text-slate-400 capitalize">
                    {participant.connectionQuality}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Media status */}
            <div className="flex items-center gap-1">
              <motion.div
                className={`p-1.5 rounded-lg ${
                  participant.isAudioEnabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {participant.isAudioEnabled ? (
                  <Mic className="w-3 h-3" />
                ) : (
                  <MicOff className="w-3 h-3" />
                )}
              </motion.div>

              <motion.div
                className={`p-1.5 rounded-lg ${
                  participant.isVideoEnabled 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {participant.isVideoEnabled ? (
                  <Video className="w-3 h-3" />
                ) : (
                  <VideoOff className="w-3 h-3" />
                )}
              </motion.div>
            </div>

            {/* More options - only show on hover */}
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600/50"
                onClick={() => setSelectedParticipant(
                  selectedParticipant === participant.id ? null : participant.id
                )}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Participant Actions Menu */}
        <AnimatePresence>
          {selectedParticipant === participant.id && !participant.isLocal && (
            <motion.div
              className="mt-3 pt-3 border-t border-slate-600/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-300 hover:text-white hover:bg-slate-600/50"
                >
                  <Pin className="w-3 h-3 mr-1" />
                  Pin
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-300 hover:text-white hover:bg-slate-600/50"
                >
                  <MicOff className="w-3 h-3 mr-1" />
                  Mute
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <UserMinus className="w-3 h-3 mr-1" />
                  Remove
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-800/30 backdrop-blur-sm">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-slate-700/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">Participants</h3>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {sortedParticipants.length}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        className="p-4 border-b border-slate-700/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 rounded-lg"
          />
        </div>
      </motion.div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {sortedParticipants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {filteredParticipants.length === 0 && searchQuery && (
          <motion.div
            className="flex flex-col items-center justify-center py-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-400">No participants found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search</p>
          </motion.div>
        )}
      </div>

      {/* Footer Actions */}
      <motion.div
        className="p-4 border-t border-slate-700/50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          variant="outline"
          className="w-full bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 hover:text-white"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Participants
        </Button>
      </motion.div>
    </div>
  );
};

export default ParticipantList;