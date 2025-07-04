"use client";
import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

const quickJoinSchema = z.object({
    roomId: z.string().min(4, "Room ID must be at least 4 characters"),
});

type QuickJoinForm = z.infer<typeof quickJoinSchema>;

const QuickJoin: FC = () => {
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    
    const { register, handleSubmit, formState: { errors } } = useForm<QuickJoinForm>({
        resolver: zodResolver(quickJoinSchema),
    });

    const onSubmit = async (data: QuickJoinForm) => {
        setIsJoining(true);
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push(`/meeting/${data.roomId}`);
    };

    return (
        <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <motion.div
                    className="relative"
                    whileHover={{ scale: 1.02 }}
                    whileFocus={{ scale: 1.02 }}
                >
                    <Input
                        placeholder="Enter Room ID (e.g., ABC-123-XYZ)"
                        {...register("roomId")}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 text-lg font-medium"
                        disabled={isJoining}
                    />
                    <motion.div
                        className="absolute inset-0 rounded-md border-2 border-blue-500/0 pointer-events-none"
                        whileHover={{ borderColor: "rgba(59, 130, 246, 0.3)" }}
                        transition={{ duration: 0.2 }}
                    />
                </motion.div>

                <AnimatePresence mode="wait">
                    {errors.roomId && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                            className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                        >
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            {errors.roomId.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        type="submit"
                        disabled={isJoining}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
                    >
                        <AnimatePresence mode="wait">
                            {isJoining ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Joining...
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2"
                                >
                                    Join Meeting
                                    <motion.div
                                        className="group-hover:translate-x-1 transition-transform duration-200"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </motion.div>
            </form>

            <motion.div
                className="text-center text-slate-400 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <motion.p
                    whileHover={{ scale: 1.05 }}
                    className="cursor-default"
                >
                    💡 Tip: Room IDs are usually shared by the meeting host
                </motion.p>
            </motion.div>
        </motion.div>
    );
};

export default QuickJoin;