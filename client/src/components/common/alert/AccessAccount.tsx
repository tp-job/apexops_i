import type { FC } from 'react';
import { Link } from 'react-router-dom';

interface AccessAccountProps {
    /** Title text */
    title?: string;
    /** Description text */
    description?: string;
    /** Show deactivate button */
    showDeactivate?: boolean;
    /** Custom login route */
    loginRoute?: string;
}

const AccessAccount: FC<AccessAccountProps> = ({
    title = 'Login Required',
    description = 'Please login to access account settings.',
    showDeactivate = false,
    loginRoute = '/auth',
}) => {
    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="max-w-xl w-full mx-auto bg-light-surface dark:bg-dark-surface rounded-xl overflow-hidden shadow-lg border border-light-border dark:border-dark-border">
                {/* Header */}
                <div className="max-w-sm mx-auto pt-12 pb-8 px-5 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-5 bg-global-red/10 dark:bg-global-red/20 rounded-full">
                        <i className="ri-shield-user-line text-global-red text-3xl"></i>
                    </div>
                    <h4 className="text-2xl text-light-text-primary dark:text-dark-text-primary font-semibold mb-3">
                        {title}
                    </h4>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Actions */}
                <div className="pt-5 pb-6 px-6 bg-light-surface-2 dark:bg-dark-surface-2 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center">
                    {showDeactivate && (
                        <Link
                            to="#"
                            className="inline-block w-full sm:w-auto py-3 px-6 text-center font-semibold leading-6 text-light-text-secondary dark:text-dark-text-secondary bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border rounded-lg transition duration-200 border border-light-border dark:border-dark-border"
                        >
                            Deactivate
                        </Link>
                    )}
                    <Link
                        to={loginRoute}
                        className="group flex items-center justify-center w-full sm:w-auto min-w-[140px] h-12 bg-gradient-to-r from-blue-primary to-orange-primary rounded-lg cursor-pointer relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                    >
                        <div className="flex items-center justify-center gap-2 px-6 text-white font-semibold">
                            <i className="ri-login-box-line text-xl"></i>
                            <span>Login</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AccessAccount;
