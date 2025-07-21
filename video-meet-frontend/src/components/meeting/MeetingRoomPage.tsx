/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { useAuth } from "@/hooks/useAuth";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import MeetingHeader from "@/components/meeting/MeetingHeader";
import VideoGrid from "@/components/meeting/VideoGrid";
import MeetingControls from "@/components/meeting/MeetingControls";
import ChatPanel from "@/components/meeting/ChatPanel";
import SettingsPanel from "@/components/meeting/SettingsPanel";
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
    } = useMeeting(roomId);
    
    // Initialize WebRTC
    const { 
        initializeMedia,
        isInitialized,
        error: webrtcError
    } = useWebRTC(roomId);

    // Component state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activePanel, setActivePanel] = useState<"chat" | "participants" | "settings">("chat");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    
    // CRITICAL: Add a ref to track if we've already attempted to join
    const hasAttemptedJoin = useRef(false);
    const joinAttemptCount = useRef(0);

    // Handle sidebar panel toggling
    const handleToggleSidebar = useCallback((panel: "chat" | "participants" | "settings") => {
        if (isSidebarOpen && activePanel === panel) {
            // If the same panel is clicked and sidebar is open, close it
            setIsSidebarOpen(false);
        } else {
            // Otherwise, open the sidebar and set the active panel
            setActivePanel(panel);
            setIsSidebarOpen(true);
        }
    }, [isSidebarOpen, activePanel]);

    // Optimize debug logging - only log critical changes
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 MeetingRoomPage State:', {
                isInMeeting,
                participantCount: participants.length,
                meetingStatus: meeting?.status
            });
        }
    }, [isInMeeting, participants.length, meeting?.status]);

    // Handle joining the meeting - FIXED
    const handleJoinMeeting = useCallback(async () => {
        // Prevent multiple simultaneous join attempts
        if (isJoining || hasAttemptedJoin.current) {
            return;
        }

        // Safety check for too many attempts
        if (joinAttemptCount.current >= 1) {  // Reduced from 3 to 1
            setJoinError('Join attempt failed. Please refresh to try again.');
            return;
        }

        hasAttemptedJoin.current = true;
        joinAttemptCount.current += 1;
        setIsJoining(true);
        setJoinError(null);

        try {
            // Initialize media first
            const mediaInitialized = await initializeMedia();
            if (!mediaInitialized) {
                throw new Error('Failed to initialize media devices');
            }
            
            // Then join the meeting
            const result = await joinMeeting({
                roomId,
                autoEnableAudio: true,
                autoEnableVideo: true
            });

            if (!result.success) {
                setJoinError(result.error || 'Failed to join meeting');
                toast.error(result.error || 'Failed to join meeting');
                hasAttemptedJoin.current = false; // Allow retry on failure
            } else {
                toast.success('Successfully joined the meeting');
                // Keep hasAttemptedJoin.current = true to prevent re-joining
            }
        } catch (error) {
            setJoinError('An unexpected error occurred');
            toast.error('Failed to join meeting');
            hasAttemptedJoin.current = false; // Allow retry on exception
        } finally {
            setIsJoining(false);
        }
    }, [roomId]); // REMOVED circular dependencies

    // Auto-join meeting when component mounts - FIXED
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Only attempt to join once per room
        if (!hasAttemptedJoin.current && !isInMeeting && !isJoining) {
            handleJoinMeeting();
        }
    }, [isAuthenticated, roomId]); // REMOVED circular dependencies

    // Reset join state when roomId changes (user navigates to different room)
    useEffect(() => {
        hasAttemptedJoin.current = false;
        joinAttemptCount.current = 0;
        setJoinError(null);
        setIsJoining(false);
    }, [roomId]);

    // Reset join attempts on page load to allow fresh attempts
    useEffect(() => {
        if (typeof window !== 'undefined') {
            hasAttemptedJoin.current = false;
            joinAttemptCount.current = 0;
        }
    }, []);

    // Handle leaving the meeting
    const handleLeave = () => {
        console.log('🚪 Leave meeting requested');
        setShowLeaveModal(true);
    };

    const handleConfirmLeave = async () => {
        console.log('✅ Confirmed leave meeting');
        try {
            await leaveMeeting();
            hasAttemptedJoin.current = false; // Reset for future joins
            joinAttemptCount.current = 0;
            router.push('/dashboard');
        } catch (error) {
            console.error('❌ Failed to leave meeting:', error);
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
                        Connecting to room {roomId}... (Attempt {joinAttemptCount.current})
                    </p>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (joinError || meetingError || webrtcError) {
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
                        {joinError || meetingError || webrtcError}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button
                            onClick={() => {
                                console.log('🔄 Manual retry requested');
                                hasAttemptedJoin.current = false;
                                handleJoinMeeting();
                            }}
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

    // Debug info panel
    const debugInfo = (
        <div className="fixed top-4 left-4 bg-black/80 text-green-400 p-4 rounded text-xs font-mono z-50 max-w-md">
            <div className="text-green-300 font-bold mb-2">DEBUG INFO:</div>
            <div>Room: {roomId}</div>
            <div>In Meeting: {isInMeeting ? '✅' : '❌'}</div>
            <div>Is Joining: {isJoining ? '🔄' : '❌'}</div>
            <div>Attempted Join: {hasAttemptedJoin.current ? '✅' : '❌'}</div>
            <div>Join Attempts: {joinAttemptCount.current}</div>
            <div>Participants: {participants.length}</div>
            <div>Meeting Status: {meeting?.status || 'none'}</div>
            <div>WebRTC Initialized: {isInitialized ? '✅' : '❌'}</div>
            <div>Join Error: {joinError || 'none'}</div>
            <div>Meeting Error: {meetingError || 'none'}</div>
            <div>WebRTC Error: {webrtcError || 'none'}</div>
        </div>
    );

    // Main meeting interface
    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Debug Info */}
            {debugInfo}

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

                {/* Recording Indicator and Timer - positioned at top */}
                <div className="absolute top-20 left-6 z-20 flex items-center gap-3">
                    <MeetingRecordingIndicator />
                    <MeetingTimer />
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content Area - Video Grid */}
                    <div className="flex-1 flex flex-col relative bg-slate-800/30">
                        <div className="flex-1 relative">
                            <VideoGrid />
                        </div>
                        
                        {/* Meeting Controls */}
                        <div className="relative z-10">
                            <MeetingControls 
                                onToggleSidebar={handleToggleSidebar}
                                sidebarOpen={isSidebarOpen}
                                activePanel={activePanel}
                            />
                        </div>
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

                    {/* Sidebar - Only Chat Panel */}
                    <AnimatePresence mode="wait">
                        {isSidebarOpen && (
                            <motion.aside
                                className="w-80 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700/50 flex flex-col"
                                variants={sidebarVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                {/* Panel Tabs - Only Chat */}
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
                                                <ChatPanel meeting={meeting} participants={participants} isInMeeting={isInMeeting} />
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

            {/* Simple Leave Confirmation */}
            {showLeaveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 p-6 rounded-lg max-w-md mx-4">
                        <h3 className="text-white text-lg font-semibold mb-4">Leave Meeting?</h3>
                        <p className="text-slate-400 mb-6">Are you sure you want to leave this meeting?</p>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleConfirmLeave}
                                variant="destructive"
                                className="flex-1"
                            >
                                Leave
                            </Button>
                            <Button
                                onClick={() => setShowLeaveModal(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}