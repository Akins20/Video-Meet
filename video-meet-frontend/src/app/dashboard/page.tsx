/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
    Video, 
    Users, 
    Clock, 
    Settings, 
    Zap, 
    Calendar, 
    MessageCircle,
    Home,
    PlusCircle,
    History,
    User,
    Bell,
    Search,
    Menu,
    X,
    TrendingUp,
    Activity,
    Globe,
    Shield,
    Headphones,
    BarChart3,
    Star,
    ChevronRight,
    Phone,
    Monitor,
    Wifi,
    WifiOff
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuickJoin from "@/components/dashboard/QuickJoin";
import MeetingList from "@/components/dashboard/MeetingList";
import CreateMeeting from "@/components/dashboard/CreateMeeting";
import UserProfile from "@/components/dashboard/UserProfile";

const sidebarVariants = {
    hidden: { x: -300, opacity: 0 },
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

export default function DashboardPage() {
    const user = useSelector((state: RootState) => state.auth.user);
    const meetings = useSelector((state: RootState) => state.meeting.meetings || []);
    const participants = useSelector((state: RootState) => state.meeting.participants || []);
    const isInMeeting = useSelector((state: RootState) => !!state.meeting.currentMeeting);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");

    console.log("DashboardPage rendered with user:", user);
    console.log("Meetings:", meetings);
    console.log("Participants:", participants);


    const sidebarItems = [
        { id: "dashboard", label: "Dashboard", icon: Home },
        { id: "meetings", label: "Meetings", icon: Video, badge: meetings.length > 0 ? meetings.length.toString() : undefined },
        { id: "create", label: "Create", icon: PlusCircle },
        { id: "history", label: "History", icon: History },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "settings", label: "Settings", icon: Settings },
    ];

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
            color: "from-blue-500 to-cyan-500" 
        },
        { 
            icon: Video, 
            label: "Total Meetings", 
            value: totalMeetings.toString(), 
            color: "from-green-500 to-emerald-500" 
        },
        { 
            icon: Activity, 
            label: "Active Now", 
            value: activeMeetings.toString(), 
            color: "from-purple-500 to-pink-500" 
        },
        { 
            icon: Clock, 
            label: "Completed", 
            value: completedMeetings.toString(), 
            color: "from-orange-500 to-red-500" 
        }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case "dashboard":
                return (
                    <motion.div
                        key="dashboard"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        {/* Quick Stats */}
                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickStats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300"
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
                        </section>

                        {/* Quick Actions */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                                    onClick={() => setActiveTab("meetings")}
                                >
                                    View All
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
                                onClick={() => setActiveTab("create")}
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

            case "settings":
                return (
                    <motion.div
                        key="settings"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <div>
                            <h2 className="text-2xl font-bold text-white">Settings</h2>
                            <p className="text-slate-400">Manage your account and preferences</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                            <UserProfile />
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

            {/* Sidebar */}
            <motion.aside
                className={`fixed left-0 top-0 h-full bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300 z-50 ${
                    isSidebarOpen ? 'w-64' : 'w-16'
                }`}
                variants={sidebarVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="p-4 h-full flex flex-col">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-8">
                        <motion.div
                            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                            whileHover={{ scale: 1.1 }}
                        >
                            <Video className="w-5 h-5 text-white" />
                        </motion.div>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h1 className="text-xl font-bold text-white">Video Meet</h1>
                                <p className="text-xs text-slate-400">Professional</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {sidebarItems.map((item, index) => (
                            <motion.button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                                    activeTab === item.id 
                                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <item.icon className="w-5 h-5" />
                                {isSidebarOpen && (
                                    <>
                                        <span className="font-medium">{item.label}</span>
                                        {item.badge && (
                                            <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </motion.button>
                        ))}
                    </nav>

                    {/* User Profile in Sidebar */}
                    {isSidebarOpen && (
                        <motion.div
                            className="mt-auto p-4 bg-slate-700/50 rounded-xl border border-slate-600/50"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user?.firstName || user?.username || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
                {/* Header */}
                <motion.header
                    className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 p-4 sticky top-0 z-40"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="text-slate-400 hover:text-white"
                            >
                                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </Button>
                            
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    Good evening, {user?.firstName || user?.username || 'User'}!
                                </h2>
                                <p className="text-sm text-slate-400">
                                    {new Date().toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search meetings..."
                                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 w-64"
                                />
                            </div>

                            {/* Notifications */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="relative text-slate-400 hover:text-white"
                            >
                                <Bell className="w-5 h-5" />
                                {meetings.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                                )}
                            </Button>

                            {/* Status */}
                            {isInMeeting && (
                                <motion.div
                                    className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium">In Meeting</span>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.header>

                {/* Tab Content */}
                <motion.main className="p-6">
                    <AnimatePresence mode="wait">
                        {renderTabContent()}
                    </AnimatePresence>
                </motion.main>
            </div>
        </div>
    );
}