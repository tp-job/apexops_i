import { createContext, useContext } from 'react';

/**
 * Wiring that `Field` hands down to whatever control it wraps.
 *
 * Split into its own file so `Field.tsx` exports only a component — a file that
 * mixes component and non-component exports breaks Fast Refresh for it
 * (`react-refresh/only-export-components`), the same reason `auth-context.ts`
 * is split from `AuthContext.tsx`.
 */
export interface FieldWiring {
    /** Goes on the control; `Field`'s <label> points its `htmlFor` at this. */
    controlId: string;
    /** Space-joined ids of the hint and/or error text, or undefined when neither exists. */
    describedBy: string | undefined;
    /** True when the field is showing an error — controls both styling and `aria-invalid`. */
    invalid: boolean;
    required: boolean;
}

export const FieldContext = createContext<FieldWiring | null>(null);

/**
 * Read the surrounding `Field`'s wiring.
 *
 * Returns `null` outside a `Field` rather than throwing: a bare `<Input>` with a
 * caller-supplied `id` and `aria-label` is a legitimate use (search boxes, inline
 * filters), so standing alone must not be an error.
 */
export function useFieldWiring(): FieldWiring | null {
    return useContext(FieldContext);
}
