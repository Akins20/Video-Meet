/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { FC, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";
import { 
    User, 
    Mail, 
    Settings, 
    LogOut, 
    Shield, 
    Calendar,
    Clock,
    Video,
    Bell,
    Palette,
    ChevronDown,
    Edit3,
    Save,
    X,
    CheckCircle2,
    Activity,
    Users,
    Globe,
    Camera,
    Mic,
    Monitor,
    MessageSquare,
    Award,
    TrendingUp
} from "lucide-react";

const UserProfile: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const meetings = useSelector((state: RootState) => state.meeting.meetings || []);
    const participants = useSelector((state: RootState) => state.meeting.participants || []);
    const dispatch = useDispatch();
    const router = useRouter();
    const { logout, updateProfile } = useAuth();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        bio: user?.bio || '',
    });

    // Calculate real stats from Redux state
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'ended').length;
    const activeMeetings = meetings.filter(m => m.status === 'active').length;
    const totalParticipants = participants.length;
    
    // Calculate meeting hours (mock calculation based on completed meetings)
    const estimatedHours = completedMeetings * 0.75; // Assuming 45 minutes average per meeting
    
    // Get meetings this week
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const meetingsThisWeek = meetings.filter(m => 
        m.createdAt && new Date(m.createdAt) >= thisWeek
    ).length;

    const userStats = [
        { 
            icon: Video, 
            label: "Total Meetings", 
            value: totalMeetings.toString(), 
            color: "text-blue-400",
            trend: activeMeetings > 0 ? "up" : "stable"
        },
        { 
            icon: Clock, 
            label: "Meeting Hours", 
            value: estimatedHours.toFixed(1), 
            color: "text-green-400",
            trend: "up"
        },
        { 
            icon: Calendar, 
            label: "This Week", 
            value: meetingsThisWeek.toString(), 
            color: "text-purple-400",
            trend: meetingsThisWeek > 0 ? "up" : "stable"
        },
        { 
            icon: Users, 
            label: "Participants", 
            value: totalParticipants, 
            color: "text-cyan-400",
            trend: "up"
        },
    ];

    const quickActions = [
        { 
            icon: Settings, 
            label: "Account Settings", 
            color: "from-slate-500 to-slate-600",
            action: () => console.log("Settings clicked")
        },
        { 
            icon: Bell, 
            label: "Notifications", 
            color: "from-blue-500 to-cyan-500",
            action: () => console.log("Notifications clicked")
        },
        { 
            icon: Palette, 
            label: "Appearance", 
            color: "from-purple-500 to-pink-500",
            action: () => console.log("Theme clicked")
        },
        { 
            icon: Shield, 
            label: "Privacy", 
            color: "from-green-500 to-emerald-500",
            action: () => console.log("Privacy clicked")
        },
        { 
            icon: Activity, 
            label: "Activity", 
            color: "from-orange-500 to-red-500",
            action: () => console.log("Activity clicked")
        },
        { 
            icon: Globe, 
            label: "Language", 
            color: "from-indigo-500 to-purple-500",
            action: () => console.log("Language clicked")
        },
    ];

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await updateProfile(editData);
            setIsEditing(false);
        } catch (error) {
            console.error("Profile update failed:", error);
        }
    };

    const handleCancelEdit = () => {
        setEditData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            bio: user?.bio || '',
        });
        setIsEditing(false);
    };

    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return user?.username?.charAt(0).toUpperCase() || 'U';
    };

    const getDisplayName = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        return user?.username || 'User';
    };

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Profile Header */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                whileHover={{ 
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)" 
                }}
            >
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <motion.div
                        className="relative"
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            {user?.avatar ? (
                                <img 
                                    src={user.avatar} 
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-white font-bold text-xl">
                                    {getInitials(user?.firstName, user?.lastName)}
                                </span>
                            )}
                        </div>
                        <motion.div
                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800"
                            animate={{ 
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        />
                    </motion.div>

                    {/* User Info */}
                    <div className="flex-1">
                        {isEditing ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={editData.firstName}
                                        onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                                        placeholder="First Name"
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                    <Input
                                        value={editData.lastName}
                                        onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                                        placeholder="Last Name"
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                </div>
                                <Input
                                    value={editData.bio}
                                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                                    placeholder="Bio"
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSaveProfile}
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </Button>
                                    <Button
                                        onClick={handleCancelEdit}
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-600 text-slate-300"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <motion.h3 
                                        className="text-xl font-bold text-white"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        {getDisplayName()}
                                    </motion.h3>
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        size="sm"
                                        variant="ghost"
                                        className="p-1 h-auto text-slate-400 hover:text-white"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <motion.div
                                    className="flex items-center gap-2 text-slate-400"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{user?.email}</span>
                                    {user?.isEmailVerified && (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    )}
                                </motion.div>
                                {user?.bio && (
                                    <motion.p
                                        className="text-sm text-slate-400 mt-1"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        {user.bio}
                                    </motion.p>
                                )}
                                <motion.div
                                    className="flex items-center gap-2 mt-2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-sm text-green-400">Online</span>
                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                        Member
                                    </Badge>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Expand Button */}
                    <motion.button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                        </motion.div>
                    </motion.button>
                </div>
            </motion.div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* User Stats */}
                        <motion.div
                            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h4 className="text-lg font-semibold text-white mb-4">
                                Your Activity
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {userStats.map((stat, index) => (
                                    <motion.div
                                        key={stat.label}
                                        className="text-center bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/50 transition-colors"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 + index * 0.1 }}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                            {stat.trend === "up" && (
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                            )}
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">
                                            {stat.value.toString() || "0"}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {stat.label}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h4 className="text-lg font-semibold text-white mb-4">
                                Quick Actions
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                {quickActions.map((action, index) => (
                                    <motion.button
                                        key={action.label}
                                        onClick={action.action}
                                        className={`p-4 rounded-xl bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 group`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 + index * 0.05 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <action.icon className="w-6 h-6 text-white mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                        <div className="text-sm text-white font-medium">
                                            {action.label}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Account Actions */}
                        <motion.div
                            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h4 className="text-lg font-semibold text-white mb-4">
                                Account Management
                            </h4>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Privacy & Security
                                </Button>
                                
                                <Button
                                    variant="outline"
                                    className="w-full justify-start bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                                >
                                    <Bell className="w-4 h-4 mr-2" />
                                    Notification Settings
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full justify-start bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                                >
                                    <Activity className="w-4 h-4 mr-2" />
                                    Activity Log
                                </Button>
                                
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="w-full justify-start bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all duration-300"
                                    >
                                        <AnimatePresence mode="wait">
                                            {isLoggingOut ? (
                                                <motion.div
                                                    key="loading"
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="flex items-center"
                                                >
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                        className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full mr-2"
                                                    />
                                                    Logging out...
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="idle"
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="flex items-center"
                                                >
                                                    <LogOut className="w-4 h-4 mr-2" />
                                                    Logout
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default UserProfile;