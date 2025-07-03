"use client";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
    roomId: z.string().min(4, "Room ID must be at least 4 characters"),
});

type JoinForm = z.infer<typeof schema>;

const MeetingJoinModal: FC = () => {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm<JoinForm>({
        resolver: zodResolver(schema),
    });

    const onSubmit = (data: JoinForm) => {
        router.push(`/meeting/${data.roomId}`);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Join Meeting</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Join Meeting</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <Input placeholder="Enter Room ID" {...register("roomId")} />
                    {errors.roomId && <p className="text-red-500 text-xs">{errors.roomId.message}</p>}
                    <Button type="submit">Join</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default MeetingJoinModal;
