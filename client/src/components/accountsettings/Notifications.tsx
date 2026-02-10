import type { FC } from 'react'
import type { NotificationSettings } from '@/types/accountSettings'

interface NotificationsProps {
    notifications: NotificationSettings;
    onToggle: (field: keyof NotificationSettings) => void;
}

const Notifications: FC<NotificationsProps> = ({ notifications, onToggle }) => {
    return (
        <div className="space-y-6">
            <div className="bg-light-surface dark:bg-dark-surface backdrop-blur-sm border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="text-light-text dark:text-dark-text font-semibold text-lg mb-6">Notification Preferences</h3>
                <div className="space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b border-light-border dark:border-dark-border last:border-0">
                            <div>
                                <p className="text-light-text dark:text-dark-text font-medium">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </p>
                                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                                    {key === 'emailNotifications' && 'Receive notifications via email'}
                                    {key === 'pushNotifications' && 'Receive push notifications in browser'}
                                    {key === 'bugAlerts' && 'Get notified when critical bugs are detected'}
                                    {key === 'weeklyReports' && 'Receive weekly summary reports'}
                                    {key === 'teamUpdates' && 'Get updates about team activities'}
                                </p>
                            </div>
                            <button
                                onClick={() => onToggle(key as keyof NotificationSettings)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    value 
                                        ? 'bg-ember' 
                                        : 'bg-light-surface-2 dark:bg-dark-border'
                                }`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    value ? 'translate-x-6' : 'translate-x-0'
                                }`}></div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Notifications;