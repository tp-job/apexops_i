import type { FC } from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import {
    FiActivity,
    FiTrendingUp,
    FiZap,
    FiArrowUpRight,
    FiPlus,
    FiDownload,
    FiLayers,
    FiDroplet,
    FiType,
    FiBox,
    FiGrid,
    FiEye,
    FiCheckCircle,
    FiPaperclip,
} from 'react-icons/fi';
import {
    Surface,
    StatTile,
    Meter,
    AccentButton,
    Badge,
    AnimatedNumber,
    Timeline,
    Stepper,
    AvatarStack,
    SegmentedControl,
    EmptyState,
    GanttTrack,
    type GanttBar,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { fadeUp, scaleIn, stagger, inViewOnce } from '@/lib/motion';

// ── Section wrapper ───────────────────────────────────────────
const Section: FC<{ id: string; icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
    icon,
    title,
    children,
}) => (
    <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="flex flex-col gap-5"
    >
        <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent flex items-center justify-center">
                {icon}
            </span>
            <h2 className="text-xl font-bold font-heading text-brand-dark dark:text-white">{title}</h2>
        </div>
        {children}
    </motion.section>
);

const Swatch: FC<{ name: string; hex: string; className: string; dark?: boolean }> = ({
    name,
    hex,
    className,
    dark,
}) => (
    <div className="flex flex-col gap-2">
        <div className={`h-20 rounded-2xl ds-elev-1 ${className} ${dark ? '' : 'border border-black/5'}`} />
        <div>
            <p className="text-sm font-semibold text-brand-dark dark:text-white">{name}</p>
            <p className="text-xs font-numbers text-gray-400">{hex}</p>
        </div>
    </div>
);

const TypeRow: FC<{ label: string; cls: string; sample: string }> = ({ label, cls, sample }) => (
    <div className="flex items-baseline justify-between gap-6 py-3 border-b border-black/5 dark:border-white/10">
        <span className={`${cls} text-brand-dark dark:text-white`}>{sample}</span>
        <span className="text-xs font-numbers text-gray-400 whitespace-nowrap">{label}</span>
    </div>
);

const GANTT_BARS: GanttBar[] = [
    { id: 'g1', label: 'Discovery & research', start: '2024-12-02', end: '2025-01-10', progress: 100, tone: 'neutral', done: true },
    { id: 'g2', label: 'Design system v2', start: '2024-12-20', end: '2025-02-14', progress: 80, tone: 'accent' },
    { id: 'g3', label: 'Invoices rebuild', start: '2025-01-15', end: '2025-03-05', progress: 45, tone: 'dark' },
    { id: 'g4', label: 'Bug tracker port', start: '2025-02-10', end: '2025-04-20', progress: 10, tone: 'neutral' },
];

const DesignSystem: FC = () => {
    const [meter, setMeter] = useState(72);
    const [step, setStep] = useState(2);
    const [range, setRange] = useState('month');
    const [charts, setCharts] = useState<string[]>(['column', 'scatter']);
    const [showDone, setShowDone] = useState('show');

    return (
        <div className="flex flex-col gap-10 pb-16 max-w-[1400px] mx-auto w-full">
            {/* Hero */}
            <motion.div variants={scaleIn} initial="hidden" animate="show">
                <Surface variant="frost" radius="3xl" padding="lg" className="ds-mesh relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <Badge tone="accent">Design System · v2</Badge>
                            <h1 className="mt-3 text-5xl font-bold font-heading text-brand-dark dark:text-white tracking-tight">
                                ApexOps <span className="text-brand-accent">Luxe</span>
                            </h1>
                            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg">
                                A high-end, cutting-edge system built on the Invoices template.
                                Neutral + lime, layered glass, monospaced numbers, and one
                                signature motion curve.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <AccentButton icon={<FiZap className="w-4 h-4" />}>Get started</AccentButton>
                            <AccentButton variant="ghost" icon={<FiDownload className="w-4 h-4" />}>
                                Tokens
                            </AccentButton>
                        </div>
                    </div>
                </Surface>
            </motion.div>

            <PageHeader title="Foundations" subtitle="Tokens, type, surfaces, motion & components" />

            {/* Colour */}
            <Section id="color" icon={<FiDroplet className="w-4 h-4" />} title="Colour">
                <Surface variant="panel" padding="md">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
                        <Swatch name="Accent" hex="#C5F43A" className="bg-brand-accent" />
                        <Swatch name="Dark" hex="#222222" className="bg-brand-dark" dark />
                        <Swatch name="Near Black" hex="#141414" className="bg-brand-nearBlack" dark />
                        <Swatch name="Steel" hex="#9CB3C4" className="bg-brand-steel" />
                        <Swatch name="Gray" hex="#F3F4F6" className="bg-brand-gray" />
                        <Swatch name="Glass" hex="rgba 255·.6" className="glass-panel" />
                    </div>
                </Surface>
            </Section>

            {/* Typography */}
            <Section id="type" icon={<FiType className="w-4 h-4" />} title="Typography">
                <Surface variant="panel" padding="md">
                    <TypeRow label="DM Sans · 48 · bold" cls="text-5xl font-bold font-heading" sample="Invoices" />
                    <TypeRow label="Numbers · JetBrains Mono" cls="text-3xl font-bold font-numbers" sample="$31,211.00" />
                    <TypeRow label="Card head · DM Sans · xl" cls="text-xl font-bold font-heading" sample="BlueRock" />
                    <TypeRow label="Body · Inter · sm" cls="text-sm font-medium font-body" sample="How to interpret failures and recover safely." />
                    <TypeRow label="Nano · uppercase tracked" cls="text-[10px] uppercase tracking-wider font-semibold" sample="Unsent" />
                </Surface>
            </Section>

            {/* Surfaces */}
            <Section id="surfaces" icon={<FiLayers className="w-4 h-4" />} title="Surfaces">
                <motion.div
                    variants={stagger()}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <Surface variant="frost" reveal interactive radius="2xl" className="h-32 flex items-end">
                        <span className="text-sm font-semibold text-brand-dark dark:text-white">Frost</span>
                    </Surface>
                    <Surface variant="panel" reveal interactive radius="2xl" className="h-32 flex items-end">
                        <span className="text-sm font-semibold text-brand-dark dark:text-white">Panel</span>
                    </Surface>
                    <Surface variant="dark" reveal interactive radius="2xl" className="h-32 flex items-end">
                        <span className="text-sm font-semibold">Dark</span>
                    </Surface>
                    <Surface variant="blue" reveal interactive radius="2xl" className="h-32 flex items-end">
                        <span className="text-sm font-semibold">Blue</span>
                    </Surface>
                </motion.div>
            </Section>

            {/* Components */}
            <Section id="components" icon={<FiBox className="w-4 h-4" />} title="Components">
                {/* Stat tiles */}
                <motion.div
                    variants={stagger()}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <StatTile label="Overdue" value={31211} prefix="$" decimals={2} trend={-4} icon={<FiActivity className="w-5 h-5" />} />
                    <StatTile label="Instant payout" value={214390} prefix="$" decimals={2} trend={12} icon={<FiTrendingUp className="w-5 h-5" />} />
                    <StatTile label="Avg. days to pay" value={12} suffix="days" icon={<FiArrowUpRight className="w-5 h-5" />} />
                    <StatTile label="Gross profit" value={177349} prefix="$" decimals={2} variant="accent" />
                </motion.div>

                {/* Buttons + badges + meter */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Buttons</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <AccentButton icon={<FiPlus className="w-4 h-4" />}>Create an invoice</AccentButton>
                            <AccentButton variant="dark">Pay out now</AccentButton>
                            <AccentButton variant="ghost">Cancel</AccentButton>
                            <AccentButton variant="accent" size="sm">Small</AccentButton>
                        </div>
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mt-2">Badges</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="accent">Active</Badge>
                            <Badge tone="solid">Unsent</Badge>
                            <Badge tone="neutral">Draft</Badge>
                            <Badge tone="outline">Viewed</Badge>
                        </div>
                    </Surface>

                    <Surface variant="panel" padding="md" className="flex flex-col justify-between gap-6">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                                Meter · glowing knob
                            </p>
                            <span className="font-numbers text-lg font-bold text-brand-dark dark:text-white">
                                <AnimatedNumber value={meter} />%
                            </span>
                        </div>
                        <Meter value={meter} />
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={meter}
                            onChange={(e) => setMeter(Number(e.target.value))}
                            className="w-full accent-brand-accent"
                        />
                    </Surface>
                </div>
            </Section>

            {/* ── Composition primitives (from .agents/template) ────────── */}
            <Section id="composition" icon={<FiGrid className="w-4 h-4" />} title="Composition">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            Timeline · activity feed
                        </p>
                        <Timeline
                            items={[
                                { id: 'a', title: 'Invoice created', meta: 'by Kamil Bachanek', timestamp: '09:41', icon: <FiPlus className="w-3.5 h-3.5" />, tone: 'accent' },
                                { id: 'b', title: 'Viewed by client', meta: 'Lost Island AB', timestamp: '11:02', icon: <FiEye className="w-3.5 h-3.5" /> },
                                { id: 'c', title: 'Reminder sent', meta: 'Automatic · 7 days overdue', timestamp: 'Mar 26' },
                                { id: 'd', title: 'Payment received', meta: '$31,211.00 via Stripe', timestamp: 'Mar 28', icon: <FiCheckCircle className="w-3.5 h-3.5" />, tone: 'positive' },
                            ]}
                        />
                    </Surface>

                    <Surface variant="panel" padding="md" className="flex flex-col gap-6">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                                Stepper · stage progress
                            </p>
                            <AvatarStack
                                people={[
                                    { id: '1', name: 'Clair Burge' },
                                    { id: '2', name: 'Christian Bass' },
                                    { id: '3', name: 'Craig Curry' },
                                    { id: '4', name: 'Brandon Crawford' },
                                    { id: '5', name: 'Helna Julie' },
                                ]}
                                max={3}
                                size="sm"
                            />
                        </div>

                        <Stepper
                            steps={[
                                { id: 'info', label: 'Task info', hint: 'Title & description' },
                                { id: 'assign', label: 'Assignment', hint: 'Team & priority' },
                                { id: 'subtasks', label: 'Subtasks', hint: 'Breakdown steps' },
                                { id: 'schedule', label: 'Schedule', hint: 'Dates & reminders' },
                                { id: 'done', label: 'Completion', hint: 'Preview' },
                            ]}
                            current={step}
                            onStepClick={(i) => setStep(i)}
                        />

                        <div className="flex items-center gap-3">
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep((s) => Math.max(0, s - 1))}
                            >
                                Back
                            </AccentButton>
                            <AccentButton
                                variant="dark"
                                size="sm"
                                onClick={() => setStep((s) => Math.min(4, s + 1))}
                            >
                                Next step
                            </AccentButton>
                        </div>
                    </Surface>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            SegmentedControl · exclusive & capped-multiple
                        </p>
                        <SegmentedControl
                            segments={[
                                { value: 'week', label: 'Week' },
                                { value: 'month', label: 'Month' },
                                { value: 'quarter', label: 'Quarter' },
                            ]}
                            value={range}
                            onChange={setRange}
                        />
                        <div className="flex flex-col gap-2">
                            <SegmentedControl
                                multiple
                                maxSelected={2}
                                size="sm"
                                segments={[
                                    { value: 'column', label: 'Column' },
                                    { value: 'scatter', label: 'Scatter' },
                                    { value: 'heatmap', label: 'Heatmap' },
                                    { value: 'boxplot', label: 'Boxplot' },
                                ]}
                                value={charts}
                                onChange={setCharts}
                            />
                            <p className="text-xs text-gray-400">
                                Maximum 2 overlaps — the rest disable at the cap.
                            </p>
                        </div>
                    </Surface>

                    <Surface variant="panel" padding="none" className="flex flex-col justify-center">
                        <EmptyState
                            icon={<FiPaperclip className="w-5 h-5" />}
                            title="No attachments"
                            description="Files added to this invoice will appear here and travel with every reminder you send."
                            action={
                                <AccentButton variant="ghost" size="sm" icon={<FiPlus className="w-4 h-4" />}>
                                    Add a file
                                </AccentButton>
                            }
                        />
                    </Surface>
                </div>

                <Surface variant="panel" padding="md" className="flex flex-col gap-5 overflow-x-auto">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            GanttTrack · long-horizon schedule
                        </p>
                        <SegmentedControl
                            size="sm"
                            segments={[
                                { value: 'hide', label: 'Hide done' },
                                { value: 'show', label: 'Show done' },
                            ]}
                            value={showDone}
                            onChange={setShowDone}
                        />
                    </div>
                    <div className="min-w-[640px]">
                        <GanttTrack
                            bars={GANTT_BARS.filter((b) => showDone === 'show' || !b.done)}
                            rangeStart="2024-12-01"
                            rangeEnd="2025-04-30"
                        />
                    </div>
                </Surface>
            </Section>
        </div>
    );
};

export default DesignSystem;
