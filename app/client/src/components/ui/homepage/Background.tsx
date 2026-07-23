import type { FC } from 'react';

const Background: FC = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--color-blue-primary)] opacity-20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[var(--color-violet)] opacity-20 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[var(--color-orange-primary)] opacity-10 blur-[120px]" />
    </div>
);

export default Background;

