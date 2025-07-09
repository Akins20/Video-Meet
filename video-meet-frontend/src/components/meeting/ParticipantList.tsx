"use client";
import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { 
  Search,
  UserPlus,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ParticipantCard from "./ParticipantCard";

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

const ParticipantList: FC = () => {
  const participants = useSelector((state: RootState) => state.meeting.participants || {});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  // Convert participants object to array
  const allParticipants = Object.values(participants) as MeetingParticipant[];

  // Filter participants based on search
  const filteredParticipants = allParticipants.filter(p =>
    p.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort participants: host first, then moderators, then participants, then guests
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    const roleOrder = { host: 0, moderator: 1, participant: 2, guest: 3 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipant(selectedParticipant === participantId ? null : participantId);
  };

  const handleParticipantAction = (participantId: string, action: string) => {
    console.log(`Action: ${action} on participant: ${participantId}`);
    // Handle actions like pin, mute, remove
    switch (action) {
      case 'pin':
        // Handle pin action
        break;
      case 'mute':
        // Handle mute action
        break;
      case 'remove':
        // Handle remove action
        break;
      default:
        break;
    }
  };

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
          onClick={() => console.log('Add participant')}
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
                isSelected={selectedParticipant === participant.id}
                onSelect={handleParticipantSelect}
                onAction={handleParticipantAction}
                showActions={true}
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

        {/* No participants state */}
        {allParticipants.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
              <UserPlus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-400">No participants yet</p>
            <p className="text-xs text-slate-500 mt-1">Invite people to join the meeting</p>
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
          onClick={() => console.log('Manage participants')}
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Participants
        </Button>
      </motion.div>
    </div>
  );
};

export default ParticipantList;