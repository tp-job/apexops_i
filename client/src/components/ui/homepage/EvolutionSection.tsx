import type { FC } from 'react';

const EvolutionSection: FC = () => (
    <section className="relative overflow-hidden bg-[#050816] text-white py-24">
        {/* Top dashed timeline line */}
        <div className="absolute inset-x-0 top-16 flex items-center justify-between px-10 lg:px-24 pointer-events-none">
            {/* Horizontal dashed line */}
            <div className="absolute left-0 right-0 h-px border-t border-dotted border-white/30" />
            {/* Four vertical connectors + dots */}
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="relative flex flex-col items-center">
                    <div className="h-24 border-l border-dotted border-white/30" />
                    <div className="w-5 h-5 rounded-full bg-black border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                </div>
            ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
            {/* Header row */}
            <div className="flex items-center justify-between mb-20 text-xs sm:text-sm tracking-[0.2em] uppercase text-white/60">
                <span>Future Roadmap</span>
                <span className="hidden sm:inline">ApexOps.io</span>
                <span>Page 07</span>
            </div>

            {/* Q1–Q4 panels */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-0">
                {/* Q1 (hover highlight) */}
                <div className="relative px-6 pb-14 pt-40 md:pt-48 bg-gradient-to-b from-transparent via-transparent to-black/40 flex flex-col justify-end group cursor-pointer transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.45)]">
                    {/* Highlight gradient stripe (visible on hover) */}
                    <div className="absolute inset-y-0 inset-x-0 bg-gradient-to-b from-[#f97316] via-[#fb923c] to-[#1f2937] opacity-0 group-hover:opacity-100 pointer-events-none -z-10 transition-opacity duration-300" />
                    <div className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#f97316] to-[#f97316]/70">
                        Q1
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Product Development</h3>
                    <p className="text-sm text-white/60 max-w-xs">
                        Improving AI-powered analytics to enhance energy efficiency &amp; accuracy.
                    </p>
                </div>

                {/* Q2 (hover highlight) */}
                <div className="relative px-6 pb-14 pt-40 md:pt-48 bg-gradient-to-b from-transparent via-transparent to-black/40 flex flex-col justify-end group cursor-pointer transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_24px_rgba(168,85,247,0.45)]">
                    {/* Highlight gradient stripe (visible on hover) */}
                    <div className="absolute inset-y-0 inset-x-0 bg-gradient-to-b from-[#a855f7] via-[#c084fc] to-[#111827] opacity-0 group-hover:opacity-100 pointer-events-none -z-10 transition-opacity duration-300" />
                    <div className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#a855f7] to-[#a855f7]/70">
                        Q2
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Pilot Implementation</h3>
                    <p className="text-sm text-white/60 max-w-xs">
                        Testing in real-world environments to refine predictive capabilities.
                    </p>
                </div>

                {/* Q3 (hover highlight) */}
                <div className="relative px-6 pb-14 pt-40 md:pt-48 bg-gradient-to-b from-transparent via-transparent to-black/40 flex flex-col justify-end group cursor-pointer transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_30px_rgba(251,146,60,0.45)]">
                    {/* Highlight gradient stripe (visible on hover) */}
                    <div className="absolute inset-y-0 inset-x-0 bg-gradient-to-b from-[#f97316] via-[#fb923c] to-[#1d1b3b] opacity-0 group-hover:opacity-100 pointer-events-none -z-10 transition-opacity duration-300" />
                    <div className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/80">
                        Q3
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Market Expansion</h3>
                    <p className="text-sm text-white/80 max-w-xs">
                        Scaling deployment by entering new industries and global markets.
                    </p>
                </div>

                {/* Q4 (hover highlight) */}
                <div className="relative px-6 pb-14 pt-40 md:pt-48 bg-gradient-to-b from-transparent via-transparent to-black/40 flex flex-col justify-end group cursor-pointer transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]">
                    {/* Highlight gradient stripe (visible on hover) */}
                    <div className="absolute inset-y-0 inset-x-0 bg-gradient-to-b from-[#6366f1] via-[#818cf8] to-[#020617] opacity-0 group-hover:opacity-100 pointer-events-none -z-10 transition-opacity duration-300" />
                    <div className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#6366f1] to-[#6366f1]/70">
                        Q4
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Integration</h3>
                    <p className="text-sm text-white/60 max-w-xs">
                        Global integration &mdash; expanding worldwide while maintaining compliance.
                    </p>
                </div>
            </div>

            {/* Footer label */}
            <div className="mt-10 text-xs text-white/40">
                apex.ops &mdash; predictive energy intelligence roadmap
            </div>
        </div>
    </section>
);

export default EvolutionSection;

