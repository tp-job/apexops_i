import type { FC } from 'react';
import { motion } from 'motion/react';
import { SPRING } from '@/lib/motion';

export interface Person {
    id: string;
    name: string;
    /** Optional photo. Falls back to tokenised initials. */
    src?: string;
}

type Size = 'sm' | 'md' | 'lg';

interface AvatarStackProps {
    people: Person[];
    /** Avatars rendered before collapsing into a "+N" chip. */
    max?: number;
    size?: Size;
    /** Renders the first name (or "N people") beside the stack. */
    showLabel?: boolean;
    className?: string;
}

const sizes: Record<Size, { box: string; text: string; ring: string }> = {
    sm: { box: 'w-6 h-6', text: 'text-[10px]', ring: 'ring-2' },
    md: { box: 'w-8 h-8', text: 'text-xs', ring: 'ring-2' },
    lg: { box: 'w-10 h-10', text: 'text-sm', ring: 'ring-[3px]' },
};

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

/**
 * Overlapping assignee avatars with a "+N" overflow chip.
 *
 * Neutral by design — avatars must never compete with the view's accent.
 * `name` is always exposed via `title` + `alt`, so the stack stays readable
 * to screen readers and on hover without a tooltip dependency.
 */
const AvatarStack: FC<AvatarStackProps> = ({
    people,
    max = 4,
    size = 'md',
    showLabel = false,
    className = '',
}) => {
    if (people.length === 0) return null;

    const { box, text, ring } = sizes[size];
    const shown = people.slice(0, max);
    const overflow = people.length - shown.length;

    const label =
        people.length === 1 ? people[0].name : `${people.length} people`;

    return (
        <div className={`flex items-center gap-3 ${className}`.trim()}>
            <div className="flex -space-x-2" role="group" aria-label={`Assignees: ${people.map((p) => p.name).join(', ')}`}>
                {shown.map((person) => (
                    <motion.span
                        key={person.id}
                        whileHover={{ y: -2, zIndex: 1, transition: SPRING }}
                        title={person.name}
                        className={`${box} ${ring} ring-white dark:ring-brand-nearBlack2 rounded-full overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-semibold ${text} relative`}
                    >
                        {person.src ? (
                            <img
                                src={person.src}
                                alt={person.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            initials(person.name)
                        )}
                    </motion.span>
                ))}

                {overflow > 0 && (
                    <span
                        title={people.slice(max).map((p) => p.name).join(', ')}
                        className={`${box} ${ring} ring-white dark:ring-brand-nearBlack2 rounded-full flex items-center justify-center bg-brand-dark text-white dark:bg-white dark:text-brand-dark font-semibold font-numbers ${text}`}
                    >
                        +{overflow}
                    </span>
                )}
            </div>

            {showLabel && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</span>
            )}
        </div>
    );
};

export default AvatarStack;
