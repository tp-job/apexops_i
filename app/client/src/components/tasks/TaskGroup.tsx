import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/components/design-system';
import { stagger } from '@/lib/motion';

/**
 * A labelled run of task rows — **a heading, not a card**.
 *
 * These were two `Surface` panels side by side before the todos moved into a
 * single column beside the note. Inside a card, a card holding a card is one
 * frame too many: the eye reads three nested borders before it reaches a
 * checkbox. The group separates its rows using type instead of chrome.
 */
export interface TaskGroupProps {
    title: string;
    count: number;
    emptyLabel: string;
    children: ReactNode;
}

const TaskGroup: FC<TaskGroupProps> = ({ title, count, emptyLabel, children }) => (
    <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {title}
            </h3>
            <Badge tone="neutral">{count}</Badge>
        </div>
        {count === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-white/10 dark:text-gray-500">
                {emptyLabel}
            </p>
        ) : (
            <motion.ul variants={stagger(0.03)} initial="hidden" animate="show" className="flex flex-col gap-2.5">
                {children}
            </motion.ul>
        )}
    </section>
);

export default TaskGroup;
