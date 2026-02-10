import React from "react";

interface SidebarProps {
    selectedChat: string;
    onSelectChat: (name: string) => void;
}

const chats = [
    { name: "John Davidson", message: "Hey! How have you been?", status: "online" },
    { name: "Frank Jackson", message: "Let move the meeting to...", status: "online" },
    { name: "Melissa Naude", message: "You keen for coffee?", status: "away" },
    { name: "Erik James", message: "What happened last night?", status: "away" },
    { name: "Jeffery Friedman", message: "How was the party yesterday?", status: "offline" },
];

const SidebarChat: React.FC<SidebarProps> = ({ selectedChat, onSelectChat }) => {
    return (
        <div className="w-1/3 max-w-sm bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border-r p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Simple Chat</h2>
            <div className="space-y-3">
                {chats.map((chat) => (
                    <div
                        key={chat.name}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                            selectedChat === chat.name 
                                ? 'bg-ember/10 border border-ember/30 dark:bg-ember/20 dark:border-ember'
                                : 'hover:bg-gray-50 dark:hover:bg-dark-border'
                        }`}
                        onClick={() => onSelectChat(chat.name)}
                    >
                        <div className="flex items-center space-x-3">
                            <img
                                src={`https://i.pravatar.cc/40?u=${chat.name}`}
                                alt={chat.name}
                                className="w-10 h-10 rounded-full"
                            />
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary">{chat.name}</h3>
                                <p className="text-xs truncate w-32 text-gray-500 dark:text-dark-text-secondary">{chat.message}</p>
                            </div>
                        </div>
                        <span
                            className={`w-2 h-2 rounded-full ${chat.status === "online"
                                    ? "bg-green-500"
                                    : chat.status === "away"
                                        ? "bg-yellow-400"
                                        : "bg-red-500"
                                }`}
                        ></span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SidebarChat;
