"use client";
import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Users, 
  Calendar, 
  Download, 
  Share2, 
  Star, 
  MessageSquare,
  Camera,
  Mic,
  FileText,
  TrendingUp,
  Award,
  X,
  CheckCircle,
  BarChart3,
  Activity
} from "lucide-react";

interface MeetingSummaryProps {
  title: string;
  duration: string;
  participantCount: number;
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  meetingId?: string;
}

interface ParticipantStat {
  name: string;
  joinTime: string;
  leaveTime: string;
  speakingTime: number;
  avatar?: string;
}

interface MeetingMetrics {
  averageSpeakingTime: number;
  totalMessages: number;
  screenShareDuration: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  participants: ParticipantStat[];
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 50
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
    y: 50,
    transition: {
      duration: 0.2
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

const statsVariants = {
  hidden: { scale: 0 },
  visible: { 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25
    }
  }
};

const MeetingSummary: FC<MeetingSummaryProps> = ({ 
  title, 
  duration, 
  participantCount, 
  startTime,
  endTime,
  onClose,
  meetingId = "meeting-123"
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'analytics'>('overview');
  const [rating, setRating] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Mock meeting metrics - in real app this would come from props or API
  const metrics: MeetingMetrics = {
    averageSpeakingTime: 3.2,
    totalMessages: 24,
    screenShareDuration: 12,
    networkQuality: 'excellent',
    participants: [
      {
        name: "John Doe",
        joinTime: "10:00 AM",
        leaveTime: "11:30 AM",
        speakingTime: 8.5,
        avatar: "/avatars/john.jpg"
      },
      {
        name: "Jane Smith", 
        joinTime: "10:02 AM",
        leaveTime: "11:30 AM",
        speakingTime: 12.3
      },
      {
        name: "Mike Johnson",
        joinTime: "10:05 AM", 
        leaveTime: "11:25 AM",
        speakingTime: 5.7
      }
    ]
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    // Simulate download
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDownloading(false);
  };

  const StatCard: FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }> = ({ icon, label, value, subtitle, color = "blue" }) => (
    <motion.div
      variants={statsVariants}
      className="p-4 rounded-xl bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/70 transition-all duration-200"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-300">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  const TabButton: FC<{ 
    id: 'overview' | 'participants' | 'analytics';
    label: string;
    icon: React.ReactNode;
  }> = ({ id, label, icon }) => (
    <motion.button
      onClick={() => setActiveTab(id)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
        ${activeTab === id 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );

  const ParticipantRow: FC<{ participant: ParticipantStat }> = ({ participant }) => (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/20 border border-slate-600/30"
    >
      <div className="flex items-center gap-3">
        {participant.avatar ? (
          <img 
            src={participant.avatar}
            alt={participant.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {participant.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white">{participant.name}</p>
          <p className="text-xs text-slate-400">
            {participant.joinTime} - {participant.leaveTime}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-blue-400">
          {formatDuration(participant.speakingTime)}
        </p>
        <p className="text-xs text-slate-400">speaking time</p>
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div
            key="overview"
            variants={itemVariants}
            className="space-y-6"
          >
            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Clock className="w-5 h-5 text-blue-400" />}
                label="Duration"
                value={duration}
                subtitle={`${formatTime(startTime)} - ${formatTime(endTime)}`}
                color="blue"
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-green-400" />}
                label="Participants"
                value={participantCount}
                subtitle="total attendees"
                color="green"
              />
              <StatCard
                icon={<MessageSquare className="w-5 h-5 text-purple-400" />}
                label="Messages"
                value={metrics.totalMessages}
                subtitle="chat messages"
                color="purple"
              />
              <StatCard
                icon={<Activity className="w-5 h-5 text-orange-400" />}
                label="Quality"
                value={metrics.networkQuality}
                subtitle="network quality"
                color="orange"
              />
            </div>

            {/* Meeting Highlights */}
            <div className="p-4 rounded-xl bg-slate-700/20 border border-slate-600/30">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                Meeting Highlights
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Meeting completed successfully
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  {metrics.averageSpeakingTime} minutes average speaking time
                </div>
                {metrics.screenShareDuration > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Camera className="w-4 h-4 text-purple-400" />
                    {formatDuration(metrics.screenShareDuration)} screen sharing
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 'participants':
        return (
          <motion.div
            key="participants"
            variants={itemVariants}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">
                Participant Summary ({metrics.participants.length})
              </h4>
            </div>
            <div className="space-y-3">
              {metrics.participants.map((participant, index) => (
                <ParticipantRow key={index} participant={participant} />
              ))}
            </div>
          </motion.div>
        );

      case 'analytics':
        return (
          <motion.div
            key="analytics"
            variants={itemVariants}
            className="space-y-6"
          >
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400">Detailed analytics coming soon</p>
              <p className="text-xs text-slate-500 mt-1">
                Charts and insights will be available in a future update
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Background with gradient and glassmorphism */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl" />
          
          {/* Content */}
          <div className="relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <motion.h2
                    variants={itemVariants}
                    className="text-xl font-bold text-white mb-2"
                  >
                    Meeting Summary
                  </motion.h2>
                  <motion.div variants={itemVariants} className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
                    <p className="text-sm text-slate-400">{formatDate(startTime)}</p>
                  </motion.div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Tabs */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 mt-4"
              >
                <TabButton
                  id="overview"
                  label="Overview"
                  icon={<BarChart3 className="w-4 h-4" />}
                />
                <TabButton
                  id="participants"
                  label="Participants"
                  icon={<Users className="w-4 h-4" />}
                />
                <TabButton
                  id="analytics"
                  label="Analytics"
                  icon={<TrendingUp className="w-4 h-4" />}
                />
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                {/* Rating */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-300">Rate this meeting:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-1 ${
                          star <= rating ? 'text-yellow-400' : 'text-slate-600'
                        }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-700/50 border-slate-600 text-slate-200"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isDownloading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 mr-2"
                        >
                          <FileText className="w-4 h-4" />
                        </motion.div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MeetingSummary;