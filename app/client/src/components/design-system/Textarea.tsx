import type { ComponentPropsWithRef, FC } from 'react';
import { useFieldWiring } from './field-context';

interface TextareaProps extends Omit<ComponentPropsWithRef<'textarea'>, 'cols'> {
    /** Visible rows before scrolling. Height still grows with `autoGrow`. */
    rows?: number;
    /**
     * Grows to fit the content instead of scrolling, up to `maxRows`.
     *
     * Off by default. A note body wants it (the whole text should be visible
     * while writing); a comment box in a fixed-height rail does not, because a
     * growing box there pushes the thread it belongs to off screen.
     */
    autoGrow?: boolean;
    /** Ceiling for `autoGrow`, in rows. Past this it scrolls. */
    maxRows?: number;
}

// `resize-*` is deliberately NOT in here. Two conflicting resize utilities in one
// class string resolve by stylesheet order, not string order, so which one wins is
// a coin toss — the variant is applied once, below.
const base =
    'w-full rounded-xl border bg-white/70 text-sm text-brand-dark transition-colors ' +
    'px-3.5 py-2.5 leading-relaxed ' +
    'placeholder:text-gray-400 outline-none ' +
    'dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

const tone = {
    normal:
        'border-gray-200 focus-visible:border-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/25 ' +
        'dark:border-white/10 dark:focus-visible:border-brand-accent dark:focus-visible:ring-brand-accent/30',
    invalid:
        'border-global-red/70 focus-visible:border-global-red focus-visible:ring-2 focus-visible:ring-global-red/25 ' +
        'dark:border-global-red/60',
};

/**
 * The system's multi-line input. `Input`'s twin — same border, focus ring, tone
 * and `Field` wiring, so a form mixing the two looks like one control set.
 *
 * It existed as a gap for six sprints and the cost was visible: every screen
 * that needed a body of text either shipped a raw `<textarea>` with its own
 * hand-written class string (`AdminDocs`) or used a single-line `Input` and
 * hoped (`NotesCalendar`'s content field, which silently could not hold a
 * paragraph). This is the one place that decision now lives.
 *
 * `autoGrow` measures with `scrollHeight` on a ref callback rather than during
 * render — reading layout in render is what makes auto-sizing textareas janky.
 */
const Textarea: FC<TextareaProps> = ({
    rows = 4,
    autoGrow = false,
    maxRows = 16,
    className = '',
    id,
    onInput,
    ...rest
}) => {
    const field = useFieldWiring();
    const invalid = field?.invalid ?? false;

    /**
     * `scrollHeight` includes padding but not borders, so the cap is built from
     * the element's own computed metrics rather than a guessed constant —
     * otherwise `maxRows` drifts with the type scale.
     */
    const grow = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        const s = getComputedStyle(el);
        const line = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5 || 20;
        const chrome =
            parseFloat(s.paddingTop) + parseFloat(s.paddingBottom) +
            parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth);

        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight + parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth), line * maxRows + chrome)}px`;
    };

    return (
        <textarea
            id={field?.controlId ?? id}
            rows={rows}
            aria-describedby={field?.describedBy}
            aria-invalid={invalid || undefined}
            aria-required={field?.required || undefined}
            ref={autoGrow ? grow : undefined}
            onInput={(e) => {
                if (autoGrow) grow(e.currentTarget);
                onInput?.(e);
            }}
            className={`${base} ${invalid ? tone.invalid : tone.normal} ${autoGrow ? 'resize-none overflow-hidden' : 'resize-y'} ${className}`.trim()}
            {...rest}
        />
    );
};

export default Textarea;
