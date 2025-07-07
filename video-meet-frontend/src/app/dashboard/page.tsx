/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Video, 
    Users, 
    Clock, 
    Zap, 
    Calendar, 
    PlusCircle,
    History,
    TrendingUp,
    Activity,
    BarChart3,
    Wifi,
    WifiOff,
    Filter,
    ArrowRight,
    Menu,
    X
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QuickJoin from "@/components/dashboard/QuickJoin";
import MeetingList from "@/components/dashboard/MeetingList";
import CreateMeeting from "@/components/dashboard/CreateMeeting";
import React from "react";

const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2
        }
    }
};

const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 15
        }
    }
};

const sidebarVariants = {
    hidden: { x: -280, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 20
        }
    }
};

export default function DashboardPage() {
    const user = useSelector((state: RootState) => state.auth.user);
    const meetings = useSelector((state: RootState) => state.meeting.meetings || []);
    const participants = useSelector((state: RootState) => state.meeting.participants || []);
    const isInMeeting = useSelector((state: RootState) => !!state.meeting.currentMeeting);
    
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Get tab from URL on mount and when URL changes
    useEffect(() => {
        const getTabFromURL = () => {
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('tab') || 'overview';
            }
            return 'overview';
        };

        const handlePopState = () => {
            setActiveTab(getTabFromURL());
        };

        // Set initial tab from URL
        setActiveTab(getTabFromURL());

        // Listen for browser back/forward navigation
        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    console.log("DashboardPage rendered with user:", user);
    console.log("Meetings:", meetings);
    console.log("Participants:", participants);
    console.log("Is in meeting:", isInMeeting);
    console.log("Active tab:", activeTab);

    const sidebarItems = [
        { 
            id: "overview", 
            label: "Overview", 
            icon: BarChart3, 
            description: "Dashboard home"
        },
        { 
            id: "meetings", 
            label: "Meetings", 
            icon: Video, 
            badge: meetings.length > 0 ? meetings.length.toString() : undefined,
            description: "All your meetings"
        },
        { 
            id: "create", 
            label: "Create", 
            icon: PlusCircle,
            description: "Start new meeting"
        },
        { 
            id: "history", 
            label: "History", 
            icon: History,
            description: "Past meetings"
        },
        { 
            id: "analytics", 
            label: "Analytics", 
            icon: TrendingUp,
            description: "Insights & reports"
        }
    ];

    // Function to change tab and update URL
    const changeTab = (tabId: string) => {
        const url = new URL(window.location.href);
        if (tabId === 'overview') {
            url.searchParams.delete('tab'); // Clean URL for default tab
        } else {
            url.searchParams.set('tab', tabId);
        }
        
        // Update URL without page reload
        window.history.pushState({}, '', url.toString());
        setActiveTab(tabId);
    };

    // Real stats from Redux state
    const totalMeetings = meetings.length;
    const activeMeetings = meetings.filter(m => m.status === 'active').length;
    const completedMeetings = meetings.filter(m => m.status === 'ended').length;
    const totalParticipants = participants.length;

    const quickStats = [
        { 
            icon: Users, 
            label: "Total Participants", 
            value: totalParticipants || "0", 
            color: "from-blue-500 to-cyan-500",
            change: "+12%",
            trend: "up"
        },
        { 
            icon: Video, 
            label: "Total Meetings", 
            value: totalMeetings.toString(), 
            color: "from-green-500 to-emerald-500",
            change: "+8%",
            trend: "up"
        },
        { 
            icon: Activity, 
            label: "Active Now", 
            value: activeMeetings.toString(), 
            color: "from-purple-500 to-pink-500",
            change: activeMeetings > 0 ? "Live" : "None",
            trend: activeMeetings > 0 ? "up" : "stable"
        },
        { 
            icon: Clock, 
            label: "Completed", 
            value: completedMeetings.toString(), 
            color: "from-orange-500 to-red-500",
            change: "+15%",
            trend: "up"
        }
    ];

    const getCurrentTabInfo = () => {
        return sidebarItems.find(tab => tab.id === activeTab) || sidebarItems[0];
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "overview":
                return (
                    <motion.div
                        key="overview"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-8"
                    >
                        {/* Welcome Section */}
                        <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2">
                                        Welcome back, {user?.firstName || user?.username}! 👋
                                    </h1>
                                    <p className="text-slate-400 text-lg">
                                        {new Date().toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </p>
                                </div>
                                <div className="hidden md:block">
                                    {isInMeeting ? (
                                        <motion.div
                                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full border border-green-500/30"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <Wifi className="w-5 h-5" />
                                            <span className="font-medium">Currently in meeting</span>
                                        </motion.div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-400 rounded-full">
                                            <WifiOff className="w-5 h-5" />
                                            <span className="font-medium">Available</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Quick Stats */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Quick Stats</h2>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-slate-600 text-slate-300"
                                    onClick={() => changeTab('analytics')}
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    View Analytics
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {quickStats.map((stat, index) => (
                                    <motion.div
                                        key={stat.label}
                                        className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer"
                                        variants={cardVariants}
                                        whileHover={{ 
                                            scale: 1.02,
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                        }}
                                        onClick={() => {
                                            if (stat.label.includes('Meetings')) changeTab('meetings');
                                            if (stat.label.includes('History')) changeTab('history');
                                        }}
                                        custom={index}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                                                <stat.icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div className={`flex items-center gap-1 text-xs font-medium ${
                                                stat.trend === 'up' ? 'text-green-400' : 
                                                stat.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                                            }`}>
                                                {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                                                {stat.change}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-white mb-1">{String(stat.value)}</p>
                                            <p className="text-slate-400 text-sm">{stat.label}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section>
                            <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* Quick Join */}
                                <motion.div
                                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300"
                                    variants={cardVariants}
                                    whileHover={{ 
                                        scale: 1.02,
                                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">Quick Join</h3>
                                            <p className="text-slate-400 text-sm">Jump into a meeting instantly</p>
                                        </div>
                                    </div>
                                    <QuickJoin />
                                </motion.div>

                                {/* Create Meeting */}
                                <motion.div
                                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300"
                                    variants={cardVariants}
                                    whileHover={{ 
                                        scale: 1.02,
                                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                            <PlusCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">Create Meeting</h3>
                                            <p className="text-slate-400 text-sm">Start or schedule a meeting</p>
                                        </div>
                                    </div>
                                    <CreateMeeting />
                                </motion.div>

                                {/* Meeting Status */}
                                <motion.div
                                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300"
                                    variants={cardVariants}
                                    whileHover={{ 
                                        scale: 1.02,
                                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                                            {isInMeeting ? <Wifi className="w-6 h-6 text-white" /> : <WifiOff className="w-6 h-6 text-white" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">Status</h3>
                                            <p className="text-slate-400 text-sm">Your current meeting status</p>
                                        </div>
                                    </div>
                                    <div className="text-center py-4">
                                        {isInMeeting ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center gap-2 text-green-400">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                    <span className="font-medium">Currently in meeting</span>
                                                </div>
                                                <p className="text-sm text-slate-400">Meeting is active</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center gap-2 text-slate-400">
                                                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                                    <span className="font-medium">Available</span>
                                                </div>
                                                <p className="text-sm text-slate-400">Ready to join meetings</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* Recent Meetings */}
                        <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">Recent Meetings</h3>
                                        <p className="text-slate-400 text-sm">Your latest meeting activity</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    onClick={() => changeTab("meetings")}
                                >
                                    View All
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                            <MeetingList />
                        </section>
                    </motion.div>
                );

            case "meetings":
                return (
                    <motion.div
                        key="meetings"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">All Meetings</h2>
                                <p className="text-slate-400">Manage your meetings and view history</p>
                            </div>
                            <Button
                                onClick={() => changeTab("create")}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                New Meeting
                            </Button>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <MeetingList />
                        </div>
                    </motion.div>
                );

            case "create":
                return (
                    <motion.div
                        key="create"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <div>
                            <h2 className="text-2xl font-bold text-white">Create Meeting</h2>
                            <p className="text-slate-400">Start a new meeting or schedule for later</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <CreateMeeting />
                        </div>
                    </motion.div>
                );

            case "history":
                return (
                    <motion.div
                        key="history"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <div>
                            <h2 className="text-2xl font-bold text-white">Meeting History</h2>
                            <p className="text-slate-400">View your past meetings and recordings</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <div className="text-center py-12">
                                <History className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">Meeting History</h3>
                                <p className="text-slate-400 mb-6">Your completed meetings will appear here</p>
                                {completedMeetings > 0 ? (
                                    <div className="space-y-4">
                                        {meetings.filter(m => m.status === 'ended').map(meeting => (
                                            <div key={meeting.id} className="bg-slate-700/50 rounded-lg p-4 text-left">
                                                <h4 className="font-semibold text-white">{meeting.title}</h4>
                                                <p className="text-slate-400 text-sm">
                                                    {meeting.endedAt ? new Date(meeting.endedAt).toLocaleDateString() : 'Recently ended'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400">No completed meetings yet</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );

            case "analytics":
                return (
                    <motion.div
                        key="analytics"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <div>
                            <h2 className="text-2xl font-bold text-white">Analytics</h2>
                            <p className="text-slate-400">Track your meeting performance and usage</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickStats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
                                    variants={cardVariants}
                                    whileHover={{ 
                                        scale: 1.02,
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                    }}
                                    custom={index}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                                            <stat.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{String(stat.value)}</p>
                                        <p className="text-slate-400 text-sm">{stat.label}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <div className="text-center py-12">
                                <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">Detailed Analytics</h3>
                                <p className="text-slate-400">Advanced analytics coming soon</p>
                            </div>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ 
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div 
                    className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5]
                    }}
                    transition={{ 
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                />
            </div>

            {/* GitHub-Style Sidebar */}
            <motion.aside
                className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300 z-40 ${
                    isSidebarOpen ? 'w-64' : 'w-16'
                }`}
                variants={sidebarVariants}
                initial="visible"
                animate="visible"
            >
                <div className="p-4 h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between mb-6">
                        {isSidebarOpen && (
                            <motion.h2
                                className="text-lg font-semibold text-white"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                Dashboard
                            </motion.h2>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-slate-400 hover:text-white p-2"
                        >
                            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {sidebarItems.map((item, index) => (
                            <motion.button
                                key={item.id}
                                onClick={() => changeTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                                    activeTab === item.id 
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                title={!isSidebarOpen ? item.label : undefined}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {isSidebarOpen && (
                                    <>
                                        <span className="truncate">{item.label}</span>
                                        {item.badge && (
                                            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 ml-auto">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </>
                                )}
                                {!isSidebarOpen && item.badge && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                )}
                            </motion.button>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    {isSidebarOpen && (
                        <motion.div
                            className="mt-auto pt-4 border-t border-slate-700/50"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="text-xs text-slate-500 px-3">
                                <p>Video Meet Dashboard</p>
                                <p>v1.0.0</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
                {/* Page Header */}
                <div className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/30 sticky top-16 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${
                                activeTab === 'overview' ? 'from-blue-500 to-purple-600' :
                                activeTab === 'meetings' ? 'from-green-500 to-emerald-500' :
                                activeTab === 'create' ? 'from-purple-500 to-pink-500' :
                                activeTab === 'history' ? 'from-orange-500 to-red-500' :
                                activeTab === 'analytics' ? 'from-indigo-500 to-purple-500' :
                                'from-slate-500 to-slate-600'
                            } rounded-lg flex items-center justify-center`}>
                                {React.createElement(getCurrentTabInfo().icon, { className: "w-5 h-5 text-white" })}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">{getCurrentTabInfo().label}</h1>
                                <p className="text-slate-400 text-sm">{getCurrentTabInfo().description}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <main className="p-6">
                    <AnimatePresence mode="wait">
                        {renderTabContent()}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}