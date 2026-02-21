import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchChatUsers, type ChatUserSummary } from '@/components/ui/chat/utils/chatApi';
import { useAuth } from '@/context/AuthContext';
import { ChatSidebar } from '@/components/ui/chat/ChatSidebar';
import { ChatMain } from '@/components/ui/chat/ChatMain';
import { useChatController } from '@/components/ui/chat/logic/useChatController';

// ── Sub-components ───────────────────────────────────────────
// Search box to add users from database into chat (Instagram-style "new message")
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
                    <span className="material-symbols-outlined text-dark-text-secondary text-[18px]">search</span>
                </span>
                <input
                    className="w-full bg-dark-surface-2 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-primary/50 transition-all"
                    placeholder="Search users to chat..."
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl bg-dark-surface-2 border border-dark-border shadow-xl max-h-64 overflow-y-auto">
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
                                <span className="text-[11px] text-dark-text-secondary">{u.email ?? ''}</span>
                            </div>
                        </button>
                    ))}
                    {loading && (
                        <div className="px-4 py-2 text-xs text-dark-text-secondary">Loading...</div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Main Component ───────────────────────────────────────────

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
        // useChatController 已在 mount 時依照 startChatWith 建立 DM room
        navigate('/chat', { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="flex h-[calc(100vh-64px)] bg-dark-bg text-white overflow-hidden">
            {/* ── SIDEBAR ── */}
            <aside className="w-[320px] lg:w-[380px] bg-dark-bg border-r border-dark-border flex flex-col shrink-0">
                <header className="h-[72px] px-5 flex items-center justify-between shrink-0 border-b border-dark-border/50">
                    <h1 className="text-lg font-bold text-white truncate">{currentUser.name}</h1>
                    <div className="flex items-center gap-2">
                        {socketConnected && (
                            <span className="w-2 h-2 rounded-full bg-green animate-pulse" title="Connected" />
                        )}
                        <button
                            type="button"
                            onClick={() => navigate('/chat/new')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-dark-surface-2 text-xs font-medium text-dark-text-secondary hover:bg-dark-surface-2/80 hover:text-white transition-colors"
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

            {/* ── CHAT AREA ── */}
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
                <main className="flex-1 flex items-center justify-center bg-dark-bg">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-dark-surface-2 flex items-center justify-center mx-auto">
                            <span className="text-4xl text-dark-text-secondary">💬</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Your Messages</h3>
                            <p className="text-dark-text-secondary text-sm mt-1">
                                Select a conversation to start messaging
                            </p>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default Chat;
