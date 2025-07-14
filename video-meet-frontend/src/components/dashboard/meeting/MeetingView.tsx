"use client";
import { FC, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MeetingDetailsPanel from "./MeetingDetailsPanel";
import {
  Info,
  Settings,
  Users,
  Clock,
  Activity,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download,
  BarChart3,
  History,
  PlayCircle,
} from "lucide-react";

interface MeetingViewProps {
  roomId: string;
  mode?: "live" | "data";
  onBack?: () => void;
  onModeChange?: (mode: "live" | "data") => void;
}

const MeetingView: FC<MeetingViewProps> = ({
  roomId,
  mode = "live",
  onBack,
  onModeChange,
}) => {
  const {
    meeting,
    participants,
    messages,
    localParticipant,
    isInMeeting,
    isLoading,
    error,
    meetingDuration,
    isRecording,
    meetingStatus,
    // connectionQuality, // Not used in this component
    networkStatus,
    isDataMode,
    refreshData,
    getMeetingStats,
    getMeetingHealth,
    getHistoricalInsights,
    // compareWithPreviousMeetings, // Commented out as it's not used yet
    exportMeetingData,
    formatDuration,
    dataLastUpdated,
  } = useMeeting(roomId, mode);

  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(!isDataMode);

  // Auto-refresh for live meetings
  useEffect(() => {
    if (!isDataMode && autoRefresh) {
      const interval = setInterval(() => {
        // Auto-refresh logic for live meetings would go here
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isDataMode, autoRefresh]);

  // Calculate real-time stats
  const stats = useMemo(() => {
    if (!meeting || !participants.length) return null;

    const activeParticipants = participants.filter((p) => p.isActive).length;
    const audioEnabled = participants.filter(
      (p) => p.mediaState?.audioEnabled
    ).length;
    const videoEnabled = participants.filter(
      (p) => p.mediaState?.videoEnabled
    ).length;

    const recentMessages = isDataMode
      ? messages.length // In data mode, show total messages
      : messages.filter((m) => {
          const messageTime = new Date(m.timestamp);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return messageTime > fiveMinutesAgo;
        }).length;
    const meetingHealth = getMeetingHealth?.();
    const overallStats = getMeetingStats?.();

    return {
      activeParticipants,
      audioEnabled,
      videoEnabled,
      recentMessages,
      totalMessages: messages.length,
      meetingHealth,
      overallStats,
    };
  }, [meeting, participants, messages, isDataMode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "waiting":
        return "bg-yellow-500";
      case "ended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNetworkStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-400";
      case "poor":
        return "text-yellow-400";
      case "unstable":
        return "text-red-400";
      case "offline":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
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

  const handleRefresh = async () => {
    if (isDataMode && refreshData) {
      try {
        await refreshData();
      } catch (error) {
        console.error("Failed to refresh data:", error);
      }
    }
  };

  const handleExport = async () => {
    if (exportMeetingData) {
      try {
        await exportMeetingData();
      } catch (error) {
        console.error("Failed to export data:", error);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-slate-400">
            {isDataMode ? "Loading meeting data..." : "Loading meeting..."}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            {isDataMode && (
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No meeting found
  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-slate-400 mb-4">Meeting not found</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
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
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(
                      meetingStatus
                    )}`}
                  />
                  <span className="text-sm text-slate-400 capitalize">
                    {meetingStatus}
                  </span>
                </div>
                {isRecording && (
                  <Badge variant="destructive" className="text-xs">
                    {isDataMode ? "Was Recorded" : "Recording"}
                  </Badge>
                )}
                {stats?.meetingHealth && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${getHealthColor(
                      stats.meetingHealth.overall
                    )}`}
                  >
                    {stats.meetingHealth.overall} health
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            {onModeChange && (
              <div className="flex items-center gap-1 bg-slate-700 rounded-md p-1">
                <Button
                  variant={mode === "live" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onModeChange("live")}
                  className="text-xs"
                  disabled={!isInMeeting}
                >
                  <PlayCircle className="w-3 h-3 mr-1" />
                  Live
                </Button>
                <Button
                  variant={mode === "data" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onModeChange("data")}
                  className="text-xs"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Data
                </Button>
              </div>
            )}

            {stats && (
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatDuration ? formatDuration(meetingDuration) : "0:00"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{stats.activeParticipants}</span>
                </div>
                {!isDataMode && (
                  <div className="flex items-center gap-1">
                    <Activity
                      className={`w-4 h-4 ${getNetworkStatusColor(
                        networkStatus
                      )}`}
                    />
                    <span className={getNetworkStatusColor(networkStatus)}>
                      {networkStatus}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1">
              {isDataMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="text-slate-400 hover:text-white"
                  title="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="text-slate-400 hover:text-white"
                title="Export meeting data"
              >
                <Download className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsPanel(true)}
                className="text-slate-400 hover:text-white"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Data Mode Info */}
        {isDataMode && dataLastUpdated && (
          <div className="mt-2 text-xs text-slate-500">
            Data last updated: {new Date(dataLastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Meeting Content */}
      <div className="p-6">
        {stats ? (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-400">
                      {isDataMode ? "Total" : "Active"}
                    </p>
                    <p className="text-xl font-bold text-white">
                      {stats.activeParticipants}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-slate-400">Duration</p>
                    <p className="text-xl font-bold text-white">
                      {formatDuration && formatDuration(meetingDuration)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-slate-400">Messages</p>
                    <p className="text-xl font-bold text-white">
                      {stats.totalMessages}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2">
                  {stats.meetingHealth ? (
                    <>
                      <Activity
                        className={`w-5 h-5 ${getHealthColor(
                          stats.meetingHealth.overall
                        )}`}
                      />
                      <div>
                        <p className="text-sm text-slate-400">Health</p>
                        <p
                          className={`text-xl font-bold capitalize ${getHealthColor(
                            stats.meetingHealth.overall
                          )}`}
                        >
                          {stats.meetingHealth.overall}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-slate-400">Quality</p>
                        <p className="text-xl font-bold text-gray-400">
                          Unknown
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Stats for Data Mode */}
            {isDataMode && stats.overallStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Participation Stats */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    Participation Analysis
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">
                        Audio Participation
                      </span>
                      <span className="text-sm font-medium text-white">
                        {stats.overallStats.audioParticipation.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">
                        Video Participation
                      </span>
                      <span className="text-sm font-medium text-white">
                        {stats.overallStats.videoParticipation.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">
                        Chat Engagement
                      </span>
                      <span className="text-sm font-medium text-white">
                        {stats.overallStats.chatEngagement.activeUsers} active
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">
                        Health Score
                      </span>
                      <span
                        className={`text-sm font-medium ${getHealthColor(
                          stats.overallStats.meetingHealth.overall
                        )}`}
                      >
                        {stats.overallStats.meetingHealth.score}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connection Quality */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    Connection Quality
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(stats.overallStats.connectionQuality).map(
                      ([quality, count]) => (
                        <div
                          key={quality}
                          className="flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                quality === "excellent"
                                  ? "bg-green-400"
                                  : quality === "good"
                                  ? "bg-blue-400"
                                  : quality === "fair"
                                  ? "bg-yellow-400"
                                  : "bg-red-400"
                              }`}
                            />
                            <span className="text-sm text-slate-400 capitalize">
                              {quality}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Historical Insights for Data Mode */}
            {isDataMode && getHistoricalInsights && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Meeting Insights
                </h3>
                <div className="space-y-3">
                  {getHistoricalInsights()?.map(
                    (
                      insight: {
                        type: string;
                        title: string;
                        description: string;
                      },
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            insight.type === "positive"
                              ? "bg-green-400"
                              : insight.type === "warning"
                              ? "bg-yellow-400"
                              : "bg-blue-400"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {insight.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    )
                  ) || (
                    <p className="text-sm text-slate-400">
                      No specific insights available for this meeting.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Meeting Info */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                Meeting Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Room ID</p>
                  <p className="text-base font-medium text-white font-mono">
                    {meeting.roomId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Host</p>
                  <p className="text-base font-medium text-white">
                    {meeting.hostName || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">
                    {isDataMode ? "Started" : "Started"}
                  </p>
                  <p className="text-base font-medium text-white">
                    {meeting.startedAt
                      ? new Date(meeting.startedAt).toLocaleString()
                      : "Not started"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Type</p>
                  <p className="text-base font-medium text-white capitalize">
                    {meeting.type || "Standard"}
                  </p>
                </div>
                {isDataMode && meeting.endedAt && (
                  <div>
                    <p className="text-sm text-slate-400">Ended</p>
                    <p className="text-base font-medium text-white">
                      {new Date(meeting.endedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {meeting.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-400">Description</p>
                    <p className="text-base text-white">
                      {meeting.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants Summary */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                Participants ({participants.length})
              </h3>
              <div className="space-y-2">
                {participants.slice(0, 5).map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-2 bg-slate-700 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Media indicators */}
                      <div className="flex items-center gap-1">
                        {participant.mediaState?.audioEnabled && (
                          <div
                            className="w-2 h-2 rounded-full bg-blue-400"
                            title="Audio enabled"
                          />
                        )}
                        {participant.mediaState?.videoEnabled && (
                          <div
                            className="w-2 h-2 rounded-full bg-green-400"
                            title="Video enabled"
                          />
                        )}
                        {participant.mediaState?.screenSharing && (
                          <div
                            className="w-2 h-2 rounded-full bg-purple-400"
                            title="Screen sharing"
                          />
                        )}
                      </div>
                      {/* Status indicator */}
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            participant.isActive
                              ? "bg-green-400"
                              : "bg-gray-400"
                          }`}
                        />
                        <span className="text-xs text-slate-400">
                          {participant.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {participants.length > 5 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowDetailsPanel(true)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      +{participants.length - 5} more participants
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity / Message Summary */}
            {((!isDataMode && stats.recentMessages > 0) ||
              (isDataMode && stats.totalMessages > 0)) && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  {isDataMode ? "Message Summary" : "Recent Activity"}
                </h3>
                <div className="space-y-2">
                  {messages.slice(-3).map((message) => (
                    <div key={message.id} className="p-2 bg-slate-700 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-300">
                          {message.senderName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        {message.type !== "text" && (
                          <Badge variant="outline" className="text-xs">
                            {message.type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 line-clamp-2">
                        {message.content}
                      </p>
                    </div>
                  ))}
                  {messages.length > 3 && (
                    <div className="text-center">
                      <button
                        onClick={() => setShowDetailsPanel(true)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        View all {messages.length} messages
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDetailsPanel(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Info className="w-4 h-4 mr-2" />
                {isDataMode ? "View Analytics" : "View Details"}
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {!isDataMode && (
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No meeting data available</p>
            {isDataMode && (
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetailsPanel && meeting && (
          <MeetingDetailsPanel
            meeting={meeting}
            participants={participants}
            messages={messages}
            localParticipant={localParticipant}
            isRecording={isRecording}
            meetingDuration={meetingDuration}
            isDataMode={isDataMode}
            onClose={() => setShowDetailsPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal - Only for live mode */}
      <AnimatePresence>
        {showSettings && !isDataMode && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 rounded-lg border border-slate-700 p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Meeting Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Auto-refresh</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  Automatically refresh meeting data every 30 seconds
                </p>
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeetingView;
