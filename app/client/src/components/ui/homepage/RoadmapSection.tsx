import type { FC } from 'react';

const RoadmapSection: FC = () => (
    <section className="py-32 relative overflow-hidden bg-background-dark">
        <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-t from-[var(--color-violet)]/10 to-transparent blur-[80px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="relative hidden lg:block group">
                    <div className="absolute top-8 -left-8 w-full h-full border-2 border-[var(--color-blue-primary)]/30 rounded-xl z-0 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-blue-primary)] to-[var(--color-pink)] rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-200" />
                    <img
                        alt="Staircase abstract architecture"
                        className="relative z-10 w-full shadow-2xl object-cover h-[600px] rounded-xl hover:scale-[1.02] transition-transform duration-500 border border-white/10"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeFfeSIc3HSSYsH1e4R3GRUPeEuseLNLjMdk7hTtGXDtUkfnS8Q2WhcqIhG-EVwY7ZCkH8T4u8elKCy9SmwDC7LeTSY8h7twfk_PfM8Ht1PedVfJqvXmvVGNqZYWHP-ppbAOcdjod1ZCyaH2O7fpubVXDcbjPUiHA6LK2OcmAMNy9WTFBRcg1noYnPVITGcEtxVHDDJ3Zmgoh6geseMhLDfcOtbTjKk9adVqW9yB8_sbWqOkBB9DZcBAnjTPPg9qiMOWS75o4JwtFh"
                    />
                </div>
                <div className="glass-card p-10 rounded-2xl border border-white/5 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-orange-primary)]/20 blur-[40px] rounded-full pointer-events-none" />
                    <span className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-blue-primary)] mb-4 block font-extrabold text-glow">
                        Strategic Roadmap
                    </span>
                    <h2 className="font-display text-5xl text-white mb-10">Timelines</h2>
                    <div className="w-32 h-1 bg-gradient-to-r from-white to-transparent mb-16 opacity-30" />
                    <div className="space-y-16 pl-6 border-l-2 border-white/10 relative">
                        <div className="relative pl-10 group">
                            <div className="absolute -left-[9px] top-3 w-4 h-4 bg-black border-2 border-[var(--color-blue-primary)] rounded-full transition-all duration-300 group-hover:bg-[var(--color-blue-primary)] group-hover:shadow-[0_0_15px_#3B82F6]" />
                            <span className="text-xs font-bold text-[var(--color-blue-primary)] mb-2 block tracking-wider">
                                2023.01
                            </span>
                            <h4 className="text-2xl font-display text-white mb-3">Phase Alpha</h4>
                            <p className="text-base text-light-text-secondary dark:text-dark-text-secondary font-light leading-relaxed group-hover:text-dark-text-secondary transition-colors">
                                Initial deployment of core services. Establishing the baseline for future scalability and integration.
                            </p>
                        </div>
                        <div className="relative pl-10 group">
                            <div className="absolute -left-[9px] top-3 w-4 h-4 bg-black border-2 border-[var(--color-orange-primary)] rounded-full transition-all duration-300 group-hover:bg-[var(--color-orange-primary)] group-hover:shadow-[0_0_15px_#FF6F41]" />
                            <span className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary mb-2 block tracking-wider group-hover:text-[var(--color-orange-primary)] transition-colors">
                                2023.06
                            </span>
                            <h4 className="text-2xl font-display text-white mb-3 group-hover:text-[var(--color-orange-primary)] transition-colors">
                                Phase Beta
                            </h4>
                            <p className="text-base text-light-text-secondary dark:text-dark-text-secondary font-light leading-relaxed group-hover:text-dark-text-secondary transition-colors">
                                User acceptance testing and iterative refinement. Optimizing latency across all main endpoints.
                            </p>
                        </div>
                        <div className="relative pl-10 group">
                            <div className="absolute -left-[9px] top-3 w-4 h-4 bg-black border-2 border-[var(--color-pink)] rounded-full transition-all duration-300 group-hover:bg-[var(--color-pink)] group-hover:shadow-[0_0_15px_#EC4899]" />
                            <span className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary mb-2 block tracking-wider group-hover:text-[var(--color-pink)] transition-colors">
                                2023.12
                            </span>
                            <h4 className="text-2xl font-display text-white mb-3 group-hover:text-[var(--color-pink)] transition-colors">
                                Launch
                            </h4>
                            <p className="text-base text-light-text-secondary dark:text-dark-text-secondary font-light leading-relaxed group-hover:text-dark-text-secondary transition-colors">
                                Full-scale public release. Monitoring systems active. Marketing campaigns initiated globally.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

export default RoadmapSection;

