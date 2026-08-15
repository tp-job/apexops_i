import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { FiChevronsRight, FiCpu } from 'react-icons/fi';
import { EmptyState } from '@/components/design-system';

/**
 * The AI assistant rail (spec F010).
 *
 * **This is layout chrome, not a design-system primitive.** It deliberately does
 * not live in `components/design-system` and must never be added to that barrel:
 * the barrel is the one door for reusable primitives, and a panel that only ever
 * appears once, in one shell, is not one.
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
 * Below `xl` it *is* floating, so the drawer variant earns `.ds-elev-3`. The
 * scrim and its timing are `AppLayout`'s existing nav-drawer values reused
 * verbatim rather than a second near-identical set.
 *
 * ## Tokens
 *
 * This repo carries two token systems. Everything here uses the Luxe `@theme`
 * scale (`brand-*`, `light/dark-*`). The shadcn neutral set (`bg-background`,
 * `text-muted-foreground`, …) backs `components/ui/*` only — a directory that
 * does not exist — and must not appear in this subtree.
 *
 * ## Why there is no composer yet
 *
 * `Topbar`'s own comment states the rule: a control that does nothing is worse
 * than no control. The conversation surface and its composer arrive with F011,
 * wired to `useAssistant`. Until then this renders an honest empty state rather
 * than an input that swallows what you type.
 */

interface AssistantPanelProps {
    onClose: () => void;
    /** `rail` sits inline at `xl`+; `drawer` floats above content below that. */
    variant?: 'rail' | 'drawer';
}

/**
 * There is deliberately no `open` prop: `AppLayout` mounts this only while the
 * panel is open, so a boolean here could only ever be `true`. A prop that cannot
 * vary is a prop that will eventually be read as meaningful and get a branch
 * built on it.
 */
const AssistantPanel: FC<AssistantPanelProps> = ({ onClose, variant = 'rail' }) => {
    const closeRef = useRef<HTMLButtonElement>(null);

    // Esc closes from anywhere in the panel. Focus return to the trigger is
    // `AppLayout`'s job — it owns the trigger, and a component that cannot see
    // an element should not claim to restore focus to it.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

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
                        Not configured
                    </span>
                </div>

                <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close assistant"
                    className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                    <FiChevronsRight size={17} />
                </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
                <EmptyState
                    size="sm"
                    icon={<FiCpu size={18} />}
                    title="Assistant not wired up yet"
                    description="The conversation surface and your own API key arrive next. This rail is the shell it mounts into."
                />
            </div>
        </aside>
    );
};

export default AssistantPanel;
