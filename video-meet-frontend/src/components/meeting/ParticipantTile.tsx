"use client";
import { FC } from "react";
import { LucideMic, LucideMicOff, LucideVideo, LucideVideoOff } from "lucide-react";

interface ParticipantTileProps {
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
}

const ParticipantTile: FC<ParticipantTileProps> = ({ name, isAudioEnabled, isVideoEnabled }) => {
    return (
        <div className="flex items-center justify-between p-2 rounded border bg-gray-50 dark:bg-gray-800">
            <span>{name}</span>
            <div className="flex gap-2">
                {isAudioEnabled ? (
                    <LucideMic className="w-4 h-4 text-green-500" />
                ) : (
                    <LucideMicOff className="w-4 h-4 text-red-500" />
                )}
                {isVideoEnabled ? (
                    <LucideVideo className="w-4 h-4 text-green-500" />
                ) : (
                    <LucideVideoOff className="w-4 h-4 text-red-500" />
                )}
            </div>
        </div>
    );
};

export default ParticipantTile;
