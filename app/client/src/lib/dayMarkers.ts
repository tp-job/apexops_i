/**
 * The spoken half of a day cell's markers (F007).
 *
 * Lives beside `components/calendar/DayMarkers.tsx` rather than inside it only
 * because a component file may not also export functions — fast refresh needs
 * one or the other. **Change the marks and change this in the same edit:** the
 * usual failure is a marker added to the render and forgotten in the label, so
 * the picture and the sentence stop agreeing and only sighted users notice.
 */
export const describeDay = (notes: number, tasks: number, events: number): string => {
    const parts: string[] = [];
    if (notes > 0) parts.push(`${notes} note${notes === 1 ? '' : 's'}`);
    if (tasks > 0) parts.push(`${tasks} task${tasks === 1 ? '' : 's'}`);
    if (events > 0) parts.push(`${events} event${events === 1 ? '' : 's'}`);
    return parts.length ? parts.join(', ') : 'nothing planned';
};
