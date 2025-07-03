"use client";
import { FC } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { LucideMic, LucideMicOff, LucideVideo, LucideVideoOff } from "lucide-react";

const ParticipantList: FC = () => {
    const participants = useSelector((state: RootState) => state.meeting.participants);

    return (
        <div className="space-y-2 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-2">Participants</h3>
            {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded bg-gray-50 dark:bg-gray-800">
                    <span>{p.name}</span>
                    <div className="flex gap-2">
                        {p.isAudioEnabled ? (
                            <LucideMic className="w-4 h-4 text-green-500" />
                        ) : (
                            <LucideMicOff className="w-4 h-4 text-red-500" />
                        )}
                        {p.isVideoEnabled ? (
                            <LucideVideo className="w-4 h-4 text-green-500" />
                        ) : (
                            <LucideVideoOff className="w-4 h-4 text-red-500" />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ParticipantList;
