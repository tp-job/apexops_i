import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiCalendar } from 'react-icons/fi';

/**
 * Tells the user where this day's writing ends up (blueprint US-01).
 *
 * The sync it describes has always worked — a daily note *is* a `Note`, tagged
 * `daily` and scheduled on the day, so it has always appeared in Notes &
 * Calendar. What was missing was any way to know that. The page previously said
 * so in one line of grey body text below the editor, which reads as a footnote,
 * and the reasonable conclusion from a page that never mentions it is that the
 * two screens are separate and everything has to be written twice.
 *
 * **Tense tracks reality.** Before anything is saved the note does not exist
 * yet, so the badge says what *will* happen and has nowhere to link. Once it
 * exists the badge switches to the past tense and becomes a real link to that
 * note. Saying "saved as" over a note that was never created would be the kind
 * of small lie that teaches people not to trust the rest of the interface.
 */
export interface DailyNoteBadgeProps {
    /** The title the note carries, e.g. `Daily Note - 16 Aug 2026`. */
    title: string;
    /** The note's id once it exists; null on a day nothing has been written to. */
    noteId: number | null;
}

const DailyNoteBadge: FC<DailyNoteBadgeProps> = ({ title, noteId }) => {
    const shell =
        'flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border px-3 py-2 text-xs leading-relaxed';

    if (noteId === null) {
        return (
            <p
                className={`${shell} border-gray-200 bg-black/[0.02] text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400`}
            >
                <FiCalendar size={12} className="shrink-0" aria-hidden />
                <span>What you write here becomes a note called</span>
                <b className="font-semibold text-brand-dark dark:text-gray-200">{title}</b>
                <span>in Notes &amp; Calendar.</span>
            </p>
        );
    }

    return (
        <p
            className={`${shell} border-brand-accent/40 bg-brand-accent/10 text-gray-600 dark:border-brand-accent/25 dark:bg-brand-accent/[0.07] dark:text-gray-300`}
        >
            <FiCalendar size={12} className="shrink-0" aria-hidden />
            <span>Saved in Notes &amp; Calendar as</span>
            <Link
                to={`/notes?note=${noteId}`}
                className="inline-flex items-center gap-0.5 rounded font-semibold text-brand-dark underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-white dark:focus-visible:ring-brand-accent/40"
            >
                {title}
                <FiArrowUpRight size={12} aria-hidden />
            </Link>
        </p>
    );
};

export default DailyNoteBadge;
