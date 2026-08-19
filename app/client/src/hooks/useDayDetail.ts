import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDay, type DayDetail, type DayTask } from '@/services/day';
import { updateTask } from '@/services/tasks';

/**
 * The composed day behind the detail panel (blueprint US-07).
 *
 * One request per opened day, and a sequence guard so a slow response for a day
 * the user has already clicked away from cannot overwrite the one on screen —
 * clicking across a month is exactly the pattern that produces out-of-order
 * responses.
 *
 * Writes are not optimistic here. The panel is a *read* of three collections
 * that other surfaces own; patching one of them in place would leave this view
 * disagreeing with `/daily` until the next load, which is the class of bug D3
 * exists to prevent. Re-reading the day is one indexed call.
 */
export interface UseDayDetail {
    day: DayDetail | null;
    loading: boolean;
    busy: boolean;
    error: string | null;
    reload: () => Promise<void>;
    toggleTask: (task: DayTask) => Promise<void>;
}

export function useDayDetail(dayKey: string | null): UseDayDetail {
    const [day, setDay] = useState<DayDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const seq = useRef(0);

    const reload = useCallback(async () => {
        if (!dayKey) {
            setDay(null);
            return;
        }
        const mine = ++seq.current;
        setLoading(true);
        setError(null);
        try {
            const detail = await fetchDay(dayKey);
            if (mine !== seq.current) return;
            setDay(detail);
        } catch {
            if (mine !== seq.current) return;
            setError('Could not load that day.');
            setDay(null);
        } finally {
            if (mine === seq.current) setLoading(false);
        }
    }, [dayKey]);

    useEffect(() => { void reload(); }, [reload]);

    const toggleTask = useCallback(
        async (task: DayTask) => {
            setBusy(true);
            try {
                await updateTask(task.taskId, { isDone: !task.checked });
                await reload();
            } catch {
                setError('Could not save that change.');
            } finally {
                setBusy(false);
            }
        },
        [reload],
    );

    return { day, loading, busy, error, reload, toggleTask };
}
