import type { FC } from 'react';

const PrinciplesSection: FC = () => (
    <section className="py-32 px-6 lg:px-12 relative bg-[#080c14]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-[var(--color-blue-primary)]/5 blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-24 max-w-3xl mx-auto">
                <h2 className="font-display text-5xl lg:text-7xl text-white mb-6 tracking-tight drop-shadow-xl">
                    Core{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-blue-primary)] to-[var(--color-green)]">
                        Principles
                    </span>
                </h2>
                <p className="text-light-text-secondary dark:text-dark-text-secondary font-light text-xl">
                    Design is an inherent part of corporate identity.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-card p-10 hover:-translate-y-4 transition-all duration-500 group rounded-2xl border-t border-l border-white/10 border-b border-r border-black/50 hover:border-[var(--color-blue-primary)]/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-blue-primary)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="h-56 overflow-hidden mb-10 rounded-lg relative">
                        <div className="absolute inset-0 bg-[var(--color-blue-primary)]/20 mix-blend-overlay z-10" />
                        <img
                            alt="Abstract architectural detail"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNh2AcaJiZ839vlkUXHVU2dzX2G6ifRocGFvRoo-X9iIPxbGUKh-C9D3-4v053V3DZ-pmB4adxGn4ektmtioVLd66WA9ZrBglGqChjGdpAKYTHTV9yv2VHYEy2x9XGOS1eDPEY_7hmzZN68c3iLhBCyWLwasjpA3GI2PB7rCaTCvp7n9M-3Oa8zWYK1Japt6g8xsnrbqCRlVCGbD_O9czRHYDhu57qegQXYcKOsCByoSQAGeC-CtxUytm54FKRDvY5mlPTLjJK213D"
                        />
                    </div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <span className="text-xs font-black text-[var(--color-blue-primary)] uppercase tracking-widest block border border-[var(--color-blue-primary)] px-3 py-1 rounded bg-[var(--color-blue-primary)]/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                            01
                        </span>
                        <div className="h-px bg-white/20 flex-grow" />
                    </div>
                    <h3 className="font-display text-3xl text-white mb-4 group-hover:text-[var(--color-blue-primary)] transition-colors relative z-10">
                        Minimalist Infrastructure
                    </h3>
                    <p className="text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-light mb-8 relative z-10 group-hover:text-dark-text-secondary transition-colors">
                        Removing the superfluous. Focusing on clean code, efficient pipelines, and bare-metal performance where it matters most.
                    </p>
                    <a
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white hover:text-[var(--color-blue-primary)] transition-colors pb-1 group/link relative z-10 font-bold"
                        href="#"
                    >
                        Explore
                        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform group-hover/link:text-glow">
                            arrow_forward
                        </span>
                    </a>
                </div>

                <div className="glass-card p-10 hover:-translate-y-4 transition-all duration-500 group rounded-2xl border-t border-l border-white/10 border-b border-r border-black/50 hover:border-[var(--color-orange-primary)]/50 hover:shadow-[0_0_30px_rgba(255,111,65,0.2)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-orange-primary)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="h-56 overflow-hidden mb-10 rounded-lg relative">
                        <div className="absolute inset-0 bg-[var(--color-orange-primary)]/20 mix-blend-overlay z-10" />
                        <img
                            alt="Corporate clean office space"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnef1NEealoMNRlvm5el5KAk6ssRRqBJy01poX_j1Lj8qSajGJelgoI5v9Qm2NM2JSZRLA3BqX8fPFBdpo_lNfVMsUdIaFOs2_BFCR8on-xTwLuLpouan1aspuhJUUoImYcEc8BPjeVOAJKWc-rJsF1rcEXtJ6S1JwbSFnjxGtX7kwjuHx-WJkGrx_BaUw-86iaBiLqJOxUT_1HuqkxyOF98e-1lrSgkh2L422j64c8FmGTGgTvgMJJS6ckpHF58nY6OqvGne8e0Su"
                        />
                    </div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <span className="text-xs font-black text-[var(--color-orange-primary)] uppercase tracking-widest block border border-[var(--color-orange-primary)] px-3 py-1 rounded bg-[var(--color-orange-primary)]/10 shadow-[0_0_10px_rgba(255,111,65,0.3)]">
                            02
                        </span>
                        <div className="h-px bg-white/20 flex-grow" />
                    </div>
                    <h3 className="font-display text-3xl text-white mb-4 group-hover:text-[var(--color-orange-primary)] transition-colors relative z-10">
                        Strategic Vision
                    </h3>
                    <p className="text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-light mb-8 relative z-10 group-hover:text-dark-text-secondary transition-colors">
                        Forward-thinking strategies that align technical capabilities with long-term business objectives.
                    </p>
                    <a
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white hover:text-[var(--color-orange-primary)] transition-colors pb-1 group/link relative z-10 font-bold"
                        href="#"
                    >
                        Explore
                        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform group-hover/link:text-glow">
                            arrow_forward
                        </span>
                    </a>
                </div>

                <div className="glass-card p-10 hover:-translate-y-4 transition-all duration-500 group rounded-2xl border-t border-l border-white/10 border-b border-r border-black/50 hover:border-[var(--color-violet)]/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-violet)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="h-56 overflow-hidden mb-10 rounded-lg relative">
                        <div className="absolute inset-0 bg-[var(--color-violet)]/20 mix-blend-overlay z-10" />
                        <img
                            alt="Network connections abstract"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcmfWKsXoUB8E1BsJSWfIdnE6EUhdOtrA0iLsybfbJsYFsH2TgJTu0uiGon4csaDyOIuvRMqDvI4E0Gd_jQPRc47f1NGfG1SK23LjJy30MsMnqcLX_38e1F2tu1-fMFGG-U_LkABrAS4JTUWZO7iqQuj26NaYOLQMkbsi1SqGYpvNBJW8RjHzAlAFQ-76wJth79mIC5J1mTTiB8vDXh6xQLIH5WAkfrC-0LGcO_gZXJ0YsVNAMefSFfAIA-dHWmZWiILM2yUIKXu5C"
                        />
                    </div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <span className="text-xs font-black text-[var(--color-violet)] uppercase tracking-widest block border border-[var(--color-violet)] px-3 py-1 rounded bg-[var(--color-violet)]/10 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                            03
                        </span>
                        <div className="h-px bg-white/20 flex-grow" />
                    </div>
                    <h3 className="font-display text-3xl text-white mb-4 group-hover:text-[var(--color-violet)] transition-colors relative z-10">
                        Global Connectivity
                    </h3>
                    <p className="text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-light mb-8 relative z-10 group-hover:text-dark-text-secondary transition-colors">
                        Building bridges between disparate systems. Creating a unified language for your entire tech stack.
                    </p>
                    <a
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white hover:text-[var(--color-violet)] transition-colors pb-1 group/link relative z-10 font-bold"
                        href="#"
                    >
                        Explore
                        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform group-hover/link:text-glow">
                            arrow_forward
                        </span>
                    </a>
                </div>
            </div>
        </div>
    </section>
);

export default PrinciplesSection;

