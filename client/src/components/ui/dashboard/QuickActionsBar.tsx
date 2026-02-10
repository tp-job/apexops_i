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
        ember: 'bg-ember/10 text-ember hover:bg-ember hover:text-white',
        indigo: 'bg-indigo/10 text-indigo hover:bg-indigo hover:text-white',
        wine: 'bg-wine/10 text-wine hover:bg-wine hover:text-white',
        peach: 'bg-peach/10 text-peach hover:bg-peach hover:text-white',
    };

    return (
        <div className="rounded-2xl p-6 bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold dark:text-dark-text-primary text-light-text-primary">
                    Quick Actions
                </h3>
                <Link
                    to="/bug-tracker"
                    className="text-sm text-ember hover:text-wine font-medium flex items-center gap-1"
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
