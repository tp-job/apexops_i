import type { FC } from 'react';

const HeroSection: FC = () => (
    <header className="relative pt-40 pb-32 lg:pt-56 lg:pb-40 px-6 lg:px-12 max-w-7xl mx-auto z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-blue-primary)] to-transparent opacity-50 blur-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
            <div className="lg:col-span-6 flex flex-col justify-between h-full space-y-12 relative">
                <div>
                    <span className="inline-block px-3 py-1 mb-6 text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--color-orange-primary)] border border-[var(--color-orange-primary)]/30 rounded bg-[var(--color-orange-primary)]/5 shadow-[0_0_15px_rgba(255,111,65,0.2)]">
                        Next Gen Infrastructure
                    </span>
                    <h1 className="font-display text-6xl lg:text-8xl leading-[0.9] text-white font-medium mb-8 tracking-tight drop-shadow-2xl">
                        Building the <br />
                        <span className="font-sans font-black italic text-6xl lg:text-8xl ml-1 text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-blue-primary)] via-[var(--color-violet)] to-[var(--color-pink)] animate-pulse">
                            FUTURE
                        </span>
                        of <br /> Tech Ops
                    </h1>
                    <div className="w-32 h-1 bg-gradient-to-r from-[var(--color-blue-primary)] to-[var(--color-orange-primary)] mb-10 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                </div>
                <div className="relative pl-8 border-l-2 border-[var(--color-violet)]/50 backdrop-blur-sm bg-white/5 p-6 rounded-r-xl border-t border-b border-white/10">
                    <p className="text-xl text-dark-text-secondary font-light leading-relaxed italic font-display">
                        "The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart."
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.15em] text-[var(--color-blue-primary)] font-bold">— Helen Keller</p>
                </div>
            </div>
            <div className="lg:col-span-6 relative pl-0 lg:pl-12 group perspective-1000">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-blue-primary)] via-[var(--color-violet)] to-[var(--color-orange-primary)] blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity duration-700 rounded-full animate-pulse" />
                <div className="relative aspect-[16/11] overflow-hidden bg-dark-bg rounded-xl border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.3)] transform group-hover:rotate-1 transition-transform duration-700">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                    <img
                        alt="Modern futuristic data center with neon lights"
                        className="w-full h-full object-cover opacity-90 hover:scale-110 transition-transform duration-[2s] ease-out mix-blend-overlay"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpS4Vp0jSlOUhG3fIgW_bHuGkYwQnlstXB46P2U9eufD1ci5vLudRCKr8Ak0n-hPygtK1zoPwOsU9oglGqISKlZ0YKJNpJsgAukqbCWreHoTIr0r1oNYj8swYn5SGbm6iHdbTGZIwM5yE_ojLXR44QrUAltLL-5W0F8EZoYr7lWk6-QmX9IJbckITVziLgUgUf5E2a2T1sRbN2LlZF7xKnWO62KqVlm7uHefWRSP4vsyvH25apYUS3oYQ1G3IEn_Mj0nTMl-B52qmS"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-blue-primary)]/20 to-[var(--color-orange-primary)]/20 mix-blend-color-dodge pointer-events-none" />
                </div>
                <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-black/60 backdrop-blur-xl border border-[var(--color-blue-primary)]/50 z-20 hidden lg:flex items-center justify-center rounded-full shadow-[0_0_30px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[var(--color-blue-primary)] text-5xl font-light animate-float">arrow_outward</span>
                </div>
            </div>
        </div>
    </header>
);

export default HeroSection;

