import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchChatUsers, type ChatUserSummary } from '@/components/ui/chat/utils/chatApi';
import { useAuth } from '@/context/AuthContext';
import { ChatSidebar } from '@/components/ui/chat/ChatSidebar';
import { ChatMain } from '@/components/ui/chat/ChatMain';
import { useChatController } from '@/components/ui/chat/logic/useChatController';

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Search box to add users from database into chat (Instagram-style"new message")
const ChatUserSearch: FC<{
    onStartChat: (user: ChatUserSummary) => void;
}> = ({ onStartChat }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ChatUserSummary[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const users = await fetchChatUsers(query);
                setResults(users);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    return (
        <div className="relative">
            <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center">
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">search</span>
                </span>
                <input
                    className="w-full bg-white/5 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-dark placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-all"
                    placeholder="Search users to chat..."
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-xl max-h-64 overflow-y-auto">
                    {results.map((u) => (
                        <button
                            key={u.id}
                            type="button"
                            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-dark-surface-2/70 text-left"
                            onClick={() => onStartChat(u)}
                        >
                            {u.avatarUrl ? (
                                <img
                                    src={u.avatarUrl}
                                    alt={`${u.firstName} ${u.lastName}`}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-xs font-semibold">
                                    {u.firstName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-sm text-white">
                                    {u.firstName} {u.lastName}
                                </span>
                                <span className="text-[11px] text-gray-400">{u.email ?? ''}</span>
                            </div>
                        </button>
                    ))}
                    {loading && (
                        <div className="px-4 py-2 text-xs text-gray-400">Loading...</div>
                    )}
                </div>
            )}
        </div>
    );
};

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Chat: FC = () => {
    const { } = useAuth();
    const location = useLocation() as { state?: { startChatWith?: ChatUserSummary } };
    const navigate = useNavigate();
    const {
        rooms,
        selectedRoomId,
        setSelectedRoomId,
        currentUser,
        currentMessages,
        inputValue,
        setInputValue,
        handleSend,
        isTyping,
        socketConnected,
        startChatWithUser,
    } = useChatController({
        startChatWith: location.state?.startChatWith ?? null,
    });

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

    // Handle redirect from /chat/new with a selected user (clear state after consumption)
    useEffect(() => {
        if (!location.state?.startChatWith) return;
        // useChatController å·²åœ¨ mount æ™‚ä¾ç…§ startChatWith å»ºç«‹ DM room
        navigate('/chat', { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold font-heading text-brand-dark">Chat</h1>
                    <p className="text-sm text-gray-500 mt-1">Direct messages & team conversations</p>
                </div>
                {socketConnected && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-gray-200 text-xs font-medium text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Connected
                    </div>
                )}
            </div>
        <div className="flex h-[calc(100vh-180px)] glass-panel overflow-hidden rounded-3xl">
            {/* â”€â”€ SIDEBAR â”€â”€ */}
            <aside className="w-[320px] lg:w-[380px] border-r border-white/10 flex flex-col shrink-0">
                <header className="h-[72px] px-5 flex items-center justify-between shrink-0 border-b border-white/10">
                    <h1 className="text-lg font-bold text-brand-dark truncate font-heading">{currentUser.name}</h1>
                    <div className="flex items-center gap-2">
                        {socketConnected && (
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Connected" />
                        )}
                        <button
                            type="button"
                            onClick={() => navigate('/chat/new')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-brand-dark transition-colors"
                        >
                            <span>New</span>
                        </button>
                    </div>
                </header>

                <div className="px-4 py-3">
                    <ChatUserSearch
                        onStartChat={(target) => {
                            startChatWithUser(target);
                        }}
                    />
                </div>

                <ChatSidebar
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    currentUserName={currentUser.name}
                    onSelectRoom={setSelectedRoomId}
                />
            </aside>

            {/* â”€â”€ CHAT AREA â”€â”€ */}
            {selectedRoom ? (
                <ChatMain
                    room={selectedRoom}
                    messages={currentMessages}
                    currentUserId={currentUser.id}
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    onSend={handleSend}
                    isTyping={isTyping}
                />
            ) : (
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                            <span className="text-4xl text-gray-400">ðŸ’¬</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-brand-dark font-heading">Your Messages</h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Select a conversation to start messaging
                            </p>
                        </div>
                    </div>
                </main>
            )}
        </div>
        </div>
    );
};

export default Chat;
