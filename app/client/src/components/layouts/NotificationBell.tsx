import type { FC } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiRotateCcw, FiUserPlus } from 'react-icons/fi';
import { useNotifications } from '@/hooks/useNotifications';
import { useDismissable } from '@/hooks/useDismissable';
import { relativeTime } from '@/utils/format';
import type { AppNotification } from '@/types/projects';

/**
 * The alert bell.
 *
 * A plain popover rather than a Radix dropdown, matching `ProjectSwitcher`:
 * this is a list of links needing click-outside and Escape, nothing more.
 *
 * The badge is capped at "9+" — the exact number stops being actionable past a
 * handful, and an unbounded count makes the button reflow as it grows.
 */
const NotificationBell: FC = () => {
    const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useDismissable(open, ref, useCallback(() => setOpen(false), []));

    const openNotification = async (n: AppNotification) => {
        setOpen(false);
        if (!n.readAt) void markRead(n.id);

        // An invite notification is an announcement, not a door. Accepting needs
        // the token, and the token is never stored — so there is nothing to link
        // to, and `/p/:slug/*` would 404 the recipient, who is by definition not
        // a member yet. Marking it read is the whole interaction.
        //
        // The fix that would make this row actionable is a `GET /api/invites/mine`
        // that resolves pending invites by the caller's own address instead of by
        // token. That is a backend addition, tracked separately.
        if (n.kind === 'invite') return;

        // Regressions always carry an issue; the guard is for future kinds that
        // may only reference a project.
        if (n.projectSlug && n.issueId) navigate(`/p/${n.projectSlug}/issues/${n.issueId}`);
        else if (n.projectSlug) navigate(`/p/${n.projectSlug}/overview`);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={
                    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
                }
                className="relative grid h-9 w-9 place-items-center rounded-xl text-gray-600 outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-300 dark:hover:bg-white/10 dark:focus-visible:ring-brand-accent/40"
            >
                <FiBell size={17} />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid min-w-[17px] place-items-center rounded-full bg-global-red px-1 text-[10px] font-bold leading-[17px] text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="menu"
                    className="ds-frost absolute right-0 z-50 mt-2 w-80 rounded-2xl p-1.5 shadow-xl"
                >
                    <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-sm font-semibold text-brand-dark dark:text-white">
                            Notifications
                        </p>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAllRead()}
                                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="my-1 h-px bg-black/5 dark:bg-white/10" />

                    <div className="max-h-96 overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-gray-400">Loading…</p>
                        ) : notifications.length === 0 ? (
                            <div className="px-3 py-8 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Nothing yet
                                </p>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    You&apos;ll be told when a resolved issue comes back.
                                </p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n.id}
                                    role="menuitem"
                                    type="button"
                                    onClick={() => void openNotification(n)}
                                    className={`flex w-full gap-2.5 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${
                                        n.readAt ? 'opacity-60' : ''
                                    }`}
                                >
                                    {/* Icon carries the kind, so the two are
                                        distinguishable without reading the title. */}
                                    <span
                                        className={`mt-0.5 shrink-0 ${
                                            n.kind === 'invite'
                                                ? 'text-brand-dark dark:text-brand-accent'
                                                : 'text-global-red'
                                        }`}
                                        aria-hidden
                                    >
                                        {n.kind === 'invite' ? (
                                            <FiUserPlus size={14} />
                                        ) : (
                                            <FiRotateCcw size={14} />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-[13px] font-semibold text-brand-dark dark:text-gray-100">
                                                {n.title}
                                            </span>
                                            {/* Unread dot, not a colour change: colour alone
                                                is not a signal everyone can perceive. */}
                                            {!n.readAt && (
                                                <span
                                                    aria-label="Unread"
                                                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-global-red"
                                                />
                                            )}
                                        </span>
                                        {n.body && (
                                            <span className="mt-0.5 block line-clamp-2 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
                                                {n.body}
                                            </span>
                                        )}
                                        {n.kind === 'invite' && (
                                            // Says what to do next, because this row
                                            // cannot do it for them.
                                            <span className="mt-1 block text-[11px] italic text-gray-400">
                                                Open the invite link they sent you to join.
                                            </span>
                                        )}
                                        <span className="mt-1 block text-[11px] text-gray-400">
                                            {relativeTime(n.createdAt)}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
