import { useCallback, useState } from 'react';
import type { MenuPosition } from './ContextMenu';

export interface ContextMenuState<T> {
    /** The row/card the menu was opened for, or null when closed. */
    target: T | null;
    position: MenuPosition | null;
    open: boolean;
    /** Wire to `onContextMenu` — prevents the native menu and opens at the cursor. */
    openAtCursor: (event: React.MouseEvent, target: T) => void;
    /** Wire to a visible "⋯" button — opens anchored under the button. */
    openAtElement: (event: React.MouseEvent | React.KeyboardEvent, target: T) => void;
    close: () => void;
}

/**
 * Open/position state for a **single shared** `ContextMenu`.
 *
 * Deliberately one menu for a whole list rather than one per row: N menu
 * instances means N portals and N sets of document listeners for a surface where
 * only one can ever be open. The list holds this hook and passes the built items
 * for whichever `target` is current.
 *
 * `openAtElement` exists so the visible "⋯" trigger and the right-click gesture
 * produce the same menu — a right-click-only action is unreachable by keyboard
 * and impossible on touch.
 */
export function useContextMenu<T>(): ContextMenuState<T> {
    const [target, setTarget] = useState<T | null>(null);
    const [position, setPosition] = useState<MenuPosition | null>(null);

    const openAtCursor = useCallback((event: React.MouseEvent, next: T) => {
        event.preventDefault();
        // Stop the parent's handler from firing too — a right-click on a card
        // inside a list would otherwise open the card menu and then immediately
        // replace it with the list's own.
        event.stopPropagation();

        /**
         * Not every `contextmenu` event comes from a cursor.
         *
         * Shift+F10 and the Menu key fire a real `contextmenu` event on the focused
         * element, which is the only way a keyboard user reaches a right-click menu
         * at all. Several browsers report `0,0` for those, and taken literally that
         * pins the menu to the top-left corner of the viewport, nowhere near the
         * thing it acts on. Falling back to the element's own box puts it where a
         * mouse user would have seen it.
         */
        const fromKeyboard = event.clientX === 0 && event.clientY === 0;
        if (fromKeyboard && event.currentTarget instanceof HTMLElement) {
            const rect = event.currentTarget.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.bottom + 4 });
        } else {
            setPosition({ x: event.clientX, y: event.clientY });
        }
        setTarget(next);
    }, []);

    const openAtElement = useCallback((event: React.MouseEvent | React.KeyboardEvent, next: T) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        // Anchored to the trigger's bottom-left so the menu reads as belonging to
        // the button rather than appearing at an unrelated point.
        setPosition({ x: rect.left, y: rect.bottom + 4 });
        setTarget(next);
    }, []);

    const close = useCallback(() => {
        setTarget(null);
        setPosition(null);
    }, []);

    return {
        target,
        position,
        open: target !== null && position !== null,
        openAtCursor,
        openAtElement,
        close,
    };
}
