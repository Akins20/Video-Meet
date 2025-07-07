/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { FC, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";
import { ChevronDown } from "lucide-react";

// Import modular components
import UserAvatar from "./UserAvatar";
import UserStats from "./UserStats";
import ProfileEditor from "./ProfileEditor";
import QuickActions from "./QuickActions";
import AccountManagement from "./AccountManagement";

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    username: string;
    isEmailVerified: boolean;
    lastLogin: string;
    avatar?: string;
    bio?: string;
    preferences?: {
        meeting?: {
            defaultMicMuted: boolean;
            defaultVideoOff: boolean;
            preferredQuality: string;
        };
        notifications?: {
            email: boolean;
            meetingInvites: boolean;
            meetingReminders: boolean;
            push: boolean;
        };
        privacy?: {
            allowDiscovery: boolean;
            showOnlineStatus: boolean;
        };
    };
}

const UserProfile: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const meetings = useSelector((state: RootState) => state.meeting.meetings || []);
    const participants = useSelector((state: RootState) => state.meeting.participants || []);
    const dispatch = useDispatch();
    const router = useRouter();
    const { logout, updateProfile } = useAuth();

    const [isExpanded, setIsExpanded] = useState(false);

    // Handle profile updates
    const handleProfileUpdate = async (profileData: any) => {
        try {
            const result = await updateProfile(profileData);
            return result;
        } catch (error) {
            console.error("Profile update failed:", error);
            return { success: false, error: "Profile update failed" };
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
            router.push('/auth/login');
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        }
    };

    // Handle quick actions
    const handleQuickAction = (actionId: string) => {
        console.log(`Quick action triggered: ${actionId}`);

        switch (actionId) {
            case "account-settings":
                // Navigate to settings page or open modal
                router.push('/settings/account');
                break;
            case "notifications":
                router.push('/settings/notifications');
                break;
            case "appearance":
                router.push('/settings/appearance');
                break;
            case "privacy":
                router.push('/settings/privacy');
                break;
            case "activity":
                router.push('/settings/activity');
                break;
            case "language":
                router.push('/settings/language');
                break;
            case "audio-video":
                router.push('/settings/media');
                break;
            case "keyboard-shortcuts":
                router.push('/settings/shortcuts');
                break;
            case "export-data":
                router.push('/settings/export');
                break;
            case "help":
                window.open('/docs', '_blank');
                break;
            default:
                console.log(`Unhandled action: ${actionId}`);
        }
    };

    // Handle account management actions
    const handleAccountAction = (actionId: string) => {
        console.log(`Account action triggered: ${actionId}`);

        switch (actionId) {
            case "privacy-security":
                router.push('/settings/security');
                break;
            case "notifications":
                router.push('/settings/notifications');
                break;
            case "activity-log":
                router.push('/settings/activity');
                break;
            case "change-password":
                router.push('/settings/password');
                break;
            case "verify-email":
                // Handle email verification
                console.log("Resending verification email...");
                break;
            case "export-data":
                // Handle data export
                console.log("Starting data export...");
                break;
            case "delete-account":
                router.push('/settings/delete-account');
                break;
            default:
                console.log(`Unhandled account action: ${actionId}`);
        }
    };

    // Ensure user data exists
    if (!user) {
        return (
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="text-center text-slate-400">
                    <p>No user data available</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Profile Header with Editor */}
            <div className="relative">
                <ProfileEditor
                    user={user}
                    onSave={handleProfileUpdate}
                />

                {/* Expand/Collapse Button */}
                <motion.button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
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
                        <UserStats
                            meetings={meetings}
                            participants={participants}
                            layout="grid"
                        />

                        {/* Quick Actions */}
                        <QuickActions
                            onAction={handleQuickAction}
                            layout="grid"
                            columns={3}
                        />

                        {/* Account Management */}
                        <AccountManagement
                            user={user}
                            onLogout={handleLogout}
                            onAction={handleAccountAction}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default UserProfile;