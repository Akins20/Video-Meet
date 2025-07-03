"use client";
import { FC, useRef, useEffect } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";

const LocalVideo: FC = () => {
    const { localStream, isVideoEnabled } = useWebRTC();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    return (
        <div className="relative w-full h-full bg-black rounded overflow-hidden">
            {isVideoEnabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex items-center justify-center text-white h-full">
                    <span>Camera Off</span>
                </div>
            )}
        </div>
    );
};

export default LocalVideo;
