import { FC } from "react";
import { motion } from "framer-motion";
import { User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserAvatarProps {
    user: {
        id: string;
        firstName?: string;
        lastName?: string;
        username: string;
        avatar?: string;
        fullName?: string;
    };
    size?: "sm" | "md" | "lg" | "xl";
    showEditButton?: boolean;
    showOnlineStatus?: boolean;
    onEdit?: () => void;
    className?: string;
}

const UserAvatar: FC<UserAvatarProps> = ({
    user,
    size = "lg",
    showEditButton = false,
    showOnlineStatus = true,
    onEdit,
    className = ""
}) => {
    // Size configurations
    const sizeConfig = {
        sm: { container: "w-8 h-8", text: "text-sm", status: "w-2 h-2", edit: "w-3 h-3" },
        md: { container: "w-12 h-12", text: "text-base", status: "w-3 h-3", edit: "w-4 h-4" },
        lg: { container: "w-16 h-16", text: "text-xl", status: "w-5 h-5", edit: "w-5 h-5" },
        xl: { container: "w-24 h-24", text: "text-3xl", status: "w-6 h-6", edit: "w-6 h-6" }
    };

    const config = sizeConfig[size];

    // Get user initials
    const getInitials = () => {
        if (user.firstName && user.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
        }
        if (user.fullName) {
            const names = user.fullName.split(' ');
            if (names.length >= 2) {
                return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
            }
            return names[0].charAt(0).toUpperCase();
        }
        return user.username?.charAt(0).toUpperCase() || 'U';
    };

    return (
        <div className={`relative ${className}`}>
            <motion.div
                className={`${config.container} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden`}
                whileHover={{ scale: showEditButton ? 1.05 : 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={`${user.fullName || user.username}'s avatar`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className={`text-white font-bold ${config.text}`}>
                        {getInitials()}
                    </span>
                )}

                {/* Edit overlay - only show on hover if edit button is enabled */}
                {showEditButton && onEdit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                        onClick={onEdit}
                    >
                        <Camera className={`${config.edit} text-white`} />
                    </motion.div>
                )}
            </motion.div>

            {/* Online status indicator */}
            {showOnlineStatus && (
                <motion.div
                    className={`absolute -bottom-0.5 -right-0.5 ${config.status} bg-green-500 rounded-full border-2 border-slate-800`}
                    animate={{
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                    }}
                />
            )}

            {/* Edit button (separate from overlay) */}
            {showEditButton && onEdit && size === "xl" && (
                <Button
                    onClick={onEdit}
                    size="sm"
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-slate-800"
                >
                    <Camera className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};

export default UserAvatar;