"use client";
import { FC } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { logout } from "@/store/authSlice";
import { useRouter } from "next/navigation";

const UserProfile: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();
    const router = useRouter();

    const handleLogout = () => {
        dispatch(logout());
        router.push("/login");
    };

    return (
        <div className="space-y-4 max-w-md p-4">
            <h2 className="text-lg font-semibold">User Profile</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                <p><strong>Name:</strong> {user?.username}</p>
                <p><strong>Email:</strong> {user?.email}</p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>Sign Out</Button>
        </div>
    );
};

export default UserProfile;
