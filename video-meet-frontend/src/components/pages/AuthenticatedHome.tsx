"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Video,
    Users,
    Calendar,
    Clock,
    Plus,
    TrendingUp,
    Zap,
    ArrowRight,
    Coffee,
    Star,
    Activity,
    BarChart3,
    MessageSquare,
    Settings,
    Sparkles
} from "lucide-react";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            duration: 0.6
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 10
        }
    }
};

const AuthenticatedHome = () => {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.auth.user);
    const meetings = useSelector((state: RootState) => state.meeting.meetings || []);
    const isInMeeting = useSelector((state: RootState) => !!state.meeting.currentMeeting);

    // Calculate user stats
    const activeMeetings = meetings.filter(m => m.status === 'active').length;
    const upcomingMeetings = meetings.filter(m => m.status === 'waiting').length;
    const completedMeetings = meetings.filter(m => m.status === 'ended').length;

    // Get current time and greeting
    const currentHour = new Date().getHours();
    const getGreeting = () => {
        if (currentHour < 12) return "Good morning";
        if (currentHour < 17) return "Good afternoon";
        return "Good evening";
    };

    const quickActions = [
        {
            title: "Start Instant Meeting",
            description: "Begin a meeting right now",
            icon: Video,
            color: "from-blue-500 to-cyan-500",
            action: () => router.push('/dashboard?tab=create'),
            primary: true
        },
        {
            title: "Schedule Meeting",
            description: "Plan a meeting for later",
            icon: Calendar,
            color: "from-purple-500 to-pink-500",
            action: () => router.push('/dashboard?tab=create'),
            primary: false
        },
        {
            title: "Join Meeting",
            description: "Enter a meeting with ID",
            icon: Users,
            color: "from-green-500 to-emerald-500",
            action: () => router.push('/dashboard?tab=overview'),
            primary: false
        }
    ];

    const dashboardCards = [
        {
            title: "View Dashboard",
            description: "See your meeting overview and analytics",
            icon: BarChart3,
            href: "/dashboard",
            color: "from-indigo-500 to-purple-500"
        },
        {
            title: "Meeting History",
            description: "Review your past meetings",
            icon: Clock,
            href: "/dashboard?tab=history",
            color: "from-orange-500 to-red-500"
        },
        {
            title: "Analytics",
            description: "Track your meeting performance",
            icon: TrendingUp,
            href: "/dashboard?tab=analytics",
            color: "from-teal-500 to-cyan-500"
        },
        {
            title: "Settings",
            description: "Manage your account preferences",
            icon: Settings,
            href: "/settings",
            color: "from-slate-500 to-slate-600"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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

            {/* Main Content */}
            <div className="relative z-10 pt-20 px-4">
                <motion.div
                    className="max-w-6xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Welcome Header */}
                    <motion.section
                        className="text-center mb-12"
                        variants={itemVariants}
                    >
                        <motion.div
                            className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full px-6 py-3 mb-6"
                            whileHover={{ scale: 1.05 }}
                        >
                            <Coffee className="w-5 h-5 text-amber-400" />
                            <span className="text-slate-300 font-medium">
                                Welcome back to Video Meet
                            </span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                            {getGreeting()}, {user?.firstName || user?.username}! 👋
                        </h1>
                        
                        <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
                            Ready to connect and collaborate? Let us make today productive.
                        </p>

                        {/* Status Indicator */}
                        {isInMeeting ? (
                            <motion.div
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full border border-green-500/30"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="font-medium">Currently in meeting</span>
                            </motion.div>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-400 rounded-full">
                                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                <span className="font-medium">Available for meetings</span>
                            </div>
                        )}
                    </motion.section>

                    {/* Quick Stats */}
                    <motion.section
                        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
                        variants={itemVariants}
                    >
                        {[
                            { label: "Total Meetings", value: meetings.length, icon: Video, color: "text-blue-400" },
                            { label: "Active Now", value: activeMeetings, icon: Activity, color: "text-green-400" },
                            { label: "Upcoming", value: upcomingMeetings, icon: Calendar, color: "text-purple-400" },
                            { label: "Completed", value: completedMeetings, icon: Clock, color: "text-orange-400" }
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center hover:bg-slate-800/70 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                variants={itemVariants}
                                custom={index}
                            >
                                <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-sm text-slate-400">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.section>

                    {/* Quick Actions */}
                    <motion.section
                        className="mb-12"
                        variants={itemVariants}
                    >
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">What would you like to do?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {quickActions.map((action, index) => (
                                <motion.div
                                    key={action.title}
                                    className={`relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group ${
                                        action.primary ? 'ring-2 ring-blue-500/30' : ''
                                    }`}
                                    onClick={action.action}
                                    whileHover={{ 
                                        scale: 1.05,
                                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                                    }}
                                    variants={itemVariants}
                                    custom={index}
                                >
                                    {action.primary && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                            <Badge className="bg-blue-600 text-white">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                Popular
                                            </Badge>
                                        </div>
                                    )}
                                    
                                    <div className={`w-16 h-16 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <action.icon className="w-8 h-8 text-white" />
                                    </div>
                                    
                                    <h3 className="text-xl font-semibold text-white mb-2">{action.title}</h3>
                                    <p className="text-slate-400 mb-4">{action.description}</p>
                                    
                                    <div className="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                                        <span className="text-sm font-medium">Get started</span>
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                    {/* Dashboard Navigation */}
                    <motion.section
                        className="mb-12"
                        variants={itemVariants}
                    >
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">Explore Your Workspace</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {dashboardCards.map((card, index) => (
                                <motion.div
                                    key={card.title}
                                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group"
                                    onClick={() => router.push(card.href)}
                                    whileHover={{ 
                                        scale: 1.05,
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                    }}
                                    variants={itemVariants}
                                    custom={index}
                                >
                                    <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="w-6 h-6 text-white" />
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                                    <p className="text-slate-400 text-sm">{card.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                    {/* Quick Tips */}
                    <motion.section
                        className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center"
                        variants={itemVariants}
                        whileHover={{ 
                            scale: 1.02,
                            boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
                        }}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Star className="w-8 h-8 text-white" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-4">Pro Tip</h3>
                        <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                            You can start an instant meeting from anywhere in the app by pressing <kbd className="px-2 py-1 bg-slate-700 rounded text-white">Ctrl + M</kbd>
                        </p>
                        
                        <Button
                            onClick={() => router.push('/dashboard')}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Go to Full Dashboard
                        </Button>
                    </motion.section>
                </motion.div>
            </div>
        </div>
    );
};

export default AuthenticatedHome;