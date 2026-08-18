import type { FC } from 'react';
import { useState } from 'react';
import dayjs from 'dayjs';
import { FiPlus } from 'react-icons/fi';
import { AccentButton, Input } from '@/components/design-system';

/**
 * Add one task, from the master list (blueprint US-06).
 *
 * Tasks could only be *created* on the daily page, which meant the one screen
 * that shows everything you have planned could not add to it — you had to
 * navigate to a specific day first, and pick the right one. The list that
 * answers "what is open?" should also be able to answer it with one more item.
 *
 * **A day is chosen, never assumed silently.** It defaults to today because that
 * is what most additions mean, but the field is visible and editable, so filing
 * something for Friday does not require a detour through Friday.
 */
export interface TaskComposerProps {
    /** Resolves with true when the task was stored, so the field can clear. */
    onAdd: (text: string, dayKey: string) => Promise<boolean>;
    disabled?: boolean;
}

const TaskComposer: FC<TaskComposerProps> = ({ onAdd, disabled }) => {
    const [text, setText] = useState('');
    const [dayKey, setDayKey] = useState(() => dayjs().format('YYYY-MM-DD'));
    const [saving, setSaving] = useState(false);

    const trimmed = text.trim();
    const blocked = disabled || saving || !trimmed;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (blocked) return;
        setSaving(true);
        try {
            // The text clears only on a confirmed write. Clearing optimistically
            // and then failing loses what the person typed, and they have no way
            // to get it back.
            if (await onAdd(trimmed, dayKey)) setText('');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
            <div className="min-w-[14rem] flex-1">
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a task…"
                    aria-label="New task"
                    disabled={disabled || saving}
                />
            </div>

            <input
                type="date"
                value={dayKey}
                onChange={(e) => setDayKey(e.target.value)}
                aria-label="Day this task is planned for"
                disabled={disabled || saving}
                className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2 font-numbers text-sm text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/25 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:ring-brand-accent/30"
            />

            <AccentButton type="submit" size="sm" icon={<FiPlus size={14} />} disabled={blocked}>
                {saving ? 'Adding…' : 'Add'}
            </AccentButton>
        </form>
    );
};

export default TaskComposer;
