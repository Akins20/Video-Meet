"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";

export default function LandingPage() {
    const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);

    return (
        <main className="flex flex-col items-center justify-center min-h-screen text-center p-8 relative overflow-hidden">
            {/* subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-950 animate-fade-in" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6 animate-slide-up">
                <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                    Welcome to VideoMeet
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Connect, collaborate, and communicate with high-quality video conferencing built for modern teams.
                </p>
                <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                    VideoMeet brings secure, crystal-clear video calls right to your browser — no downloads, no fuss.
                    Share your screen, chat with colleagues, and get your work done seamlessly.
                </p>
                <div className="flex gap-4 justify-center mt-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button
                                onClick={() => setAuthModal("login")}
                                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                            >
                                Login
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Login to VideoMeet</DialogTitle>
                            <div className="p-2">
                                <LoginPage />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog>
                        <DialogTrigger asChild>
                            <button
                                onClick={() => setAuthModal("register")}
                                className="border border-blue-600 text-blue-600 px-6 py-2 rounded hover:bg-blue-50 transition"
                            >
                                Register
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Register for VideoMeet</DialogTitle>
                            <div className="p-2">
                                <RegisterPage />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* subtle floating shapes animation */}
            <div className="absolute -bottom-10 right-10 w-40 h-40 bg-blue-300 rounded-full opacity-20 blur-3xl animate-pulse-slow" />
            <div className="absolute -top-20 left-10 w-32 h-32 bg-purple-300 rounded-full opacity-20 blur-3xl animate-pulse-slower" />
        </main>
    );
}
