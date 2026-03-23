import type { Dayjs } from 'dayjs';

export interface CalendarCell {
    day: number;
    current: boolean;
    dateKey: string;
}

/**
 * Build a 6×7 grid of calendar cells for the given month (ISO weekday: Mon = 1).
 */
export function getCalendarGridCells(month: Dayjs): CalendarCell[] {
    const start = month.startOf('month');
    const startWeekday = start.day();
    const offset = startWeekday === 0 ? 6 : startWeekday - 1;
    const daysInMonth = month.daysInMonth();
    const prevMonth = month.subtract(1, 'month');
    const prevDays = prevMonth.daysInMonth();
    const cells: CalendarCell[] = [];
    for (let i = 0; i < offset; i++) {
        const d = prevDays - offset + 1 + i;
        cells.push({ day: d, current: false, dateKey: prevMonth.date(d).format('YYYY-MM-DD') });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        cells.push({ day: i, current: true, dateKey: month.date(i).format('YYYY-MM-DD') });
    }
    const remaining = 42 - cells.length;
    const nextMonth = month.add(1, 'month');
    for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, current: false, dateKey: nextMonth.date(i).format('YYYY-MM-DD') });
    }
    return cells.slice(0, 42);
}
