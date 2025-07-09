/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    LogOut,
    Shield,
    Bell,
    Activity,
    Key,
    Trash2,
    Download,
    RefreshCw,
    AlertTriangle,
    Loader2,
    CheckCircle,
    Mail
} from "lucide-react";

interface AccountAction {
    id: string;
    icon: any;
    label: string;
    description: string;
    variant: "default" | "outline" | "destructive";
    action: () => void | Promise<void>;
    requiresConfirmation?: boolean;
    confirmationText?: string;
    disabled?: boolean;
}

interface AccountManagementProps {
    user: {
        isEmailVerified: boolean;
        email: string;
    };
    onLogout: () => Promise<void>;
    onAction?: (actionId: string) => void;
    className?: string;
}

const AccountManagement: FC<AccountManagementProps> = ({
    user,
    onLogout,
    onAction,
    className = ""
}) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
    const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

    const handleActionWithLoading = async (actionId: string, action: () => void | Promise<void>) => {
        setLoadingActions(prev => new Set([...prev, actionId]));
        try {
            await action();
            onAction?.(actionId);
        } finally {
            setLoadingActions(prev => {
                const newSet = new Set(prev);
                newSet.delete(actionId);
                return newSet;
            });
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await onLogout();
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    const handleConfirmAction = (actionId: string, action: () => void | Promise<void>) => {
        if (confirmingAction === actionId) {
            handleActionWithLoading(actionId, action);
            setConfirmingAction(null);
        } else {
            setConfirmingAction(actionId);
        }
    };

    const accountActions: AccountAction[] = [
        {
            id: "privacy-security",
            icon: Shield,
            label: "Privacy & Security",
            description: "Manage passwords, 2FA, and privacy settings",
            variant: "outline",
            action: () => console.log("Privacy & Security"),
        },
        {
            id: "notifications",
            icon: Bell,
            label: "Notification Settings",
            description: "Configure email and push notifications",
            variant: "outline",
            action: () => console.log("Notification Settings"),
        },
        {
            id: "activity-log",
            icon: Activity,
            label: "Activity Log",
            description: "View your recent account activity",
            variant: "outline",
            action: () => console.log("Activity Log"),
        },
        {
            id: "change-password",
            icon: Key,
            label: "Change Password",
            description: "Update your account password",
            variant: "outline",
            action: () => console.log("Change Password"),
        },
        {
            id: "verify-email",
            icon: Mail,
            label: "Verify Email",
            description: "Resend email verification",
            variant: "outline",
            action: async () => {
                // Simulate email verification request
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log("Email verification sent");
            },
            disabled: user.isEmailVerified,
        },
        {
            id: "export-data",
            icon: Download,
            label: "Export Data",
            description: "Download a copy of your data",
            variant: "outline",
            action: async () => {
                // Simulate data export
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log("Data export completed");
            },
        },
        {
            id: "delete-account",
            icon: Trash2,
            label: "Delete Account",
            description: "Permanently delete your account and all data",
            variant: "destructive",
            action: () => console.log("Delete Account"),
            requiresConfirmation: true,
            confirmationText: "This action cannot be undone. Are you sure?"
        }
    ];

    return (
        <motion.div
            className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <h4 className="text-lg font-semibold text-white mb-4">
                Account Management
            </h4>

            <div className="space-y-3">
                {/* Account Actions */}
                {accountActions.map((action, index) => {
                    const isLoading = loadingActions.has(action.id);
                    const isConfirming = confirmingAction === action.id;
                    const isDisabled = action.disabled || isLoading;

                    return (
                        <motion.div
                            key={action.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                        >
                            <AnimatePresence mode="wait">
                                {isConfirming ? (
                                    <motion.div
                                        key="confirming"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-2"
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-red-400 text-sm font-medium mb-2">
                                                    {action.confirmationText}
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => handleConfirmAction(action.id, action.action)}
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8"
                                                    >
                                                        Confirm
                                                    </Button>
                                                    <Button
                                                        onClick={() => setConfirmingAction(null)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-slate-600 text-slate-300"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>

                            <Button
                                onClick={() => {
                                    if (action.requiresConfirmation) {
                                        handleConfirmAction(action.id, action.action);
                                    } else {
                                        handleActionWithLoading(action.id, action.action);
                                    }
                                }}
                                disabled={isDisabled}
                                variant={action.variant}
                                className={`w-full justify-start h-auto p-3 ${action.variant === "outline"
                                        ? "bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
                                        : action.variant === "destructive"
                                            ? "bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 hover:border-red-500"
                                            : ""
                                    } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                    ) : action.id === "verify-email" && user.isEmailVerified ? (
                                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    ) : (
                                        <action.icon className="w-4 h-4 flex-shrink-0" />
                                    )}

                                    <div className="text-left flex-1">
                                        <div className="font-medium text-sm">
                                            {action.id === "verify-email" && user.isEmailVerified
                                                ? "Email Verified"
                                                : action.label}
                                        </div>
                                        <div className={`text-xs ${action.variant === "destructive" ? "text-red-400/70" : "text-slate-400"
                                            }`}>
                                            {action.id === "verify-email" && user.isEmailVerified
                                                ? "Your email is verified"
                                                : action.description}
                                        </div>
                                    </div>

                                    {!isDisabled && (
                                        <div className="text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </Button>
                        </motion.div>
                    );
                })}

                {/* Logout Button */}
                <motion.div
                    className="pt-4 border-t border-slate-700/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full justify-start bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all duration-300 h-auto p-3"
                        >
                            <AnimatePresence mode="wait">
                                {isLoggingOut ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-3"
                                    >
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full"
                                        />
                                        <div className="text-left">
                                            <div className="font-medium text-sm">Logging out...</div>
                                            <div className="text-xs text-red-400/70">Please wait</div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="idle"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-3 w-full"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <div className="text-left flex-1">
                                            <div className="font-medium text-sm">Logout</div>
                                            <div className="text-xs text-red-400/70">Sign out of your account</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default AccountManagement;