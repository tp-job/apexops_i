import type { FC } from 'react';
import { Link } from 'react-router-dom';

const TopBar: FC = () => {
    return (
        <div className="bg-light-surface border-light-border dark:bg-dark-surface dark:border-dark-border border-b px-8 py-4 top-0">
            <div className="flex items-center justify-between">
                <div className="flex-1 max-w-xl">
                    <div className="relative">
                        <i className="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"></i>
                        <input type="text" placeholder="Search for events, patients etc." className="w-full pl-12 pr-4 py-3 bg-light-surface border-light-border text-light-text-primary placeholder-light-text dark:bg-dark-bg dark:border-dark-border dark:text-dark-text-primary dark:placeholder-dark-text-secondary border rounded-xl focus:ring-2 focus:ring-ember focus:border-transparent" />
                    </div>
                </div>
                <div className="flex items-center space-x-4 ml-6">
                    <Link to="/auth">
                        <button className="w-10 h-10 bg-light-border text-light-text-primary hover:bg-light-text-secondary dark:bg-dark-border dark:text-dark-text-primary dark:hover:bg-dark-surface rounded-xl flex items-center justify-center transition">
                            <i className="ri-login-box-line"></i>
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
