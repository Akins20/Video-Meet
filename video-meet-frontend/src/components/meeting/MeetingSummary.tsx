"use client";
import { FC } from "react";
import { Button } from "@/components/ui/button";

interface MeetingSummaryProps {
    title: string;
    duration: string;
    participantCount: number;
    onClose: () => void;
}

const MeetingSummary: FC<MeetingSummaryProps> = ({ title, duration, participantCount, onClose }) => {
    return (
        <div className="max-w-md mx-auto p-6 rounded border bg-white dark:bg-gray-900 shadow">
            <h2 className="text-xl font-bold mb-2">Meeting Summary</h2>
            <div className="space-y-2">
                <p><strong>Title:</strong> {title}</p>
                <p><strong>Duration:</strong> {duration}</p>
                <p><strong>Participants:</strong> {participantCount}</p>
            </div>
            <div className="mt-4 text-right">
                <Button onClick={onClose}>Close</Button>
            </div>
        </div>
    );
};

export default MeetingSummary;
