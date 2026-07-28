import type { FC, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';

type Size = 'sm' | 'md' | 'lg';

interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** One line under the title. Wired to `aria-describedby` by Radix. */
    description?: string;
    size?: Size;
    /** Footer actions. Right-aligned; put the primary action last. */
    footer?: ReactNode;
    /**
     * Blocks closing via ESC, overlay click and the X. Use while a submit is in
     * flight — never as a way to force a decision, which is what makes a dialog
     * feel like a trap.
     */
    dismissible?: boolean;
    children?: ReactNode;
}

const sizes: Record<Size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
};

/**
 * The system's dialog.
 *
 * Radix owns focus trapping, focus restore, ESC, scroll lock and the inert
 * background. That is deliberate: a hand-rolled focus trap is a steady source of
 * keyboard-accessibility bugs, and this is the one primitive where the
 * correctness bar justifies the dependency. (Radix marks the background inert
 * with `aria-hidden` on every sibling rather than `aria-modal` on the dialog —
 * verified in-browser; it is the stronger of the two.)
 *
 * **Motion here is CSS (`tw-animate-css` + Radix `data-state`), not
 * `motion/react`** — the one deliberate exception to "motion only from
 * `@/lib/motion`". Radix delays unmount until the exit animation on the content
 * finishes, so whatever animates the close must be the thing Radix is watching.
 * Driving it from CSS keeps mount/unmount owned end-to-end by one library
 * instead of split across two that each think they control it.
 *
 * Keep the durations in step with `DUR` in `@/lib/motion` by hand (150ms overlay,
 * 200ms content) — they are not imported, so they can drift silently.
 *
 * Verification note: in a headless or backgrounded tab, CSS animations and rAF
 * are both suspended, so `animationend` never fires and a closing dialog appears
 * to hang with `data-state="closed"` still in the DOM. That is the harness, not
 * this component — confirmed by re-running the close cycle with
 * `animation: none`, which unmounts cleanly. Do not "fix" it by removing the
 * exit animation.
 */
const Modal: FC<ModalProps> = ({
    open,
    onOpenChange,
    title,
    description,
    size = 'md',
    footer,
    dismissible = true,
    children,
}) => {
    const block = (e: Event) => {
        if (!dismissible) e.preventDefault();
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

                <Dialog.Content
                    onEscapeKeyDown={block}
                    onPointerDownOutside={block}
                    onInteractOutside={block}
                    className={`ds-frost fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] ${sizes[size]} -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-2xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200`}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <Dialog.Title className="text-base font-semibold text-brand-dark dark:text-white">
                                {title}
                            </Dialog.Title>
                            {description && (
                                <Dialog.Description className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                    {description}
                                </Dialog.Description>
                            )}
                        </div>

                        {dismissible && (
                            <Dialog.Close
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-gray-400 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-brand-accent/40"
                                aria-label="Close dialog"
                            >
                                <FiX size={16} />
                            </Dialog.Close>
                        )}
                    </div>

                    {children && <div className="mt-5">{children}</div>}

                    {footer && (
                        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                            {footer}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default Modal;
