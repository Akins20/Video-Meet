"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
    Search,
    Menu,
    X,
    ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Import our settings components
import AccountSettings from "./AccountSettings";
import NotificationsSettings from "./NotificationSettings";
import SecuritySettings from "./SecuritySettings";
import React from "react";

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    badge?: string;
}

const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2
        }
    }
};

const sidebarVariants = {
    hidden: { x: -280, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 20
        }
    }
};

const SettingsClient = () => {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState('account');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Get section from URL on mount and when URL changes
    useEffect(() => {
        const getSectionFromURL = () => {
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('section') || 'account';
            }
            return 'account';
        };

        const handlePopState = () => {
            setActiveSection(getSectionFromURL());
        };

        // Set initial section from URL
        setActiveSection(getSectionFromURL());

        // Listen for browser back/forward navigation
        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const settingsSections: SettingsSection[] = [
        {
            id: "account",
            title: "Account",
            description: "Personal information and profile settings",
            icon: User,
            color: "from-blue-500 to-cyan-500"
        },
        {
            id: "notifications",
            title: "Notifications",
            description: "Email and push notification preferences",
            icon: Bell,
            color: "from-green-500 to-emerald-500",
            badge: "3"
        },
        {
            id: "security",
            title: "Privacy & Security",
            description: "Password, 2FA, and privacy settings",
            icon: Shield,
            color: "from-red-500 to-pink-500"
        },
        {
            id: "appearance",
            title: "Appearance",
            description: "Theme, layout, and visual preferences",
            icon: Palette,
            color: "from-purple-500 to-indigo-500"
        },
        {
            id: "language",
            title: "Language & Region",
            description: "Language, timezone, and regional settings",
            icon: Globe,
            color: "from-orange-500 to-yellow-500"
        },
        {
            id: "media",
            title: "Audio & Video",
            description: "Camera, microphone, and media settings",
            icon: Camera,
            color: "from-teal-500 to-cyan-500"
        },
        {
            id: "activity",
            title: "Activity",
            description: "View and manage your account activity",
            icon: Activity,
            color: "from-indigo-500 to-purple-500"
        },
        {
            id: "shortcuts",
            title: "Keyboard Shortcuts",
            description: "Customize keyboard shortcuts",
            icon: Key,
            color: "from-amber-500 to-orange-500"
        },
        {
            id: "export",
            title: "Data Export",
            description: "Download your data and information",
            icon: Download,
            color: "from-violet-500 to-purple-500"
        },
        {
            id: "danger",
            title: "Danger Zone",
            description: "Delete account and sensitive actions",
            icon: Trash2,
            color: "from-red-600 to-red-700"
        }
    ];

    // Function to change section and update URL
    const changeSection = (sectionId: string) => {
        const url = new URL(window.location.href);
        if (sectionId === 'account') {
            url.searchParams.delete('section'); // Clean URL for default section
        } else {
            url.searchParams.set('section', sectionId);
        }
        
        // Update URL without page reload
        window.history.pushState({}, '', url.toString());
        setActiveSection(sectionId);
    };

    // Filter sections based on search
    const filteredSections = settingsSections.filter(section =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCurrentSectionInfo = () => {
        return settingsSections.find(section => section.id === activeSection) || settingsSections[0];
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case "account":
                return <AccountSettings />;
            case "notifications":
                return <NotificationsSettings />;
            case "security":
                return <SecuritySettings />;
            case "appearance":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Palette className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Appearance Settings</h3>
                            <p className="text-slate-400">Theme and visual customization options coming soon</p>
                        </div>
                    </motion.div>
                );
            case "language":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Globe className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Language & Region</h3>
                            <p className="text-slate-400">Language and regional settings coming soon</p>
                        </div>
                    </motion.div>
                );
            case "media":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Camera className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Audio & Video Settings</h3>
                            <p className="text-slate-400">Media device configuration coming soon</p>
                        </div>
                    </motion.div>
                );
            case "activity":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Account Activity</h3>
                            <p className="text-slate-400">Activity logs and history coming soon</p>
                        </div>
                    </motion.div>
                );
            case "shortcuts":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Key className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Keyboard Shortcuts</h3>
                            <p className="text-slate-400">Shortcut customization coming soon</p>
                        </div>
                    </motion.div>
                );
            case "export":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Download className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Data Export</h3>
                            <p className="text-slate-400">Data export functionality coming soon</p>
                        </div>
                    </motion.div>
                );
            case "danger":
                return (
                    <motion.div
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
                    >
                        <div className="text-center py-12">
                            <Trash2 className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Danger Zone</h3>
                            <p className="text-slate-400">Account deletion and sensitive operations coming soon</p>
                        </div>
                    </motion.div>
                );
            default:
                return <AccountSettings />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Animated Background */}
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

            {/* GitHub-Style Sidebar */}
            <motion.aside
                className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300 z-40 ${
                    isSidebarOpen ? 'w-72' : 'w-16'
                }`}
                variants={sidebarVariants}
                initial="visible"
                animate="visible"
            >
                <div className="p-4 h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between mb-6">
                        {isSidebarOpen && (
                            <motion.div
                                className="flex items-center gap-3"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push('/dashboard')}
                                    className="text-slate-400 hover:text-white p-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="text-lg font-semibold text-white">Settings</h2>
                            </motion.div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-slate-400 hover:text-white p-2"
                        >
                            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </Button>
                    </div>

                    {/* Search */}
                    {isSidebarOpen && (
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search settings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
                            />
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 overflow-y-auto">
                        {filteredSections.map((section, index) => (
                            <motion.button
                                key={section.id}
                                onClick={() => changeSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                                    activeSection === section.id 
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + index * 0.02 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                title={!isSidebarOpen ? section.title : undefined}
                            >
                                <div className={`w-8 h-8 bg-gradient-to-br ${section.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <section.icon className="w-4 h-4 text-white" />
                                </div>
                                
                                {isSidebarOpen && (
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{section.title}</span>
                                            {section.badge && (
                                                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                                                    {section.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{section.description}</p>
                                    </div>
                                )}
                                
                                {isSidebarOpen && (
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors flex-shrink-0" />
                                )}

                                {!isSidebarOpen && section.badge && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                )}
                            </motion.button>
                        ))}
                    </nav>

                    {/* No results */}
                    {filteredSections.length === 0 && searchTerm && isSidebarOpen && (
                        <motion.div
                            className="text-center py-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Settings className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-sm font-semibold text-white mb-1">
                                No settings found
                            </h3>
                            <p className="text-xs text-slate-400">
                                Try adjusting your search terms
                            </p>
                        </motion.div>
                    )}

                    {/* Sidebar Footer */}
                    {isSidebarOpen && (
                        <motion.div
                            className="mt-auto pt-4 border-t border-slate-700/50"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="text-xs text-slate-500 px-3">
                                <p>Video Meet Settings</p>
                                <p>v1.0.0</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-16'}`}>
                {/* Page Header */}
                <div className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/30 sticky top-16 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getCurrentSectionInfo().color} rounded-lg flex items-center justify-center`}>
                                {React.createElement(getCurrentSectionInfo().icon, { className: "w-5 h-5 text-white" })}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">{getCurrentSectionInfo().title}</h1>
                                <p className="text-slate-400 text-sm">{getCurrentSectionInfo().description}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Content */}
                <main className="p-6">
                    <AnimatePresence mode="wait">
                        {renderSectionContent()}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default SettingsClient;