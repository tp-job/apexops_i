import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatWindowProps {
    chatName: string;
}

interface Message {
    text: string;
    sender: "me" | "them";
    time: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatName }) => {
    const [messages, setMessages] = useState<Message[]>([
        { text: "You think we can meet tomorrow for coffee?", sender: "me", time: "5 min ago" },
        { text: "Hopefully :(", sender: "them", time: "4 min ago" },
        { text: "Been working super late this past week...", sender: "them", time: "3 min ago" },
        { text: "No worries mate, I understand.", sender: "me", time: "2 min ago" },
    ]);

    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const now = new Date();
        const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setMessages([...messages, { text: input, sender: "me", time: timeString }]);
        setInput("");
        
        // Simulate reply after 1 second
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                text: "Got it! I'll get back to you soon.", 
                sender: "them", 
                time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 1000);
    };

    const formatTimestamp = (time: string) => {
        if (time === "now") {
            return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        }
        return time;
    };

    return (
        <div className="flex flex-col flex-1 h-full bg-light-bg dark:bg-dark-bg">
            <div className="border-b border-gray-200 dark:border-dark-border pb-3 px-6 pt-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    To: {chatName}
                </h2>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-xs p-3 rounded-2xl text-sm ${
                                msg.sender === "me"
                                    ? "bg-indigo text-white rounded-br-none dark:bg-ember"
                                    : "bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200 dark:bg-dark-surface dark:text-dark-text-primary dark:border-dark-border"
                            }`}
                        >
                            <p className="break-words">{msg.text}</p>
                            <div className={`text-xs mt-1 ${msg.sender === "me" 
                                ? "text-indigo-200 dark:text-blue-200"
                                : "text-gray-500 dark:text-dark-text-secondary"
                            }`}>
                                {formatTimestamp(msg.time)}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 dark:border-dark-border p-4">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="พิมพ์ข้อความ..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="flex-1 px-4 py-2 rounded-lg outline-none transition bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-ember dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary border focus:border-transparent"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition bg-ember hover:bg-wine disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                        <Send className="w-4 h-4" />
                        ส่ง
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
