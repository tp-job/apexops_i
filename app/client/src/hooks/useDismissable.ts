import { useEffect, type RefObject } from 'react';

export interface DismissableOptions {
    /** Dismiss when the page scrolls. Right, for anything anchored to a cursor. */
    onScroll?: boolean;
    /** Dismiss on window resize and blur. */
    onViewportChange?: boolean;
    /** Also dismiss on a right-click outside, not just a left-click. */
    onContextMenu?: boolean;
}

/**
 * Click-outside + Escape dismissal for popovers.
 *
 * Extracted from three hand-rolled copies (`NotificationBell`,
 * `ProjectSwitcher`, `ContextMenu`) that had each drifted slightly — only one
 * dismissed on scroll, only one on right-click outside. Inconsistent dismissal
 * is the kind of thing users feel as "this app is janky" without being able to
 * name it, and fixing it in one place meant remembering the other two existed.
 *
 * `mousedown` rather than `click`: closing on mouse-*down* matches every native
 * menu, and a `click` listener fires after the press has already landed on
 * whatever is underneath.
 *
 * The listener is only attached while `open`, so a closed popover costs nothing.
 */
export function useDismissable(
    open: boolean,
    ref: RefObject<HTMLElement | null>,
    onDismiss: () => void,
    options: DismissableOptions = {}
): void {
    const { onScroll = false, onViewportChange = false, onContextMenu = false } = options;

    useEffect(() => {
        if (!open) return;

        const isOutside = (target: EventTarget | null) =>
            ref.current !== null && !ref.current.contains(target as Node);

        const handlePointer = (e: MouseEvent) => {
            if (isOutside(e.target)) onDismiss();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDismiss();
        };
        const handleDismiss = () => onDismiss();

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        if (onContextMenu) document.addEventListener('contextmenu', handlePointer);
        // Capture phase: a scroll inside any nested container should dismiss an
        // anchored popover too, and scroll does not bubble to document.
        if (onScroll) window.addEventListener('scroll', handleDismiss, true);
        if (onViewportChange) {
            window.addEventListener('resize', handleDismiss);
            window.addEventListener('blur', handleDismiss);
        }

        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
            if (onContextMenu) document.removeEventListener('contextmenu', handlePointer);
            if (onScroll) window.removeEventListener('scroll', handleDismiss, true);
            if (onViewportChange) {
                window.removeEventListener('resize', handleDismiss);
                window.removeEventListener('blur', handleDismiss);
            }
        };
    }, [open, ref, onDismiss, onScroll, onViewportChange, onContextMenu]);
}
