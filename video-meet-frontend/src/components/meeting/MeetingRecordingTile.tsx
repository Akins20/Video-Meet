"use client";
import { FC } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const MeetingRecordingIndicator: FC = () => {
    const isRecording = useSelector((state: RootState) => state.meeting.isRecording);

    if (!isRecording) return null;

    return (
        <div className="flex items-center gap-2 text-red-600 font-semibold animate-pulse">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            Recording
        </div>
    );
};

export default MeetingRecordingIndicator;
