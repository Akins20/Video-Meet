"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { FC, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Video,
    Home,
    Settings,
    User,
    Calendar,
    Users,
    Bell,
    Menu,
    X,
    LogOut,
    Plus,
    BarChart3,
    Monitor,
    MessageSquare,
    ChevronDown,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import useAuth from "@/hooks/useAuth";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";
import UserAvatar from "@/components/dashboard/UserAvatar";

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: any;
    badge?: string;
    requiresAuth: boolean;
    hideOnMobile?: boolean;
}

const GlobalNavbar: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const meetings = useSelector((state: RootState) => state.meeting.meetings || []);
    const isInMeeting = useSelector((state: RootState) => !!state.meeting.currentMeeting);
    const { logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const isAuthenticated = !!user;
    const activeMeetings = meetings.filter(m => m.status === 'active').length;
    const upcomingMeetings = meetings.filter(m => m.status === 'waiting').length;

    // Navigation items
    const navItems: NavItem[] = [
        {
            id: "home",
            label: "Home",
            href: "/home",
            icon: Home,
            requiresAuth: false
        },
        {
            id: "dashboard",
            label: "Dashboard",
            href: "/dashboard",
            icon: BarChart3,
            requiresAuth: true
        },
        {
            id: "meetings",
            label: "Meetings",
            href: "/dashboard?tab=meetings",
            icon: Video,
            badge: activeMeetings > 0 ? activeMeetings.toString() : undefined,
            requiresAuth: true
        },
        {
            id: "calendar",
            label: "Calendar",
            href: "/calendar",
            icon: Calendar,
            badge: upcomingMeetings > 0 ? upcomingMeetings.toString() : undefined,
            requiresAuth: true,
            hideOnMobile: true
        },
        {
            id: "team",
            label: "Team",
            href: "/team",
            icon: Users,
            requiresAuth: true,
            hideOnMobile: true
        }
    ];

    // Filter navigation items based on auth status
    const visibleNavItems = navItems.filter(item => 
        !item.requiresAuth || (item.requiresAuth && isAuthenticated)
    );

    // User menu items
    const userMenuItems = [
        { label: "Profile", href: "/settings?section=profile", icon: User },
        { label: "Settings", href: "/settings", icon: Settings },
        { label: "Analytics", href: "/dashboard?tab=analytics", icon: BarChart3 },
    ];

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
    }, [pathname]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.user-menu') && !target.closest('.mobile-menu')) {
                setIsUserMenuOpen(false);
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const isActiveRoute = (href: string) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(href);
    };

    // Don't show navbar on auth pages or landing page
    const hideNavbar = pathname === '/' || pathname.startsWith('/auth');
    if (hideNavbar) return null;

    return (
        <motion.nav
            className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <motion.div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white hidden sm:block">
                            Video Meet
                        </span>
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {visibleNavItems.map((item) => (
                            <motion.button
                                key={item.id}
                                onClick={() => router.push(item.href)}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActiveRoute(item.href)
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                                {item.badge && (
                                    <Badge className="bg-red-500 text-white text-xs px-1 py-0 min-w-5 h-5">
                                        {item.badge}
                                    </Badge>
                                )}
                            </motion.button>
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">
                        {/* Search (when authenticated) */}
                        {isAuthenticated && (
                            <div className="hidden lg:block relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search meetings..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 w-48"
                                />
                            </div>
                        )}

                        {/* Meeting Status */}
                        {isInMeeting && (
                            <motion.div
                                className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium hidden sm:block">In Meeting</span>
                            </motion.div>
                        )}

                        {/* Quick Actions (when authenticated) */}
                        {isAuthenticated && (
                            <>
                                {/* Create Meeting Button */}
                                <Button
                                    onClick={() => router.push('/meeting/create')}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 hidden sm:flex"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Meeting
                                </Button>

                                {/* Notifications */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="relative text-slate-400 hover:text-white"
                                    onClick={() => router.push('/notifications')}
                                >
                                    <Bell className="w-5 h-5" />
                                    {(activeMeetings + upcomingMeetings) > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                                    )}
                                </Button>

                                {/* User Menu */}
                                <div className="relative user-menu">
                                    <motion.button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <UserAvatar user={user} size="sm" showOnlineStatus />
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform hidden sm:block ${
                                            isUserMenuOpen ? 'rotate-180' : ''
                                        }`} />
                                    </motion.button>

                                    {/* User Dropdown */}
                                    <AnimatePresence>
                                        {isUserMenuOpen && (
                                            <motion.div
                                                className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50"
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                transition={{ duration: 0.1 }}
                                            >
                                                {/* User Info */}
                                                <div className="px-4 py-3 border-b border-slate-700">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={user} size="sm" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-white truncate">
                                                                {user?.firstName || user?.username}
                                                            </p>
                                                            <p className="text-sm text-slate-400 truncate">
                                                                {user?.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Menu Items */}
                                                <div className="py-1">
                                                    {userMenuItems.map((item) => (
                                                        <button
                                                            key={item.label}
                                                            onClick={() => router.push(item.href)}
                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                                                        >
                                                            <item.icon className="w-4 h-4" />
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Logout */}
                                                <div className="border-t border-slate-700 pt-1">
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                        Sign Out
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}

                        {/* Auth Buttons (when not authenticated) */}
                        {!isAuthenticated && (
                            <div className="flex items-center gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-300 hover:text-white"
                                            onClick={() => setAuthModal("login")}
                                        >
                                            Sign In
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md bg-transparent border-0 shadow-none">
                                        <DialogTitle className="text-2xl font-bold text-white mb-4">
                                            Sign In to Video Meet
                                        </DialogTitle>
                                        <LoginPage />
                                    </DialogContent>
                                </Dialog>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={() => setAuthModal("register")}
                                        >
                                            Get Started
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md bg-transparent border-0 shadow-none">
                                        <DialogTitle className="text-2xl font-bold text-white mb-4">
                                            Create Your Account
                                        </DialogTitle>
                                        <RegisterPage />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="md:hidden text-slate-400 hover:text-white mobile-menu"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            className="md:hidden mobile-menu"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="py-4 space-y-2 border-t border-slate-700">
                                {/* Search (mobile) */}
                                {isAuthenticated && (
                                    <div className="px-4 pb-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="Search meetings..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Navigation Items */}
                                {visibleNavItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => router.push(item.href)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                            isActiveRoute(item.href)
                                                ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-500'
                                                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                        {item.badge && (
                                            <Badge className="bg-red-500 text-white text-xs px-2 py-1 ml-auto">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </button>
                                ))}

                                {/* Mobile Quick Actions */}
                                {isAuthenticated && (
                                    <div className="px-4 pt-2 space-y-2">
                                        <Button
                                            onClick={() => router.push('/dashboard')}
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            New Meeting
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
};

export default GlobalNavbar;