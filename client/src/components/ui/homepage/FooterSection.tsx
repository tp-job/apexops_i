import type { FC } from 'react';

const FooterSection: FC = () => (
    <div className="pt-32 pb-16 px-6 lg:px-12 max-w-7xl mx-auto relative border-t border-white/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-blue-primary)] to-transparent opacity-50 shadow-[0_0_10px_#3B82F6]" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-12">
            <div className="max-w-2xl">
                <h2 className="font-display text-5xl lg:text-8xl text-white leading-[0.9] mb-6">
                    Ready to define <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-orange-primary)] to-[var(--color-pink)]">
                        your timeline?
                    </span>
                </h2>
                <p className="text-xl text-light-text-secondary dark:text-dark-text-secondary font-light">Join the vanguard of technological evolution.</p>
            </div>
            <div>
                <a
                    className="relative inline-flex items-center justify-center px-12 py-6 overflow-hidden font-bold text-white transition-all duration-300 bg-[var(--color-orange-primary)] rounded-full group hover:scale-105 neon-glow-orange"
                    href="#"
                >
                    <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
                    <span className="relative text-xs uppercase tracking-[0.2em]">Contact Us</span>
                    <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            </div>
        </div>
    </div>
);

export default FooterSection;

