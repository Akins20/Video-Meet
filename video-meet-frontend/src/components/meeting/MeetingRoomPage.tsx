/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMeeting } from "@/hooks/useMeeting";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import MeetingHeader from "@/components/meeting/MeetingHeader";
import VideoGrid from "@/components/meeting/VideoGrid";
import MeetingControls from "@/components/meeting/MeetingControls";
import ChatPanel from "@/components/meeting/ChatPanel";
import SettingsPanel from "@/components/meeting/SettingsPanel";
import NotificationToast from "@/components/common/NotificationToast";
import MeetingEndModal from "@/components/meeting/MeetingEndModal";
import ParticipantList from "@/components/meeting/ParticipantList";
import MeetingRecordingIndicator from "@/components/meeting/MeetingRecordingIndicator";
import MeetingTimer from "@/components/meeting/MeetingTimer";
import { 
    MessageSquare, 
    Users, 
    Settings, 
    ChevronLeft, 
    ChevronRight,
    Maximize2,
    Minimize2,
    Loader2,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingRoomPageProps {
    roomId: string;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            duration: 0.3
        }
    }
};

const sidebarVariants = {
    hidden: { x: 320, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 20
        }
    },
    exit: {
        x: 320,
        opacity: 0,
        transition: {
            duration: 0.2
        }
    }
};

export default function MeetingRoomPage({ roomId }: MeetingRoomPageProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { 
        meeting,
        participants,
        isInMeeting,
        joinMeeting,
        leaveMeeting,
        isLoading,
        error: meetingError
    } = useMeeting();

    // Component state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activePanel, setActivePanel] = useState<"chat" | "participants" | "settings">("chat");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    // Auto-join meeting when component mounts
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        if (!isInMeeting && !isJoining && !joinError) {
            handleJoinMeeting();
        }
    }, [isAuthenticated, isInMeeting, isJoining, joinError, roomId]);

    // Handle joining the meeting
    const handleJoinMeeting = async () => {
        if (isJoining) return;

        setIsJoining(true);
        setJoinError(null);

        try {
            const result = await joinMeeting({
                roomId,
                autoEnableAudio: true,
                autoEnableVideo: true
            });

            if (!result.success) {
                setJoinError(result.error || 'Failed to join meeting');
                toast.error(result.error || 'Failed to join meeting');
            } else {
                toast.success('Successfully joined the meeting');
            }
        } catch (error) {
            console.error('Failed to join meeting:', error);
            setJoinError('An unexpected error occurred');
            toast.error('Failed to join meeting');
        } finally {
            setIsJoining(false);
        }
    };

    // Handle leaving the meeting
    const handleLeave = () => {
        setShowLeaveModal(true);
    };

    const handleConfirmLeave = async () => {
        try {
            await leaveMeeting();
            router.push('/dashboard');
        } catch (error) {
            console.error('Failed to leave meeting:', error);
            toast.error('Failed to leave meeting');
        }
    };

    // Fullscreen functionality
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Panel tabs configuration
    const panelTabs = [
        { id: "chat", label: "Chat", icon: MessageSquare },
        { id: "participants", label: "People", icon: Users, badge: participants.length },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    // Loading state while joining
    if (isJoining || isLoading) {
        return (
            <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Joining Meeting
                    </h2>
                    <p className="text-slate-400">
                        Connecting to room {roomId}...
                    </p>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (joinError || meetingError) {
        return (
            <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <motion.div
                    className="text-center max-w-md mx-auto px-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Unable to Join Meeting
                    </h2>
                    <p className="text-slate-400 mb-6">
                        {joinError || meetingError}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button
                            onClick={handleJoinMeeting}
                            className="bg-blue-500 hover:bg-blue-600"
                        >
                            Try Again
                        </Button>
                        <Button
                            onClick={() => router.push('/dashboard')}
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Main meeting interface
    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ 
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <motion.div
                className="flex flex-col h-full relative z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Meeting Header */}
                <MeetingHeader onLeave={handleLeave} />

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col relative">
                        {/* Top Bar with Recording & Timer */}
                        <motion.div
                            className="flex justify-between items-center px-6 py-3 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <MeetingRecordingIndicator />
                            <MeetingTimer />
                            
                            {/* Fullscreen Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleFullscreen}
                                className="text-slate-400 hover:text-white"
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="w-4 h-4" />
                                ) : (
                                    <Maximize2 className="w-4 h-4" />
                                )}
                            </Button>
                        </motion.div>

                        {/* Video Grid */}
                        <motion.div
                            className="flex-1 relative"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <VideoGrid />
                        </motion.div>

                        {/* Meeting Controls */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <MeetingControls />
                        </motion.div>
                    </div>

                    {/* Sidebar Toggle Button */}
                    <motion.div
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="bg-slate-800/80 backdrop-blur-sm border-slate-600 text-white hover:bg-slate-700 shadow-lg"
                        >
                            {isSidebarOpen ? (
                                <ChevronRight className="w-4 h-4" />
                            ) : (
                                <ChevronLeft className="w-4 h-4" />
                            )}
                        </Button>
                    </motion.div>

                    {/* Sidebar */}
                    <AnimatePresence mode="wait">
                        {isSidebarOpen && (
                            <motion.aside
                                className="w-80 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700/50 flex flex-col"
                                variants={sidebarVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                {/* Panel Tabs */}
                                <div className="flex border-b border-slate-700/50 bg-slate-800/30">
                                    {panelTabs.map((tab) => (
                                        <motion.button
                                            key={tab.id}
                                            onClick={() => setActivePanel(tab.id as any)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                                                activePanel === tab.id
                                                    ? 'text-blue-400 bg-slate-700/50'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                                            }`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            {tab.badge && tab.badge > 0 && (
                                                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                    {tab.badge}
                                                </span>
                                            )}
                                            
                                            {activePanel === tab.id && (
                                                <motion.div
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                                                    layoutId="activeTab"
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Panel Content */}
                                <div className="flex-1 overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        {activePanel === "chat" && (
                                            <motion.div
                                                key="chat"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="h-full"
                                            >
                                                <ChatPanel />
                                            </motion.div>
                                        )}
                                        
                                        {activePanel === "participants" && (
                                            <motion.div
                                                key="participants"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="h-full"
                                            >
                                                <ParticipantList />
                                            </motion.div>
                                        )}
                                        
                                        {activePanel === "settings" && (
                                            <motion.div
                                                key="settings"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="h-full"
                                            >
                                                <SettingsPanel />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Modals */}
            <MeetingEndModal 
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                onConfirmLeave={handleConfirmLeave} 
            />
            <NotificationToast />
        </div>
    );
}