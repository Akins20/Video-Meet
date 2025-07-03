"use client";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import { LucideMic, LucideMicOff, LucideVideo, LucideVideoOff, LucideMonitor, LucideX } from "lucide-react";
import { useMeeting } from "@/hooks/useMeeting";
import { useWebRTC } from "@/hooks/useWebRTC";

const MeetingControls: FC = () => {
    const { leaveMeeting } = useMeeting();
    const {
        isAudioEnabled, toggleAudio,
        isVideoEnabled, toggleVideo,
        shareScreen
    } = useWebRTC();

    return (
        <div className="flex justify-center gap-4 py-3 border-t border-gray-200 bg-white dark:bg-gray-800">
            <Button onClick={toggleAudio} variant="secondary">
                {isAudioEnabled ? <LucideMic className="w-4 h-4" /> : <LucideMicOff className="w-4 h-4" />}
            </Button>
            <Button onClick={toggleVideo} variant="secondary">
                {isVideoEnabled ? <LucideVideo className="w-4 h-4" /> : <LucideVideoOff className="w-4 h-4" />}
            </Button>
            <Button onClick={shareScreen} variant="secondary">
                <LucideMonitor className="w-4 h-4" />
            </Button>
            <Button onClick={leaveMeeting} variant="destructive">
                <LucideX className="w-4 h-4" />
            </Button>
        </div>
    );
};

export default MeetingControls;
