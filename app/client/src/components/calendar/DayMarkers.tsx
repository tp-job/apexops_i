import type { FC } from 'react';

/**
 * What a day holds, at a glance (blueprint F007).
 *
 * **Shape carries the meaning, not colour.** Around one man in twelve cannot
 * separate red from green reliably, and a legend of three coloured dots is
 * exactly the pattern that fails for them — so the note is a **circle**, the
 * task a **triangle** and the event a **square**. Colour is still applied, but
 * only as reinforcement; remove it entirely and the marks stay distinguishable.
 *
 * The spoken equivalent lives in `lib/dayMarkers.ts` (`describeDay`) — a
 * component file may not also export functions. Keep the two in step.
 *
 * Counts are announced rather than drawn as N marks: eleven dots in a 76px cell
 * is noise, and "3 tasks" is the thing the reader actually wants. Assistive tech
 * gets the same sentence through the cell's `aria-label`, so this element is
 * `aria-hidden` and carries no duplicate text.
 */
export interface DayMarkersProps {
    notes: number;
    tasks: number;
    events: number;
}

/** One mark per *kind present*, never one per item. */
const DayMarkers: FC<DayMarkersProps> = ({ notes, tasks, events }) => {
    if (notes === 0 && tasks === 0 && events === 0) return null;

    return (
        <span className="mt-auto flex items-center gap-1" aria-hidden>
            {notes > 0 && (
                // Circle — a note.
                <span className="h-1.5 w-1.5 rounded-full bg-brand-steel dark:bg-gray-400" />
            )}
            {tasks > 0 && (
                // Triangle — a task. Drawn with borders so it needs no asset.
                <span
                    className="h-0 w-0 border-x-[3px] border-b-[5px] border-x-transparent border-b-global-green"
                    style={{ borderTopWidth: 0 }}
                />
            )}
            {events > 0 && (
                // Square — an appointment.
                <span className="h-1.5 w-1.5 rounded-[1px] bg-global-blue" />
            )}
        </span>
    );
};

export default DayMarkers;
