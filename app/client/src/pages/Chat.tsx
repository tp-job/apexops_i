import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
    FiAlertOctagon,
    FiLock,
    FiMessageSquare,
    FiSearch,
    FiSend,
    FiUsers,
    FiWifi,
    FiWifiOff,
} from 'react-icons/fi';
import {
    Surface,
    AccentButton,
    Badge,
    EmptyState,
    Input,
    PageHeader,
} from '@/components/design-system';
import { useAuth } from '@/context/auth-context';
import { useChat } from '@/hooks/useChat';
import { fetchChatUsers, getDirectRoomId } from '@/services/chat';
import type { ChatUser } from '@/types/chat';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Chat — 1:1 direct messages.
 *
 * Built only after the socket was authenticated and room-scoped server-side
 * (see `.agents/docs/features/chat.md`). Two things this page must not be
 * refactored into:
 *
 *  - It must not filter messages client-side for privacy. The server emits into
 *    the conversation's room after checking participation; the browser is not
 *    the boundary.
 *  - It must not claim history. Messages are relayed, not stored, so the empty
 *    state says so plainly rather than implying a failed load.
 */

const initials = (u: ChatUser) => `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
const fullName = (u: ChatUser) => `${u.firstName} ${u.lastName}`.trim();

const timeOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Contact rail ──────────────────────────────────────────────
const ContactRow: FC<{ user: ChatUser; active: boolean; onSelect: () => void }> = ({
    user,
    active,
    onSelect,
}) => (
    <motion.li variants={fadeUp}>
        <button
            type="button"
            onClick={onSelect}
            aria-current={active}
            className={[
                'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                active
                    ? 'bg-brand-accent/20 ring-1 ring-brand-accent'
                    : 'hover:bg-black/[0.04] dark:hover:bg-white/5',
            ].join(' ')}
        >
            {user.avatarUrl ? (
                <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
            ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-semibold text-brand-accent dark:bg-white/10 dark:text-white">
                    {initials(user)}
                </span>
            )}
            <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-brand-dark dark:text-white">
                    {fullName(user)}
                </span>
                <span className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
            </span>
        </button>
    </motion.li>
);

// ── Page ──────────────────────────────────────────────────────
const Chat: FC = () => {
    const { user } = useAuth();
    const currentUserId = user?.id ?? null;

    const [users, setUsers] = useState<ChatUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [query, setQuery] = useState('');
    const [partner, setPartner] = useState<ChatUser | null>(null);
    const [draft, setDraft] = useState('');

    const roomId = useMemo(
        () => (currentUserId && partner ? getDirectRoomId(currentUserId, partner.id) : null),
        [currentUserId, partner],
    );

    const { messages, connected, typingUserIds, error, sendMessage, notifyTyping } = useChat({
        currentUserId,
        roomId,
    });

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const load = useCallback(async (q: string) => {
        setLoadingUsers(true);
        try {
            setUsers(await fetchChatUsers(q));
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    // Debounced so a fast typist doesn't fire a request per keystroke.
    useEffect(() => {
        const t = setTimeout(() => load(query), 250);
        return () => clearTimeout(t);
    }, [query, load]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);

    const submit = () => {
        const body = draft.trim();
        if (!body || !roomId) return;
        sendMessage(body);
        setDraft('');
    };

    if (!currentUserId) {
        return (
            <div className="flex flex-col gap-6">
                <EmptyState
                    icon={<FiLock size={22} />}
                    title="Sign in to chat"
                    description="Conversations are scoped to your account."
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Chat"
                subtitle="Direct messages with anyone in the workspace."
                actions={
                    <span
                        className={[
                            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                            connected
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-400',
                        ].join(' ')}
                    >
                        {connected ? <FiWifi size={13} /> : <FiWifiOff size={13} />}
                        {connected ? 'Connected' : 'Offline'}
                    </span>
                }
            />

            {error && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        {error}
                    </p>
                </Surface>
            )}

            <div className="grid gap-5 lg:grid-cols-3">
                {/* ── Contacts ───────────────────────────────── */}
                <motion.div variants={fadeUp} initial="hidden" animate="show">
                    <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                        <div className="flex h-full flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent">
                                    <FiUsers size={17} />
                                </span>
                                <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                    People
                                </h2>
                            </div>

                            <Input
                                aria-label="Search people"
                                icon={<FiSearch size={15} />}
                                placeholder="Search by name or email…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />

                            {loadingUsers ? (
                                <div className="flex flex-col gap-2" aria-hidden>
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-14 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                                    ))}
                                </div>
                            ) : users.length === 0 ? (
                                <EmptyState
                                    size="sm"
                                    icon={<FiUsers size={20} />}
                                    title={query ? 'No one matches' : 'No one else here yet'}
                                    description={
                                        query
                                            ? 'Try a different name or email.'
                                            : 'Other accounts will appear here once they exist.'
                                    }
                                />
                            ) : (
                                <motion.ul
                                    variants={stagger(0.03)}
                                    initial="hidden"
                                    animate="show"
                                    className="flex flex-col gap-1 overflow-y-auto"
                                >
                                    {users.map((u) => (
                                        <ContactRow
                                            key={u.id}
                                            user={u}
                                            active={partner?.id === u.id}
                                            onSelect={() => setPartner(u)}
                                        />
                                    ))}
                                </motion.ul>
                            )}
                        </div>
                    </Surface>
                </motion.div>

                {/* ── Thread ─────────────────────────────────── */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
                    <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                        {!partner ? (
                            <EmptyState
                                icon={<FiMessageSquare size={22} />}
                                title="Pick someone to talk to"
                                description="Choose a person on the left to open a direct conversation."
                            />
                        ) : (
                            <div className="flex h-full min-h-[28rem] flex-col gap-4">
                                <div className="flex items-center gap-3 border-b border-black/5 pb-4 dark:border-white/10">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-semibold text-brand-accent dark:bg-white/10 dark:text-white">
                                        {initials(partner)}
                                    </span>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-sm font-semibold text-brand-dark dark:text-white">
                                            {fullName(partner)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {typingUserIds.length > 0 ? 'typing…' : partner.email}
                                        </span>
                                    </div>
                                    <Badge tone="outline" className="ml-auto shrink-0">
                                        not saved
                                    </Badge>
                                </div>

                                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                                    {messages.length === 0 ? (
                                        <EmptyState
                                            size="sm"
                                            icon={<FiMessageSquare size={20} />}
                                            title="No messages in this session"
                                            description="Messages are delivered live and not stored — reloading starts a fresh pane."
                                        />
                                    ) : (
                                        <ul className="flex flex-col gap-3">
                                            {messages.map((m) => {
                                                const mine = m.senderId === String(currentUserId);
                                                return (
                                                    <li
                                                        key={m.id}
                                                        className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}
                                                    >
                                                        <div
                                                            className={[
                                                                'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                                                                mine
                                                                    ? 'bg-brand-accent text-brand-dark'
                                                                    : 'bg-black/[0.04] text-gray-800 dark:bg-white/10 dark:text-gray-100',
                                                            ].join(' ')}
                                                        >
                                                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                                        </div>
                                                        <span className="px-1 text-[11px] text-gray-400 dark:text-gray-500">
                                                            {mine ? 'You' : m.senderName} · {timeOf(m.createdAt)}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Input
                                        aria-label={`Message ${fullName(partner)}`}
                                        placeholder={connected ? 'Write a message…' : 'Reconnecting…'}
                                        value={draft}
                                        disabled={!connected}
                                        onChange={(e) => {
                                            setDraft(e.target.value);
                                            notifyTyping();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                submit();
                                            }
                                        }}
                                    />
                                    <AccentButton
                                        size="sm"
                                        icon={<FiSend size={14} />}
                                        onClick={submit}
                                        disabled={!connected || !draft.trim()}
                                    >
                                        Send
                                    </AccentButton>
                                </div>
                            </div>
                        )}
                    </Surface>
                </motion.div>
            </div>
        </div>
    );
};

export default Chat;
