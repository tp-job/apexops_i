import type { FC } from 'react';
import { Link } from 'react-router-dom';

const QuickActionsBar: FC = () => {
    const actions = [
        { icon: <i className="ri-add-large-fill"></i>, label: 'New Ticket', color: 'ember', link: '/bug-tracker' },
        { icon: <i className="ri-terminal-fill"></i>, label: 'View Logs', color: 'indigo', link: '/bug-tracker' },
        { icon: <i className="ri-bar-chart-fill"></i>, label: 'Reports', color: 'wine', link: '/bug-tracker' },
        { icon: <i className="ri-crosshair-2-fill"></i>, label: 'Activity', color: 'peach', link: '/bug-tracker' },
    ];

    const colorClasses = {
        ember: 'bg-white/5 text-gray-300 hover:bg-brand-accent hover:text-brand-dark border border-white/10',
        indigo: 'bg-white/5 text-gray-300 hover:bg-brand-accent hover:text-brand-dark border border-white/10',
        wine: 'bg-white/5 text-gray-300 hover:bg-brand-accent hover:text-brand-dark border border-white/10',
        peach: 'bg-white/5 text-gray-300 hover:bg-brand-accent hover:text-brand-dark border border-white/10',
    };

    return (
        <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brand-dark font-heading">
                    Quick Actions
                </h3>
                <Link
                    to="/bug-tracker"
                    className="text-sm text-brand-accent hover:text-white font-medium flex items-center gap-1"
                >
                    Go to Bug Tracker
                    {/* <ExternalLink className="w-4 h-4" /> */}
                    <i className="ri-external-link-fill"></i>
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {actions.map((action, index) => (
                    <Link
                        key={index}
                        to={action.link}
                        className={`
                            flex flex-col items-center gap-2 p-4 rounded-xl
                            transition-all duration-300 hover:scale-105 hover:shadow-lg
                            ${colorClasses[action.color as keyof typeof colorClasses]}
                        `}
                    >
                        {action.icon}
                        <span className="text-sm font-medium">{action.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default QuickActionsBar;
