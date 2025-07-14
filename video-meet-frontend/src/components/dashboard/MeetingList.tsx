/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { FC, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    useGetMeetingsQuery,
    useEndMeetingMutation
} from "@/store/api/meetingApi";
import { useAuth } from "@/hooks/useAuth";
import {
    Play,
    Loader2,
    AlertCircle,
    StopCircle,
    AlertTriangle,
    X,
    Check,
    LayoutList,
    Table
} from "lucide-react";
import { toast } from "react-hot-toast";

interface EndMeetingDialogProps {
    meetingTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

const EndMeetingDialog: FC<EndMeetingDialogProps> = ({
    meetingTitle,
    onConfirm,
    onCancel,
    isLoading
}) => (
    <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
    >
        <motion.div
            className="relative bg-slate-800/90 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={onCancel}
                className="absolute top-3 right-3 text-slate-400 hover:text-white transition"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">End Meeting</h3>
                    <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
            </div>

            <p className="text-slate-300 text-sm mb-6">
                Are you sure you want to end <span className="font-semibold text-white">{meetingTitle}</span>? All participants will be disconnected.
            </p>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    End Meeting
                </button>
            </div>
        </motion.div>
    </motion.div>
);

const MeetingList: FC = () => {
    const { data, isLoading, error } = useGetMeetingsQuery({});
    const [endMeeting, { isLoading: isEndingMeeting }] = useEndMeetingMutation();
    const { user } = useAuth();
    const [meetingToEnd, setMeetingToEnd] = useState<string | null>(null);
    const [isTableView, setIsTableView] = useState<boolean>(true);

    const uniqueMeetings = useMemo(() => {
        const meetings = data?.data?.meetings || [];
        const seen = new Set();
        return meetings.filter((meeting: any) => {
            if (seen.has(meeting.id)) return false;
            seen.add(meeting.id);
            return true;
        });
    }, [data?.data?.meetings]);

    const handleEndMeeting = async (meetingId: string) => {
        try {
            const result = await endMeeting({ meetingId }).unwrap();
            if (result.success) {
                toast.success("Meeting ended successfully");
                setMeetingToEnd(null);
            }
        } catch (error: any) {
            toast.error(error?.data?.message || "Failed to end meeting");
        }
    };

    const isCurrentUserHost = (meeting: any) => {
        const hostId = typeof meeting.hostId === 'object' ? meeting.hostId?.id : meeting.hostId;
        return user?.id === hostId;
    };

    const canEndMeeting = (meeting: any) => isCurrentUserHost(meeting) && meeting.status === 'active';

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (diff === 1) return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (diff < 7) return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-400';
            case 'waiting': return 'text-yellow-400';
            case 'ended': return 'text-slate-400';
            case 'cancelled': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading meetings...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center py-12 text-red-400">
                <AlertCircle className="w-6 h-6 mr-2" />
                Failed to load meetings
            </div>
        );
    }

    return (
        <>
            {/* Toggle View Button */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setIsTableView(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-600 transition"
                >
                    {isTableView ? <LayoutList className="w-4 h-4" /> : <Table className="w-4 h-4" />}
                    {isTableView ? "Card View" : "Table View"}
                </button>
            </div>

            {/* Table View */}
            {isTableView ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-slate-300 border border-slate-700">
                        <thead className="bg-slate-700 text-slate-100">
                            <tr>
                                <th className="px-4 py-2">Title</th>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Participants</th>
                                <th className="px-4 py-2">Description</th>
                                <th className="px-4 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueMeetings.map(meeting => (
                                <tr key={meeting.id} className="border-t border-slate-700">
                                    <td className="px-4 py-2 font-medium text-blue-400 hover:underline">
                                        <Link href={`/meeting/${meeting.roomId}`}>
                                            {meeting.title}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2">{formatDate(meeting.createdAt || 'N/A')}</td>
                                    <td className={`px-4 py-2 font-medium ${getStatusClass(meeting.status)}`}>
                                        {meeting.status}
                                    </td>
                                    <td className="px-4 py-2 capitalize">{meeting.type}</td>
                                    <td className="px-4 py-2">{meeting.currentParticipants || 0} / {meeting.maxParticipants}</td>
                                    <td className="px-4 py-2 text-slate-400">{meeting.description || '-'}</td>
                                    <td className="px-4 py-2 flex items-center justify-center gap-2">
                                        {canEndMeeting(meeting) && (
                                            <button
                                                onClick={() => setMeetingToEnd(meeting.id)}
                                                className="p-1 text-red-400 hover:text-red-300 transition"
                                                title="End Meeting"
                                            >
                                                <StopCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <Link href={`/meeting/${meeting.roomId}`} className="text-blue-400 hover:underline text-sm flex items-center gap-1">
                                            <Play className="w-4 h-4" />
                                            {meeting.status === 'active' ? 'Join' : 'View'}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // Card View from previous version
                <div className="space-y-3">
                    {uniqueMeetings.map(meeting => (
                        <motion.div key={meeting.id} whileHover={{ scale: 1.01 }}>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Link href={`/meeting/${meeting.roomId}`}>
                                            <h4 className="text-white font-medium hover:underline">{meeting.title}</h4>
                                        </Link>
                                        <p className="text-slate-400 text-xs">{formatDate(meeting.createdAt || 'N/A')}</p>
                                        {meeting.description && (
                                            <p className="text-slate-400 text-sm mt-1">{meeting.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(meeting.status)}`}>
                                            {meeting.status}
                                        </span>
                                        {canEndMeeting(meeting) && (
                                            <button
                                                onClick={() => setMeetingToEnd(meeting.id)}
                                                className="p-2 text-red-400 hover:text-red-300 transition"
                                            >
                                                <StopCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* End Meeting Dialog */}
            <AnimatePresence>
                {meetingToEnd && (
                    <EndMeetingDialog
                        meetingTitle={uniqueMeetings.find(m => m.id === meetingToEnd)?.title || "Unknown"}
                        onConfirm={() => handleEndMeeting(meetingToEnd)}
                        onCancel={() => setMeetingToEnd(null)}
                        isLoading={isEndingMeeting}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default MeetingList;
