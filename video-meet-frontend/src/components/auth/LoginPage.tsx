"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import { AppDispatch } from "@/store";
import { 
    Video, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    ArrowRight, 
    Loader2, 
    AlertCircle,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import Link from "next/link";

const schema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof schema>;

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

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as "spring",
            stiffness: 100,
            damping: 10
        }
    }
};

import { easeInOut } from "framer-motion";

const floatingVariants = {
    animate: {
        y: [-10, 10, -10],
        rotate: [0, 5, -5, 0],
        transition: {
            duration: 6,
            repeat: Infinity,
            ease: easeInOut
        }
    }
};

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const dispatch = useDispatch<AppDispatch>();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginSuccess, setLoginSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginForm>({
        resolver: zodResolver(schema),
    });

    const email = watch("email");
    const password = watch("password");

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        setLoginError(null);

        try {
            const credentials = {
                emailOrUsername: data.email,
                password: data.password,
            };
            
            await login(credentials);
            setLoginSuccess(true);
            
            // Add a delay to show success animation
            setTimeout(() => {
                router.push("/dashboard");
            }, 1500);
        } catch (err: any) {
            console.error("Login error:", err);
            setLoginError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Animated Background Elements */}
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

            <motion.div
                className="relative z-10 w-full max-w-md"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <motion.div 
                    className="text-center mb-8"
                    variants={itemVariants}
                >
                    <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl mb-4"
                        variants={floatingVariants}
                        animate="animate"
                    >
                        <Video className="w-8 h-8 text-white" />
                    </motion.div>
                    
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-slate-400">
                        Sign in to continue to Video Meet
                    </p>
                </motion.div>

                {/* Login Form */}
                <motion.div
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl"
                    variants={itemVariants}
                    whileHover={{ 
                        boxShadow: "0 25px 50px rgba(0,0,0,0.5)" 
                    }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email Field */}
                        <motion.div
                            className="space-y-2"
                            variants={itemVariants}
                        >
                            <label className="text-sm font-medium text-slate-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileFocus={{ scale: 1.02 }}
                                >
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        {...register("email")}
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 pl-12 pr-4 rounded-xl"
                                        disabled={isLoading}
                                    />
                                </motion.div>
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                
                                {email && !errors.email && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </motion.div>
                                )}
                            </div>
                            
                            <AnimatePresence mode="wait">
                                {errors.email && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                        className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {errors.email.message}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Password Field */}
                        <motion.div
                            className="space-y-2"
                            variants={itemVariants}
                        >
                            <label className="text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileFocus={{ scale: 1.02 }}
                                >
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        {...register("password")}
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 pl-12 pr-12 rounded-xl"
                                        disabled={isLoading}
                                    />
                                </motion.div>
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                
                                <motion.button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </motion.button>
                            </div>
                            
                            <AnimatePresence mode="wait">
                                {errors.password && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                        className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {errors.password.message}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Login Error */}
                        <AnimatePresence mode="wait">
                            {loginError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                    className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {loginError}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Success Message */}
                        <AnimatePresence mode="wait">
                            {loginSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                    className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-4"
                                >
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    Login successful! Redirecting to dashboard...
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.div
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                type="submit"
                                disabled={isLoading || loginSuccess}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                            >
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Signing in...
                                        </motion.div>
                                    ) : loginSuccess ? (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            Success!
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex items-center gap-2"
                                        >
                                            Sign In
                                            <motion.div
                                                className="group-hover:translate-x-1 transition-transform duration-200"
                                            >
                                                <ArrowRight className="w-5 h-5" />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </motion.div>

                        {/* Forgot Password */}
                        <motion.div
                            className="text-center"
                            variants={itemVariants}
                        >
                            <motion.button
                                type="button"
                                className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                                whileHover={{ scale: 1.05 }}
                            >
                                Forgot your password?
                            </motion.button>
                        </motion.div>
                    </form>
                </motion.div>

                {/* Sign Up Link */}
                <motion.div
                    className="text-center mt-8"
                    variants={itemVariants}
                >
                    <p className="text-slate-400">
                        Don't have an account?{" "}
                        <Link 
                            href="/register" 
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Sign up here
                        </Link>
                    </p>
                </motion.div>

                {/* Footer */}
                <motion.div
                    className="text-center mt-8 text-slate-500 text-sm"
                    variants={itemVariants}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Powered by Video Meet</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}