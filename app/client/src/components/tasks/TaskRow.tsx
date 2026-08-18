import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import dayjs from 'dayjs';
import { FiArrowDown, FiArrowUp, FiTrash2 } from 'react-icons/fi';
import { Checkbox, Input, Surface } from '@/components/design-system';
import type { DailyTodo } from '@/lib/dailyTodos';
import { fadeUp } from '@/lib/motion';

/**
 * One task row, shared by `/daily` and the master list.
 *
 * It used to live inside `DailyNote.tsx`. Moving it here is not tidying: the
 * master list shows the same object with the same affordances, and a second copy
 * would drift — one of them would grow a fix the other never got, and a checkbox
 * that behaves differently depending on which page you tick it from is a bug
 * report nobody can reproduce.
 *
 * The two surfaces differ in exactly two ways, so those are the only props that
 * vary: reordering makes sense within a day and not across a filtered list, and
 * the master list needs to say *which* day a task belongs to. Everything else —
 * inline rename, the done styling, the delete affordance — is identical on
 * purpose.
 */
export interface TaskRowProps {
    todo: DailyTodo;
    readOnly: boolean;
    onToggle: () => void;
    onRename: (text: string) => void;
    onRemove: () => void;
    /** Omitted by the master list: order is only meaningful within one day. */
    onMove?: (direction: 'up' | 'down') => void;
    /** Extra line under the title — the master list puts the date and status here. */
    meta?: ReactNode;
    /**
     * Row-level controls rendered before Delete — the master list puts
     * rescheduling here. Kept as a slot rather than a `onReschedule` prop so this
     * component stays ignorant of what a surface wants to offer; it owns the row,
     * not the feature set.
     */
    actions?: ReactNode;
}

const TaskRow: FC<TaskRowProps> = ({ todo, readOnly, onToggle, onRename, onRemove, onMove, meta, actions }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(todo.text);

    // A rename that lost its race with a refetch would otherwise keep showing the
    // stale text in the editor.
    useEffect(() => setDraft(todo.text), [todo.text]);

    const commit = () => {
        setEditing(false);
        if (draft.trim() && draft.trim() !== todo.text) onRename(draft);
        else setDraft(todo.text);
    };

    return (
        <motion.li variants={fadeUp} layout>
            <Surface variant="frost" radius="2xl" padding="sm">
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={todo.checked}
                        disabled={readOnly}
                        onChange={onToggle}
                        aria-label={todo.checked ? `Mark "${todo.text}" as not done` : `Mark "${todo.text}" as done`}
                        className="mt-0.5"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {editing ? (
                            <Input
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={commit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commit();
                                    if (e.key === 'Escape') { setDraft(todo.text); setEditing(false); }
                                }}
                                aria-label={`Rename "${todo.text}"`}
                            />
                        ) : (
                            <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => setEditing(true)}
                                title="Click to rename"
                                className={[
                                    'text-left text-sm font-medium transition-colors disabled:cursor-default',
                                    todo.checked
                                        ? 'text-gray-400 line-through dark:text-gray-500'
                                        : 'text-brand-dark hover:text-gray-600 dark:text-white dark:hover:text-gray-300',
                                ].join(' ')}
                            >
                                {todo.text}
                            </button>
                        )}

                        {meta}

                        {todo.checked && todo.completedAt && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                done {dayjs(todo.completedAt).format('HH:mm')}
                            </span>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                        {actions}
                        {onMove && (
                            <>
                                <button
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => onMove('up')}
                                    aria-label={`Move "${todo.text}" up`}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <FiArrowUp size={13} />
                                </button>
                                <button
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => onMove('down')}
                                    aria-label={`Move "${todo.text}" down`}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <FiArrowDown size={13} />
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={onRemove}
                            aria-label={`Delete "${todo.text}"`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-global-red/10 hover:text-global-red disabled:opacity-40"
                        >
                            <FiTrash2 size={13} />
                        </button>
                    </div>
                </div>
            </Surface>
        </motion.li>
    );
};

export default TaskRow;
