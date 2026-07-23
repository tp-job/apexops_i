import type { FC } from 'react';
import { GridDotsPanel } from '@/components/common/GridDotsPanel';

const PresentStatPanel: FC = () => (
    <GridDotsPanel gradientClassName="bg-gradient-to-br from-orange-primary via-status-critical to-accent-purple">
        <div className="space-y-2 lg:space-y-6">
            <p className="text-sm lg:text-lg font-light tracking-wide opacity-90">
                Real-time <br className="hidden lg:block" /> data analytic
            </p>
            <h1 className="text-7xl lg:text-[10rem] font-bold leading-none tracking-tight">84%</h1>
            <p className="text-sm lg:text-lg font-light tracking-wide opacity-90">
                Real-time <br className="hidden lg:block" /> data analytic
            </p>
        </div>
    </GridDotsPanel>
);

export default PresentStatPanel;

