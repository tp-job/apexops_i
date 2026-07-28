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

// Form kit — grown in Sprint 2 with the project settings screen (Checkbox, Switch).
// Select, Textarea, RadioGroup, FormActions and useFormState are STILL UNBUILT —
// price them in before estimating any form-heavy screen.
// Status table: .agents/docs/planning/sprint-plan.md
export { default as Field } from './Field';
export { default as Input } from './Input';
export { default as Checkbox } from './Checkbox';
export { default as Switch } from './Switch';
export { useFieldWiring } from './field-context';
export type { FieldWiring } from './field-context';

// Data-surface kit — one table for every list surface. Sorting and paging are
// server-side; these components reflect state, they do not own it.
export { default as DataTable } from './DataTable';
export { default as Pagination } from './Pagination';
export { default as Skeleton, SkeletonText } from './Skeleton';
export type { Column, DataTableProps, SortDirection } from './DataTable';

// Overlay kit — Radix owns focus management (see Modal.tsx for why).
// ConfirmDialog is required before any destructive action ships.
export { default as Modal } from './Modal';
export { default as ConfirmDialog } from './ConfirmDialog';

// Composition primitives harvested from the `.agents/template` references.
// See .agents/docs/guides/template-adoption.md for the mapping.
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
