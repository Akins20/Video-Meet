"use client";
import { FC } from "react";
import { X, Users, Clock, Video } from "lucide-react";
import { Meeting } from "@/types/meeting";

interface Props {
    meeting: Meeting | null;
    onClose: () => void;
    onViewStats?: () => void;
}

const MeetingDetailsModal: FC<Props> = ({ meeting, onClose, onViewStats }) => {
    if (!meeting) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
            <div className="w-full sm:w-[420px] h-full bg-slate-800 border-l border-slate-700 shadow-xl p-6 overflow-y-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mt-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white">{meeting.title}</h2>
                    {meeting.description && <p className="text-slate-400">{meeting.description}</p>}

                    <div className="text-sm text-slate-300 space-y-3">
                        <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            <span className="capitalize">{meeting.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(meeting.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{meeting.currentParticipants} / {meeting.maxParticipants}</span>
                        </div>
                    </div>

                    <button
                        onClick={onViewStats}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        View Meeting Stats
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingDetailsModal;
