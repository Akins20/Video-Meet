/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { FC, useEffect, useRef } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";

interface ScreenShareTileProps {
    screenShareStream: MediaStream | null;
    sharingUserName: string;
}

const ScreenShareTile: FC<ScreenShareTileProps> = ({ screenShareStream, sharingUserName }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && screenShareStream) {
            videoRef.current.srcObject = screenShareStream;
        }
    }, [screenShareStream]);

    return (
        <div className="relative w-full h-full rounded overflow-hidden bg-black">
            {screenShareStream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                />
            ) : (
                <div className="flex items-center justify-center h-full text-white">
                    <span>No Screen Sharing</span>
                </div>
            )}
            {screenShareStream && (
                <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 rounded">
                    {sharingUserName}'s screen
                </span>
            )}
        </div>
    );
};

export default ScreenShareTile;
