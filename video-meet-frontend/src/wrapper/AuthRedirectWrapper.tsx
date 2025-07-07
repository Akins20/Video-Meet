"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface AuthRedirectWrapperProps {
    children: React.ReactNode;
}

const AuthRedirectWrapper = ({ children }: AuthRedirectWrapperProps) => {
    const router = useRouter();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const isLoading = useSelector((state: RootState) => state.auth.isLoading);

    useEffect(() => {
        // Only redirect if not loading and user is authenticated
        if (!isLoading && isAuthenticated) {
            router.replace('/home');
        }
    }, [isAuthenticated, isLoading, router]);

    // Show loading or render children for unauthenticated users
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // If authenticated, don't render the landing page (redirect will happen)
    if (isAuthenticated) {
        return null;
    }

    // Render children for unauthenticated users
    return <>{children}</>;
};

export default AuthRedirectWrapper;