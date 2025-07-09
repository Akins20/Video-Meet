"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FC, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    Mail,
    Smartphone,
    Video,
    Users,
    MessageSquare,
    Calendar,
    Settings,
    CheckCircle2,
    AlertCircle,
    Save,
    RotateCcw,
    ChevronDown,
    Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/hooks/useAuth";

interface NotificationPreferences {
    email: boolean;
    push: boolean;
    meetingInvites: boolean;
    meetingReminders: boolean;
    meetingStarted: boolean;
    participantJoined: boolean;
    participantLeft: boolean;
    chatMessages: boolean;
    recordingReady: boolean;
    weeklyDigest: boolean;
    securityAlerts: boolean;
    systemUpdates: boolean;
}

interface NotificationGroup {
    id: string;
    title: string;
    icon: any;
    color: string;
    items: {
        key: keyof NotificationPreferences;
        label: string;
        description: string;
        channels: ('email' | 'push' | 'inApp' | 'sound')[];
    }[];
}

const NotificationsSettings: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const { updatePreferences } = useAuth();
    
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        email: user?.preferences?.notifications?.email ?? true,
        push: user?.preferences?.notifications?.push ?? true,
        meetingInvites: user?.preferences?.notifications?.meetingInvites ?? true,
        meetingReminders: user?.preferences?.notifications?.push ?? true,
        meetingStarted: true,
        participantJoined: false,
        participantLeft: false,
        chatMessages: true,
        recordingReady: true,
        weeklyDigest: true,
        securityAlerts: true,
        systemUpdates: false
    });

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['meetings']));
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [error, setError] = useState("");

    // Track changes
    useEffect(() => {
        const originalPrefs = {
            email: user?.preferences?.notifications?.email ?? true,
            push: user?.preferences?.notifications?.push ?? true,
            meetingInvites: user?.preferences?.notifications?.meetingInvites ?? true,
            meetingReminders: user?.preferences?.notifications?.push ?? true,
            meetingStarted: true,
            participantJoined: false,
            participantLeft: false,
            chatMessages: true,
            recordingReady: true,
            weeklyDigest: true,
            securityAlerts: true,
            systemUpdates: false
        };
        
        setHasChanges(JSON.stringify(preferences) !== JSON.stringify(originalPrefs));
    }, [preferences, user]);

    const notificationGroups: NotificationGroup[] = [
        {
            id: "meetings",
            title: "Meetings",
            icon: Video,
            color: "from-blue-500 to-cyan-500",
            items: [
                {
                    key: "meetingInvites",
                    label: "Meeting Invitations",
                    description: "When someone invites you to a meeting",
                    channels: ['email', 'push', 'inApp', 'sound']
                },
                {
                    key: "meetingReminders",
                    label: "Meeting Reminders",
                    description: "Reminders before meetings start",
                    channels: ['email', 'push', 'inApp', 'sound']
                },
                {
                    key: "meetingStarted",
                    label: "Meeting Started",
                    description: "When a meeting you're invited to begins",
                    channels: ['push', 'inApp', 'sound']
                }
            ]
        },
        {
            id: "activity",
            title: "Activity & Communication",
            icon: Users,
            color: "from-purple-500 to-pink-500",
            items: [
                {
                    key: "participantJoined",
                    label: "Participant Joined",
                    description: "When someone joins your meeting",
                    channels: ['push', 'inApp', 'sound']
                },
                {
                    key: "participantLeft",
                    label: "Participant Left",
                    description: "When someone leaves your meeting",
                    channels: ['inApp']
                },
                {
                    key: "chatMessages",
                    label: "Chat Messages",
                    description: "New messages in meeting chat",
                    channels: ['push', 'inApp', 'sound']
                }
            ]
        },
        {
            id: "content",
            title: "Content & Reports",
            icon: Calendar,
            color: "from-green-500 to-emerald-500",
            items: [
                {
                    key: "recordingReady",
                    label: "Recording Ready",
                    description: "When meeting recordings are processed",
                    channels: ['email', 'push', 'inApp']
                },
                {
                    key: "weeklyDigest",
                    label: "Weekly Digest",
                    description: "Weekly summary of your meetings",
                    channels: ['email', 'inApp']
                }
            ]
        },
        {
            id: "system",
            title: "Security & System",
            icon: Settings,
            color: "from-orange-500 to-red-500",
            items: [
                {
                    key: "securityAlerts",
                    label: "Security Alerts",
                    description: "Important security notifications",
                    channels: ['email', 'push', 'inApp', 'sound']
                },
                {
                    key: "systemUpdates",
                    label: "System Updates",
                    description: "App updates and maintenance notifications",
                    channels: ['email', 'inApp']
                }
            ]
        }
    ];

    const handleToggle = (settingId: keyof NotificationPreferences) => {
        setPreferences(prev => ({
            ...prev,
            [settingId]: !prev[settingId]
        }));
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError("");
        
        try {
            const result = await updatePreferences({
                notifications: preferences
            });
            
            if (result.success) {
                setSuccessMessage("Notification preferences updated successfully!");
                setHasChanges(false);
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setError(result.error || "Failed to update preferences");
            }
        } catch (error) {
            setError("An unexpected error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPreferences({
            email: user?.preferences?.notifications?.email ?? true,
            push: user?.preferences?.notifications?.push ?? true,
            meetingInvites: user?.preferences?.notifications?.meetingInvites ?? true,
            meetingReminders: user?.preferences?.notifications?.push ?? true,
            meetingStarted: true,
            participantJoined: false,
            participantLeft: false,
            chatMessages: true,
            recordingReady: true,
            weeklyDigest: true,
            securityAlerts: true,
            systemUpdates: false
        });
    };

    const ToggleSwitch: FC<{ enabled: boolean; onChange: () => void; size?: 'sm' | 'md' }> = ({ 
        enabled, 
        onChange, 
        size = 'md'
    }) => {
        const sizeClasses = {
            sm: { container: 'h-5 w-9', thumb: 'h-3 w-3', translate: 'translate-x-5' },
            md: { container: 'h-6 w-11', thumb: 'h-4 w-4', translate: 'translate-x-6' }
        };
        const classes = sizeClasses[size];
        
        return (
            <button
                onClick={onChange}
                className={`relative inline-flex ${classes.container} items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-slate-600'
                } cursor-pointer`}
            >
                <span
                    className={`inline-block ${classes.thumb} transform rounded-full bg-white transition-transform ${
                        enabled ? classes.translate : 'translate-x-1'
                    }`}
                />
            </button>
        );
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'email': return <Mail className="w-3 h-3" />;
            case 'push': return <Smartphone className="w-3 h-3" />;
            case 'inApp': return <Bell className="w-3 h-3" />;
            case 'sound': return <Volume2 className="w-3 h-3" />;
            default: return null;
        }
    };

    const isChannelEnabled = (channel: string) => {
        switch (channel) {
            case 'email': return preferences.email;
            case 'push': return preferences.push;
            case 'inApp': return true;
            case 'sound': return true;
            default: return false;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Success/Error Messages */}
            <AnimatePresence>
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

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-medium">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Controls */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                        <p className="text-slate-400 text-sm">Control how you receive notifications</p>
                    </div>
                    {hasChanges && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                            <span className="text-orange-400 text-sm font-medium">Unsaved changes</span>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                <Mail className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white text-sm">Email Notifications</h3>
                                <p className="text-xs text-slate-400">Receive notifications via email</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.email}
                            onChange={() => handleToggle('email')}
                            size="sm"
                        />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                <Smartphone className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white text-sm">Push Notifications</h3>
                                <p className="text-xs text-slate-400">Receive notifications on your device</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.push}
                            onChange={() => handleToggle('push')}
                            size="sm"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Notification Groups */}
            <div className="space-y-3">
                {notificationGroups.map((group, groupIndex) => (
                    <motion.div
                        key={group.id}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + groupIndex * 0.05 }}
                    >
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-br ${group.color} rounded-lg flex items-center justify-center`}>
                                    <group.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-white">{group.title}</h3>
                                    <p className="text-sm text-slate-400">
                                        {group.items.filter(item => preferences[item.key]).length} of {group.items.length} enabled
                                    </p>
                                </div>
                            </div>
                            
                            <motion.div
                                animate={{ rotate: expandedGroups.has(group.id) ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            </motion.div>
                        </button>

                        {/* Group Content */}
                        <AnimatePresence>
                            {expandedGroups.has(group.id) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-slate-700/50"
                                >
                                    <div className="p-4 space-y-3">
                                        {group.items.map((item, itemIndex) => (
                                            <motion.div
                                                key={item.key}
                                                className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg hover:bg-slate-700/30 transition-colors"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: itemIndex * 0.05 }}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-medium text-white text-sm">{item.label}</h4>
                                                        <ToggleSwitch
                                                            enabled={preferences[item.key]}
                                                            onChange={() => handleToggle(item.key)}
                                                            size="sm"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-400 mb-2">{item.description}</p>
                                                    
                                                    {/* Channel Indicators */}
                                                    <div className="flex gap-1">
                                                        {item.channels.map((channel) => (
                                                            <Badge 
                                                                key={channel}
                                                                variant="outline" 
                                                                className={`text-xs px-2 py-0.5 ${
                                                                    preferences[item.key] && isChannelEnabled(channel)
                                                                        ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' 
                                                                        : 'border-slate-600 text-slate-500'
                                                                }`}
                                                            >
                                                                {getChannelIcon(channel)}
                                                                <span className="ml-1 capitalize">{channel === 'inApp' ? 'In-App' : channel}</span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Save Actions */}
            <AnimatePresence>
                {hasChanges && (
                    <motion.div
                        className="sticky bottom-6 bg-slate-800/95 border border-slate-700/50 rounded-xl p-4 backdrop-blur-md shadow-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                <span className="text-white font-medium">You have unsaved changes</span>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleReset}
                                    disabled={isSaving}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSaving ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                        />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationsSettings;