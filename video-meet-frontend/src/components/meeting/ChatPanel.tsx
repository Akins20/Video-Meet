// Debug version of ChatPanel to help identify the issue
"use client";
import { FC, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { useMeetingChat } from "@/hooks/meeting/useMeetingChat"; // Import directly for debugging
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Send } from "lucide-react";
import { ChatMessage } from "@/types/meeting";
import { Meeting, MeetingParticipant } from "@/types/meeting";

interface ChatPanelProps {
  meeting: Meeting | null;
  participants: MeetingParticipant[];
  isInMeeting: boolean;
}

const ChatPanel: FC<ChatPanelProps> = ({ meeting, isInMeeting }) => {
  const { socket } = useSocket();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // DEBUGGING: Get both the main hook and chat hook directly
  const mainHook = useMeeting(
    meeting?.roomId || "",
    isInMeeting ? "live" : "data"
  );
  const chatHookDirect = useMeetingChat(); // Direct chat hook for comparison

  const [message, setMessage] = useState("");
  const [debugMessages, setDebugMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debugging: Log both message sources
  useEffect(() => {
    console.log("🔍 CHAT DEBUG:", {
      mainHookMessages: mainHook.messages.length,
      chatHookDirectMessages: chatHookDirect.messages.length,
      isInMeeting,
      meetingId: meeting?.id,
      socketConnected: !!socket,
    });
  }, [
    mainHook.messages,
    chatHookDirect.messages,
    isInMeeting,
    meeting?.id,
    socket,
  ]);

  // DEBUGGING: Listen to Socket.IO events directly in ChatPanel
  useEffect(() => {
    if (!socket) return;

    console.log("🔍 Setting up direct Socket.IO listeners in ChatPanel");

    const handleChatMessage = (message: ChatMessage) => {
      console.log(
        "🔍 DIRECT Socket.IO message received in ChatPanel:",
        message
      );

      // Add to our debug messages array
      setDebugMessages((prev) => {
        const exists = prev.find((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    };

    socket.on("chat-message", handleChatMessage);

    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [socket]);

  // DEBUGGING: Send via multiple methods to see which works
  const sendMessage = async () => {
    if (!message.trim() || !meeting || !currentUser) return;

    console.log("🔍 SENDING MESSAGE via multiple methods:");

    // Method 1: Via main hook
    try {
      const result1 = await mainHook.sendMessage({
        content: message,
        type: "text",
        meetingId: meeting.id,
        user: currentUser,
      });
      console.log("🔍 Main hook result:", result1);
    } catch (error) {
      console.error("🔍 Main hook error:", error);
    }

    // Method 2: Via chat hook directly
    try {
      const result2 = await chatHookDirect.sendMessage({
        content: message,
        type: "text",
        meetingId: meeting.id,
        user: currentUser,
      });
      console.log("🔍 Chat hook direct result:", result2);
    } catch (error) {
      console.error("🔍 Chat hook direct error:", error);
    }

    // Method 3: Direct Socket.IO emit
    try {
      socket?.emit("chat-message", {
        id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        meetingId: meeting.id,
        content: message,
        type: "text",
        senderId: currentUser.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        senderEmail: currentUser.email,
        senderRole: "participant",
        timestamp: new Date().toISOString(),
        isEdited: false,
        deliveryStatus: "sending",
        readBy: [],
        isDeleted: false,
      });
      console.log("🔍 Direct Socket.IO emit sent");
    } catch (error) {
      console.error("🔍 Direct Socket.IO emit error:", error);
    }

    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Combine all message sources for debugging
  const allMessages = [
    ...mainHook.messages.map((m) => ({ ...m, source: "main-hook" })),
    ...chatHookDirect.messages.map((m) => ({ ...m, source: "chat-hook" })),
    ...debugMessages.map((m) => ({ ...m, source: "direct-socket" })),
  ]
    .reduce((acc, msg) => {
      // Deduplicate by message ID
      if (!acc.find((m) => m.id === msg.id)) {
        acc.push(msg);
      }
      return acc;
    }, [] as (ChatMessage & { source: string })[])
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  return (
    <div className="flex flex-col h-full bg-slate-800/30 backdrop-blur-sm">
      {/* Debug Header */}
      <div className="bg-red-900/20 p-2 border-b border-red-500/30">
        <div className="text-xs text-red-300">
          🔍 DEBUG MODE - Main Hook: {mainHook.messages.length} | Chat Hook:{" "}
          {chatHookDirect.messages.length} | Direct: {debugMessages.length} |
          Total: {allMessages.length}
        </div>
        <div className="text-xs text-red-300">
          Socket: {socket ? "Connected" : "Disconnected"} | Meeting:{" "}
          {meeting?.id || "None"} | User: {currentUser?.id || "None"}
        </div>
      </div>

      {/* Chat Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-slate-700/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="font-semibold text-white">Meeting Chat (Debug)</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {allMessages.length} messages
          </span>
        </div>
      </motion.div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          allMessages.map((msg) => (
            <div key={msg.id} className="mb-3">
              {/* Debug info */}
              <div className="text-xs text-slate-500 mb-1">
                Source: {msg.source} | ID: {msg.id}
              </div>

              {/* Message */}
              <div
                className={`flex ${
                  msg.senderId === currentUser?.id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.senderId === currentUser?.id
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-100"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {msg.senderId === currentUser?.id ? "You" : msg.senderName}{" "}
                    - {formatTime(msg.timestamp)}
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              placeholder="Type a debug message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="bg-slate-700/50 border-slate-600/50 text-white"
              disabled={!meeting || !socket}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!message.trim() || !meeting || !socket}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Debug Status */}
        <div className="mt-2 text-xs text-slate-500">
          {!meeting && "❌ No meeting"}
          {!socket && "❌ No socket"}
          {!currentUser && "❌ No user"}
          {meeting && socket && currentUser && "✅ All systems ready"}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
