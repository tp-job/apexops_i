import type { FC } from 'react';
import { useEffect, useState } from 'react';
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
    FiEdit3,
    FiTag,
    FiMail,
    FiLock,
    FiList,
    FiAlertTriangle,
} from 'react-icons/fi';
import {
    PageHeader,
    Surface,
    GlassPanel,
    KpiCard,
    PillTabs,
    Skeleton,
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
    Field,
    Input,
    Textarea,
    Select,
    Checkbox,
    Switch,
    DataTable,
    Pagination,
    SkeletonText,
    Modal,
    ConfirmDialog,
    ContextMenu,
    useContextMenu,
    type Column,
    type SortDirection,
    type GanttBar,
} from '@/components/design-system';
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

/**
 * The value of a design token, read from the document at runtime.
 *
 * Swatches used to carry a **hand-typed hex** beside the class name — a caption
 * that can disagree with the paint it sits under. On a page whose whole job is to
 * be the reference, a caption that lies is worse than no caption. Reading
 * `--color-*` off `:root` means the label cannot drift from the token.
 *
 * Re-read when the `<html>` class changes: a token can resolve differently per
 * theme, and this page is looked at in both.
 */
function useTokenValue(name: string): string {
    const [value, setValue] = useState('');

    useEffect(() => {
        const read = () =>
            setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
        read();
        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [name]);

    return value;
}

const Swatch: FC<{ name: string; token: string; className: string; dark?: boolean }> = ({
    name,
    token,
    className,
    dark,
}) => {
    const value = useTokenValue(token);
    return (
        <div className="flex flex-col gap-2">
            <div className={`h-20 rounded-2xl ds-elev-1 ${className} ${dark ? '' : 'border border-black/5'}`} />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-dark dark:text-white">{name}</p>
                <p className="truncate text-xs font-numbers text-gray-500 dark:text-gray-400" title={value}>
                    {value || '-'}
                </p>
                <p className="truncate font-mono text-[10px] text-gray-500 dark:text-gray-400" title={token}>
                    {token}
                </p>
            </div>
        </div>
    );
};

const TypeRow: FC<{ label: string; cls: string; sample: string }> = ({ label, cls, sample }) => (
    <div className="flex items-baseline justify-between gap-6 py-3 border-b border-black/5 dark:border-white/10">
        <span className={`${cls} text-brand-dark dark:text-white`}>{sample}</span>
        <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
    </div>
);

const GANTT_BARS: GanttBar[] = [
    { id: 'g1', label: 'Discovery & research', start: '2024-12-02', end: '2025-01-10', progress: 100, tone: 'neutral', done: true },
    { id: 'g2', label: 'Design system v2', start: '2024-12-20', end: '2025-02-14', progress: 80, tone: 'accent' },
    { id: 'g3', label: 'Invoices rebuild', start: '2025-01-15', end: '2025-03-05', progress: 45, tone: 'dark' },
    { id: 'g4', label: 'Bug tracker port', start: '2025-02-10', end: '2025-04-20', progress: 10, tone: 'neutral' },
];

interface DsIssueRow {
    id: number;
    level: string;
    title: string;
    culprit: string;
    count: number;
    lastSeen: string;
}

const DS_ISSUE_ROWS: DsIssueRow[] = [
    { id: 1, level: 'error', title: "Cannot read properties of undefined (reading 'map')", culprit: 'Cart.tsx:88', count: 1284, lastSeen: '2m ago' },
    { id: 2, level: 'error', title: 'User <n> not found', culprit: 'api/users.ts:42', count: 310, lastSeen: '14m ago' },
    { id: 3, level: 'warn', title: 'Deprecated prop `onToggle` used', culprit: 'Switch.tsx:12', count: 96, lastSeen: '1h ago' },
    { id: 4, level: 'error', title: 'NetworkError when attempting to fetch resource', culprit: 'lib/http.ts:7', count: 22, lastSeen: '3h ago' },
];

const dsColumns: Column<DsIssueRow>[] = [
    {
        key: 'level',
        header: 'Level',
        className: 'w-20',
        render: (r) => <Badge tone={r.level === 'error' ? 'accent' : 'neutral'}>{r.level}</Badge>,
    },
    {
        key: 'title',
        header: 'Issue',
        render: (r) => (
            <div className="flex flex-col">
                <span className="font-medium truncate max-w-md">{r.title}</span>
                <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{r.culprit}</span>
            </div>
        ),
    },
    {
        key: 'count',
        header: 'Events',
        sortable: true,
        className: 'w-24 text-right',
        hideOnMobile: true,
        render: (r) => <span className="font-numbers tabular-nums">{r.count.toLocaleString()}</span>,
    },
    {
        key: 'lastSeen',
        header: 'Last seen',
        sortable: true,
        className: 'w-28',
        hideOnMobile: true,
        render: (r) => <span className="text-xs text-gray-500 dark:text-gray-400">{r.lastSeen}</span>,
    },
];

const DesignSystem: FC = () => {
    const [meter, setMeter] = useState(72);
    const [step, setStep] = useState(2);
    const [range, setRange] = useState('month');
    const [charts, setCharts] = useState<string[]>(['column', 'scatter']);
    const [showDone, setShowDone] = useState('show');
    const [dsEmail, setDsEmail] = useState('');
    const [dsPassword, setDsPassword] = useState('');
    const [dsLevels, setDsLevels] = useState<string[]>(['error', 'warn']);
    const [dsAllowlist, setDsAllowlist] = useState(true);
    const [dsRole, setDsRole] = useState('member');
    const [dsNote, setDsNote] = useState('');
    const [dsSort, setDsSort] = useState<{ key: string; direction: SortDirection }>({
        key: 'lastSeen',
        direction: 'desc',
    });
    const [dsPage, setDsPage] = useState(1);
    const [dsPill, setDsPill] = useState<'issues' | 'board' | 'members'>('issues');
    const [dsModal, setDsModal] = useState(false);
    const [dsConfirm, setDsConfirm] = useState(false);
    const dsMenu = useContextMenu<string>();

    const toggleDsLevel = (level: string) =>
        setDsLevels((prev) =>
            prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
        );

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
                    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                        Values are read from <span className="font-mono">:root</span> at runtime, so this
                        page cannot disagree with the tokens it documents.
                    </p>

                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Brand
                    </p>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                        <Swatch name="Accent" token="--color-brand-accent" className="bg-brand-accent" />
                        <Swatch name="Accent hover" token="--color-brand-accentHover" className="bg-brand-accentHover" />
                        <Swatch name="Accent soft" token="--color-brand-accentSoft" className="bg-brand-accentSoft" />
                        <Swatch name="Dark" token="--color-brand-dark" className="bg-brand-dark" dark />
                        <Swatch name="Near black" token="--color-brand-nearBlack" className="bg-brand-nearBlack" dark />
                        <Swatch name="Steel" token="--color-brand-steel" className="bg-brand-steel" />
                    </div>

                    {/* Semantic tones carry MEANING. Pick by what the value means
                        (resolved to success), never by what colour suits the mock. */}
                    <p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Semantic - pick by meaning, never by hue
                    </p>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                        <Swatch name="Success" token="--color-global-green" className="bg-global-green" />
                        <Swatch name="Warning" token="--color-global-yellow" className="bg-global-yellow" />
                        <Swatch name="Danger" token="--color-global-red" className="bg-global-red" />
                        <Swatch name="Info" token="--color-global-blue" className="bg-global-blue" />
                        <Swatch name="Gray" token="--color-brand-gray" className="bg-brand-gray" />
                        <Swatch name="Glass" token="--color-brand-glass" className="glass-panel" />
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

                {/* GlassPanel is the raw glass register underneath `Surface`. Pages
                    should reach for `Surface`; this is here because the system
                    exports it, and an exported primitive nobody can see is one
                    nobody checks. */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <GlassPanel variant="light" radius="2xl" padding="md" className="h-28">
                        <span className="text-sm font-semibold text-brand-dark dark:text-white">GlassPanel - light</span>
                    </GlassPanel>
                    <GlassPanel variant="dark" radius="2xl" padding="md" className="h-28">
                        <span className="text-sm font-semibold text-white">GlassPanel - dark</span>
                    </GlassPanel>
                    <GlassPanel variant="blue" radius="2xl" padding="md" className="h-28">
                        <span className="text-sm font-semibold text-white">GlassPanel - blue</span>
                    </GlassPanel>
                </div>

                <Surface variant="panel" padding="md">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        KpiCard - label, mono figure, optional icon
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <KpiCard label="Unresolved issues" value={128} icon={<FiAlertTriangle className="h-4 w-4" />} />
                        <KpiCard label="Events - 24h" value="12,904" icon={<FiActivity className="h-4 w-4" />} />
                        <KpiCard label="Resolution rate" value={92} suffix="%" icon={<FiCheckCircle className="h-4 w-4" />} />
                    </div>
                </Surface>
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
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Buttons</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <AccentButton icon={<FiPlus className="w-4 h-4" />}>Create an invoice</AccentButton>
                            <AccentButton variant="dark">Pay out now</AccentButton>
                            <AccentButton variant="ghost">Cancel</AccentButton>
                            <AccentButton variant="accent" size="sm">Small</AccentButton>
                        </div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mt-2">Badges</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="accent">Active</Badge>
                            <Badge tone="solid">Unsent</Badge>
                            <Badge tone="neutral">Draft</Badge>
                            <Badge tone="outline">Viewed</Badge>
                        </div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mt-2">
                            Semantic tones
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="success">Resolved</Badge>
                            <Badge tone="info">In progress</Badge>
                            <Badge tone="warning">Open</Badge>
                            <Badge tone="danger">Critical</Badge>
                            <Badge tone="neutral" plainCase icon={<FiTag className="w-2.5 h-2.5" />}>
                                design-system
                            </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                            Pick a semantic tone by what the value <em>means</em>, never by colour.
                            They are tinted rather than solid so several can sit in one list without
                            competing with the view&apos;s single accent. <code className="font-mono text-[11px]">plainCase</code>{' '}
                            is for labels read as words — a tag, a name — rather than as status keys.
                        </p>
                    </Surface>

                    <Surface variant="panel" padding="md" className="flex flex-col justify-between gap-6">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
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

            {/* ── Form kit (Sprint 1 — the auth pages' primitives) ───────── */}
            <Section id="forms" icon={<FiEdit3 className="w-4 h-4" />} title="Form kit">
                <Surface variant="panel" padding="md" className="flex flex-col gap-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                        <strong className="text-brand-dark dark:text-white">Field</strong> owns the label,
                        hint, error and required marker, and wires <code className="font-mono text-xs">htmlFor</code>,{' '}
                        <code className="font-mono text-xs">aria-describedby</code>,{' '}
                        <code className="font-mono text-xs">aria-invalid</code> and{' '}
                        <code className="font-mono text-xs">aria-required</code> onto the control it wraps.
                        Controls read that out of context — never from props — so the accessibility is
                        solved once here rather than re-remembered per form. RadioGroup and{' '}
                        <code className="font-mono text-xs">useFormState</code> are still unbuilt —
                        price them in before estimating a form-heavy screen.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
                        <Field label="Email" hint="We only use this to sign you in." required id="ds-email">
                            <Input
                                type="email"
                                placeholder="you@company.com"
                                icon={<FiMail className="w-4 h-4" />}
                                value={dsEmail}
                                onChange={(e) => setDsEmail(e.target.value)}
                            />
                        </Field>

                        <Field label="Password" required id="ds-password">
                            <Input
                                type="password"
                                placeholder="••••••••"
                                icon={<FiLock className="w-4 h-4" />}
                                revealable
                                value={dsPassword}
                                onChange={(e) => setDsPassword(e.target.value)}
                            />
                        </Field>

                        <Field
                            label="Workspace name"
                            error="That name is already taken."
                            required
                            id="ds-invalid"
                        >
                            <Input defaultValue="apexops" />
                        </Field>

                        <Field label="Billing reference" hint="Optional — appears on invoices." id="ds-disabled">
                            <Input placeholder="Unavailable on this plan" disabled />
                        </Field>

                        <Field
                            label="Project role"
                            hint="Native <select>: platform pickers on touch, type-ahead on keyboard."
                            id="ds-select"
                        >
                            <Select
                                options={[
                                    { value: 'admin', label: 'admin' },
                                    { value: 'member', label: 'member' },
                                    { value: 'owner', label: 'owner — set by transfer only', disabled: true },
                                ]}
                                value={dsRole}
                                onChange={(e) => setDsRole(e.target.value)}
                            />
                        </Field>

                        <Field label="Assignee" error="Not a member of this project." id="ds-select-invalid">
                            <Select
                                placeholder="Choose a member"
                                options={[{ value: 'a', label: 'Someone else' }]}
                                value=""
                                onChange={() => {}}
                            />
                        </Field>

                        <Field
                            label="Note body"
                            hint="Textarea — Input's twin. Same border, ring and Field wiring."
                            id="ds-textarea"
                        >
                            <Textarea
                                rows={3}
                                placeholder="Write something longer than one line…"
                                value={dsNote}
                                onChange={(e) => setDsNote(e.target.value)}
                            />
                        </Field>

                        <Field
                            label="Auto-growing body"
                            hint="autoGrow: fits the content up to maxRows, then scrolls."
                            id="ds-textarea-grow"
                        >
                            <Textarea
                                autoGrow
                                maxRows={8}
                                rows={2}
                                placeholder="Type a few lines and watch it grow…"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5 border-t border-gray-200 dark:border-white/10 pt-6">
                        <div className="flex flex-col gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Checkbox
                            </p>
                            <Checkbox
                                label="error"
                                hint="Uncaught exceptions and console.error"
                                checked={dsLevels.includes('error')}
                                onChange={() => toggleDsLevel('error')}
                            />
                            <Checkbox
                                label="warn"
                                hint="console.warn"
                                checked={dsLevels.includes('warn')}
                                onChange={() => toggleDsLevel('warn')}
                            />
                            <Checkbox label="debug" hint="Not available on this plan" disabled />
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Switch
                            </p>
                            <Switch
                                justified
                                label="Origin allowlist"
                                hint="Reject ingest from unlisted origins"
                                checked={dsAllowlist}
                                onChange={(e) => setDsAllowlist(e.target.checked)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                <code className="font-mono">role=&quot;switch&quot;</code> — use only when the
                                change applies on toggle. If it needs a Save button, it is a Checkbox.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        The third field shows the error state: the message is{' '}
                        <code className="font-mono">role=&quot;alert&quot;</code> and replaces the hint rather
                        than stacking under it, so there is only ever one line of guidance to read.
                    </p>
                </Surface>
            </Section>

            {/* ── Data surfaces ─────────────────────────────────────────── */}
            <Section id="data" icon={<FiList className="w-4 h-4" />} title="Data surfaces">
                <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                        One <strong className="text-brand-dark dark:text-white">DataTable</strong> for every
                        list surface — issues, logs, users, documents. Sorting and paging are{' '}
                        <strong className="text-brand-dark dark:text-white">server-side</strong>: the table
                        reflects that state and requests changes, it never reorders rows itself. Client-side
                        sorting would only order the current page, which lies as soon as the list is longer
                        than one.
                    </p>

                    <DataTable
                        caption="Design system example table"
                        columns={dsColumns}
                        rows={DS_ISSUE_ROWS}
                        rowKey={(r) => r.id}
                        sort={dsSort}
                        onSortChange={(key, direction) => setDsSort({ key, direction })}
                    />

                    <Pagination
                        page={dsPage}
                        pageSize={5}
                        total={23}
                        onPageChange={setDsPage}
                        itemLabel="issues"
                    />

                    <div className="border-t border-gray-200 dark:border-white/10 pt-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Loading state
                        </p>
                        <div className="flex flex-col gap-4">
                            <SkeletonText lines={3} />
                            {/* The single block, for a placeholder that is not a
                                paragraph - an avatar, a chart, a tile. */}
                            <div className="flex items-center gap-3">
                                <Skeleton height="h-10" width="w-10" radius="full" />
                                <Skeleton height="h-10" width="w-40" radius="lg" />
                                <Skeleton height="h-10" className="flex-1" radius="xl" />
                            </div>
                        </div>
                    </div>
                </Surface>
            </Section>

            {/* ── Overlays ──────────────────────────────────────────────── */}
            <Section id="overlays" icon={<FiAlertTriangle className="w-4 h-4" />} title="Overlays">
                <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                        Radix owns focus trapping, focus restore,{' '}
                        <code className="font-mono text-xs">aria-modal</code>, ESC and scroll lock — a
                        hand-rolled focus trap is a steady source of keyboard bugs.{' '}
                        <strong className="text-brand-dark dark:text-white">ConfirmDialog</strong> is required
                        before any destructive action ships, and stays open if the action rejects so the
                        error can be shown next to what failed.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <AccentButton variant="ghost" size="sm" onClick={() => setDsModal(true)}>
                            Open modal
                        </AccentButton>
                        <AccentButton variant="ghost" size="sm" onClick={() => setDsConfirm(true)}>
                            Destructive action
                        </AccentButton>
                    </div>

                    <Modal
                        open={dsModal}
                        onOpenChange={setDsModal}
                        title="Create project"
                        description="Projects scope every issue, event and ticket."
                        footer={
                            <>
                                <AccentButton variant="ghost" size="sm" onClick={() => setDsModal(false)}>
                                    Cancel
                                </AccentButton>
                                <AccentButton size="sm" onClick={() => setDsModal(false)}>
                                    Create
                                </AccentButton>
                            </>
                        }
                    >
                        <Field label="Project name" required id="ds-modal-name">
                            <Input placeholder="Acme Storefront" />
                        </Field>
                    </Modal>

                    <ConfirmDialog
                        open={dsConfirm}
                        onOpenChange={setDsConfirm}
                        title="Rotate ingest key?"
                        description="Every page embedding the current snippet stops reporting until it is updated. There is no grace period."
                        confirmLabel="Rotate key"
                        destructive
                        onConfirm={() => {}}
                    />

                    <div className="border-t border-gray-200 dark:border-white/10 pt-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Context menu
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mb-4">
                            <strong className="text-brand-dark dark:text-white">
                                Never make right-click the only route to an action.
                            </strong>{' '}
                            It is invisible to keyboard users, impossible on touch and undiscoverable to
                            anyone who does not think to try it. Pair the gesture with a visible trigger
                            that opens the <em>same</em> menu — <code className="font-mono text-xs">useContextMenu</code>{' '}
                            exposes <code className="font-mono text-xs">openAtCursor</code> and{' '}
                            <code className="font-mono text-xs">openAtElement</code> for exactly that.
                        </p>

                        <div
                            onContextMenu={(e) => dsMenu.openAtCursor(e, 'demo')}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-white/15 dark:text-gray-500 dark:text-gray-400"
                        >
                            <span>Right-click anywhere in this box…</span>
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                aria-haspopup="menu"
                                onClick={(e) => dsMenu.openAtElement(e, 'demo')}
                            >
                                … or use this button
                            </AccentButton>
                        </div>

                        <ContextMenu
                            open={dsMenu.open}
                            position={dsMenu.position}
                            onClose={dsMenu.close}
                            label="Example actions"
                            items={[
                                { id: 'open', label: 'Open', icon: <FiEye size={15} />, onSelect: () => {} },
                                { id: 'edit', label: 'Rename…', icon: <FiEdit3 size={15} />, onSelect: () => {} },
                                {
                                    id: 'copy',
                                    label: 'Copy link',
                                    icon: <FiPaperclip size={15} />,
                                    separatorBefore: true,
                                    onSelect: () => {},
                                },
                                {
                                    id: 'disabled',
                                    label: 'Requires owner',
                                    icon: <FiLock size={15} />,
                                    disabled: true,
                                    onSelect: () => {},
                                },
                                {
                                    id: 'archive',
                                    label: 'Archive',
                                    icon: <FiDownload size={15} />,
                                    destructive: true,
                                    separatorBefore: true,
                                    onSelect: () => {},
                                },
                            ]}
                        />
                    </div>
                </Surface>
            </Section>

            {/* ── Composition primitives (from .agents/template) ────────── */}
            <Section id="composition" icon={<FiGrid className="w-4 h-4" />} title="Composition">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
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
                            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
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
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                            SegmentedControl · exclusive & capped-multiple
                        </p>
                        <div className="mb-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                PillTabs - navigation between destinations
                            </p>
                            <PillTabs
                                tabs={[
                                    { id: 'issues', label: 'Issues', count: 128 },
                                    { id: 'board', label: 'Board', count: 12 },
                                    { id: 'members', label: 'Members' },
                                ]}
                                activeId={dsPill}
                                onChange={setDsPill}
                            />
                            {/* The distinction is worth stating where both are on
                                screen: PillTabs moves you somewhere, SegmentedControl
                                filters what you are already looking at. */}
                        </div>

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
                            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
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
