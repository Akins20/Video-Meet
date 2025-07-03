"use client";
import { FC, useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const ChatPanel: FC = () => {
    const { socket } = useSocket();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
    const currentUser = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        if (!socket) return;

        socket.on("chat-message", (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            socket.off("chat-message");
        };
    }, [socket]);

    const sendMessage = () => {
        if (message.trim()) {
            socket?.emit("chat-message", { user: currentUser?.name, text: message });
            setMessages((prev) => [...prev, { user: currentUser?.name || "You", text: message }]);
            setMessage("");
        }
    };

    return (
        <div className="flex flex-col h-full border-l border-gray-200 bg-white dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg, index) => (
                    <div key={index} className="text-sm">
                        <span className="font-semibold">{msg.user}:</span> {msg.text}
                    </div>
                ))}
            </div>
            <div className="flex border-t border-gray-200 p-2">
                <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} className="ml-2">Send</Button>
            </div>
        </div>
    );
};

export default ChatPanel;
