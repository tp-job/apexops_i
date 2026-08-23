import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
    FiActivity,
    FiTrendingUp,
    FiArrowUpRight,
    FiPlus,
    FiDownload,
    FiEye,
    FiCheckCircle,
    FiPaperclip,
    FiEdit3,
    FiTag,
    FiMail,
    FiLock,
    FiAlertTriangle,
} from 'react-icons/fi';
import {
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
import { EASE_LUX, fadeUp, stagger, inViewOnce } from '@/lib/motion';
import { useTheme } from '@/context/theme-context';

// ── Section wrapper ───────────────────────────────────────────
/**
 * A section, styled as the written reference styles one: the title on the left,
 * the file it is answerable to on the right, a hairline between that and the
 * content. The `ref` is the point — a rule with no source is an opinion, and the
 * reader can go and check.
 */
const Section: FC<{
    id: string;
    title: string;
    /** Where this section's rules actually live. Rendered mono, right-aligned. */
    sourceRef?: string;
    children: React.ReactNode;
}> = ({ id, title, sourceRef, children }) => (
    <motion.section
        id={id}
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="flex scroll-mt-28 flex-col gap-6 pt-4"
    >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-black/10 pb-3 dark:border-white/10">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-brand-dark dark:text-white">{title}</h2>
            {sourceRef && (
                <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{sourceRef}</span>
            )}
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

const Swatch: FC<{ name: string; token: string; className: string; dark?: boolean; role?: string }> = ({
    name,
    token,
    className,
    dark,
    role,
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
                {/* The job, not just the value. A palette without roles gets used
                    by eye, and "which grey was the muted one" is how drift starts. */}
                {role && <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">{role}</p>}
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

/**
 * The six laws, carried over from the written reference
 * (`.agents/design-system/design-system.html`) so the live guide states the rules
 * it demonstrates. Two references that disagree are worse than one.
 */
/** The files this page is answerable to. Shown as chips under the thesis. */
const SOURCES = [
    'source: index.css @theme',
    'globals.css .ds-*',
    'lib/motion.ts',
    'written: design-system.html',
];

/**
 * The rail. Ids match the `Section` ids, and the scroll-spy below reads them —
 * one list, so a section cannot exist without a way to reach it.
 */
type RailId =
    | 'laws' | 'color' | 'type' | 'radius' | 'elevation' | 'motion'
    | 'surfaces' | 'components' | 'forms' | 'data' | 'overlays' | 'rules';

const RAIL: { id: RailId; label: string }[] = [
    { id: 'laws', label: 'Laws' },
    { id: 'color', label: 'Colour' },
    { id: 'type', label: 'Type' },
    { id: 'radius', label: 'Radius' },
    { id: 'elevation', label: 'Elevation' },
    { id: 'motion', label: 'Motion' },
    { id: 'surfaces', label: 'Surfaces' },
    { id: 'components', label: 'Primitives' },
    { id: 'forms', label: 'Forms' },
    { id: 'data', label: 'Data' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'rules', label: "Do & Don't" },
];



const LAWS = [
    {
        n: '01',
        rule: 'Contrast through opacity, not colour weight.',
        why: 'Depth is built by stacking translucency - white/5 to white/10 to white/20 - never by reaching for a darker or more saturated fill.',
        tag: 'law 01',
        cost: 'breaking it produces the muddy, heavy look the glass base exists to avoid',
    },
    {
        n: '02',
        rule: 'One glowing element per view.',
        why: 'The active state or the primary action, not both. Two glows and neither reads as focal.',
        tag: 'law 02',
        cost: 'on this page the budget is spent on the word "Luxe" in the title',
    },
    {
        n: '03',
        rule: 'Every number is monospaced.',
        why: 'Money, IDs, dates, counts, durations. Values must not shift width between renders, and mono signals "this is precise".',
        tag: 'font-numbers',
        cost: 'JetBrains Mono, tabular-nums',
    },
    {
        n: '04',
        rule: 'Nothing is sharper than 12px.',
        why: 'The radius floor is rounded-xl. There is no rounded-lg anywhere in the product.',
        tag: 'law 04',
        cost: 'a single square corner reads as a bug, not a variation',
    },
    {
        n: '05',
        rule: 'Motion comes from one file.',
        why: 'Every transition uses a shared variant from @/lib/motion. No hand-rolled tween, ever.',
        tag: 'law 05',
        cost: 'ad-hoc easing is how a system stops feeling like one system',
    },
    {
        n: '06',
        rule: 'Cards compose on Surface.',
        why: 'Never a raw div with background utilities. The primitive owns the blur, border, elevation and reveal.',
        tag: 'law 06',
        cost: 'hand-built cards drift within a sprint',
    },
];

/** The easing-demo dot, in px. Also its inset from each end of the track. */
const DOT_PX = 12;

const RADII = [
    { name: 'rounded-full', px: '9999px', cls: 'rounded-full', use: 'Avatars, nav pills, badges, icon buttons' },
    { name: 'rounded-3xl', px: '24px', cls: 'rounded-3xl', use: 'Cards and main containers' },
    { name: 'rounded-2xl', px: '16px', cls: 'rounded-2xl', use: 'List rows and inner panels' },
    { name: 'rounded-xl', px: '12px - the floor', cls: 'rounded-xl', use: 'Buttons, inputs, dropdowns' },
];

const ELEVATIONS = [
    { cls: 'ds-elev-1', use: 'Resting' },
    { cls: 'ds-elev-2', use: 'Cards' },
    { cls: 'ds-elev-3', use: 'Overlays' },
    { cls: 'ds-glow', use: 'One per view' },
];

const DURATIONS = [
    { name: 'DUR.fast - 160ms', use: 'Hover, colour, small state' },
    { name: 'DUR.base - 280ms', use: 'Entrances and panel reveals. The default' },
    { name: 'DUR.slow - 520ms', use: 'Count-ups, meter fills, hero sequences' },
];

const VARIANTS = [
    { name: 'fadeUp', motion: 'opacity 0 to 1, y 16 to 0', use: 'cards, rows, hero blocks. The default entrance' },
    { name: 'scaleIn', motion: 'opacity 0 to 1, scale .96 to 1', use: 'focal elements - KPIs, modals, badges' },
    { name: 'fade', motion: 'opacity only, EASE_SOFT', use: 'when movement would be noise' },
    { name: 'stagger(gap)', motion: 'children in sequence, 60ms default', use: 'lists and grids. Parent only' },
    { name: 'hoverLift', motion: 'y -4 on hover, scale .985 on tap', use: 'interactive cards and tiles' },
    { name: 'pressable', motion: 'scale 1.02 / 0.96', use: 'buttons. Press without lift' },
    { name: 'SPRING', motion: 'stiffness 420, damping 32, mass 0.7', use: 'interactive lift and press. Snappy, never bouncy' },
];

/** Do / Don't, carried from the written reference. */
const DOS = [
    'Compose on Surface. It owns blur, border, elevation and reveal.',
    'Spend the glow budget once - active state or CTA, never both.',
    'Put every money value, ID, count and duration in font-numbers.',
    'Layer white/5, white/10, white/20 for depth on dark surfaces.',
    'Take all motion from @/lib/motion, and let reduced motion resolve to the end state.',
    'Keep the shadow tint blue-violet so elevation belongs to the canvas.',
];

const DONTS = [
    'Use brand-accent as a large background. It is a signal, and a signal cannot be a field.',
    'Reach for blue or purple SaaS gradients. The palette is neutral plus lime, on purpose.',
    'Nest glass-panel inside glass-dark - the contrast inversion breaks depth.',
    'Ship rounded-lg or sharper. 12px is the floor.',
    'Write a one-off transition object, however small.',
    'Add new remixicon usage. React Icons (Fi) only.',
];

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
    /* Remounting the two dots is what replays them: a key change restarts the
       animation, where re-running the same `animate` would be a no-op. */
    const [motionRun, setMotionRun] = useState(0);

    /**
     * How far the easing dots travel.
     *
     * Measured, not expressed as a percentage. `x: '92%'` looks right and is not:
     * a percentage transform resolves against **the element's own box**, so a
     * 12px dot moved 11px and the demo showed two dots twitching in place. Caught
     * by measuring the DOM in a real browser — both dots sat at
     * `translateX(11.04px)` inside a 1350px track.
     */
    const trackRef = useRef<HTMLDivElement>(null);
    const [travel, setTravel] = useState(0);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        // Both tracks are siblings of identical width, so one measurement serves
        // both. `ResizeObserver` rather than a one-off read: this page is wide and
        // the sidebar-less layout reflows on any window resize.
        const measure = () => setTravel(Math.max(0, el.clientWidth - DOT_PX * 2));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /* Scroll-spy for the rail. The threshold is a *little* below the sticky rail
       so the pill flips as a heading passes under it rather than when it is
       already gone. */
    const [activeSection, setActiveSection] = useState<RailId>('laws');

    useEffect(() => {
        const sync = () => {
            let current: RailId = RAIL[0].id;
            for (const item of RAIL) {
                const el = document.getElementById(item.id);
                if (el && el.getBoundingClientRect().top <= 140) current = item.id;
            }
            setActiveSection(current);
        };
        sync();
        window.addEventListener('scroll', sync, { passive: true });
        return () => window.removeEventListener('scroll', sync);
    }, []);

    const goToSection = useCallback((id: RailId) => {
        // `scroll-mt-28` on the section is what keeps the heading clear of the
        // sticky rail; letting the browser do the scrolling keeps it smooth and
        // respects the user's reduced-motion setting.
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    /* Theme control, because this route renders outside `AppLayout` and so has no
       Topbar toggle of its own. Same three states the written reference offers. */
    const { preference, setPreference } = useTheme();
    const cycleTheme = useCallback(() => {
        setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system');
    }, [preference, setPreference]);
    const [dsModal, setDsModal] = useState(false);
    const [dsConfirm, setDsConfirm] = useState(false);
    const dsMenu = useContextMenu<string>();

    const toggleDsLevel = (level: string) =>
        setDsLevels((prev) =>
            prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
        );

    return (
        <div className="flex flex-col gap-10 pb-16 max-w-[1400px] mx-auto w-full">
            {/* ── Masthead ──────────────────────────────────────────────
                Not a card. The written reference opens with a statement of what
                the system is, and a card around it would make the thesis look
                like one more component demo. */}
            <motion.header variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-6 pt-2">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                    ApexOps · Design system v2
                </span>

                <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-brand-dark sm:text-6xl lg:text-7xl dark:text-white">
                    Neutral,
                    <br />
                    and one{' '}
                    {/* The one glowing element on this page — law 02, spent here
                        deliberately so the page obeys the rule it states. */}
                    <span className="ds-glow inline-block rounded-2xl bg-brand-accent px-3 pb-1 text-brand-dark">
                        lime
                    </span>
                    .
                </h1>

                <p className="max-w-[62ch] text-base leading-relaxed text-gray-600 dark:text-gray-300">
                    Layered glass over a soft gradient canvas. Depth comes from opacity, never from
                    heavier colour. The accent is a signal, not a decoration — it marks the one thing
                    on a screen that wants your attention, and nothing else.
                </p>

                <div className="flex flex-wrap gap-2">
                    {SOURCES.map((src) => (
                        <span
                            key={src}
                            className="rounded-full border border-black/10 px-3 py-1 font-mono text-[11px] text-gray-600 dark:border-white/15 dark:text-gray-300"
                        >
                            {src}
                        </span>
                    ))}
                </div>
            </motion.header>

            {/* ── Rail ──────────────────────────────────────────────────
                Built on PillTabs, which is the primitive for navigating between
                destinations — this page should use the system it documents, and
                until today PillTabs had no caller anywhere to prove it worked. */}
            <div className="sticky top-3 z-30 -mx-2 flex flex-wrap items-center justify-between gap-3 px-2 py-2">
                <PillTabs tabs={RAIL} activeId={activeSection} onChange={goToSection} />
                <button
                    type="button"
                    onClick={cycleTheme}
                    className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 font-mono text-[11px] text-gray-600 backdrop-blur transition-colors hover:text-brand-dark dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
                    aria-live="polite"
                >
                    theme: {preference === 'system' ? 'auto' : preference}
                </button>
            </div>

            {/* The six laws — every rule below is a consequence of one of these */}
            <Section id="laws" title="The six laws" sourceRef="design.md §1–§5">
                <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Everything else on this page is a consequence of these. When a new screen looks
                    wrong, it has almost always broken one of them.
                </p>
                <motion.div
                    variants={stagger()}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                    className="flex flex-col"
                >
                    {LAWS.map((law) => (
                        <motion.div
                            key={law.n}
                            variants={fadeUp}
                            className="grid grid-cols-1 gap-x-10 gap-y-2 border-b border-black/10 py-5 last:border-b-0 lg:grid-cols-[1fr_260px] dark:border-white/10"
                        >
                            <p className="max-w-[70ch] text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                                <b className="font-semibold text-brand-dark dark:text-white">{law.rule}</b>{' '}
                                {law.why}
                            </p>
                            <div>
                                <p className="font-mono text-[11px] text-brand-dark dark:text-brand-accent">{law.tag}</p>
                                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{law.cost}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </Section>

            {/* Colour */}
            <Section id="color" title="Colour" sourceRef="index.css @theme">
                <Surface variant="panel" padding="md">
                    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                        Values are read from <span className="font-mono">:root</span> at runtime, so this
                        page cannot disagree with the tokens it documents.
                    </p>

                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Brand
                    </p>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                        <Swatch name="Accent" token="--color-brand-accent" className="bg-brand-accent" role="Active nav pill, focal CTA, meter fill. One per view." />
                        <Swatch name="Accent hover" token="--color-brand-accentHover" className="bg-brand-accentHover" role="Hover only. Never a resting state." />
                        <Swatch name="Accent soft" token="--color-brand-accentSoft" className="bg-brand-accentSoft" role="Tinted chip and badge grounds under accent text." />
                        <Swatch name="Dark" token="--color-brand-dark" className="bg-brand-dark" dark role="Nav ground, headings, text on the accent." />
                        <Swatch name="Near black" token="--color-brand-nearBlack" className="bg-brand-nearBlack" dark role="Dark-mode canvas, paired with #1C1C1C." />
                        <Swatch name="Steel" token="--color-brand-steel" className="bg-brand-steel" role="Small marks only in practice - note dots, neutral track fills." />
                    </div>

                    {/* Semantic tones carry MEANING. Pick by what the value means
                        (resolved to success), never by what colour suits the mock. */}
                    <p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Semantic - pick by meaning, never by hue
                    </p>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                        <Swatch name="Success" token="--color-global-green" className="bg-global-green" role="Success. Resolved, healthy, done." />
                        <Swatch name="Warning" token="--color-global-yellow" className="bg-global-yellow" role="Warning. Open, degraded, needs a look." />
                        <Swatch name="Danger" token="--color-global-red" className="bg-global-red" role="Danger. Errors, destructive actions, overdue." />
                        <Swatch name="Info" token="--color-global-blue" className="bg-global-blue" role="Info. Neutral status, in progress." />
                        <Swatch name="Gray" token="--color-brand-gray" className="bg-brand-gray" role="Chip fills, input grounds, muted surfaces." />
                        <Swatch name="Glass" token="--color-brand-glass" className="glass-panel" role="The translucent register every panel sits on." />
                    </div>
                </Surface>
            </Section>

            {/* Typography */}
            <Section id="type" title="Typography" sourceRef="design.md §3">
                <Surface variant="panel" padding="md">
                    <TypeRow label="DM Sans · 48 · bold" cls="text-5xl font-bold font-heading" sample="Invoices" />
                    <TypeRow label="Numbers · JetBrains Mono" cls="text-3xl font-bold font-numbers" sample="$31,211.00" />
                    <TypeRow label="Card head · DM Sans · xl" cls="text-xl font-bold font-heading" sample="BlueRock" />
                    <TypeRow label="Body · Inter · sm" cls="text-sm font-medium font-body" sample="How to interpret failures and recover safely." />
                    <TypeRow label="Nano · uppercase tracked" cls="text-[10px] uppercase tracking-wider font-semibold" sample="Unsent" />
                </Surface>
            </Section>

            {/* Radius */}
            <Section id="radius" title="Radius" sourceRef="design.md §5">
                <Surface variant="panel" padding="md">
                    <p className="mb-5 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        Four steps and a floor. The floor is the part people break: a single square
                        corner reads as a bug, not a variation.
                    </p>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                        {RADII.map((r) => (
                            <div key={r.name} className="flex flex-col gap-2">
                                <div className={`h-20 bg-brand-accentSoft border border-brand-accent/40 ${r.cls}`} />
                                <div>
                                    <p className="font-mono text-xs font-semibold text-brand-dark dark:text-white">{r.name}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{r.px}</p>
                                    <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">{r.use}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">rounded-lg</span> and sharper: <b>never</b>. The
                        floor is 12px, and there is no <span className="font-mono">rounded-lg</span>
                        {' '}anywhere in the product.
                    </p>
                </Surface>
            </Section>

            {/* Elevation */}
            <Section id="elevation" title="Elevation & glow" sourceRef="index.css --shadow-ds-*">
                <Surface variant="panel" padding="md">
                    <p className="mb-5 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        Wide, soft, low opacity. Luxury reads as restraint - a hard drop shadow is the
                        fastest way to make this system look cheap.
                    </p>
                    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                        {ELEVATIONS.map((e) => (
                            <div key={e.cls} className="flex flex-col gap-2">
                                <div className={`h-20 rounded-2xl bg-white dark:bg-white/10 ${e.cls}`} />
                                <div>
                                    <p className="font-mono text-xs font-semibold text-brand-dark dark:text-white">{e.cls}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{e.use}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* The tint is the part that gets "cleaned up" by someone who
                        assumes a shadow should be neutral grey. It should not. */}
                    <p className="mt-5 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        The shadow colour carries a blue-violet tint, which ties elevation to the
                        canvas gradient instead of dropping neutral grey onto a coloured ground. Grey
                        shadows on this canvas read as dirt.
                    </p>
                </Surface>
            </Section>

            {/* Motion */}
            <Section id="motion" title="Motion" sourceRef="lib/motion.ts">
                <Surface variant="panel" padding="md">
                    <p className="mb-5 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        One signature curve. <span className="font-mono">EASE_LUX</span> leaves fast and
                        settles slowly, which is what makes an interface feel responsive without feeling
                        abrupt. The lime dot is the system; the steel dot is linear, for comparison only.
                    </p>

                    <div className="flex flex-col gap-3">
                        <div ref={trackRef} className="h-8 rounded-xl bg-black/5 dark:bg-white/5">
                            <motion.span
                                key={`lux-${motionRun}`}
                                className="mt-2.5 block h-3 w-3 rounded-full bg-brand-accent"
                                initial={{ x: DOT_PX / 2 }}
                                animate={{ x: travel }}
                                transition={{ duration: 1.1, ease: EASE_LUX }}
                            />
                        </div>
                        <div className="h-8 rounded-xl bg-black/5 dark:bg-white/5">
                            <motion.span
                                key={`lin-${motionRun}`}
                                className="mt-2.5 block h-3 w-3 rounded-full bg-brand-steel"
                                initial={{ x: DOT_PX / 2 }}
                                animate={{ x: travel }}
                                transition={{ duration: 1.1, ease: 'linear' }}
                            />
                        </div>
                        <div>
                            <AccentButton variant="ghost" size="sm" onClick={() => setMotionRun((n) => n + 1)}>
                                Replay
                            </AccentButton>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {DURATIONS.map((d) => (
                            <div key={d.name}>
                                <p className="font-mono text-xs font-semibold text-brand-dark dark:text-white">{d.name}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">{d.use}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 border-t border-black/5 pt-5 dark:border-white/10">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Variants - all of them from @/lib/motion
                        </p>
                        <div className="flex flex-col gap-2">
                            {VARIANTS.map((v) => (
                                <div key={v.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <span className="font-mono text-xs font-semibold text-brand-dark dark:text-white">{v.name}</span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{v.motion}</span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">- {v.use}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="mt-5 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        Reduced motion is a contract, not a courtesy: count-ups land on their final
                        value, entrances resolve to their end state, and nothing depends on an
                        animation completing for the interface to be usable.
                    </p>
                </Surface>
            </Section>

            {/* Surfaces */}
            <Section id="surfaces" title="Surfaces" sourceRef="globals.css .ds-* · Surface.tsx">
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

                {/* The nesting model, and the census that says nobody uses it.
                    Both belong on the same page: the rule without the count reads
                    as current practice, and it has not been for a while. */}
                <Surface variant="panel" padding="md">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        The nesting model
                    </p>
                    <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        Depth runs one direction: dark holds mid, mid holds translucent white. Putting
                        a light panel inside a dark one inverts the contrast and breaks the model.
                    </p>
                    <div className="rounded-2xl bg-brand-dark p-4">
                        <span className="text-[11px] font-medium text-white/70">dark - content panel</span>
                        <div className="mt-2 rounded-2xl bg-brand-steel/90 p-4">
                            <span className="text-[11px] font-medium text-white/80">blue - detail pane</span>
                            <div className="mt-2 rounded-xl bg-white/10 p-3">
                                <span className="text-[11px] font-medium text-white/80">white/10 - line item</span>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        <b className="text-brand-dark dark:text-white">Specified, but no longer in use.</b>{' '}
                        Counting <span className="font-mono">&lt;Surface variant&gt;</span> across the
                        product on 2026-08-21, excluding this page:{' '}
                        <span className="font-numbers">panel 64</span>,{' '}
                        <span className="font-numbers">frost 5</span>,{' '}
                        <span className="font-numbers">dark 1</span>,{' '}
                        <span className="font-numbers">blue 0</span>,{' '}
                        <span className="font-numbers">accent 0</span>. The model came from a
                        master-detail layout on the old Invoices page, which was mock data throughout
                        and was deleted in the 2026-07-24 reset. Everything rebuilt since composes flat
                        panel cards directly on the canvas.
                    </p>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        So: <b className="text-brand-dark dark:text-white">panel on the canvas is the default.</b>{' '}
                        Reach for dark or blue only if you are genuinely rebuilding a master-detail
                        screen - and if you do, you are the first, so expect gaps.
                    </p>
                </Surface>

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
            <Section id="components" title="Components" sourceRef="components/design-system/*">
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
            <Section id="forms" title="Form kit" sourceRef="Field · Input · Select · Switch">
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
            <Section id="data" title="Data surfaces" sourceRef="DataTable · Pagination · Skeleton">
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
            <Section id="overlays" title="Overlays" sourceRef="Modal · ConfirmDialog · ContextMenu">
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

            {/* Do & Don't */}
            <Section id="rules" title="Do & Don't" sourceRef="design.md §2 · v2 rules">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Surface variant="panel" padding="md" className="h-full">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Do</p>
                        <ul className="flex flex-col gap-2.5">
                            {DOS.map((rule) => (
                                <li key={rule} className="flex gap-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                                    <span aria-hidden className="font-numbers font-bold text-emerald-700 dark:text-emerald-400">+</span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ul>
                    </Surface>
                    <Surface variant="panel" padding="md" className="h-full">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Don&apos;t</p>
                        <ul className="flex flex-col gap-2.5">
                            {DONTS.map((rule) => (
                                <li key={rule} className="flex gap-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                                    <span aria-hidden className="font-numbers font-bold text-red-600 dark:text-red-400">x</span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ul>
                    </Surface>
                </div>
            </Section>

            {/* ── Composition primitives (from .agents/template) ────────── */}
            <Section id="composition" title="Composition" sourceRef=".agents/template">
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
