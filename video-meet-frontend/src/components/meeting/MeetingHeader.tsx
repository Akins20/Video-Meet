"use client";
import { FC, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
    LogOut, 
    Users, 
    Lock, 
    Globe, 
    Shield,
    Copy,
    ChevronDown,
    Video,
    Wifi,
    WifiOff,
    Signal,
    AlertTriangle
} from "lucide-react";
import { toast } from "react-hot-toast";

interface MeetingHeaderProps {
    onLeave: () => void;
}

const MeetingHeader: FC<MeetingHeaderProps> = ({ onLeave }) => {
    const currentMeeting = useSelector((state: RootState) => state.meeting.currentMeeting);
    interface MeetingParticipant {
        displayName?: string;
        role?: string;
        // Add other fields as needed
    }
    
    const participants: MeetingParticipant[] = useSelector((state: RootState) => Object.values(state.meeting.participants || {}));
    const user = useSelector((state: RootState) => state.auth.user);
    const [showDetails, setShowDetails] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("excellent");

    const meetingTitle = currentMeeting?.title || "Untitled Meeting";
    const roomId = currentMeeting?.roomId || "ABC-123-XYZ";
    const isHost = currentMeeting?.hostId === user?.id;
    const participantCount = participants.length;

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success("Room ID copied to clipboard!");
        } catch (error) {
            toast.error("Failed to copy room ID");
        }
    };

    const getConnectionIcon = () => {
        switch (connectionQuality) {
            case "excellent":
                return <Signal className="w-4 h-4 text-green-400" />;
            case "good":
                return <Wifi className="w-4 h-4 text-yellow-400" />;
            case "poor":
                return <WifiOff className="w-4 h-4 text-red-400" />;
            default:
                return <Signal className="w-4 h-4 text-green-400" />;
        }
    };

    const getConnectionText = () => {
        switch (connectionQuality) {
            case "excellent":
                return "Excellent";
            case "good":
                return "Good";
            case "poor":
                return "Poor";
            default:
                return "Excellent";
        }
    };

    return (
        <motion.header
            className="flex justify-between items-center px-6 py-4 bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Left Section - Meeting Info */}
            <div className="flex items-center gap-4">
                {/* Meeting Icon */}
                <motion.div
                    className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Video className="w-5 h-5 text-white" />
                </motion.div>

                {/* Meeting Details */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <motion.h2 
                            className="text-lg font-semibold text-white truncate max-w-64"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {meetingTitle}
                        </motion.h2>
                        
                        {/* Meeting Status Badges */}
                        <div className="flex gap-2">
                            {isHost && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Host
                                </Badge>
                            )}
                            
                            <Badge 
                                variant="outline" 
                                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 cursor-pointer"
                                onClick={copyRoomId}
                            >
                                <Copy className="w-3 h-3 mr-1" />
                                {roomId}
                            </Badge>
                        </div>
                    </div>

                    {/* Meeting Stats */}
                    <div className="flex items-center gap-4 mt-1">
                        <motion.div
                            className="flex items-center gap-1 text-sm text-slate-400"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Users className="w-4 h-4" />
                            <span>
                                {participantCount} participant{participantCount !== 1 ? 's' : ''}
                            </span>
                        </motion.div>

                        {/* Connection Quality */}
                        <motion.div
                            className="flex items-center gap-1 text-sm text-slate-400"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            {getConnectionIcon()}
                            <span>{getConnectionText()}</span>
                        </motion.div>

                        {/* Meeting Privacy */}
                        <motion.div
                            className="flex items-center gap-1 text-sm text-slate-400"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {currentMeeting?.hasPassword ? (
                                <>
                                    <Lock className="w-4 h-4" />
                                    <span>Private</span>
                                </>
                            ) : (
                                <>
                                    <Globe className="w-4 h-4" />
                                    <span>Public</span>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-3">
                {/* Meeting Details Toggle */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                    >
                        Details
                        <motion.div
                            animate={{ rotate: showDetails ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </motion.div>
                    </Button>
                </motion.div>

                {/* Leave Button */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button 
                        variant="destructive" 
                        onClick={onLeave}
                        className="bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all duration-300"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Meeting
                    </Button>
                </motion.div>
            </div>

            {/* Expandable Details Section */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        className="absolute top-full left-0 right-0 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 z-50"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Meeting Info */}
                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">Meeting Information</h4>
                                <div className="space-y-2 text-sm text-slate-400">
                                    <div>Room ID: <span className="text-white font-mono">{roomId}</span></div>
                                    <div>Status: <span className="text-green-400">Active</span></div>
                                    <div>Type: <span className="text-white">
                                        {currentMeeting?.hasPassword ? "Private" : "Public"}
                                    </span></div>
                                </div>
                            </div>

                            {/* Participants */}
                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">Participants ({participantCount})</h4>
                                <div className="space-y-1 text-sm text-slate-400 max-h-20 overflow-y-auto">
                                    {participants.slice(0, 3).map((participant, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                            <span className="text-white">{participant.displayName || `Participant ${index + 1}`}</span>
                                            {participant.role === 'host' && (
                                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                                    Host
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                    {participantCount > 3 && (
                                        <div className="text-slate-500">
                                            +{participantCount - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Connection Details */}
                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">Connection</h4>
                                <div className="space-y-2 text-sm text-slate-400">
                                    <div className="flex items-center gap-2">
                                        {getConnectionIcon()}
                                        <span>Quality: <span className="text-white">{getConnectionText()}</span></span>
                                    </div>
                                    <div>Latency: <span className="text-white">45ms</span></div>
                                    <div>Bandwidth: <span className="text-white">1.2 Mbps</span></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
};

export default MeetingHeader;