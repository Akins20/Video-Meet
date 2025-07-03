"use client";
import { FC } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MeetingEndModalProps {
    onConfirmLeave: () => void;
}

const MeetingEndModal: FC<MeetingEndModalProps> = ({ onConfirmLeave }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive">Leave Meeting</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Leave Meeting</DialogTitle>
                <DialogDescription>
                    Are you sure you want to leave the meeting? You will be disconnected from all participants.
                </DialogDescription>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary">Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirmLeave}
                    >
                        Leave
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MeetingEndModal;
