import type { FC } from 'react';

const Navbar: FC = () => (
    <nav className="fixed w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer">
                <div className="relative">
                    <span className="absolute inset-0 bg-[var(--color-blue-primary)] blur-md rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="relative block w-3 h-3 bg-white rounded-full" />
                </div>
                <span className="font-display text-2xl font-bold tracking-wide text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-dark-text-secondary group-hover:to-[var(--color-blue-primary)] transition-all">
                    ApexOps
                </span>
            </div>
            <div className="hidden md:flex items-center space-x-10 text-xs uppercase tracking-widest text-dark-text-secondary font-bold">
                <a className="hover:text-[var(--color-orange-primary)] hover:text-glow transition-all duration-300" href="#">
                    Evolution
                </a>
                <a className="hover:text-[var(--color-blue-primary)] hover:text-glow transition-all duration-300" href="#">
                    Capabilities
                </a>
                <a className="hover:text-[var(--color-pink)] hover:text-glow transition-all duration-300" href="#">
                    Insights
                </a>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[var(--color-green)] bg-black/50 px-3 py-1.5 rounded-full border border-[var(--color-green)]/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-1.5 h-1.5 bg-[var(--color-green)] rounded-full animate-pulse-fast shadow-[0_0_8px_#10B981]" />
                    SYSTEM ONLINE
                </div>
                <button className="md:hidden text-white hover:text-[var(--color-blue-primary)] transition-colors">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </div>
        </div>
    </nav>
);

export default Navbar;

