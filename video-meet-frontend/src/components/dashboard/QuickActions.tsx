import { FC } from "react";
import { motion } from "framer-motion";
import {
    Settings,
    Bell,
    Palette,
    Shield,
    Activity,
    Globe,
    Camera,
    Mic,
    Monitor,
    MessageSquare,
    Key,
    Download,
    HelpCircle,
    Zap
} from "lucide-react";

interface QuickAction {
    id: string;
    icon: any;
    label: string;
    description?: string;
    color: string;
    action: () => void;
    disabled?: boolean;
    badge?: string;
}

interface QuickActionsProps {
    onAction?: (actionId: string) => void;
    className?: string;
    layout?: "grid" | "list";
    columns?: 2 | 3 | 4;
}

const QuickActions: FC<QuickActionsProps> = ({
    onAction,
    className = "",
    layout = "grid",
    columns = 3
}) => {
    const quickActions: QuickAction[] = [
        {
            id: "account-settings",
            icon: Settings,
            label: "Account Settings",
            description: "Manage your account preferences",
            color: "from-slate-500 to-slate-600",
            action: () => {
                console.log("Account settings clicked");
                onAction?.("account-settings");
            }
        },
        {
            id: "notifications",
            icon: Bell,
            label: "Notifications",
            description: "Configure notification preferences",
            color: "from-blue-500 to-cyan-500",
            action: () => {
                console.log("Notifications clicked");
                onAction?.("notifications");
            },
            badge: "3"
        },
        {
            id: "appearance",
            icon: Palette,
            label: "Appearance",
            description: "Customize theme and layout",
            color: "from-purple-500 to-pink-500",
            action: () => {
                console.log("Appearance clicked");
                onAction?.("appearance");
            }
        },
        {
            id: "privacy",
            icon: Shield,
            label: "Privacy & Security",
            description: "Control your privacy settings",
            color: "from-green-500 to-emerald-500",
            action: () => {
                console.log("Privacy clicked");
                onAction?.("privacy");
            }
        },
        {
            id: "activity",
            icon: Activity,
            label: "Activity Log",
            description: "View your recent activity",
            color: "from-orange-500 to-red-500",
            action: () => {
                console.log("Activity clicked");
                onAction?.("activity");
            }
        },
        {
            id: "language",
            icon: Globe,
            label: "Language",
            description: "Change language preferences",
            color: "from-indigo-500 to-purple-500",
            action: () => {
                console.log("Language clicked");
                onAction?.("language");
            }
        },
        {
            id: "audio-video",
            icon: Camera,
            label: "Audio & Video",
            description: "Configure media settings",
            color: "from-teal-500 to-cyan-500",
            action: () => {
                console.log("Audio/Video clicked");
                onAction?.("audio-video");
            }
        },
        {
            id: "keyboard-shortcuts",
            icon: Key,
            label: "Shortcuts",
            description: "View keyboard shortcuts",
            color: "from-amber-500 to-orange-500",
            action: () => {
                console.log("Shortcuts clicked");
                onAction?.("keyboard-shortcuts");
            }
        },
        {
            id: "export-data",
            icon: Download,
            label: "Export Data",
            description: "Download your data",
            color: "from-violet-500 to-purple-500",
            action: () => {
                console.log("Export data clicked");
                onAction?.("export-data");
            }
        }
    ];

    const gridCols = {
        2: "grid-cols-2",
        3: "grid-cols-3", 
        4: "grid-cols-4"
    };

    return (
        <motion.div
            className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">
                    Quick Actions
                </h4>
                <motion.div
                    className="flex items-center gap-1 text-xs text-slate-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <Zap className="w-3 h-3" />
                    <span>{quickActions.filter(a => !a.disabled).length} available</span>
                </motion.div>
            </div>

            {layout === "grid" ? (
                <div className={`grid ${gridCols[columns]} gap-3`}>
                    {quickActions.map((action, index) => (
                        <motion.button
                            key={action.id}
                            onClick={action.action}
                            disabled={action.disabled}
                            className={`relative p-4 rounded-xl bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            whileHover={{ scale: action.disabled ? 1 : 1.05 }}
                            whileTap={{ scale: action.disabled ? 1 : 0.95 }}
                        >
                            {/* Badge */}
                            {action.badge && (
                                <motion.div
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5 + index * 0.05, type: "spring" }}
                                >
                                    {action.badge}
                                </motion.div>
                            )}

                            {/* Icon */}
                            <action.icon className="w-6 h-6 text-white mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            
                            {/* Label */}
                            <div className="text-sm text-white font-medium">
                                {action.label}
                            </div>
                        </motion.button>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {quickActions.map((action, index) => (
                        <motion.button
                            key={action.id}
                            onClick={action.action}
                            disabled={action.disabled}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            whileHover={{ x: action.disabled ? 0 : 5 }}
                        >
                            {/* Icon container */}
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                                <action.icon className="w-5 h-5 text-white" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h5 className="text-white font-medium text-sm">
                                        {action.label}
                                    </h5>
                                    {action.badge && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                            {action.badge}
                                        </span>
                                    )}
                                </div>
                                {action.description && (
                                    <p className="text-slate-400 text-xs truncate">
                                        {action.description}
                                    </p>
                                )}
                            </div>

                            {/* Arrow indicator */}
                            <div className="text-slate-400 group-hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Help footer */}
            <motion.div
                className="mt-4 pt-4 border-t border-slate-700/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <button
                    onClick={() => onAction?.("help")}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <HelpCircle className="w-4 h-4" />
                    <span>Need help? View documentation</span>
                </button>
            </motion.div>
        </motion.div>
    );
};

export default QuickActions;