import type { FC, ReactNode } from 'react';

interface GridDotsPanelProps {
    children: ReactNode;
    className?: string;
    gradientClassName?: string;
}

export const GridDotsPanel: FC<GridDotsPanelProps> = ({
    children,
    className = '',
    gradientClassName = 'bg-gradient-to-br from-orange-primary via-status-critical to-violet',
}) => (
    <>
        <style>
            {`
                .grid-dots-panel .dot-intersection {
                    width: 12px;
                    height: 12px;
                    background-color: white;
                    border-radius: 50%;
                    position: absolute;
                    box-shadow: 0 0 15px 2px rgba(255, 255, 255, 0.6);
                }
                .grid-dots-panel .grid-line-h {
                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.4);
                    border-top: 1px dotted rgba(255, 255, 255, 0.8);
                }
                .grid-dots-panel .grid-line-v {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 1px;
                    background: rgba(255, 255, 255, 0.4);
                    border-left: 1px dotted rgba(255, 255, 255, 0.8);
                }
            `}
        </style>
        <div
            className={`w-full lg:w-1/2 h-[50vh] lg:h-screen relative ${gradientClassName} flex items-center justify-center p-8 overflow-hidden ${className}`}
        >
            <div className="absolute inset-0 pointer-events-none grid-dots-panel">
                <div className="grid-line-v left-1/6 lg:left-[15%]" />
                <div className="grid-line-v right-1/6 lg:right-[15%]" />
                <div className="grid-line-h top-1/4" />
                <div className="grid-line-h bottom-1/4" />
                <div className="dot-intersection top-[calc(25%-6px)] left-[calc(16.6%-6px)] lg:left-[calc(15%-6px)] ring-4 ring-white/20" />
                <div className="dot-intersection top-[calc(25%-6px)] right-[calc(16.6%-6px)] lg:right-[calc(15%-6px)] ring-4 ring-white/20" />
                <div className="dot-intersection bottom-[calc(25%-6px)] left-[calc(16.6%-6px)] lg:left-[calc(15%-6px)] ring-4 ring-white/20" />
                <div className="dot-intersection bottom-[calc(25%-6px)] right-[calc(16.6%-6px)] lg:right-[calc(15%-6px)] ring-4 ring-white/20" />
            </div>
            <div className="relative z-10 text-center text-white">{children}</div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        </div>
    </>
);
