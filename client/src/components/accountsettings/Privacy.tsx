import type { FC } from 'react'

const Privacy: FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-light-surface dark:bg-dark-surface backdrop-blur-sm border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="text-light-text dark:text-dark-text font-semibold text-lg mb-6">Privacy Settings</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg">
                        <p className="text-ember dark:text-peach text-sm">
                            Your privacy is important to us. These settings help you control how your information is shared and used.
                        </p>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-light-border dark:border-dark-border">
                        <div>
                            <p className="text-light-text dark:text-dark-text font-medium">Profile Visibility</p>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">Make your profile visible to other team members</p>
                        </div>
                        <button className="relative w-12 h-6 rounded-full bg-ember">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full translate-x-6"></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-light-border dark:border-dark-border">
                        <div>
                            <p className="text-light-text dark:text-dark-text font-medium">Activity Status</p>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">Show when you're online</p>
                        </div>
                        <button className="relative w-12 h-6 rounded-full bg-ember">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full translate-x-6"></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-light-text dark:text-dark-text font-medium">Data Collection</p>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">Allow anonymous usage data collection</p>
                        </div>
                        <button className="relative w-12 h-6 rounded-full bg-light-surface-2 dark:bg-dark-border">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"></div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-red-500/10 dark:bg-red-500/20 backdrop-blur-sm border border-red-500/20 dark:border-red-500/30 rounded-2xl p-6">
                <h3 className="text-red-500 dark:text-red-400 font-semibold text-lg mb-4">Danger Zone</h3>
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Delete Account
                </button>
            </div>
        </div>
    )
}

export default Privacy
