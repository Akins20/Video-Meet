"use client";
import { FC, useEffect, useRef } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { User, VideoOff, Wifi, WifiOff } from "lucide-react";

interface RemoteVideoProps {
    participantId: string;
    participantName: string;
    avatar?: string;
    className?: string;
}

const RemoteVideo: FC<RemoteVideoProps> = ({ 
    participantId, 
    participantName, 
    avatar,
    className = "" 
}) => {
    const { participants } = useWebRTC();
    const videoRef = useRef<HTMLVideoElement>(null);

    // Get participant data from the participants Map
    const participant = participants.get(participantId);
    const stream = participant?.stream;
    const connectionState = participant?.connectionState;
    const quality = participant?.quality;

    // Check if participant has video enabled by looking at video tracks
    const hasVideoTrack = stream?.getVideoTracks() && stream?.getVideoTracks().length > 0;
    const isVideoEnabled = hasVideoTrack && stream?.getVideoTracks()[0]?.enabled;

    // Set up video stream
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Get connection quality indicator
    const getConnectionQualityIcon = () => {
        const qualityLevel = quality?.overall || 'good';
        switch (qualityLevel) {
            case 'excellent':
            case 'good':
                return <Wifi className="w-4 h-4 text-green-400" />;
            case 'fair':
                return <Wifi className="w-4 h-4 text-yellow-400" />;
            case 'poor':
                return <WifiOff className="w-4 h-4 text-red-400" />;
            default:
                return <Wifi className="w-4 h-4 text-gray-400" />;
        }
    };

    // Get connection state color
    const getConnectionStateColor = () => {
        switch (connectionState) {
            case 'connected':
                return 'border-green-500';
            case 'connecting':
                return 'border-yellow-500';
            case 'disconnected':
            case 'failed':
                return 'border-red-500';
            default:
                return 'border-gray-500';
        }
    };

    return (
        <div className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border-2 ${getConnectionStateColor()} ${className}`}>
            {/* Video or placeholder */}
            {isVideoEnabled && stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted // Remote videos should always be muted to prevent echo
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-700 to-gray-900">
                    {/* Avatar or default icon */}
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={participantName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl">
                            {participantName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            {/* Overlay information */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Top-left: Connection quality */}
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full p-1">
                    {getConnectionQualityIcon()}
                </div>

                {/* Top-right: Video disabled indicator */}
                {!isVideoEnabled && (
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1">
                        <VideoOff className="w-4 h-4 text-red-400" />
                    </div>
                )}

                {/* Bottom: Participant name */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm truncate">
                            {participantName}
                        </span>
                        
                        {/* Connection state indicator */}
                        <div className="flex items-center gap-1">
                            {connectionState === 'connecting' && (
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            )}
                            {connectionState === 'connected' && (
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                            {(connectionState === 'disconnected' || connectionState === 'failed') && (
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {connectionState === 'connecting' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Connecting...</p>
                    </div>
                </div>
            )}

            {/* Connection failed state */}
            {(connectionState === 'failed' || connectionState === 'disconnected') && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                        <User className="w-8 h-8 mx-auto mb-2 text-red-400" />
                        <p className="text-sm">Connection lost</p>
                    </div>
                </div>
            )}

            {/* No stream available */}
            {!stream && connectionState === 'connected' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                        <VideoOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No video stream</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemoteVideo;