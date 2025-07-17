"use client";
import { FC, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Send } from "lucide-react";
import { Meeting, MeetingParticipant } from "@/types/meeting";

interface ChatPanelProps {
  meeting: Meeting | null;
  participants: MeetingParticipant[];
  isInMeeting: boolean;
}

const ChatPanel: FC<ChatPanelProps> = ({ meeting, isInMeeting }) => {
  const { socket } = useSocket();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Use the main meeting hook to get messages and send functionality
  const { 
    messages, 
    sendMessage: sendMessageHook 
  } = useMeeting(meeting?.roomId || "", isInMeeting ? "live" : "data");

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message function
  const sendMessage = async () => {
    if (!message.trim() || !meeting || !currentUser) return;

    try {
      const result = await sendMessageHook({
        content: message,
        type: "text",
        meetingId: meeting.id,
        user: currentUser,
      });
      
      if (result.success) {
        setMessage("");
      } else {
        console.error("Failed to send message:", result.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
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

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-slate-800/30 backdrop-blur-sm">
      {/* Chat Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-slate-700/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="font-semibold text-white">Meeting Chat</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {sortedMessages.length} messages
          </span>
        </div>
      </motion.div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <div key={msg.id} className="mb-3">
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
