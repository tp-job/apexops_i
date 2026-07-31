import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismissable } from '@/hooks/useDismissable';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: ReactNode;
    onSelect: () => void;
    /** Red styling. Reserve for actions that destroy or revoke. */
    destructive?: boolean;
    disabled?: boolean;
    /** Draws a divider above this item. */
    separatorBefore?: boolean;
}

export interface MenuPosition {
    x: number;
    y: number;
}

interface ContextMenuProps {
    open: boolean;
    position: MenuPosition | null;
    items: ContextMenuItem[];
    onClose: () => void;
    /** Accessible name — describes what the menu acts on ("Actions for Acme Storefront"). */
    label: string;
}

const EDGE_PADDING = 8;

/**
 * Cursor-positioned action menu.
 *
 * **A right-click menu must never be the only route to an action.** It is
 * invisible to keyboard users, impossible on touch, and undiscoverable to anyone
 * who does not think to try it. Every caller pairs this with a visible trigger
 * (a "⋯" button) that opens the same menu with the same items — this component
 * is the shared surface for both, which is what keeps the two in step.
 *
 * Behaviour that has to be right or the menu feels broken:
 * - flips away from the viewport edge instead of being clipped
 * - closes on Escape, outside click, scroll, resize and window blur
 * - full keyboard navigation once open, with focus moved into the menu
 * - focus returns to whatever opened it
 */
const ContextMenu: FC<ContextMenuProps> = ({ open, position, items, onClose, label }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<Element | null>(null);
    const [coords, setCoords] = useState<MenuPosition | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const selectable = items.filter((i) => !i.disabled);

    // Remember what had focus so it can be restored on close. Read at open time,
    // because by the time we close, focus is inside the menu.
    useEffect(() => {
        if (open) openerRef.current = document.activeElement;
    }, [open]);

    /**
     * Position before paint, not after: measuring in `useEffect` renders the menu
     * at the raw cursor point for one frame, so a menu near the right edge visibly
     * jumps left. `useLayoutEffect` clamps it before the browser paints.
     */
    useLayoutEffect(() => {
        if (!open || !position) {
            setCoords(null);
            return;
        }
        const el = menuRef.current;
        if (!el) {
            setCoords(position);
            return;
        }
        const { width, height } = el.getBoundingClientRect();
        const maxX = window.innerWidth - width - EDGE_PADDING;
        const maxY = window.innerHeight - height - EDGE_PADDING;
        setCoords({
            x: Math.max(EDGE_PADDING, Math.min(position.x, maxX)),
            y: Math.max(EDGE_PADDING, Math.min(position.y, maxY)),
        });
    }, [open, position]);

    useEffect(() => {
        if (!open) return;
        setActiveIndex(0);
    }, [open]);

    /**
     * Focus once the menu is **positioned**, not when `open` flips.
     *
     * Opening renders an invisible copy first so it can be measured (see below),
     * so at `open` time `menuRef` still points at that throwaway node — focusing
     * it does nothing. Keying on `coords` means this runs against the real menu.
     *
     * Focus lands on the menu container rather than the first item: Escape and
     * the arrow keys work immediately, without implying an action is pre-selected.
     */
    useEffect(() => {
        if (!open || !coords) return;
        menuRef.current?.focus();
    }, [open, coords]);

    const close = useCallback(() => {
        onClose();
        const opener = openerRef.current;
        if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    }, [onClose]);

    // A menu anchored to a cursor position is wrong the moment the page moves
    // underneath it, so this one also dismisses on scroll/resize/blur — and on a
    // right-click elsewhere, which should open that element's menu, not stack.
    useDismissable(open, menuRef, close, {
        onScroll: true,
        onViewportChange: true,
        onContextMenu: true,
    });

    if (!open) return null;

    const move = (delta: number) => {
        if (!selectable.length) return;
        setActiveIndex((i) => {
            const next = (i + delta + selectable.length) % selectable.length;
            return next;
        });
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                close();
                break;
            case 'ArrowDown':
                e.preventDefault();
                move(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                move(-1);
                break;
            case 'Home':
                e.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setActiveIndex(selectable.length - 1);
                break;
            case 'Enter':
            case ' ': {
                e.preventDefault();
                const item = selectable[activeIndex];
                if (item) {
                    close();
                    item.onSelect();
                }
                break;
            }
            case 'Tab':
                // Tabbing out of an open menu should dismiss it, not leave it
                // floating over a page the user has moved on from.
                close();
                break;
        }
    };

    return createPortal(
        <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            /**
             * One element, rendered with its real styles from the first pass and
             * merely hidden until positioned.
             *
             * The earlier version measured a bare copy of the items that lacked the
             * menu's own `min-w` and padding, so the clamp ran against a box several
             * pixels smaller than the thing being placed and a menu opened near the
             * edge still overflowed. Measuring the actual element is the only way
             * the numbers can agree.
             */
            style={
                coords
                    ? { left: coords.x, top: coords.y }
                    : { left: 0, top: 0, visibility: 'hidden' }
            }
            className="ds-frost fixed z-[60] min-w-[13rem] rounded-2xl p-1.5 shadow-2xl outline-none"
        >
            <MenuBody
                items={items}
                activeIndex={activeIndex}
                onSelect={(item) => {
                    close();
                    item.onSelect();
                }}
            />
        </div>,
        document.body
    );
};

const MenuBody: FC<{
    items: ContextMenuItem[];
    activeIndex: number;
    onSelect: (item: ContextMenuItem) => void;
}> = ({ items, activeIndex, onSelect }) => {
    let selectableIndex = -1;

    return (
        <>
            {items.map((item) => {
                if (!item.disabled) selectableIndex += 1;
                const isActive = !item.disabled && selectableIndex === activeIndex;

                return (
                    <div key={item.id}>
                        {item.separatorBefore && (
                            <div className="my-1 h-px bg-black/5 dark:bg-white/10" role="separator" />
                        )}
                        <button
                            type="button"
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={() => onSelect(item)}
                            className={[
                                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm outline-none transition-colors',
                                item.disabled
                                    ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                                    : item.destructive
                                      ? 'text-global-red hover:bg-global-red/10'
                                      : 'text-brand-dark hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10',
                                isActive && !item.disabled
                                    ? item.destructive
                                        ? 'bg-global-red/10'
                                        : 'bg-black/5 dark:bg-white/10'
                                    : '',
                            ].join(' ')}
                        >
                            {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
                            <span className="truncate">{item.label}</span>
                        </button>
                    </div>
                );
            })}
        </>
    );
};

export default ContextMenu;
