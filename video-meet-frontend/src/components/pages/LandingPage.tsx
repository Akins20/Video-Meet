/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
    Video, 
    Users, 
    Shield, 
    Zap, 
    Globe, 
    MessageSquare, 
    Share2, 
    Camera, 
    Mic, 
    Monitor, 
    Star,
    ArrowRight,
    Play,
    CheckCircle2,
    Sparkles,
    Rocket,
    Heart,
    Award,
    User
} from "lucide-react";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            duration: 0.6
        }
    }
};

import type { Variants } from "framer-motion";

const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 10
        }
    }
};

import { easeInOut } from "framer-motion";

const floatingVariants = {
    animate: {
        y: [-20, 20, -20],
        rotate: [0, 5, -5, 0],
        transition: {
            duration: 6,
            repeat: Infinity,
            ease: easeInOut
        }
    }
};

const features = [
    {
        icon: Video,
        title: "Crystal Clear Video",
        description: "HD video calls with automatic quality adjustment",
        color: "from-blue-500 to-cyan-500"
    },
    {
        icon: Users,
        title: "Team Collaboration",
        description: "Host meetings with up to 50 participants",
        color: "from-purple-500 to-pink-500"
    },
    {
        icon: Shield,
        title: "Enterprise Security",
        description: "End-to-end encryption and secure data handling",
        color: "from-green-500 to-emerald-500"
    },
    {
        icon: Share2,
        title: "Screen Sharing",
        description: "Share your screen with seamless quality",
        color: "from-orange-500 to-red-500"
    },
    {
        icon: MessageSquare,
        title: "Real-time Chat",
        description: "Instant messaging during video calls",
        color: "from-indigo-500 to-purple-500"
    },
    {
        icon: Globe,
        title: "Cross-Platform",
        description: "Works on any device, anywhere in the world",
        color: "from-teal-500 to-blue-500"
    }
];

const stats = [
    { number: "10K+", label: "Happy Users", icon: Heart },
    { number: "50K+", label: "Meetings Hosted", icon: Video },
    { number: "99.9%", label: "Uptime", icon: Award },
    { number: "150+", label: "Countries", icon: Globe }
];

export default function LandingPage() {
    const router = useRouter();

    const handleGetStarted = () => {
        router.push('/register');
    };

    const handleSignIn = () => {
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
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
                <motion.div 
                    className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5]
                    }}
                    transition={{ 
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                />
                <motion.div 
                    className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl"
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ 
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
            </div>

            {/* Landing Page Header Navigation */}
            <motion.header
                className="relative z-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <motion.div
                            className="flex items-center gap-3"
                            whileHover={{ scale: 1.05 }}
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Video className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Video Meet</span>
                        </motion.div>

                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-slate-300 hover:text-white transition-colors">
                                Features
                            </a>
                            <a href="#stats" className="text-slate-300 hover:text-white transition-colors">
                                About
                            </a>
                            <a href="#contact" className="text-slate-300 hover:text-white transition-colors">
                                Contact
                            </a>
                        </div>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={handleSignIn}
                                className="text-slate-300 hover:text-white hover:bg-slate-700/50"
                            >
                                Sign In
                            </Button>
                            <Button
                                onClick={handleGetStarted}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6"
                            >
                                Get Started
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <div className="relative z-10">
                {/* Hero Section */}
                <motion.section
                    className="min-h-screen flex items-center justify-center px-4 pt-16"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <div className="max-w-6xl mx-auto text-center">
                        {/* Hero Content */}
                        <motion.div
                            className="mb-12"
                            variants={itemVariants}
                        >
                            <motion.div
                                className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full px-6 py-3 mb-8"
                                whileHover={{ scale: 1.05 }}
                                variants={itemVariants}
                            >
                                <Sparkles className="w-5 h-5 text-yellow-400" />
                                <span className="text-slate-300 font-medium">
                                    The Future of Video Meetings
                                </span>
                            </motion.div>

                            <motion.h1
                                className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent"
                                variants={itemVariants}
                            >
                                Video Meet
                            </motion.h1>
                            
                            <motion.p
                                className="text-xl md:text-2xl text-slate-400 mb-4 max-w-3xl mx-auto"
                                variants={itemVariants}
                            >
                                Connect, collaborate, and communicate with 
                                <span className="text-blue-400 font-semibold"> crystal-clear video calls</span> 
                                {" "}built for modern teams.
                            </motion.p>
                            
                            <motion.p
                                className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto"
                                variants={itemVariants}
                            >
                                Experience seamless video conferencing with enterprise-grade security, 
                                real-time collaboration, and intuitive design that just works.
                            </motion.p>

                            {/* CTA Buttons */}
                            <motion.div
                                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                                variants={itemVariants}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        size="lg"
                                        onClick={handleGetStarted}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 group"
                                    >
                                        <Rocket className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                                        Get Started Free
                                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>

                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={handleSignIn}
                                        className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500 font-semibold px-8 py-4 rounded-xl backdrop-blur-sm group"
                                    >
                                        <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                        Sign In
                                    </Button>
                                </motion.div>
                            </motion.div>
                        </motion.div>

                        {/* Floating Video Preview */}
                        <motion.div
                            className="relative max-w-4xl mx-auto"
                            variants={itemVariants}
                        >
                            <motion.div
                                className="relative bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-2xl"
                                whileHover={{ 
                                    scale: 1.02,
                                    boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
                                }}
                                variants={floatingVariants}
                                animate="animate"
                            >
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    {/* Mock Video Tiles */}
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="aspect-video bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl border border-slate-600/30 flex items-center justify-center"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                    <User className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="text-xs text-slate-400">User {i}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                
                                {/* Mock Control Bar */}
                                <motion.div
                                    className="flex items-center justify-center gap-4 bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    {[Camera, Mic, Monitor, MessageSquare].map((Icon, index) => (
                                        <motion.div
                                            key={index}
                                            className="w-10 h-10 bg-slate-700/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-600/50 transition-colors"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <Icon className="w-5 h-5 text-slate-300" />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Stats Section */}
                <motion.section
                    id="stats"
                    className="py-20 px-4"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            className="text-center mb-16"
                            variants={itemVariants}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Trusted by Teams Worldwide
                            </h2>
                            <p className="text-lg text-slate-400">
                                Join thousands of companies already using Video Meet
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={index}
                                    className="text-center bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/50 transition-all duration-300"
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <stat.icon className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                                    <div className="text-3xl font-bold text-white mb-2">
                                        {stat.number}
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Features Section */}
                <motion.section
                    id="features"
                    className="py-20 px-4"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            className="text-center mb-16"
                            variants={itemVariants}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Everything You Need
                            </h2>
                            <p className="text-lg text-slate-400">
                                Powerful features designed for modern collaboration
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/50 transition-all duration-300 group"
                                    variants={itemVariants}
                                    whileHover={{ 
                                        scale: 1.05,
                                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                                    }}
                                >
                                    <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* CTA Section */}
                <motion.section
                    className="py-20 px-4"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-12"
                            variants={itemVariants}
                            whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
                            }}
                        >
                            <motion.h2
                                className="text-3xl md:text-4xl font-bold text-white mb-4"
                                variants={itemVariants}
                            >
                                Ready to Transform Your Meetings?
                            </motion.h2>
                            <motion.p
                                className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto"
                                variants={itemVariants}
                            >
                                Join thousands of teams who've already made the switch to better, 
                                more engaging video meetings.
                            </motion.p>
                            
                            <motion.div
                                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                                variants={itemVariants}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        size="lg"
                                        onClick={handleGetStarted}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 group"
                                    >
                                        <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                                        Start Free Trial
                                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>

                                <motion.div
                                    className="flex items-center gap-2 text-slate-400"
                                    variants={itemVariants}
                                >
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <span>No credit card required</span>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Footer */}
                <motion.footer
                    id="contact"
                    className="py-12 px-4 border-t border-slate-700/50"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <div className="max-w-6xl mx-auto text-center">
                        <motion.div
                            className="flex items-center justify-center gap-2 mb-4"
                            variants={itemVariants}
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Video className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Video Meet</span>
                        </motion.div>
                        <motion.p
                            className="text-slate-400"
                            variants={itemVariants}
                        >
                            © 2024 Video Meet. All rights reserved. Built with ❤️ for modern teams.
                        </motion.p>
                    </div>
                </motion.footer>
            </div>
        </div>
    );
}