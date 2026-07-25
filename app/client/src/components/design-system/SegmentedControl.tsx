import { type FC, type ReactNode, useId } from 'react';
import { motion } from 'motion/react';
import { SPRING } from '@/lib/motion';

export interface Segment {
    value: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}

interface BaseProps {
    segments: Segment[];
    size?: 'sm' | 'md';
    /** Stretch each segment to equal width. */
    fullWidth?: boolean;
    className?: string;
}

interface SingleProps extends BaseProps {
    multiple?: false;
    value: string;
    onChange: (value: string) => void;
    maxSelected?: never;
}

interface MultipleProps extends BaseProps {
    multiple: true;
    value: string[];
    onChange: (value: string[]) => void;
    /** Cap on simultaneous selections (e.g. "maximum 2 overlaps"). */
    maxSelected?: number;
}

type SegmentedControlProps = SingleProps | MultipleProps;

const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
} as const;

/**
 * Exclusive (or capped-multiple) option switch — chart types, view modes,
 * density toggles. `PillTabs` navigates between destinations; this one
 * changes how the *current* view renders.
 *
 * At the `maxSelected` cap the unselected segments disable rather than
 * silently evicting the oldest choice — the user stays in control of the
 * trade, and the cap is discoverable instead of surprising.
 */
const SegmentedControl: FC<SegmentedControlProps> = (props) => {
    const { segments, size = 'md', fullWidth = false, className = '' } = props;
    const layoutId = useId();

    const selected = props.multiple ? props.value : [props.value];
    const atCap =
        props.multiple &&
        props.maxSelected !== undefined &&
        selected.length >= props.maxSelected;

    const toggle = (value: string) => {
        if (props.multiple) {
            const next = selected.includes(value)
                ? selected.filter((v) => v !== value)
                : [...selected, value];
            props.onChange(next);
        } else {
            props.onChange(value);
        }
    };

    return (
        <div
            role={props.multiple ? 'group' : 'radiogroup'}
            className={`inline-flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
        >
            {segments.map((segment) => {
                const isSelected = selected.includes(segment.value);
                const blockedByCap = Boolean(atCap) && !isSelected;
                const disabled = segment.disabled || blockedByCap;

                return (
                    <button
                        key={segment.value}
                        type="button"
                        role={props.multiple ? 'checkbox' : 'radio'}
                        aria-checked={isSelected}
                        disabled={disabled}
                        onClick={() => !disabled && toggle(segment.value)}
                        className={`relative inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:focus-visible:ring-brand-accent/50 ${sizes[size]} ${fullWidth ? 'flex-1' : ''} ${
                            isSelected
                                ? 'text-brand-dark dark:text-brand-dark'
                                : disabled
                                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white cursor-pointer'
                        }`}
                    >
                        {isSelected && (
                            <motion.span
                                aria-hidden
                                // Single-select slides one pill; multi-select fades each in place.
                                layoutId={props.multiple ? undefined : `segmented-${layoutId}`}
                                initial={props.multiple ? { opacity: 0, scale: 0.9 } : false}
                                animate={props.multiple ? { opacity: 1, scale: 1 } : undefined}
                                transition={SPRING}
                                className="absolute inset-0 rounded-xl bg-brand-accent"
                            />
                        )}
                        <span className="relative inline-flex items-center gap-2">
                            {segment.icon}
                            {segment.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedControl;
