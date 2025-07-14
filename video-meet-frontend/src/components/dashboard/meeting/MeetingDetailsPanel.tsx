/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { FC, useState, useMemo } from "react";
import {
  X,
  Clock,
  Users,
  MessageSquare,
  Mic,
  Video,
  Monitor,
  FileText,
  Download,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Signal,
  BarChart3,
  History,
  Zap,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Meeting, MeetingParticipant, ChatMessage } from "@/types/meeting";

interface Props {
  meeting: Meeting;
  participants: MeetingParticipant[];
  messages: ChatMessage[];
  onClose: () => void;
  localParticipant: MeetingParticipant | null;
  isRecording: boolean;
  meetingDuration: number;
  isDataMode?: boolean;
}

const MeetingDetailsPanel: FC<Props> = ({
  meeting,
  participants,
  messages,
  onClose,
  isRecording,
  meetingDuration,
  isDataMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "participants" | "analytics" | "insights"
  >("overview");

  // Calculate comprehensive meeting statistics
  const stats = useMemo(() => {
    const activeParticipants = participants.filter((p) => p.isActive).length;
    const audioEnabled = participants.filter(
      (p) => p.mediaState?.audioEnabled
    ).length;
    const videoEnabled = participants.filter(
      (p) => p.mediaState?.videoEnabled
    ).length;
    const screenSharing = participants.filter(
      (p) => p.mediaState?.screenSharing
    ).length;

    // Fix: Ensure textMessages is an array of ChatMessage objects
    const textMessagesList = messages.filter((m) => m.type === "text");
    const systemMessagesList = messages.filter((m) => m.type === "system");
    const textMessagesCount = textMessagesList.length;
    const systemMessagesCount = systemMessagesList.length;

    // Calculate connection quality distribution
    const connectionQualities = participants
      .filter((p) => p.connectionQuality)
      .map((p) => p.connectionQuality!.overall);

    const qualityDistribution = {
      excellent: connectionQualities.filter((q) => q === "excellent").length,
      good: connectionQualities.filter((q) => q === "good").length,
      fair: connectionQualities.filter((q) => q === "fair").length,
      poor: connectionQualities.filter((q) => q === "poor").length,
    };

    // Calculate average latency
    const participantsWithLatency = participants.filter(
      (p) => p.connectionQuality?.latency
    );
    const avgLatency =
      participantsWithLatency.length > 0
        ? participantsWithLatency.reduce(
            (sum, p) => sum + (p.connectionQuality?.latency || 0),
            0
          ) / participantsWithLatency.length
        : 0;

    // Calculate participation rates
    const audioParticipation =
      participants.length > 0 ? (audioEnabled / participants.length) * 100 : 0;
    const videoParticipation =
      participants.length > 0 ? (videoEnabled / participants.length) * 100 : 0;

    // Chat analytics - Fix: Use the filtered textMessagesList array
    const uniqueChatters = new Set(
      textMessagesList.map((m) => m.senderId || m.senderName)
    ).size;

    const averageMessageLength =
      textMessagesList.length > 0
        ? textMessagesList.reduce((sum, m) => sum + m.content.length, 0) /
          textMessagesList.length
        : 0;

    const messageFrequency =
      meetingDuration > 0
        ? textMessagesList.length / (meetingDuration / 60)
        : 0;

    // Engagement score calculation
    let engagementScore = 100;
    if (audioParticipation < 50) engagementScore -= 20;
    if (videoParticipation < 30) engagementScore -= 15;
    if (qualityDistribution.poor > participants.length * 0.3)
      engagementScore -= 25;
    if (messageFrequency < 0.5 && meetingDuration > 600) engagementScore -= 10;
    if (meetingDuration < 300) engagementScore -= 10; // Very short meetings

    return {
      activeParticipants,
      audioEnabled,
      videoEnabled,
      screenSharing,
      textMessages: textMessagesCount,
      systemMessages: systemMessagesCount,
      textMessagesList, // Keep the actual array for further processing if needed
      qualityDistribution,
      avgLatency,
      audioParticipation,
      videoParticipation,
      uniqueChatters,
      averageMessageLength,
      messageFrequency,
      engagementScore: Math.max(0, Math.round(engagementScore)),
    };
  }, [participants, messages, meetingDuration]);

  // Generate insights for data mode
  const insights = useMemo(() => {
    if (!isDataMode) return [];

    const insights = [];

    // Participation insights
    if (stats.audioParticipation > 80) {
      insights.push({
        type: "positive",
        icon: Mic,
        title: "Excellent Audio Engagement",
        description: `${stats.audioParticipation.toFixed(
          1
        )}% of participants had audio enabled`,
        score: 10,
      });
    } else if (stats.audioParticipation < 30) {
      insights.push({
        type: "warning",
        icon: Mic,
        title: "Low Audio Participation",
        description: `Only ${stats.audioParticipation.toFixed(
          1
        )}% of participants had audio enabled`,
        score: -5,
      });
    }

    if (stats.videoParticipation > 70) {
      insights.push({
        type: "positive",
        icon: Video,
        title: "High Video Engagement",
        description: `${stats.videoParticipation.toFixed(
          1
        )}% of participants had video enabled`,
        score: 8,
      });
    } else if (stats.videoParticipation < 20) {
      insights.push({
        type: "warning",
        icon: Video,
        title: "Low Video Participation",
        description: `Only ${stats.videoParticipation.toFixed(
          1
        )}% of participants had video enabled`,
        score: -3,
      });
    }

    // Duration insights
    if (meetingDuration > 3600) {
      insights.push({
        type: "info",
        icon: Clock,
        title: "Extended Meeting",
        description: `Meeting lasted ${formatDuration(
          meetingDuration
        )}. Consider breaks for long meetings.`,
        score: 0,
      });
    } else if (meetingDuration < 300) {
      insights.push({
        type: "warning",
        icon: Clock,
        title: "Very Short Meeting",
        description: `Meeting lasted only ${formatDuration(
          meetingDuration
        )}. Consider if objectives were met.`,
        score: -2,
      });
    }

    // Chat insights
    if (stats.messageFrequency > 2) {
      insights.push({
        type: "positive",
        icon: MessageSquare,
        title: "Active Discussion",
        description: `High chat activity with ${stats.messageFrequency.toFixed(
          1
        )} messages per minute`,
        score: 5,
      });
    } else if (stats.messageFrequency < 0.2 && meetingDuration > 600) {
      insights.push({
        type: "info",
        icon: MessageSquare,
        title: "Limited Chat Activity",
        description: `Low chat activity. Consider encouraging more interaction.`,
        score: -1,
      });
    }

    // Connection quality insights
    const poorConnections = stats.qualityDistribution.poor;
    if (poorConnections > participants.length * 0.3) {
      insights.push({
        type: "warning",
        icon: Signal,
        title: "Connection Issues",
        description: `${poorConnections} participants experienced poor connection quality`,
        score: -8,
      });
    } else if (
      stats.qualityDistribution.excellent >
      participants.length * 0.7
    ) {
      insights.push({
        type: "positive",
        icon: Signal,
        title: "Excellent Connectivity",
        description: `${stats.qualityDistribution.excellent} participants had excellent connection quality`,
        score: 7,
      });
    }

    // Engagement insights
    if (stats.uniqueChatters / participants.length > 0.6) {
      insights.push({
        type: "positive",
        icon: Users,
        title: "High Chat Engagement",
        description: `${stats.uniqueChatters} out of ${participants.length} participants actively used chat`,
        score: 6,
      });
    }

    return insights.sort((a, b) => b.score - a.score);
  }, [isDataMode, stats, participants.length, meetingDuration]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-green-400";
      case "good":
        return "text-blue-400";
      case "fair":
        return "text-yellow-400";
      case "poor":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getConnectionQualityIcon = (quality: string) => {
    switch (quality) {
      case "excellent":
        return <CheckCircle className="w-4 h-4" />;
      case "good":
        return <CheckCircle className="w-4 h-4" />;
      case "fair":
        return <AlertCircle className="w-4 h-4" />;
      case "poor":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "positive":
        return "border-green-500/20 bg-green-500/10";
      case "warning":
        return "border-yellow-500/20 bg-yellow-500/10";
      case "info":
        return "border-blue-500/20 bg-blue-500/10";
      default:
        return "border-slate-500/20 bg-slate-500/10";
    }
  };

  const getInsightIconColor = (type: string) => {
    switch (type) {
      case "positive":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "info":
        return "text-blue-400";
      default:
        return "text-slate-400";
    }
  };

  const exportMeetingData = () => {
    const exportData = {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        duration: meetingDuration,
        createdAt: meeting.createdAt,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        status: meeting.status,
        type: meeting.type,
        roomId: meeting.roomId,
      },
      participants: participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isActive: p.isActive,
        mediaState: p.mediaState,
        connectionQuality: p.connectionQuality,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderId: m.senderId,
        content: m.content,
        type: m.type,
        timestamp: m.timestamp,
      })),
      analytics: {
        stats,
        insights: isDataMode ? insights : [],
        engagementScore: stats.engagementScore,
        healthMetrics: {
          audioParticipation: stats.audioParticipation,
          videoParticipation: stats.videoParticipation,
          chatEngagement: (stats.uniqueChatters / participants.length) * 100,
          connectionQuality: stats.qualityDistribution,
        },
      },
      exportInfo: {
        exportedAt: new Date().toISOString(),
        mode: isDataMode ? "historical" : "live",
        version: "1.1",
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-${meeting.id}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    const reportData = {
      meetingTitle: meeting.title,
      duration: formatDuration(meetingDuration),
      participants: participants.length,
      messages: messages.length,
      engagementScore: stats.engagementScore,
      keyMetrics: {
        audioParticipation: `${stats.audioParticipation.toFixed(1)}%`,
        videoParticipation: `${stats.videoParticipation.toFixed(1)}%`,
        chatActivity: `${stats.messageFrequency.toFixed(1)} messages/min`,
        connectionQuality: `${
          stats.qualityDistribution.excellent + stats.qualityDistribution.good
        }/${participants.length} good+`,
      },
      insights: isDataMode ? insights.slice(0, 5) : [],
      recommendations: [
        stats.audioParticipation < 50
          ? "Encourage more audio participation"
          : null,
        stats.videoParticipation < 30
          ? "Consider video engagement strategies"
          : null,
        stats.qualityDistribution.poor > 0
          ? "Address connection quality issues"
          : null,
        meetingDuration > 3600 ? "Consider shorter meetings or breaks" : null,
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
      mode: isDataMode ? "Historical Analysis" : "Live Report",
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-report-${meeting.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "participants", label: "Participants", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    ...(isDataMode ? [{ id: "insights", label: "Insights", icon: Zap }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full sm:w-[600px] h-full bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white truncate">
                  {meeting.title}
                </h2>
                {isDataMode && (
                  <Badge variant="secondary" className="text-xs">
                    <History className="w-3 h-3 mr-1" />
                    Historical
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {meeting.status}
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="text-xs">
                    {isDataMode ? "Was Recorded" : "Recording"}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Score: {stats.engagementScore}/100
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Engagement Score */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-300">
                    Meeting Engagement Score
                  </h3>
                  <span
                    className={`text-lg font-bold ${
                      stats.engagementScore >= 80
                        ? "text-green-400"
                        : stats.engagementScore >= 60
                        ? "text-blue-400"
                        : stats.engagementScore >= 40
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {stats.engagementScore}/100
                  </span>
                </div>
                <Progress
                  value={stats.engagementScore}
                  className="w-full h-2 bg-slate-700"
                />
                <p className="text-xs text-slate-400 mt-2">
                  {stats.engagementScore >= 80
                    ? "Excellent engagement!"
                    : stats.engagementScore >= 60
                    ? "Good engagement level"
                    : stats.engagementScore >= 40
                    ? "Moderate engagement"
                    : "Low engagement - consider improvements"}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-slate-400">Duration</p>
                      <p className="text-lg font-semibold text-white">
                        {formatDuration(meetingDuration)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Participants</p>
                      <p className="text-lg font-semibold text-white">
                        {stats.activeParticipants}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Stats */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Media Participation
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-slate-300">Audio</span>
                      </div>
                      <span className="text-sm text-white">
                        {stats.audioEnabled} / {participants.length} (
                        {stats.audioParticipation.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={stats.audioParticipation}
                      className="w-full h-2 bg-slate-700"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-slate-300">Video</span>
                      </div>
                      <span className="text-sm text-white">
                        {stats.videoEnabled} / {participants.length} (
                        {stats.videoParticipation.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={stats.videoParticipation}
                      className="w-full h-2 bg-slate-700"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-slate-300">
                        Screen Share
                      </span>
                    </div>
                    <span className="text-sm text-white">
                      {stats.screenSharing} active
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Stats */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Chat Activity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Total Messages</p>
                    <p className="text-lg font-semibold text-white">
                      {stats.textMessages}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Active Chatters</p>
                    <p className="text-lg font-semibold text-white">
                      {stats.uniqueChatters}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Avg Length</p>
                    <p className="text-lg font-semibold text-white">
                      {Math.round(stats.averageMessageLength)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Frequency</p>
                    <p className="text-lg font-semibold text-white">
                      {stats.messageFrequency.toFixed(1)}/min
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {participant.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {participant.displayName}
                          {participant.isLocal && " (You)"}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {participant.role}
                        </p>
                        {participant.joinedAt && (
                          <p className="text-xs text-slate-500">
                            Joined:{" "}
                            {new Date(
                              participant.joinedAt
                            ).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {participant.mediaState?.audioEnabled ? (
                          <Mic className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Mic className="w-4 h-4 text-slate-500" />
                        )}
                        {participant.mediaState?.videoEnabled ? (
                          <Video className="w-4 h-4 text-green-400" />
                        ) : (
                          <Video className="w-4 h-4 text-slate-500" />
                        )}
                        {participant.mediaState?.screenSharing && (
                          <Monitor className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      {participant.connectionQuality && (
                        <div
                          className={`flex items-center gap-1 ${getConnectionQualityColor(
                            participant.connectionQuality.overall
                          )}`}
                        >
                          {getConnectionQualityIcon(
                            participant.connectionQuality.overall
                          )}
                          <span className="text-xs">
                            {participant.connectionQuality.latency}ms
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-4">
              {/* Connection Quality Distribution */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Connection Quality Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.qualityDistribution).map(
                    ([quality, count]) => (
                      <div
                        key={quality}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              quality === "excellent"
                                ? "bg-green-400"
                                : quality === "good"
                                ? "bg-blue-400"
                                : quality === "fair"
                                ? "bg-yellow-400"
                                : "bg-red-400"
                            }`}
                          />
                          <span className="text-sm text-slate-300 capitalize">
                            {quality}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">{count}</span>
                          <span className="text-xs text-slate-400">
                            (
                            {participants.length > 0
                              ? ((count / participants.length) * 100).toFixed(0)
                              : 0}
                            %)
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {stats.avgLatency > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        Average Latency
                      </span>
                      <span className="text-sm text-white">
                        {Math.round(stats.avgLatency)}ms
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Participation Metrics */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Participation Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {stats.audioParticipation.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">
                      Audio Participation
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {stats.videoParticipation.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">
                      Video Participation
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {(
                        (stats.uniqueChatters / participants.length) *
                        100
                      ).toFixed(0)}
                      %
                    </div>
                    <div className="text-xs text-slate-400">
                      Chat Engagement
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {stats.messageFrequency.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Messages/Minute
                    </div>
                  </div>
                </div>
              </div>

              {/* Meeting Health Score Breakdown */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Engagement Score Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Audio Participation
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stats.audioParticipation >= 50
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats.audioParticipation >= 50 ? "+" : "-"}
                      {Math.abs(stats.audioParticipation >= 50 ? 0 : 20)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Video Participation
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stats.videoParticipation >= 30
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats.videoParticipation >= 30 ? "+" : "-"}
                      {Math.abs(stats.videoParticipation >= 30 ? 0 : 15)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Connection Quality
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stats.qualityDistribution.poor <=
                        participants.length * 0.3
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats.qualityDistribution.poor <=
                      participants.length * 0.3
                        ? "+"
                        : "-"}
                      {Math.abs(
                        stats.qualityDistribution.poor <=
                          participants.length * 0.3
                          ? 0
                          : 25
                      )}{" "}
                      pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Chat Activity
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stats.messageFrequency >= 0.5 || meetingDuration <= 600
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats.messageFrequency >= 0.5 || meetingDuration <= 600
                        ? "+"
                        : "-"}
                      {Math.abs(
                        stats.messageFrequency >= 0.5 || meetingDuration <= 600
                          ? 0
                          : 10
                      )}{" "}
                      pts
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        Total Score
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          stats.engagementScore >= 80
                            ? "text-green-400"
                            : stats.engagementScore >= 60
                            ? "text-blue-400"
                            : stats.engagementScore >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {stats.engagementScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "insights" && isDataMode && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Meeting Insights & Recommendations
                </h3>
                {insights.length > 0 ? (
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getInsightColor(
                          insight.type
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          <insight.icon
                            className={`w-5 h-5 mt-0.5 ${getInsightIconColor(
                              insight.type
                            )}`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {insight.title}
                            </p>
                            <p className="text-xs text-slate-300 mt-1">
                              {insight.description}
                            </p>
                            {insight.score !== 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <span className="text-xs text-slate-400">
                                  Impact:
                                </span>
                                <span
                                  className={`text-xs font-medium ${
                                    insight.score > 0
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {insight.score > 0 ? "+" : ""}
                                  {insight.score} points
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No specific insights available for this meeting.
                  </p>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  <Target className="w-4 h-4 inline mr-2" />
                  Recommendations for Future Meetings
                </h3>
                <div className="space-y-2">
                  {stats.audioParticipation < 50 && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2"></div>
                      <p className="text-sm text-slate-300">
                        Encourage more audio participation by asking direct
                        questions or using breakout discussions
                      </p>
                    </div>
                  )}
                  {stats.videoParticipation < 30 && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2"></div>
                      <p className="text-sm text-slate-300">
                        Consider video engagement strategies like virtual
                        backgrounds or camera-on policies
                      </p>
                    </div>
                  )}
                  {stats.qualityDistribution.poor > 0 && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2"></div>
                      <p className="text-sm text-slate-300">
                        Address connection quality issues by recommending better
                        internet or turning off video
                      </p>
                    </div>
                  )}
                  {meetingDuration > 3600 && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2"></div>
                      <p className="text-sm text-slate-300">
                        Consider shorter meetings or regular breaks for meetings
                        longer than 1 hour
                      </p>
                    </div>
                  )}
                  {stats.messageFrequency < 0.5 && meetingDuration > 600 && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2"></div>
                      <p className="text-sm text-slate-300">
                        Encourage more interaction through polls, Q&A sessions,
                        or chat prompts
                      </p>
                    </div>
                  )}
                  {/* Show positive recommendations when metrics are good */}
                  {stats.audioParticipation >= 50 &&
                    stats.videoParticipation >= 30 &&
                    stats.qualityDistribution.poor === 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2"></div>
                        <p className="text-sm text-slate-300">
                          Great meeting! Consider replicating this format for
                          future sessions
                        </p>
                      </div>
                    )}
                  {/* If no recommendations, show a positive message */}
                  {stats.audioParticipation >= 50 &&
                    stats.videoParticipation >= 30 &&
                    stats.qualityDistribution.poor === 0 &&
                    meetingDuration <= 3600 &&
                    (stats.messageFrequency >= 0.5 ||
                      meetingDuration <= 600) && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2"></div>
                        <p className="text-sm text-slate-300">
                          Excellent meeting execution! All key metrics show
                          strong performance.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4">
          <div className="flex gap-2">
            <Button
              onClick={exportMeetingData}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button
              onClick={generateReport}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MeetingDetailsPanel;
