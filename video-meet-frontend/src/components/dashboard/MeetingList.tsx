/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";
import { FC } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useGetMeetingsQuery } from "@/store/api/meetingApi";
import { Card } from "@/components/ui/card";
import { Video, Clock, Users, Calendar, Play, Loader2, AlertCircle } from "lucide-react";

const MeetingList: FC = () => {
    const { data, isLoading, error } = useGetMeetingsQuery({});

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0, scale: 0.9 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 15
            }
        }
    };

    const getMeetingTypeColor = (type: string) => {
        switch (type) {
            case 'instant':
                return 'from-green-500 to-emerald-500';
            case 'scheduled':
                return 'from-blue-500 to-cyan-500';
            case 'recurring':
                return 'from-purple-500 to-pink-500';
            default:
                return 'from-slate-500 to-slate-600';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'waiting':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'ended':
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays > 1 && diffDays < 7) {
            return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    };

    if (isLoading) {
        return (
            <motion.div
                className="flex items-center justify-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="flex items-center gap-3 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg">Loading meetings...</span>
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div
                className="flex items-center justify-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                        <p className="font-semibold">Failed to load meetings</p>
                        <p className="text-sm text-red-400/80">Please check your connection and try again</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    const meetings = data?.data?.meetings || [];

    if (meetings.length === 0) {
        return (
            <motion.div
                className="text-center py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <motion.div
                    className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center"
                    animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0] 
                    }}
                    transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        repeatType: "reverse"
                    }}
                >
                    <Calendar className="w-8 h-8 text-slate-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No meetings scheduled</h3>
                <p className="text-slate-400">Create your first meeting to get started!</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <AnimatePresence mode="popLayout">
                {meetings.map((meeting, index) => (
                    <motion.div
                        key={meeting.id}
                        variants={itemVariants}
                        layout
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300 overflow-hidden group">
                            <Link href={`/meeting/${meeting.roomId}`}>
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        {/* Meeting Type Icon */}
                                        <motion.div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getMeetingTypeColor(meeting.type)} shadow-lg`}
                                            whileHover={{ rotate: 5 }}
                                        >
                                            <Video className="w-6 h-6 text-white" />
                                        </motion.div>

                                        {/* Meeting Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 truncate">
                                                        {meeting.title}
                                                    </h3>
                                                    {meeting.description && (
                                                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                                                            {meeting.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Status Badge */}
                                                <motion.div
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)}`}
                                                    whileHover={{ scale: 1.05 }}
                                                >
                                                    {meeting.status}
                                                </motion.div>
                                            </div>

                                            {/* Meeting Details */}
                                            <div className="flex items-center gap-6 mt-4 text-sm text-slate-400">
                                                {/* Date/Time */}
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>
                                                        {meeting.scheduledAt 
                                                            ? formatDate(meeting.scheduledAt)
                                                            : 'Instant meeting'
                                                        }
                                                    </span>
                                                </div>

                                                {/* Participants */}
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span>
                                                        {meeting.currentParticipants || 0} / {meeting.maxParticipants}
                                                    </span>
                                                </div>

                                                {/* Meeting Type */}
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getMeetingTypeColor(meeting.type)}`}></div>
                                                    <span className="capitalize">{meeting.type}</span>
                                                </div>
                                            </div>

                                            {/* Action Hint */}
                                            <motion.div
                                                className="flex items-center gap-2 mt-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                initial={{ x: -10 }}
                                                whileHover={{ x: 0 }}
                                            >
                                                <Play className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    {meeting.status === 'active' ? 'Join meeting' : 'Enter meeting room'}
                                                </span>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
};

export default MeetingList;