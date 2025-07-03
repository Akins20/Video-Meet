"use client";
import QuickJoin from "@/components/dashboard/QuickJoin";
import MeetingList from "@/components/dashboard/MeetingList";
import CreateMeeting from "@/components/dashboard/CreateMeeting";
import UserProfile from "@/components/dashboard/UserProfile";
import MeetingJoinModal from "@/components/meeting/MeetingJoinModal";

export default function DashboardPage() {
    return (
        <main className="max-w-4xl mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold">Welcome to your Dashboard</h1>
            <div className="flex justify-between items-center">
                <QuickJoin />
                <MeetingJoinModal />
            </div>
            <CreateMeeting />
            <MeetingList />
            <UserProfile />
        </main>
    );
}
