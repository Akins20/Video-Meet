"use client";
import { FC, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { RootState } from "@/store";
import { Clock } from "lucide-react";

interface MeetingTimerProps {
  className?: string;
}

const MeetingTimer: FC<MeetingTimerProps> = ({ className }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  // Get meeting start time from Redux store
  const meetingStartTime = useSelector((state: RootState) => 
    state.meeting.recordingStartedAt
  );
  const meetingStatus = useSelector((state: RootState) => 
    state.meeting.isScreenSharing ? 'active' : 'inactive'
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (meetingStartTime && meetingStatus === 'active') {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const startTime = new Date(meetingStartTime).getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [meetingStartTime, meetingStatus]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Split time into individual digits for animation
  const timeString = formatTime(elapsedTime);
  const timeArray = timeString.split('');

  // Don't render if meeting hasn't started
  if (!meetingStartTime || meetingStatus !== 'active') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        flex items-center gap-2 
        bg-slate-800/90 backdrop-blur-sm 
        text-slate-200 
        px-3 py-2 
        rounded-lg 
        border border-slate-700/50
        shadow-lg
        ${className}
      `}
    >
      {/* Clock icon with subtle pulse animation */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Clock className="w-4 h-4 text-slate-400" />
      </motion.div>

      {/* Animated time display */}
      <div className="flex items-center font-mono text-sm font-medium">
        <AnimatePresence mode="wait">
          {timeArray.map((char, index) => (
            <motion.span
              key={`${index}-${char}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ 
                duration: 0.3,
                ease: "easeInOut"
              }}
              className={`
                inline-block
                ${char === ':' ? 'text-slate-500 mx-0.5' : 'text-slate-200'}
              `}
            >
              {char}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Optional recording indicator dot */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-2 h-2 bg-emerald-500 rounded-full ml-1"
      />
    </motion.div>
  );
};

export default MeetingTimer;