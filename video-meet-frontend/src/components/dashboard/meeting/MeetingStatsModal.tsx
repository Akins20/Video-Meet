"use client";
import { FC } from "react";
import { X, BarChart } from "lucide-react";
import { MeetingStatus } from "@/types/meeting";

interface Props {
    stats: MeetingStatus | null;
    onClose: () => void;
}

const MeetingStatsModal: FC<Props> = ({ stats, onClose }) => {
    if (!stats) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-slate-800 rounded-xl p-6 max-w-xl w-full border border-slate-700 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart className="w-5 h-5" />
                    Meeting Stats
                </h2>

                <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex justify-between">
                        <span>Total Participants:</span>
                        <span>{stats}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Average Duration:</span>
                        <span>{stats}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Join Attempts:</span>
                        <span>{stats}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Start Time:</span>
                        <span>{new Date(stats).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>End Time:</span>
                        <span>{new Date(stats).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingStatsModal;
