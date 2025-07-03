"use client";
import { FC, useEffect, useRef } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";

interface RemoteVideoProps {
    participantId: string;
    participantName: string;
}

const RemoteVideo: FC<RemoteVideoProps> = ({ participantId, participantName }) => {
    const { getRemoteStream, isParticipantVideoEnabled } = useWebRTC();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const stream = getRemoteStream(participantId);
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [participantId, getRemoteStream]);

    return (
        <div className="relative w-full h-full bg-black rounded overflow-hidden">
            {isParticipantVideoEnabled(participantId) ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex items-center justify-center h-full text-white">
                    {participantName}
                </div>
            )}
        </div>
    );
};

export default RemoteVideo;
