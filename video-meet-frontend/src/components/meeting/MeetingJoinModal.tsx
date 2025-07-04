"use client";
import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Loader2, Video, Link as LinkIcon } from "lucide-react";

const schema = z.object({
    roomId: z.string().min(4, "Room ID must be at least 4 characters"),
});

type JoinForm = z.infer<typeof schema>;

const MeetingJoinModal: FC = () => {
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    const { register, handleSubmit, formState: { errors }, reset } = useForm<JoinForm>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: JoinForm) => {
        setIsJoining(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsOpen(false);
        router.push(`/meeting/${data.roomId}`);
        reset();
        setIsJoining(false);
    };

    const handleClose = () => {
        setIsOpen(false);
        reset();
        setIsJoining(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        variant="outline"
                        className="w-full h-12 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500 font-semibold rounded-lg group transition-all duration-300"
                    >
                        <Users className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                        Advanced Join
                        <motion.div
                            className="ml-2 group-hover:translate-x-1 transition-transform duration-200"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </motion.div>
                    </Button>
                </motion.div>
            </DialogTrigger>
            
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center"
                            whileHover={{ rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Video className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-white">
                                Join Meeting
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 mt-1">
                                Enter the room ID to join an existing meeting
                            </DialogDescription>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <motion.div
                            className="space-y-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="relative">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="relative"
                                >
                                    <Input
                                        placeholder="Enter Room ID (e.g., ABC-123-XYZ)"
                                        {...register("roomId")}
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-green-500 focus:ring-green-500/20 h-12 text-lg font-medium pl-12"
                                        disabled={isJoining}
                                    />
                                    <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                </motion.div>
                                
                                <AnimatePresence mode="wait">
                                    {errors.roomId && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                            className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-2"
                                        >
                                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                            {errors.roomId.message}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.div
                                className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h4 className="text-sm font-semibold text-white mb-2">
                                    💡 Quick Tips:
                                </h4>
                                <ul className="text-sm text-slate-400 space-y-1">
                                    <li>• Room IDs are usually 9 characters long</li>
                                    <li>• Format: ABC-123-XYZ or similar</li>
                                    <li>• Case-insensitive</li>
                                </ul>
                            </motion.div>
                        </motion.div>

                        <motion.div
                            className="flex gap-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 h-12 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                                disabled={isJoining}
                            >
                                Cancel
                            </Button>
                            
                            <motion.div
                                className="flex-1"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    type="submit"
                                    disabled={isJoining}
                                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
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
                                                Join Now
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
                        </motion.div>
                    </form>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

export default MeetingJoinModal;