import type { FC } from 'react';
import { useAuth } from '@/context/AuthContext';

const CardProfile: FC = () => {
    const { user } = useAuth();

    const getInitials = () => {
        if (!user) return 'U';
        const first = user.firstName?.charAt(0) || '';
        const last = user.lastName?.charAt(0) || '';
        return (first + last).toUpperCase() || 'U';
    };

    const getFullName = () => {
        if (!user) return 'User';
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    };

    if (!user) {
        return (
            <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6">
                <div className="text-light-text-secondary dark:text-dark-text-secondary">Please login to view profile</div>
            </div>
        );
    }

    return (
        <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6">
            <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo to-wine rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
                    {getInitials()}
                </div>
                <h3 className="text-2xl font-semibold text-light-text dark:text-dark-text mb-2">
                    {getFullName()}
                </h3>
                {user.position && user.company && (
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                        {user.position} at {user.company}
                    </p>
                )}
                {user.bio && (
                    <div className="mt-4 text-center max-w-md">
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            {user.bio}
                        </p>
                    </div>
                )}
                {user.location && (
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
                        📍 {user.location}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CardProfile;
