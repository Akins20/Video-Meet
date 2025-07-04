"use client";
import { FC, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Video, Circle, Square } from "lucide-react";

type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping';

interface MeetingRecordingIndicatorProps {
  className?: string;
}

const containerVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: -10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -10,
    transition: {
      duration: 0.2
    }
  }
};

const pulseVariants = {
  recording: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      type: "spring" as "spring",
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  starting: {
    scale: [1, 1.1, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      type: "spring" as "spring",
      duration: 0.8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  stopping: {
    scale: [1.2, 1],
    opacity: [1, 0.3],
    transition: {
      type: "spring" as "spring",
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const textVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.1
    }
  }
};

const MeetingRecordingIndicator: FC<MeetingRecordingIndicatorProps> = ({
  className
}) => {
  const isRecording = useSelector((state: RootState) => state.meeting.isRecording);
  const recordingDuration = useSelector((state: RootState) => state.meeting.recordingStartedAt || 0);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [displayDuration, setDisplayDuration] = useState(0);

  // Handle recording state transitions
  useEffect(() => {
    if (isRecording) {
      setRecordingState('starting');
      const timer = setTimeout(() => {
        setRecordingState('recording');
      }, 1000);
      return () => clearTimeout(timer);
    } else if (recordingState === 'recording') {
      setRecordingState('stopping');
      const timer = setTimeout(() => {
        setRecordingState('idle');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRecording, recordingState]);

  // Update display duration
  useEffect(() => {
    if (recordingState === 'recording') {
      const interval = setInterval(() => {
        setDisplayDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (recordingState === 'idle') {
      setDisplayDuration(0);
    }
  }, [recordingState]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if not recording and not transitioning
  if (recordingState === 'idle') {
    return null;
  }

  const getStatusText = () => {
    switch (recordingState) {
      case 'starting':
        return 'Starting Recording...';
      case 'recording':
        return 'Recording';
      case 'stopping':
        return 'Stopping Recording...';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (recordingState) {
      case 'starting':
        return 'from-amber-500 to-orange-500';
      case 'recording':
        return 'from-red-500 to-red-600';
      case 'stopping':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-red-500 to-red-600';
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={recordingState}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`
          flex items-center gap-3 
          bg-slate-800/90 backdrop-blur-sm 
          px-4 py-2.5 
          rounded-lg 
          border border-slate-700/50
          shadow-lg
          ${className}
        `}
      >
        {/* Animated Recording Dot */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          <motion.div
            className={`absolute inset-0 w-6 h-6 bg-gradient-to-r ${getStatusColor()} rounded-full opacity-20`}
            variants={pulseVariants}
            animate={recordingState}
          />

          {/* Inner recording dot */}
          <motion.div
            className={`w-3 h-3 bg-gradient-to-r ${getStatusColor()} rounded-full shadow-lg`}
            variants={pulseVariants}
            animate={recordingState}
          />

          {/* Sparkle effect for active recording */}
          {recordingState === 'recording' && (
            <motion.div
              className="absolute inset-0 w-6 h-6"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="absolute top-0 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 opacity-60" />
              <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 opacity-40" />
            </motion.div>
          )}
        </div>

        {/* Recording Info */}
        <motion.div
          variants={textVariants}
          className="flex items-center gap-3"
        >
          {/* Status Text */}
          <span className="text-sm font-medium text-white">
            {getStatusText()}
          </span>

          {/* Duration - only show when actively recording */}
          {recordingState === 'recording' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1"
            >
              <div className="w-1 h-4 bg-slate-600 rounded-full" />
              <span className="font-mono text-sm text-slate-300 tabular-nums">
                {formatDuration(displayDuration)}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Recording Icon */}
        <motion.div
          className="flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {recordingState === 'recording' ? (
            <Video className="w-4 h-4 text-red-400" />
          ) : (
            <Circle className="w-4 h-4 text-slate-400" />
          )}
        </motion.div>

        {/* Subtle background glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${getStatusColor()} opacity-5 rounded-lg pointer-events-none`}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default MeetingRecordingIndicator;