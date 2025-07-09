"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { motion } from "framer-motion";
import {
    User,
    Mail,
    Calendar,
    Camera,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/hooks/useAuth";

// Import our modular components
import ProfileEditor from "@/components/dashboard/ProfileEditor";
import UserAvatar from "@/components/dashboard/UserAvatar";

const AccountSettings: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const { updateProfile } = useAuth();
    
    const [successMessage, setSuccessMessage] = useState("");

    const handleProfileUpdate = async (profileData: any) => {
        try {
            const result = await updateProfile(profileData);
            if (result.success) {
                setSuccessMessage("Profile updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            }
            return result;
        } catch (error) {
            console.error("Profile update failed:", error);
            return { success: false, error: "Profile update failed" };
        }
    };

    if (!user) {
        return (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
                <div className="text-center text-slate-400">
                    <User className="w-16 h-16 mx-auto mb-4" />
                    <p>No user data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 mx-auto max-w-6xl">
            {/* Success Message */}
            {successMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3"
                >
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">{successMessage}</span>
                </motion.div>
            )}

            {/* Basic Profile Information */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <ProfileEditor 
                    user={user} 
                    onSave={handleProfileUpdate}
                />
            </motion.div>

            {/* Account Information */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-300">
                            <User className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium">Full Name</p>
                                <p className="text-slate-400">{user.fullName || `${user.firstName} ${user.lastName}`}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <User className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium">Username</p>
                                <p className="text-slate-400">@{user.username}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <Mail className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-slate-400">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-300">
                            <User className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium">User ID</p>
                                <p className="text-slate-400 font-mono text-xs">{user.id}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium">Last Login</p>
                                <p className="text-slate-400">
                                    {user.lastLogin ? 
                                        new Date(user.lastLogin).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : "Never"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Account Status */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email Verification */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-white">Email Verification</p>
                                <p className="text-xs text-slate-400">
                                    {user.isEmailVerified ? "Your email is verified" : "Email verification required"}
                                </p>
                            </div>
                        </div>
                        {user.isEmailVerified ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                            </Badge>
                        ) : (
                            <div className="flex flex-col items-end gap-2">
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Unverified
                                </Badge>
                                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-xs">
                                    Send Verification
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Account Type */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-white">Account Type</p>
                                <p className="text-xs text-slate-400">Standard member account</p>
                            </div>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Standard
                        </Badge>
                    </div>
                </div>
            </motion.div>

            {/* User Preferences Summary */}
            {user.preferences && (
                <motion.div
                    className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <h3 className="text-lg font-semibold text-white mb-4">Current Preferences</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Meeting Preferences */}
                        {user.preferences.meeting && (
                            <div className="bg-slate-700/30 rounded-lg p-4">
                                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                    Meeting Settings
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Default Mic:</span>
                                        <span className="text-white">
                                            {user.preferences.meeting.defaultMicMuted ? 'Muted' : 'Unmuted'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Default Video:</span>
                                        <span className="text-white">
                                            {user.preferences.meeting.defaultVideoOff ? 'Off' : 'On'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Video Quality:</span>
                                        <span className="text-white capitalize">
                                            {user.preferences.meeting.preferredQuality}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notification Preferences */}
                        {user.preferences.notifications && (
                            <div className="bg-slate-700/30 rounded-lg p-4">
                                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    Notifications
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Email:</span>
                                        <span className="text-white">
                                            {user.preferences.notifications.email ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Push:</span>
                                        <span className="text-white">
                                            {user.preferences.notifications.push ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Meeting Invites:</span>
                                        <span className="text-white">
                                            {user.preferences.notifications.meetingInvites ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Privacy Preferences */}
                        {user.preferences.privacy && (
                            <div className="bg-slate-700/30 rounded-lg p-4">
                                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    Privacy
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Discoverable:</span>
                                        <span className="text-white">
                                            {user.preferences.privacy.allowDiscovery ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Online Status:</span>
                                        <span className="text-white">
                                            {user.preferences.privacy.showOnlineStatus ? 'Visible' : 'Hidden'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 text-center">
                        <Button
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => window.location.href = '/settings/notifications'}
                        >
                            Manage All Preferences
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Avatar Management */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>
                
                <div className="flex items-center gap-6">
                    <UserAvatar 
                        user={user} 
                        size="xl" 
                        showEditButton={true}
                        onEdit={() => console.log("Avatar edit clicked")}
                    />
                    
                    <div className="flex-1">
                        <h4 className="font-medium text-white mb-2">Change Profile Picture</h4>
                        <p className="text-slate-400 text-sm mb-4">
                            Upload a new avatar or remove the current one. Recommended size is 400x400px.
                        </p>
                        
                        <div className="flex gap-3">
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => console.log("Upload new avatar")}
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                Upload New
                            </Button>
                            
                            {user.avatar && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    onClick={() => console.log("Remove avatar")}
                                >
                                    Remove
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AccountSettings;