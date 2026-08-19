import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { FiCalendar } from 'react-icons/fi';

/**
 * Move one task to another day, from the master list (US-06).
 *
 * **A native `<input type="date">`, not a custom picker.** It arrives with
 * keyboard entry, locale-correct formatting, the platform's own calendar popup
 * and full screen-reader support — none of which a hand-rolled dropdown would
 * have without a great deal of work, and all of which a user already knows how
 * to drive. `/daily` uses the same control for the same job.
 *
 * It stays collapsed until asked for. A date field on every row of a long list
 * is a wall of boxes competing with the task text, which is the thing people are
 * actually reading.
 *
 * The parent decides what a chosen day *means* — this component reports a
 * `YYYY-MM-DD` and nothing else. It deliberately does not know about UTC noon or
 * `taskDayAnchor`; anchoring belongs with the wire format, in `services/tasks`.
 */
export interface RescheduleControlProps {
    /** Current day, `YYYY-MM-DD`, used as the field's starting value. */
    value: string | null;
    disabled?: boolean;
    /** Label for assistive tech — the task this control belongs to. */
    taskText: string;
    onPick: (dayKey: string) => void;
}

const RescheduleControl: FC<RescheduleControlProps> = ({ value, disabled, taskText, onPick }) => {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Opening a field nobody is focused on just adds clutter; the point of the
    // click was to type a date.
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    if (!open) {
        return (
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(true)}
                title={`Move "${taskText}" to another day`}
                aria-label={`Move "${taskText}" to another day`}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
            >
                <FiCalendar size={13} />
            </button>
        );
    }

    return (
        <input
            ref={inputRef}
            type="date"
            disabled={disabled}
            defaultValue={value ? dayjs(value).format('YYYY-MM-DD') : ''}
            aria-label={`New day for "${taskText}"`}
            onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                setOpen(false);
                // Picking the day it is already on is not a change; firing anyway
                // would bump `updatedAt` and reload the list for nothing.
                if (value && dayjs(value).format('YYYY-MM-DD') === next) return;
                onPick(next);
            }}
            // Escape and blur both mean "changed my mind", and neither should
            // leave a field open on a row the user has moved away from.
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
            onBlur={() => setOpen(false)}
            className="rounded-lg border border-gray-200 bg-white/70 px-2 py-1 text-xs text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/25 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:ring-brand-accent/30"
        />
    );
};

export default RescheduleControl;
