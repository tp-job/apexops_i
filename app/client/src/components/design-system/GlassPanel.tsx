import type { FC, ReactNode } from 'react';

interface GlassPanelProps {
    variant?: 'light' | 'dark' | 'blue';
    radius?: 'xl' | '2xl' | '3xl';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    className?: string;
    children: ReactNode;
}

const surfaceClass: Record<NonNullable<GlassPanelProps['variant']>, string> = {
    light: 'glass-panel',
    dark: 'glass-dark',
    blue: 'glass-blue',
};

const radiusClass: Record<NonNullable<GlassPanelProps['radius']>, string> = {
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
};

const paddingClass: Record<NonNullable<GlassPanelProps['padding']>, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

const GlassPanel: FC<GlassPanelProps> = ({
    variant = 'light',
    radius = '3xl',
    padding = 'md',
    className = '',
    children,
}) => {
    return (
        <div className={`${surfaceClass[variant]} ${radiusClass[radius]} ${paddingClass[padding]} ${className}`.trim()}>
            {children}
        </div>
    );
};

export default GlassPanel;
