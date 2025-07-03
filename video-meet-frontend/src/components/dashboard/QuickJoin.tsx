"use client";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const quickJoinSchema = z.object({
    roomId: z.string().min(4, "Room ID must be at least 4 characters"),
});

type QuickJoinForm = z.infer<typeof quickJoinSchema>;

const QuickJoin: FC = () => {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm<QuickJoinForm>({
        resolver: zodResolver(quickJoinSchema),
    });

    const onSubmit = (data: QuickJoinForm) => {
        router.push(`/meeting/${data.roomId}`);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
                placeholder="Enter Room ID"
                {...register("roomId")}
            />
            {errors.roomId && (
                <p className="text-red-500 text-xs">{errors.roomId.message}</p>
            )}
            <Button type="submit">Join Meeting</Button>
        </form>
    );
};

export default QuickJoin;
