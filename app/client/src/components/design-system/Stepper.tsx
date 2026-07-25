import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { FiCheck } from 'react-icons/fi';
import { EASE_LUX, SPRING } from '@/lib/motion';

export interface Step {
    id: string;
    label: string;
    /** Optional second line — the step's promise ("Dates & reminders"). */
    hint?: string;
    icon?: ReactNode;
}

interface StepperProps {
    steps: Step[];
    /** Zero-based index of the step in progress. */
    current: number;
    orientation?: 'horizontal' | 'vertical';
    /** Enables navigation. Steps after `current` stay disabled. */
    onStepClick?: (index: number, step: Step) => void;
    className?: string;
}

type State = 'done' | 'active' | 'todo';

const markerStates: Record<State, string> = {
    done: 'bg-brand-accent text-brand-dark',
    active: 'bg-brand-dark text-white dark:bg-white dark:text-brand-dark',
    todo: 'bg-black/5 dark:bg-white/10 text-gray-400 dark:text-gray-500',
};

const labelStates: Record<State, string> = {
    done: 'text-brand-dark dark:text-white',
    active: 'text-brand-dark dark:text-white',
    todo: 'text-gray-400 dark:text-gray-500',
};

const markerBase =
    'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold font-numbers flex-shrink-0 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:focus-visible:ring-brand-accent/50';

/** Connector that fills with accent once the step behind it is complete. */
const Connector: FC<{ vertical: boolean; filled: boolean }> = ({ vertical, filled }) => (
    <span
        aria-hidden
        className={`relative overflow-hidden bg-gray-200 dark:bg-white/10 ${
            vertical ? 'w-px flex-1 my-1 min-h-8' : 'h-px flex-1 mx-3'
        }`}
    >
        <motion.span
            className={`absolute inset-0 bg-brand-accent ${vertical ? 'origin-top' : 'origin-left'}`}
            initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
            animate={vertical ? { scaleY: filled ? 1 : 0 } : { scaleX: filled ? 1 : 0 }}
            transition={{ duration: 0.4, ease: EASE_LUX }}
        />
    </span>
);

/**
 * Linear stage progress — task creation flows and deal/bug pipelines.
 *
 * Deliberately does not glow: a Stepper is orientation, not the focal CTA.
 * The view's single `ds-glow` belongs to the primary action next to it.
 *
 * Horizontal hides labels below `xl` — at that width the markers alone carry
 * the progress and the labels would truncate to noise. Use `vertical` in rails.
 */
const Stepper: FC<StepperProps> = ({
    steps,
    current,
    orientation = 'horizontal',
    onStepClick,
    className = '',
}) => {
    const vertical = orientation === 'vertical';
    const stateOf = (i: number): State => (i < current ? 'done' : i === current ? 'active' : 'todo');

    const marker = (step: Step, i: number, state: State) => {
        const clickable = Boolean(onStepClick) && i <= current;
        return (
            <motion.button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStepClick?.(i, step) : undefined}
                whileTap={clickable ? { scale: 0.94, transition: SPRING } : undefined}
                className={`${markerBase} ${markerStates[state]} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
                {state === 'done' ? <FiCheck className="w-4 h-4" /> : (step.icon ?? i + 1)}
            </motion.button>
        );
    };

    const label = (step: Step, state: State, extra = '') => (
        <div className={`min-w-0 ${extra}`}>
            <p className={`text-sm font-semibold truncate ${labelStates[state]}`}>{step.label}</p>
            {step.hint && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {step.hint}
                </p>
            )}
        </div>
    );

    return (
        <ol
            className={`flex ${vertical ? 'flex-col' : 'items-start'} ${className}`.trim()}
            aria-label="Progress"
        >
            {steps.map((step, i) => {
                const state = stateOf(i);
                const isLast = i === steps.length - 1;

                if (vertical) {
                    return (
                        <li key={step.id} className="flex gap-4" aria-current={state === 'active' ? 'step' : undefined}>
                            <div className="flex flex-col items-center flex-shrink-0">
                                {marker(step, i, state)}
                                {!isLast && <Connector vertical filled={i < current} />}
                            </div>
                            {label(step, state, isLast ? 'pt-1.5' : 'pt-1.5 pb-6')}
                        </li>
                    );
                }

                return (
                    <li
                        key={step.id}
                        className={`flex flex-col gap-2 min-w-0 ${isLast ? 'flex-shrink-0' : 'flex-1'}`}
                        aria-current={state === 'active' ? 'step' : undefined}
                    >
                        <div className="flex items-center w-full">
                            {marker(step, i, state)}
                            {!isLast && <Connector vertical={false} filled={i < current} />}
                        </div>
                        {label(step, state, 'hidden xl:block')}
                    </li>
                );
            })}
        </ol>
    );
};

export default Stepper;
