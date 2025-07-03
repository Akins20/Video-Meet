"use client";
import { FC } from "react";
import Link from "next/link";
import { useGetMeetingsQuery } from "@/store/api/meetingApi";  // assuming you create this RTK Query endpoint
import { Card } from "@/components/ui/card";

const MeetingList: FC = () => {
    const { data, isLoading, error } = useGetMeetingsQuery({});

    if (isLoading) return <p>Loading meetings...</p>;
    if (error) return <p>Failed to load meetings.</p>;

    return (
        <div className="grid gap-4">
            {data && Array.isArray(data.data?.meetings) && data.data.meetings.length > 0 ? (
                data.data.meetings.map((meeting) => (
                    <Card key={meeting.id} className="p-4 hover:shadow-md transition">
                        <Link href={`/meeting/${meeting.id}`}>
                            <div className="font-semibold">{meeting.title}</div>
                            <div className="text-xs text-gray-500">{meeting.scheduledAt}</div>
                        </Link>
                    </Card>
                ))
            ) : (
                <p>No meetings scheduled.</p>
            )}
        </div>
    );
};

export default MeetingList;
