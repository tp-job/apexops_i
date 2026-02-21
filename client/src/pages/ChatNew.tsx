import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchChatUsers, type ChatUserSummary } from '@/components/ui/chat/utils/chatApi';

const ChatNew: FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ChatUserSummary[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
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
    }, [query, user]);

    const handleStartChat = (target: ChatUserSummary) => {
        navigate('/chat', {
            state: { startChatWith: target },
        });
    };

    return !user ? (
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-dark-bg text-white">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Please sign in</h2>
                <p className="text-dark-text-secondary text-sm">
                    You need an account to start new chats.
                </p>
            </div>
        </div>
    ) : (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-dark-bg text-white">
            <header className="h-[72px] px-6 flex items-center justify-between border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="p-1.5 rounded-full hover:bg-dark-surface-2"
                    >
                        <span className="material-symbols-outlined text-[22px] text-dark-text-secondary">
                            arrow_back
                        </span>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-semibold leading-tight">New message</h1>
                        <span className="text-xs text-dark-text-secondary">
                            Search your teammates to start a conversation
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center">
                        <span className="material-symbols-outlined text-dark-text-secondary text-[18px]">
                            search
                        </span>
                    </span>
                    <input
                        className="w-full bg-dark-surface-2 border border-dark-border rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-primary/50 transition-all"
                        placeholder="Search by name or email..."
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <section className="bg-dark-surface rounded-2xl border border-dark-border/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-dark-border/60 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-dark-text-secondary">
                            People
                        </span>
                        {loading && (
                            <span className="text-[11px] text-dark-text-secondary">Searching...</span>
                        )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {results.length === 0 && !loading && query.trim() && (
                            <div className="px-4 py-6 text-center text-sm text-dark-text-secondary">
                                No users found for &ldquo;{query}&rdquo;
                            </div>
                        )}
                        {results.map((u) => (
                            <button
                                key={u.id}
                                type="button"
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-surface-2/70 transition-colors text-left"
                                onClick={() => handleStartChat(u)}
                            >
                                {u.avatarUrl ? (
                                    <img
                                        src={u.avatarUrl}
                                        alt={`${u.firstName} ${u.lastName}`}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center text-sm font-semibold">
                                        {u.firstName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium truncate">
                                            {u.firstName} {u.lastName}
                                        </span>
                                        <span className="text-[11px] text-dark-text-secondary">
                                            Tap to chat
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-dark-text-secondary truncate">
                                        {u.email}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ChatNew;

