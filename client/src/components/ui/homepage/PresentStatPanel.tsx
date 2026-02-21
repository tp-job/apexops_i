import type { FC } from 'react';

const PresentStatPanel: FC = () => (
    <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen relative bg-gradient-to-br from-orange-primary via-status-critical to-accent-purple flex items-center justify-center p-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
            <div className="grid-line-v left-1/6 lg:left-[15%]" />
            <div className="grid-line-v right-1/6 lg:right-[15%]" />
            <div className="grid-line-h top-1/4" />
            <div className="grid-line-h bottom-1/4" />
            <div className="dot-intersection top-[calc(25%-6px)] left-[calc(16.6%-6px)] lg:left-[calc(15%-6px)] ring-4 ring-white/20" />
            <div className="dot-intersection top-[calc(25%-6px)] right-[calc(16.6%-6px)] lg:right-[calc(15%-6px)] ring-4 ring-white/20" />
            <div className="dot-intersection bottom-[calc(25%-6px)] left-[calc(16.6%-6px)] lg:left-[calc(15%-6px)] ring-4 ring-white/20" />
            <div className="dot-intersection bottom-[calc(25%-6px)] right-[calc(16.6%-6px)] lg:right-[calc(15%-6px)] ring-4 ring-white/20" />
        </div>
        <div className="relative z-10 text-center text-white space-y-2 lg:space-y-6">
            <p className="text-sm lg:text-lg font-light tracking-wide opacity-90">
                Real-time <br className="hidden lg:block" /> data analytic
            </p>
            <h1 className="text-7xl lg:text-[10rem] font-bold leading-none tracking-tight">84%</h1>
            <p className="text-sm lg:text-lg font-light tracking-wide opacity-90">
                Real-time <br className="hidden lg:block" /> data analytic
            </p>
        </div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
    </div>
);

export default PresentStatPanel;

