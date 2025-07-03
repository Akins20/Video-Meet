"use client";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeetingMutation } from "@/store/api/meetingApi";

const createMeetingSchema = z.object({
    title: z.string().min(3, "Title required"),
    date: z.string(),
    description: z.string().optional(),
    type: z.enum(["instant", "scheduled", "recurring"], {
        required_error: "Meeting type is required",
    }),
});

type CreateMeetingForm = z.infer<typeof createMeetingSchema>;

const CreateMeeting: FC = () => {
    const [createMeeting, { isLoading }] = useCreateMeetingMutation();

    const { register, handleSubmit, formState: { errors } } = useForm<CreateMeetingForm>({
        resolver: zodResolver(createMeetingSchema),
    });

    const onSubmit = async (data: CreateMeetingForm) => {
        try {
            // Map 'date' to 'scheduledAt' if type is 'scheduled' or 'recurring'
            const payload = {
                ...data,
                scheduledAt: data.type !== "instant" ? data.date : undefined,
            };
            await createMeeting(payload).unwrap();
            alert("Meeting created successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to create meeting");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <Input placeholder="Meeting Title" {...register("title")} />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}

            <Input type="datetime-local" {...register("date")} />
            {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}

            <select {...register("type")} className="w-full border rounded px-3 py-2">
                <option value="">Select meeting type</option>
                <option value="instant">Instant</option>
                <option value="scheduled">Scheduled</option>
                <option value="recurring">Recurring</option>
            </select>
            {errors.type && <p className="text-red-500 text-xs">{errors.type.message}</p>}

            <Textarea placeholder="Description (optional)" {...register("description")} />

            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Meeting"}
            </Button>
        </form>
    );
};

export default CreateMeeting;
