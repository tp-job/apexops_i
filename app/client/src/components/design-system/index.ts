/**
 * ApexOps Design System v2 "Luxe"
 * Import primitives from a single entry point: `@/components/design-system`.
 */
export { default as Surface } from './Surface';
export { default as StatTile } from './StatTile';
export { default as AnimatedNumber } from './AnimatedNumber';
export { default as Meter } from './Meter';
export { default as AccentButton } from './AccentButton';
export { default as Badge } from './Badge';

// Re-export the existing layout primitives so the system has one door.
export { PageHeader, GlassPanel, KpiCard, PillTabs } from '@/components/common/layout';
