"use client";
import { FC } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import LocalVideo from "./LocalVideo";

interface VideoGridProps { }

const VideoGrid: FC<VideoGridProps> = () => {
    const participants = useSelector((state: RootState) => state.meeting.participants);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-black h-full">
            {/* Local user */}
            <div className="aspect-video bg-gray-900 rounded overflow-hidden">
                <LocalVideo />
            </div>

            {/* Remote participants */}
            {participants.map((participant) => (
                <div key={participant.id} className="aspect-video bg-gray-900 rounded overflow-hidden relative">
                    {/* This assumes you implement RemoteVideo separately */}
                    <video
                        id={`remote-${participant.id}`}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 rounded">
                        {participant.name}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default VideoGrid;
