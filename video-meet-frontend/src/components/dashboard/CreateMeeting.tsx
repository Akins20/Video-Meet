/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";
import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeetingMutation } from "@/store/api/meetingApi";
import { Plus, Calendar, Clock, Users, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const createMeetingSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    date: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(["instant", "scheduled", "recurring"], {
        required_error: "Meeting type is required",
    }),
});

type CreateMeetingForm = z.infer<typeof createMeetingSchema>;

const CreateMeeting: FC = () => {
    const [createMeeting, { isLoading }] = useCreateMeetingMutation();
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<CreateMeetingForm>({
        resolver: zodResolver(createMeetingSchema),
        defaultValues: {
            type: "instant"
        }
    });

    const selectedType = watch("type");

    const onSubmit = async (data: CreateMeetingForm) => {
        try {
            const payload = {
                ...data,
                scheduledAt: data.type !== "instant" ? data.date : undefined,
            };
            
            await createMeeting(payload).unwrap();
            setShowSuccess(true);
            reset();
            
            // Hide success message after 3 seconds
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (e) {
            console.error(e);
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        }
    };

    const meetingTypes = [
        { 
            value: "instant", 
            label: "Instant Meeting", 
            description: "Start meeting immediately",
            icon: Plus,
            color: "from-green-500 to-emerald-500"
        },
        { 
            value: "scheduled", 
            label: "Scheduled Meeting", 
            description: "Schedule for later",
            icon: Calendar,
            color: "from-blue-500 to-cyan-500"
        },
        { 
            value: "recurring", 
            label: "Recurring Meeting", 
            description: "Repeating schedule",
            icon: Clock,
            color: "from-purple-500 to-pink-500"
        }
    ];

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Success/Error Messages */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400"
                    >
                        <CheckCircle className="w-5 h-5" />
                        <div>
                            <p className="font-semibold">Meeting created successfully!</p>
                            <p className="text-sm text-green-400/80">You can now share the meeting link with participants</p>
                        </div>
                    </motion.div>
                )}
                
                {showError && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400"
                    >
                        <AlertCircle className="w-5 h-5" />
                        <div>
                            <p className="font-semibold">Failed to create meeting</p>
                            <p className="text-sm text-red-400/80">Please check your connection and try again</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Meeting Title */}
                <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <label className="text-sm font-medium text-slate-300">Meeting Title</label>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileFocus={{ scale: 1.02 }}
                    >
                        <Input
                            placeholder="Enter meeting title..."
                            {...register("title")}
                            className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 h-12 text-lg"
                            disabled={isLoading}
                        />
                    </motion.div>
                    <AnimatePresence>
                        {errors.title && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-400 text-sm flex items-center gap-2"
                            >
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                {errors.title.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Meeting Type Selection */}
                <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <label className="text-sm font-medium text-slate-300">Meeting Type</label>
                    <div className="grid grid-cols-1 gap-3">
                        {meetingTypes.map((type) => (
                            <motion.label
                                key={type.value}
                                className={`relative flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                    selectedType === type.value
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <input
                                    type="radio"
                                    value={type.value}
                                    {...register("type")}
                                    className="sr-only"
                                />
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${type.color}`}>
                                    <type.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-white">{type.label}</h4>
                                    <p className="text-sm text-slate-400">{type.description}</p>
                                </div>
                                {selectedType === type.value && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                                    >
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </motion.div>
                                )}
                            </motion.label>
                        ))}
                    </div>
                    <AnimatePresence>
                        {errors.type && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-400 text-sm flex items-center gap-2"
                            >
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                {errors.type.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Date/Time Selection (for scheduled/recurring) */}
                <AnimatePresence>
                    {selectedType !== "instant" && (
                        <motion.div
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <label className="text-sm font-medium text-slate-300">
                                {selectedType === "scheduled" ? "Schedule Date & Time" : "First Occurrence"}
                            </label>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                            >
                                <Input
                                    type="datetime-local"
                                    {...register("date")}
                                    className="bg-slate-700/50 border-slate-600 text-white focus:border-purple-500 focus:ring-purple-500/20 h-12"
                                    disabled={isLoading}
                                />
                            </motion.div>
                            <AnimatePresence>
                                {errors.date && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-red-400 text-sm flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                        {errors.date.message}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Description */}
                <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileFocus={{ scale: 1.02 }}
                    >
                        <Textarea
                            placeholder="Add meeting description, agenda, or notes..."
                            {...register("description")}
                            className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 min-h-[100px] resize-none"
                            disabled={isLoading}
                        />
                    </motion.div>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
                    >
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Meeting...
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                                    Create Meeting
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
};

export default CreateMeeting;