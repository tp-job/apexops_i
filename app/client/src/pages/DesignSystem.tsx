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
} from 'react-icons/fi';
import {
    Surface,
    StatTile,
    Meter,
    AccentButton,
    Badge,
    AnimatedNumber,
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

const DesignSystem: FC = () => {
    const [meter, setMeter] = useState(72);

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
        </div>
    );
};

export default DesignSystem;
