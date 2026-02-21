import type { FC } from 'react';
import { MapPin, Users, Droplets, Clock, Settings, ChevronRight, Star, Award } from 'lucide-react';

interface ProfileCardProps {
    profile: {
        name: string;
        role: string;
        location: string;
        patients: number;
        bloodType?: string;
        availability?: string;
        avatar?: string;
    };
}

const ProfileCard: FC<ProfileCardProps> = ({ profile }) => {
    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header with Gradient */}
            <div className="relative h-28 bg-gradient-to-br from-navy via-indigo to-wine overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-primary/20 rounded-full blur-xl translate-x-8 -translate-y-8" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-primary/20 rounded-full blur-xl -translate-x-8 translate-y-8" />
                
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                    }} />
                </div>

                {/* Settings Button */}
                <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm">
                    <Settings className="w-4 h-4 text-white" />
                </button>

                {/* Badge */}
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-peach fill-peach" />
                    <span className="text-xs font-medium text-white">Premium</span>
                </div>
            </div>

            {/* Avatar */}
            <div className="relative -mt-12 px-6">
                <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-primary to-blue-primary flex items-center justify-center text-4xl shadow-lg shadow-ember/20 ring-4 ring-white dark:ring-dark-surface">
                        {profile.avatar || '👤'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-global-green rounded-full border-2 border-white dark:border-dark-surface flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="px-6 pt-4 pb-6">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        {profile.name}
                    </h3>
                    <p className="text-sm text-ember font-medium">{profile.role}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatItem 
                        icon={<MapPin className="w-4 h-4" />}
                        label="Location"
                        value={profile.location}
                    />
                    <StatItem 
                        icon={<Users className="w-4 h-4" />}
                        label="Total Patients"
                        value={profile.patients.toLocaleString()}
                    />
                    {profile.bloodType && (
                        <StatItem 
                            icon={<Droplets className="w-4 h-4" />}
                            label="Blood Type"
                            value={profile.bloodType}
                        />
                    )}
                    {profile.availability && (
                        <StatItem 
                            icon={<Clock className="w-4 h-4" />}
                            label="Available"
                            value={profile.availability}
                        />
                    )}
                </div>

                {/* Achievements */}
                <div className="p-3 rounded-xl mb-4 bg-light-surface-2 dark:bg-dark-surface-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-ember" />
                            <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                Achievements
                            </span>
                        </div>
                        <span className="text-xs text-ember font-medium">12 earned</span>
                    </div>
                    <div className="flex gap-1.5">
                        {['🏆', '⭐', '🎯', '💎', '🔥'].map((badge, i) => (
                            <div 
                                key={i}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-white dark:bg-dark-surface shadow-sm"
                            >
                                {badge}
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-white text-light-text-secondary dark:bg-dark-surface dark:text-dark-text-secondary shadow-sm">
                            +7
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-primary to-blue-primary text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-primary/25 transition-all duration-300 hover:-translate-y-0.5">
                    <span>View Full Profile</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const StatItem: FC<{ icon: React.ReactNode; label: string; value: string }> = ({ 
    icon, label, value 
}) => (
    <div className="p-3 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2">
        <div className="flex items-center gap-2 mb-1 text-light-text-secondary dark:text-dark-text-secondary">
            {icon}
            <span className="text-xs">{label}</span>
        </div>
        <p className="text-sm font-semibold truncate text-light-text-primary dark:text-dark-text-primary">
            {value}
        </p>
    </div>
);

export default ProfileCard;
