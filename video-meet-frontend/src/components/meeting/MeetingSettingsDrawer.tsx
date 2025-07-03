"use client";
import { FC } from "react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { updateMeeting } from "@/store/meetingSlice";

const schema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
});

type SettingsForm = z.infer<typeof schema>;

const MeetingSettingsDrawer: FC = () => {
    const dispatch = useDispatch();
    const currentMeeting = useSelector((state: RootState) => state.meeting.currentMeeting);

    const { register, handleSubmit, formState: { errors } } = useForm<SettingsForm>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: currentMeeting?.title || "",
            description: currentMeeting?.description || "",
        },
    });

    const onSubmit = (data: SettingsForm) => {
        dispatch(updateMeeting(data));
    };

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button variant="outline">Edit Meeting</Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerTitle>Meeting Settings</DrawerTitle>
                <DrawerDescription>Edit meeting details below.</DrawerDescription>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <Input placeholder="Title" {...register("title")} />
                    {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}

                    <Input placeholder="Description" {...register("description")} />
                    <Button type="submit">Save</Button>
                </form>
            </DrawerContent>
        </Drawer>
    );
};

export default MeetingSettingsDrawer;
