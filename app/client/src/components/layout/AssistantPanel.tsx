import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { FiChevronsRight, FiCpu, FiEdit3, FiKey } from 'react-icons/fi';
import { useAssistant } from '@/hooks/useAssistant';
import MessageList from '@/components/assistant/MessageList';
import AssistantComposer from '@/components/assistant/AssistantComposer';
import AssistantErrorRow, { KeyMissingNotice } from '@/components/assistant/AssistantErrorRow';
import KeyDialog from '@/components/assistant/KeyDialog';

/**
 * The AI assistant rail (spec F010–F014).
 *
 * **This is layout chrome, not a design-system primitive.** It deliberately does
 * not live in `components/design-system` and must never be added to that barrel:
 * the barrel is the one door for reusable primitives, and a panel that appears
 * once, in one shell, is not one.
 *
 * ## Why it looks like the Sidebar
 *
 * The governing analogy is symmetry — this is the right-hand mirror of the left
 * nav rail, so it takes `Sidebar`'s surface and border treatment with the border
 * flipped to `border-l`. That is also why it has **no shadow and no blur** at
 * `xl`: it is a border-separated rail sitting beside content, not a surface
 * floating over it. `.ds-frost` and `.ds-menu` are both wrong here, for the
 * reasons each carries in its own comment in `globals.css`.
 *
 * Below `xl` it *is* floating, so the drawer variant earns `.ds-elev-3`.
 *
 * ## Tokens
 *
 * This repo carries two token systems. Everything here uses the Luxe `@theme`
 * scale (`brand-*`, `light/dark-*`, `global-*`). The shadcn neutral set
 * (`bg-background`, `text-muted-foreground`, …) backs `components/ui/*` only — a
 * directory that does not exist — and must not appear in this subtree.
 */

interface AssistantPanelProps {
    onClose: () => void;
    /** `rail` sits inline at `xl`+; `drawer` floats above content below that. */
    variant?: 'rail' | 'drawer';
}

const AssistantPanel: FC<AssistantPanelProps> = ({ onClose, variant = 'rail' }) => {
    const assistant = useAssistant(true);
    const [keyDialogOpen, setKeyDialogOpen] = useState(false);

    // Esc closes from anywhere in the panel — but not while the key dialog is
    // open, where Radix owns Esc and should close only itself. Two handlers
    // firing on one keypress would shut both.
    useEffect(() => {
        if (keyDialogOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, keyDialogOpen]);

    const noKey = assistant.error?.code === 'NO_KEY';
    const iconBtn =
        'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-gray-600 transition-colors ' +
        'hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10';

    return (
        <aside
            id="assistant-panel"
            aria-label="AI assistant"
            className={[
                'flex h-full w-[380px] max-w-[85vw] shrink-0 flex-col',
                'border-l border-black/5 bg-light-surface dark:border-white/10 dark:bg-dark-surface',
                variant === 'drawer' ? 'ds-elev-3' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {/* h-16 so the header line matches Topbar and the Sidebar brand block. */}
            <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-black/5 px-4 dark:border-white/10">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-dark dark:bg-brand-accent">
                    <FiCpu className="text-brand-accent dark:text-brand-dark" size={15} />
                </span>

                <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate font-heading text-sm font-bold text-brand-dark dark:text-white">
                        Assistant
                    </span>
                    <span className="truncate text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                        {assistant.storedKey ? `Your key · ${assistant.storedKey.maskedKey}` : 'Gemini'}
                    </span>
                </div>

                <div className="ml-auto flex items-center gap-0.5">
                    <button type="button" onClick={() => setKeyDialogOpen(true)} aria-label="Manage API key" className={iconBtn}>
                        <FiKey size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={assistant.clear}
                        disabled={assistant.messages.length === 0}
                        aria-label="New chat"
                        className={`${iconBtn} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                        <FiEdit3 size={16} />
                    </button>
                    <button type="button" onClick={onClose} aria-label="Close assistant" className={iconBtn}>
                        <FiChevronsRight size={17} />
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <MessageList messages={assistant.messages} sending={assistant.sending} onRetry={() => void assistant.retryLast()} />
            </div>

            {/* NO_KEY is an invitation, not a failure — so it gets its own surface. */}
            {noKey && <KeyMissingNotice onOpenKeyDialog={() => setKeyDialogOpen(true)} />}

            {assistant.error && !noKey && (
                <AssistantErrorRow
                    error={assistant.error}
                    onRetry={() => void assistant.retryLast()}
                    onDismiss={assistant.dismissError}
                    onOpenKeyDialog={() => setKeyDialogOpen(true)}
                />
            )}

            <AssistantComposer onSend={(text) => void assistant.send(text)} sending={assistant.sending} />

            <KeyDialog
                open={keyDialogOpen}
                onOpenChange={setKeyDialogOpen}
                storedKey={assistant.storedKey}
                busy={assistant.keyLoading}
                error={assistant.error}
                onSubmit={assistant.submitKey}
                onRemove={assistant.removeKey}
            />
        </aside>
    );
};

export default AssistantPanel;
