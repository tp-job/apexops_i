import type { FC, ReactNode, SelectHTMLAttributes } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { useFieldWiring } from './field-context';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'ref' | 'size' | 'children'> {
    options: SelectOption[];
    /**
     * Rendered as a disabled first option when the value is empty. Not a
     * selectable value — a placeholder that can be chosen is a null the form has
     * to validate away later.
     */
    placeholder?: string;
    /** Decorative glyph on the left. Not announced — the label carries the meaning. */
    icon?: ReactNode;
    /** `sm` for inline row controls (a role picker in a table), `md` for forms. */
    size?: 'sm' | 'md';
}

const base =
    'w-full appearance-none rounded-xl border bg-white/70 text-sm text-brand-dark transition-colors ' +
    'outline-none ' +
    'dark:bg-white/5 dark:text-white ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

const tone = {
    normal:
        'border-gray-200 focus-visible:border-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/25 ' +
        'dark:border-white/10 dark:focus-visible:border-brand-accent dark:focus-visible:ring-brand-accent/30',
    invalid:
        'border-global-red/70 focus-visible:border-global-red focus-visible:ring-2 focus-visible:ring-global-red/25 ' +
        'dark:border-global-red/60',
};

/**
 * The system's select.
 *
 * **Native `<select>`, not a Radix listbox** — a deliberate departure from the
 * overlay kit, where the dependency earns its place. Every use this primitive
 * exists for is a two-or-three option enum (role, priority, status), and native
 * brings the platform picker on touch, type-ahead on keyboard, and screen-reader
 * support that is correct by construction rather than by our re-implementation.
 * A custom listbox would be more code and less accessible. Reach for Radix only
 * when an option needs to render richer than a string.
 *
 * Takes its `id`, `aria-describedby`, `aria-invalid` and `aria-required` from the
 * surrounding `Field`, exactly as `Input` does — that wiring is why `Field`
 * exists, and letting callers pass it here would let it drift. Standalone it
 * falls back to the caller's own `id`/`aria-*`.
 *
 * The chevron is `pointer-events-none` so the whole control stays one click
 * target; the arrow is decoration, not a second button.
 */
const Select: FC<SelectProps> = ({
    options,
    placeholder,
    icon,
    size = 'md',
    className = '',
    id,
    value,
    ...rest
}) => {
    const field = useFieldWiring();
    const invalid = field?.invalid ?? false;

    const pad =
        size === 'sm'
            ? `${icon ? 'pl-8' : 'pl-2.5'} pr-8 py-1.5 text-[13px]`
            : `${icon ? 'pl-10' : 'pl-3.5'} pr-10 py-2.5`;

    return (
        <div className="relative">
            {icon && (
                <span
                    className={`pointer-events-none absolute inset-y-0 ${
                        size === 'sm' ? 'left-2.5' : 'left-3'
                    } grid place-items-center text-gray-400 dark:text-gray-500`}
                    aria-hidden
                >
                    {icon}
                </span>
            )}

            <select
                id={field?.controlId ?? id}
                value={value}
                aria-describedby={field?.describedBy}
                aria-invalid={invalid || undefined}
                aria-required={field?.required || undefined}
                className={`${base} ${invalid ? tone.invalid : tone.normal} ${pad} ${className}`.trim()}
                {...rest}
            >
                {placeholder && (
                    // `disabled` as well as hidden: a placeholder that can be
                    // re-selected is an empty value the form has to defend against
                    // on every submit.
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                    </option>
                ))}
            </select>

            <span
                className={`pointer-events-none absolute inset-y-0 ${
                    size === 'sm' ? 'right-2' : 'right-3'
                } grid place-items-center text-gray-400 dark:text-gray-500`}
                aria-hidden
            >
                <FiChevronDown size={size === 'sm' ? 14 : 16} />
            </span>
        </div>
    );
};

export default Select;
