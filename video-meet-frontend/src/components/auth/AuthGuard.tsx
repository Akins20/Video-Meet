"use client";
import { FC, PropsWithChildren, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useRouter } from "next/navigation";

const AuthGuard: FC<PropsWithChildren> = ({ children }) => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return null; // or a spinner
    }

    return <>{children}</>;
};

export default AuthGuard;
