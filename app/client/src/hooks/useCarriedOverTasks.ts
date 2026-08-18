import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTasks, taskDayAnchor, updateTask, type MasterTask } from '@/services/tasks';

/**
 * Open tasks planned for a day *earlier* than the one on screen (EC-11).
 *
 * Deliberately a separate hook from `useDailyTodos` rather than another field on
 * it. The day's own todos and the backlog behind it have different lifecycles:
 * the day list is written through a whole-array reconcile, while these belong to
 * other days and may only ever be ticked or moved. Folding them into the same
 * state would put rows into the array that the day reconcile would then try to
 * own — and quietly delete, because they are not in the day it is writing.
 *
 * Nothing here carries anything over on its own. Moving is an explicit call.
 */
export interface UseCarriedOverTasks {
    tasks: MasterTask[];
    loading: boolean;
    busy: boolean;
    refresh: () => Promise<void>;
    toggle: (task: MasterTask) => Promise<void>;
    moveToDay: (task: MasterTask) => Promise<void>;
}

export function useCarriedOverTasks(dayKey: string, enabled = true): UseCarriedOverTasks {
    const [tasks, setTasks] = useState<MasterTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    /** Drops a response for a day the user has already navigated away from. */
    const seq = useRef(0);

    const refresh = useCallback(async () => {
        if (!enabled) {
            setTasks([]);
            return;
        }
        const mine = ++seq.current;
        setLoading(true);
        try {
            // `to` is exclusive, so the day itself is excluded — this is strictly
            // what came *before* the day on screen.
            const page = await fetchTasks({ status: 'open', to: `${dayKey}T00:00:00.000Z`, limit: 50 });
            if (mine !== seq.current) return;
            setTasks(page.todos);
        } catch {
            // A backlog that fails to load must not take the day down with it.
            if (mine === seq.current) setTasks([]);
        } finally {
            if (mine === seq.current) setLoading(false);
        }
    }, [dayKey, enabled]);

    useEffect(() => { void refresh(); }, [refresh]);

    const mutate = useCallback(
        async (fn: () => Promise<unknown>) => {
            setBusy(true);
            try {
                await fn();
                await refresh();
            } finally {
                setBusy(false);
            }
        },
        [refresh],
    );

    const toggle = useCallback(
        (task: MasterTask) => mutate(() => updateTask(task.taskId, { isDone: !task.checked })),
        [mutate],
    );

    /**
     * Re-plan the task for the day on screen. **This is the only thing that ever
     * changes a task's day**, and it happens because someone pressed a button.
     */
    const moveToDay = useCallback(
        (task: MasterTask) => mutate(() => updateTask(task.taskId, { scheduledFor: taskDayAnchor(dayKey) })),
        [mutate, dayKey],
    );

    return { tasks, loading, busy, refresh, toggle, moveToDay };
}
