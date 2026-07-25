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

// Composition primitives harvested from the `.agents/template` references.
// See .agents/docs/frontend/template-adoption.md for the mapping.
export { default as Timeline } from './Timeline';
export { default as Stepper } from './Stepper';
export { default as AvatarStack } from './AvatarStack';
export { default as SegmentedControl } from './SegmentedControl';
export { default as EmptyState } from './EmptyState';
export { default as GanttTrack } from './GanttTrack';

export type { TimelineItem } from './Timeline';
export type { Step } from './Stepper';
export type { Person } from './AvatarStack';
export type { Segment } from './SegmentedControl';
export type { GanttBar } from './GanttTrack';

// Re-export the existing layout primitives so the system has one door.
export { PageHeader, GlassPanel, KpiCard, PillTabs } from '@/components/common/layout';
