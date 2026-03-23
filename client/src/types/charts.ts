/**
 * Shared types for chart components (Recharts tooltips etc.).
 */

export interface RechartsTooltipPayloadItem<T = unknown> {
    name?: string;
    value?: string | number;
    dataKey?: string;
    color?: string;
    payload?: T;
}

export interface RechartsTooltipProps<T = unknown> {
    active?: boolean;
    payload?: RechartsTooltipPayloadItem<T>[];
    label?: string;
}
