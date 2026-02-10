import { useState } from 'react';
import SidebarChat from '@/components/layouts/SidebarChat'
import ChatWindow from '@/components/ui/chat/ChatWindow'
import type { FC } from 'react'

const Chat: FC = () => {
    const [selectedChat, setSelectedChat] = useState<string>('');

    return (
        <div className="flex h-full bg-light-bg dark:bg-dark-bg overflow-hidden relative animate-fade-in">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-ember/5 to-indigo/5 dark:from-dark-bg dark:to-dark-surface/20 pointer-events-none"></div>

            <SidebarChat
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
            />

            <div className="flex-1 flex flex-col relative z-10 transition-all duration-300">
                {selectedChat ? (
                    <ChatWindow chatName={selectedChat} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
                        <div className="w-24 h-24 mb-6 rounded-3xl flex items-center justify-center bg-white text-ember shadow-xl shadow-ember/10 dark:bg-dark-surface dark:text-peach dark:shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-dark-text-primary">Welcome to Chat</h2>
                        <p className="text-lg max-w-md text-gray-500 dark:text-dark-text-secondary">
                            Select a conversation from the sidebar to start chatting with your team.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Chat
