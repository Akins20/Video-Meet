import { FC } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { LucideX } from "lucide-react";

interface MeetingHeaderProps {
    onLeave: () => void;
}

const MeetingHeader: FC<MeetingHeaderProps> = ({ onLeave }) => {
    const meetingTitle = useSelector((state: RootState) => state.meeting.currentMeeting?.title);
    const participants = useSelector((state: RootState) => state.meeting.participants);

    return (
        <header className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-white dark:bg-gray-800">
            <div>
                <h2 className="text-lg font-semibold">{meetingTitle || "Untitled Meeting"}</h2>
                <span className="text-sm text-gray-500">
                    {participants.length} participant{participants.length !== 1 && "s"}
                </span>
            </div>
            <Button variant="destructive" onClick={onLeave}>
                <LucideX className="w-4 h-4 mr-1" />
                Leave
            </Button>
        </header>
    );
};

export default MeetingHeader;
