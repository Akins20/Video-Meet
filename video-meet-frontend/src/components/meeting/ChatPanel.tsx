"use client";
import { FC, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  UserPlus,
  UserMinus,
  Clock
} from "lucide-react";

interface ChatMessage {
  id: string;
  user: string;
  userId: string;
  text: string;
  timestamp: Date;
  type: 'message' | 'system' | 'join' | 'leave';
  avatar?: string;
}

interface TypingUser {
  userId: string;
  name: string;
}

const messageVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  }
};

const inputVariants = {
  focused: {
    scale: 1.02,
    boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.3)",
    transition: { duration: 0.2 }
  },
  unfocused: {
    scale: 1,
    boxShadow: "0 0 0 0px rgba(59, 130, 246, 0)",
    transition: { duration: 0.2 }
  }
};

const ChatPanel: FC = () => {
  const { socket } = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);  
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    // Listen for chat messages
    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, {
        ...msg,
        timestamp: new Date(msg.timestamp)
      }]);
    });

    // Listen for typing indicators
    socket.on("user-typing", (data: { userId: string; name: string; isTyping: boolean }) => {
      if (data.userId === currentUser?.id) return;
      
      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.find(u => u.userId === data.userId) 
            ? prev 
            : [...prev, { userId: data.userId, name: data.name }];
        } else {
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    });

    // Listen for participant events
    socket.on("participant-joined", (data: { name: string; userId: string }) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        user: "System",
        userId: "system",
        text: `${data.name} joined the meeting`,
        timestamp: new Date(),
        type: 'join'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    socket.on("participant-left", (data: { name: string; userId: string }) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        user: "System",
        userId: "system",
        text: `${data.name} left the meeting`,
        timestamp: new Date(),
        type: 'leave'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    return () => {
      socket.off("chat-message");
      socket.off("user-typing");
      socket.off("participant-joined");
      socket.off("participant-left");
    };
  }, [socket, currentUser?.id]);

  // Handle typing indicators
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { 
        userId: currentUser?.id, 
        name: currentUser?.firstName + " " + currentUser?.lastName,
        isTyping: true 
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("typing", { 
        userId: currentUser?.id, 
        name: currentUser?.firstName + " " + currentUser?.lastName,
        isTyping: false 
      });
    }, 1000);
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        user: `${currentUser?.firstName} ${currentUser?.lastName}` || "You",
        userId: currentUser?.id || "local",
        text: message,
        timestamp: new Date(),
        type: 'message',
        avatar: currentUser?.avatar
      };

      socket?.emit("chat-message", newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        socket?.emit("typing", { 
          userId: currentUser?.id, 
          name: currentUser?.firstName + " " + currentUser?.lastName,
          isTyping: false 
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const MessageBubble: FC<{ message: ChatMessage; isOwn: boolean }> = ({ 
    message, 
    isOwn 
  }) => {
    if (message.type === 'system' || message.type === 'join' || message.type === 'leave') {
      return (
        <motion.div
          variants={messageVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-center my-2"
        >
          <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-1 rounded-full text-xs text-slate-400">
            {message.type === 'join' && <UserPlus className="w-3 h-3" />}
            {message.type === 'leave' && <UserMinus className="w-3 h-3" />}
            <span>{message.text}</span>
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.timestamp)}</span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
          {/* Avatar */}
          {!isOwn && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {message.avatar ? (
                <img 
                  src={message.avatar} 
                  alt={message.user} 
                  className="w-full h-full rounded-full object-cover" 
                />
              ) : (
                message.user.charAt(0).toUpperCase()
              )}
            </div>
          )}

          {/* Message Content */}
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* User name and timestamp */}
            <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-xs font-medium text-slate-300">
                {isOwn ? 'You' : message.user}
              </span>
              <span className="text-xs text-slate-500">
                {formatTime(message.timestamp)}
              </span>
            </div>

            {/* Message bubble */}
            <motion.div
              className={`
                px-4 py-2 rounded-2xl max-w-full break-words
                ${isOwn 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
                  : 'bg-slate-700/80 backdrop-blur-sm text-slate-100 rounded-bl-md'
                }
              `}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.1 }}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

  const TypingIndicator: FC = () => (
    <AnimatePresence>
      {typingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400"
        >
          <div className="flex space-x-1">
            <motion.div
              className="w-1 h-1 bg-slate-400 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1 h-1 bg-slate-400 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-1 h-1 bg-slate-400 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <span>
            {typingUsers.length === 1 
              ? `${typingUsers[0].name} is typing...`
              : `${typingUsers.length} people are typing...`
            }
          </span>
        </motion.div>
      )}
    </AnimatePresence>
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
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.userId === currentUser?.id}
            />
          ))}
        </AnimatePresence>
        
        <TypingIndicator />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <motion.div
        className="p-4 border-t border-slate-700/50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="flex items-end gap-2"
          variants={inputVariants}
          animate={isFocused ? "focused" : "unfocused"}
        >
          {/* Text Input */}
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 rounded-xl pr-20 resize-none min-h-[44px] max-h-32"
              maxLength={500}
            />
            
            {/* Input Actions */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600/50"
              >
                <Smile className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600/50"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Send Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="h-11 w-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ChatPanel;