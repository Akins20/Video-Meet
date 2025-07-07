import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Edit3, 
    Save, 
    X, 
    CheckCircle2, 
    Mail, 
    User, 
    FileText,
    AlertCircle,
    Loader2
} from "lucide-react";
import UserAvatar from "./UserAvatar";

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    username: string;
    isEmailVerified: boolean;
    avatar?: string;
    bio?: string;
    lastLogin?: string;
    preferences?: any;
}

interface ProfileEditorProps {
    user: User;
    onSave: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
    className?: string;
}

const ProfileEditor: FC<ProfileEditorProps> = ({
    user,
    onSave,
    className = ""
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const [editData, setEditData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        bio: user?.bio || '',
        email: user?.email || ''
    });

    // Reset form when user changes
    useEffect(() => {
        setEditData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            username: user?.username || '',
            bio: user?.bio || '',
            email: user?.email || ''
        });
        setErrors({});
    }, [user]);

    // Validation
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!editData.firstName.trim()) {
            newErrors.firstName = "First name is required";
        }

        if (!editData.lastName.trim()) {
            newErrors.lastName = "Last name is required";
        }

        if (!editData.username.trim()) {
            newErrors.username = "Username is required";
        } else if (editData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }

        if (!editData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (editData.bio.length > 200) {
            newErrors.bio = "Bio must be less than 200 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveProfile = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const result = await onSave(editData);
            if (result.success) {
                setIsEditing(false);
                setErrors({});
            } else {
                setErrors({ general: result.error || "Failed to update profile" });
            }
        } catch (error) {
            setErrors({ general: "An unexpected error occurred" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            username: user?.username || '',
            bio: user?.bio || '',
            email: user?.email || ''
        });
        setErrors({});
        setIsEditing(false);
    };

    const getDisplayName = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        return user?.fullName || user?.username || 'User';
    };

    const handleInputChange = (field: string, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <motion.div
            className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm ${className}`}
            whileHover={{
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <UserAvatar
                    user={user}
                    size="lg"
                    showEditButton={isEditing}
                    onEdit={() => console.log("Avatar edit clicked")}
                />

                {/* User Info */}
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        {isEditing ? (
                            <motion.div
                                key="editing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                {/* General error */}
                                {errors.general && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-2 rounded-lg"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.general}
                                    </motion.div>
                                )}

                                {/* Name inputs */}
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Input
                                            value={editData.firstName}
                                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                                            placeholder="First Name"
                                            className={`bg-slate-700/50 border-slate-600 text-white ${
                                                errors.firstName ? 'border-red-500' : ''
                                            }`}
                                        />
                                        {errors.firstName && (
                                            <span className="text-red-400 text-xs mt-1">{errors.firstName}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            value={editData.lastName}
                                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                                            placeholder="Last Name"
                                            className={`bg-slate-700/50 border-slate-600 text-white ${
                                                errors.lastName ? 'border-red-500' : ''
                                            }`}
                                        />
                                        {errors.lastName && (
                                            <span className="text-red-400 text-xs mt-1">{errors.lastName}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Username input */}
                                <div>
                                    <Input
                                        value={editData.username}
                                        onChange={(e) => handleInputChange('username', e.target.value)}
                                        placeholder="Username"
                                        className={`bg-slate-700/50 border-slate-600 text-white ${
                                            errors.username ? 'border-red-500' : ''
                                        }`}
                                    />
                                    {errors.username && (
                                        <span className="text-red-400 text-xs mt-1">{errors.username}</span>
                                    )}
                                </div>

                                {/* Email input */}
                                <div>
                                    <Input
                                        value={editData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="Email"
                                        type="email"
                                        className={`bg-slate-700/50 border-slate-600 text-white ${
                                            errors.email ? 'border-red-500' : ''
                                        }`}
                                    />
                                    {errors.email && (
                                        <span className="text-red-400 text-xs mt-1">{errors.email}</span>
                                    )}
                                </div>

                                {/* Bio input */}
                                <div>
                                    <Input
                                        value={editData.bio}
                                        onChange={(e) => handleInputChange('bio', e.target.value)}
                                        placeholder="Bio (optional)"
                                        className={`bg-slate-700/50 border-slate-600 text-white ${
                                            errors.bio ? 'border-red-500' : ''
                                        }`}
                                    />
                                    <div className="flex justify-between items-center mt-1">
                                        {errors.bio ? (
                                            <span className="text-red-400 text-xs">{errors.bio}</span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">
                                                {editData.bio.length}/200 characters
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="viewing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-2"
                            >
                                {/* Name and edit button */}
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
                                        className="p-1 h-auto text-slate-400 hover:text-white transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Username */}
                                <motion.div
                                    className="flex items-center gap-2 text-slate-400"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <User className="w-4 h-4" />
                                    <span className="text-sm">@{user?.username}</span>
                                </motion.div>

                                {/* Email */}
                                <motion.div
                                    className="flex items-center gap-2 text-slate-400"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{user?.email}</span>
                                    {user?.isEmailVerified && (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    )}
                                    {!user?.isEmailVerified && (
                                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-400">
                                            Unverified
                                        </Badge>
                                    )}
                                </motion.div>

                                {/* Bio */}
                                {user?.bio && (
                                    <motion.div
                                        className="flex items-start gap-2 text-slate-400"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <FileText className="w-4 h-4 mt-0.5" />
                                        <p className="text-sm">{user.bio}</p>
                                    </motion.div>
                                )}

                                {/* Status */}
                                <motion.div
                                    className="flex items-center gap-2 mt-3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-sm text-green-400">Online</span>
                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                        Member
                                    </Badge>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default ProfileEditor;