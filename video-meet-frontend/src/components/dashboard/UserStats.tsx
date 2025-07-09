/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from "react";
import { motion } from "framer-motion";
import {
    Video,
    Clock,
    Calendar,
    Users,
    TrendingUp,
    TrendingDown,
    Minus,
    Activity
} from "lucide-react";

interface StatItem {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    trend?: "up" | "down" | "stable";
    subtitle?: string;
    percentage?: number;
}

interface UserStatsProps {
    meetings: any[] | any;
    participants: any[] | any;
    className?: string;
    layout?: "grid" | "row";
}

const UserStats: FC<UserStatsProps> = ({
    meetings = [],
    participants = [],
    className = "",
    layout = "grid"
}) => {
    // Calculate real stats from meetings data
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter((m: { status: string; }) => m.status === 'ended').length;
    const activeMeetings = meetings.filter((m: { status: string; }) => m.status === 'active').length;
    const totalParticipants = participants.length;

    // Calculate meeting hours (estimate based on completed meetings)
    const estimatedHours = completedMeetings * 0.75; // 45 minutes average

    // Get meetings this week
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const meetingsThisWeek = meetings.filter((m: { createdAt: string | number | Date; }) =>
        m.createdAt && new Date(m.createdAt) >= thisWeek
    ).length;

    // Previous week for comparison
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 14);
    const meetingsLastWeek = meetings.filter((m: { createdAt: string | number | Date; }) => {
        if (!m.createdAt) return false;
        const meetingDate = new Date(m.createdAt);
        return meetingDate >= lastWeek && meetingDate < thisWeek;
    }).length;

    // Calculate trend
    const getTrend = (current: number, previous: number): "up" | "down" | "stable" => {
        if (current > previous) return "up";
        if (current < previous) return "down";
        return "stable";
    };

    const weeklyTrend = getTrend(meetingsThisWeek, meetingsLastWeek);
    const trendPercentage = meetingsLastWeek > 0 
        ? Math.round(((meetingsThisWeek - meetingsLastWeek) / meetingsLastWeek) * 100)
        : meetingsThisWeek > 0 ? 100 : 0;

    const userStats: StatItem[] = [
        {
            icon: Video,
            label: "Total Meetings",
            value: totalMeetings,
            color: "text-blue-400",
            trend: activeMeetings > 0 ? "up" : "stable",
            subtitle: activeMeetings > 0 ? `${activeMeetings} active` : "No active meetings"
        },
        {
            icon: Clock,
            label: "Meeting Hours",
            value: estimatedHours.toFixed(1),
            color: "text-green-400",
            trend: completedMeetings > 0 ? "up" : "stable",
            subtitle: `${completedMeetings} completed`
        },
        {
            icon: Calendar,
            label: "This Week",
            value: meetingsThisWeek,
            color: "text-purple-400",
            trend: weeklyTrend,
            subtitle: weeklyTrend !== "stable" 
                ? `${trendPercentage > 0 ? '+' : ''}${trendPercentage}% vs last week`
                : "Same as last week",
            percentage: Math.abs(trendPercentage)
        },
        {
            icon: Users,
            label: "Participants",
            value: totalParticipants,
            color: "text-cyan-400",
            trend: totalParticipants > 0 ? "up" : "stable",
            subtitle: "Total connections"
        },
    ];

    const TrendIcon = ({ trend }: { trend?: "up" | "down" | "stable" }) => {
        switch (trend) {
            case "up":
                return <TrendingUp className="w-4 h-4 text-green-400" />;
            case "down":
                return <TrendingDown className="w-4 h-4 text-red-400" />;
            default:
                return <Minus className="w-4 h-4 text-slate-400" />;
        }
    };

    const gridClass = layout === "grid" 
        ? "grid grid-cols-2 md:grid-cols-4 gap-4"
        : "flex flex-wrap gap-4";

    return (
        <motion.div
            className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-slate-400" />
                <h4 className="text-lg font-semibold text-white">
                    Your Activity
                </h4>
            </div>

            <div className={gridClass}>
                {userStats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        className="text-center bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/50 transition-colors min-w-[120px]"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        {/* Icon and Trend */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            <TrendIcon trend={stat.trend} />
                        </div>

                        {/* Value */}
                        <div className="text-2xl font-bold text-white mb-1">
                            {stat.value || "0"}
                        </div>

                        {/* Label */}
                        <div className="text-sm text-slate-400 mb-1">
                            {stat.label}
                        </div>

                        {/* Subtitle */}
                        {stat.subtitle && (
                            <div className="text-xs text-slate-500">
                                {stat.subtitle}
                            </div>
                        )}

                        {/* Progress bar for percentage changes */}
                        {stat.percentage !== undefined && stat.percentage > 0 && (
                            <div className="mt-2">
                                <div className="w-full bg-slate-600 rounded-full h-1">
                                    <motion.div
                                        className={`h-1 rounded-full ${
                                            stat.trend === "up" ? "bg-green-400" : 
                                            stat.trend === "down" ? "bg-red-400" : "bg-slate-400"
                                        }`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(stat.percentage, 100)}%` }}
                                        transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Summary footer */}
            {totalMeetings > 0 && (
                <motion.div
                    className="mt-4 pt-4 border-t border-slate-700/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="text-sm text-slate-400 text-center">
                        <span className="text-white font-medium">{estimatedHours.toFixed(1)} hours</span> spent in 
                        <span className="text-white font-medium"> {totalMeetings} meetings</span> with
                        <span className="text-white font-medium"> {totalParticipants} participants</span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default UserStats;