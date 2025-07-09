"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FC, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Key,
    Smartphone,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle2,
    Plus,
    Save,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/hooks/useAuth";

const SecuritySettings: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const { changePassword } = useAuth();

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const validatePassword = (password: string) => {
        const errors = [];
        if (password.length < 8) errors.push("At least 8 characters");
        if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
        if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
        if (!/\d/.test(password)) errors.push("One number");
        if (!/[!@#$%^&*]/.test(password)) errors.push("One special character");
        return errors;
    };

    const handlePasswordChange = async () => {
        const errors: Record<string, string> = {};

        if (!passwordData.current) {
            errors.current = "Current password is required";
        }

        if (!passwordData.new) {
            errors.new = "New password is required";
        } else {
            const validationErrors = validatePassword(passwordData.new);
            if (validationErrors.length > 0) {
                errors.new = validationErrors.join(", ");
            }
        }

        if (passwordData.new !== passwordData.confirm) {
            errors.confirm = "Passwords do not match";
        }

        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors);
            return;
        }

        setIsLoading(true);
        try {
            const result = await changePassword({ currentPassword: passwordData.current, newPassword: passwordData.new });
            if (result.success) {
                setSuccessMessage("Password changed successfully!");
                setPasswordData({ current: '', new: '', confirm: '' });
                setIsChangingPassword(false);
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setPasswordErrors({ general: result.error || "Failed to change password" });
            }
        } catch (error) {
            setPasswordErrors({ general: "An unexpected error occurred" });
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate simple security score based on available data
    const getSecurityScore = () => {
        let score = 0;
        if (user?.isEmailVerified) score += 50;
        // Could add more factors when available (2FA, strong password, etc.)
        score += 35; // Base score for having an account
        return Math.min(score, 100);
    };

    const securityScore = getSecurityScore();
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "Good security level";
        if (score >= 60) return "Fair security level";
        return "Needs improvement";
    };

    return (
        <div className="space-y-6">
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

            {/* Security Overview */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-xl font-semibold text-white mb-4">Security Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Account Security Score */}
                    <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className={`w-5 h-5 ${getScoreColor(securityScore)}`} />
                            <span className="font-medium text-white">Security Score</span>
                        </div>
                        <div className={`text-2xl font-bold mb-1 ${getScoreColor(securityScore)}`}>
                            {securityScore}%
                        </div>
                        <p className="text-xs text-slate-400">{getScoreLabel(securityScore)}</p>
                    </div>

                    {/* Email Verification */}
                    <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                            {user?.isEmailVerified ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-orange-400" />
                            )}
                            <span className="font-medium text-white">Email</span>
                        </div>
                        <div className="text-sm text-white mb-1">
                            {user?.isEmailVerified ? "Verified" : "Not Verified"}
                        </div>
                        <p className="text-xs text-slate-400">
                            {user?.isEmailVerified ? "Email is confirmed" : "Verify your email"}
                        </p>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Smartphone className="w-5 h-5 text-orange-400" />
                            <span className="font-medium text-white">2FA</span>
                        </div>
                        <div className="text-sm text-white mb-1">Not Enabled</div>
                        <p className="text-xs text-slate-400">Enable for extra security</p>
                    </div>
                </div>
            </motion.div>

            {/* Password Management */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Password</h3>
                        <p className="text-slate-400">Manage your account password and security.</p>
                    </div>
                    {!isChangingPassword && (
                        <Button
                            onClick={() => setIsChangingPassword(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Key className="w-4 h-4 mr-2" />
                            Change Password
                        </Button>
                    )}
                </div>

                <AnimatePresence>
                    {isChangingPassword && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4"
                        >
                            {/* General Error */}
                            {passwordErrors.general && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <span className="text-red-400 text-sm">{passwordErrors.general}</span>
                                </div>
                            )}

                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.current ? "text" : "password"}
                                        value={passwordData.current}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                                        className={`bg-slate-700/50 border-slate-600 text-white pr-10 ${passwordErrors.current ? 'border-red-500' : ''
                                            }`}
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passwordErrors.current && (
                                    <span className="text-red-400 text-xs mt-1">{passwordErrors.current}</span>
                                )}
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.new ? "text" : "password"}
                                        value={passwordData.new}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                                        className={`bg-slate-700/50 border-slate-600 text-white pr-10 ${passwordErrors.new ? 'border-red-500' : ''
                                            }`}
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passwordErrors.new && (
                                    <span className="text-red-400 text-xs mt-1">{passwordErrors.new}</span>
                                )}

                                {/* Password Requirements */}
                                {passwordData.new && (
                                    <div className="mt-2 space-y-1">
                                        {validatePassword(passwordData.new).map((req, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs text-red-400">
                                                <X className="w-3 h-3" />
                                                <span>{req}</span>
                                            </div>
                                        ))}
                                        {validatePassword(passwordData.new).length === 0 && (
                                            <div className="flex items-center gap-2 text-xs text-green-400">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Password meets all requirements</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.confirm ? "text" : "password"}
                                        value={passwordData.confirm}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                                        className={`bg-slate-700/50 border-slate-600 text-white pr-10 ${passwordErrors.confirm ? 'border-red-500' : ''
                                            }`}
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passwordErrors.confirm && (
                                    <span className="text-red-400 text-xs mt-1">{passwordErrors.confirm}</span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handlePasswordChange}
                                    disabled={isLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isLoading ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                        />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {isLoading ? 'Changing...' : 'Change Password'}
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsChangingPassword(false);
                                        setPasswordData({ current: '', new: '', confirm: '' });
                                        setPasswordErrors({});
                                    }}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Two-Factor Authentication */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Two-Factor Authentication</h3>
                        <p className="text-slate-400">Add an extra layer of security to your account.</p>
                    </div>
                    <Badge variant="outline" className="border-orange-500 text-orange-400">
                        Not Enabled
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                            <Smartphone className="w-5 h-5 text-blue-400" />
                            <h4 className="font-medium text-white">Authenticator App</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            Use an app like Google Authenticator or Authy to generate time-based codes.
                        </p>
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => console.log("Setup 2FA - Authenticator")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Setup
                        </Button>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                            <Smartphone className="w-5 h-5 text-green-400" />
                            <h4 className="font-medium text-white">SMS Verification</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            Receive verification codes via SMS to your phone number.
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                            onClick={() => console.log("Setup 2FA - SMS")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Setup
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Security Tips */}
            <motion.div
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h3 className="text-lg font-semibold text-white mb-4">Security Recommendations</h3>

                <div className="space-y-3">
                    {!user?.isEmailVerified && (
                        <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-orange-400 font-medium mb-1">Verify your email address</p>
                                <p className="text-sm text-slate-400">
                                    Verify your email to secure your account and receive important notifications.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <Smartphone className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-blue-400 font-medium mb-1">Enable Two-Factor Authentication</p>
                            <p className="text-sm text-slate-400">
                                Add an extra layer of security by enabling 2FA with an authenticator app.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <Key className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-green-400 font-medium mb-1">Use a strong password</p>
                            <p className="text-sm text-slate-400">
                                Ensure your password is at least 8 characters with mixed case, numbers, and symbols.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SecuritySettings;