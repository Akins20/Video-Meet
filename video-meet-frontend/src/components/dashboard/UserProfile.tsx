"use client";
import { FC, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { logout } from "@/store/authSlice";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
    ChevronUp
} from "lucide-react";

const UserProfile: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Smooth logout animation
        dispatch(logout());
        router.push("/login");
    };

    const userStats = [
        { icon: Video, label: "Meetings", value: "23", color: "text-blue-400" },
        { icon: Clock, label: "Hours", value: "45", color: "text-green-400" },
        { icon: Calendar, label: "This Week", value: "7", color: "text-purple-400" },
    ];

    const quickActions = [
        { icon: Settings, label: "Settings", color: "from-slate-500 to-slate-600" },
        { icon: Bell, label: "Notifications", color: "from-blue-500 to-cyan-500" },
        { icon: Palette, label: "Theme", color: "from-purple-500 to-pink-500" },
    ];

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
                            <User className="w-8 h-8 text-white" />
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
                        <motion.h3 
                            className="text-xl font-bold text-white"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {user?.firstName && user?.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user?.username || 'User'
                            }
                        </motion.h3>
                        <motion.div
                            className="flex items-center gap-2 text-slate-400"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Mail className="w-4 h-4" />
                            <span className="text-sm">{user?.email}</span>
                        </motion.div>
                        <motion.div
                            className="flex items-center gap-2 mt-1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm text-green-400">Online</span>
                        </motion.div>
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
                            <div className="grid grid-cols-3 gap-4">
                                {userStats.map((stat, index) => (
                                    <motion.div
                                        key={stat.label}
                                        className="text-center"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 + index * 0.1 }}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="flex justify-center mb-2">
                                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {stat.value}
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
                                        className={`p-4 rounded-xl bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 group`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 + index * 0.1 }}
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
                                Account
                            </h4>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Privacy & Security
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