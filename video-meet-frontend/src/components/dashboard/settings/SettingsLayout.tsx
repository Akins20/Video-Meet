"use client";
import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import {
    ArrowLeft,
    User,
    Bell,
    Shield,
    Palette,
    Globe,
    Activity,
    Camera,
    Key,
    Download,
    Trash2,
    Settings,
    ChevronRight,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: any;
    href: string;
    badge?: string;
    color: string;
}

interface SettingsLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

const SettingsLayout: FC<SettingsLayoutProps> = ({
    children,
    title = "Settings",
    description = "Manage your account and application preferences"
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState("");

    const settingsSections: SettingsSection[] = [
        {
            id: "account",
            title: "Account",
            description: "Personal information and profile",
            icon: User,
            href: "/settings/account",
            color: "from-blue-500 to-cyan-500"
        },
        {
            id: "notifications",
            title: "Notifications",
            description: "Email and push notification preferences",
            icon: Bell,
            href: "/settings/notifications",
            color: "from-green-500 to-emerald-500",
            badge: "3"
        },
        {
            id: "security",
            title: "Privacy & Security",
            description: "Password, 2FA, and privacy settings",
            icon: Shield,
            href: "/settings/security",
            color: "from-red-500 to-pink-500"
        },
        {
            id: "appearance",
            title: "Appearance",
            description: "Theme, layout, and visual preferences",
            icon: Palette,
            href: "/settings/appearance",
            color: "from-purple-500 to-indigo-500"
        },
        {
            id: "language",
            title: "Language & Region",
            description: "Language, timezone, and regional settings",
            icon: Globe,
            href: "/settings/language",
            color: "from-orange-500 to-yellow-500"
        },
        {
            id: "media",
            title: "Audio & Video",
            description: "Camera, microphone, and media settings",
            icon: Camera,
            href: "/settings/media",
            color: "from-teal-500 to-cyan-500"
        },
        {
            id: "activity",
            title: "Activity",
            description: "View and manage your account activity",
            icon: Activity,
            href: "/settings/activity",
            color: "from-indigo-500 to-purple-500"
        },
        {
            id: "shortcuts",
            title: "Keyboard Shortcuts",
            description: "Customize keyboard shortcuts",
            icon: Key,
            href: "/settings/shortcuts",
            color: "from-amber-500 to-orange-500"
        },
        {
            id: "export",
            title: "Data Export",
            description: "Download your data and information",
            icon: Download,
            href: "/settings/export",
            color: "from-violet-500 to-purple-500"
        },
        {
            id: "danger",
            title: "Danger Zone",
            description: "Delete account and sensitive actions",
            icon: Trash2,
            href: "/settings/danger",
            color: "from-red-600 to-red-700"
        }
    ];

    const filteredSections = settingsSections.filter(section =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isMainSettings = pathname === "/settings";
    const currentSection = settingsSections.find(section => pathname === section.href);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard')}
                            className="text-slate-400 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>

                        {!isMainSettings && currentSection && (
                            <>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400">Settings</span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                <span className="text-white font-medium">{currentSection.title}</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {isMainSettings ? title : currentSection?.title || title}
                            </h1>
                            <p className="text-slate-400">
                                {isMainSettings ? description : currentSection?.description || description}
                            </p>
                        </div>

                        {isMainSettings && (
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search settings..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 w-64"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Settings Navigation - Only show on main settings page */}
                    {isMainSettings && (
                        <motion.div
                            className="lg:col-span-4 space-y-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {filteredSections.map((section, index) => (
                                <motion.button
                                    key={section.id}
                                    onClick={() => router.push(section.href)}
                                    className="w-full text-left bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 group"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + index * 0.05 }}
                                    whileHover={{ scale: 1.02, x: 5 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 bg-gradient-to-br ${section.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <section.icon className="w-6 h-6 text-white" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                    {section.title}
                                                </h3>
                                                {section.badge && (
                                                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                        {section.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                                {section.description}
                                            </p>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors flex-shrink-0" />
                                    </div>
                                </motion.button>
                            ))}

                            {/* No results */}
                            {filteredSections.length === 0 && searchTerm && (
                                <motion.div
                                    className="text-center py-12"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Settings className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        No settings found
                                    </h3>
                                    <p className="text-slate-400">
                                        Try adjusting your search terms
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Main Content */}
                    <motion.div
                        className={isMainSettings ? "lg:col-span-8" : "lg:col-span-12"}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: isMainSettings ? 0.2 : 0.1 }}
                    >
                        <AnimatePresence mode="wait">
                            {isMainSettings ? (
                                <motion.div
                                    key="main-settings"
                                    className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <div className="text-center py-12">
                                        <motion.div
                                            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
                                            animate={{
                                                rotate: [0, 5, -5, 0],
                                                scale: [1, 1.05, 1]
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            <Settings className="w-10 h-10 text-white" />
                                        </motion.div>

                                        <h2 className="text-2xl font-bold text-white mb-4">
                                            Configure Your Experience
                                        </h2>
                                        <p className="text-slate-400 max-w-md mx-auto mb-8">
                                            Select a settings category from the left to customize your account,
                                            notifications, security, and more.
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                            <Button
                                                onClick={() => router.push('/settings/account')}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <User className="w-4 h-4 mr-2" />
                                                Account
                                            </Button>
                                            <Button
                                                onClick={() => router.push('/settings/security')}
                                                variant="outline"
                                                className="border-slate-600 text-white hover:bg-slate-700"
                                            >
                                                <Shield className="w-4 h-4 mr-2" />
                                                Security
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="sub-settings"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    {children}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SettingsLayout;