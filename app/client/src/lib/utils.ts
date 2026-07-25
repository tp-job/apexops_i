import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional class lists and resolves Tailwind conflicts. Required by shadcn/ui components. */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
