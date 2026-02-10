import NoteDashboard from '@/components/ui/note/NoteDashboard';
import type { FC } from 'react';

const NotePage: FC = () => {
    return (
        <div className="min-h-screen transition-colors duration-300">
            <NoteDashboard />
        </div>
    );
};

export default NotePage;
