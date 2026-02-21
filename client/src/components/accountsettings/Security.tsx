import type { FC } from 'react'
import { Lock } from 'lucide-react'
import type { SecuritySettings } from '@/types/accountSettings'

interface SecurityProps {
    security: SecuritySettings;
    onToggle: (field: keyof SecuritySettings) => void;
    onSelectChange: (value: string) => void;
}

const Security: FC<SecurityProps> = ({ security, onToggle, onSelectChange }) => {
    return (
        <div className="space-y-6">
            <div className="bg-light-surface dark:bg-dark-surface backdrop-blur-sm border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="text-light-text dark:text-dark-text font-semibold text-lg mb-6">Security Settings</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-light-border dark:border-dark-border">
                        <div>
                            <p className="text-light-text dark:text-dark-text font-medium">Two-Factor Authentication</p>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">Add an extra layer of security to your account</p>
                        </div>
                        <button
                            onClick={() => onToggle('twoFactorAuth')}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                security.twoFactorAuth 
                                    ? 'bg-orange-primary' 
                                    : 'bg-light-surface-2 dark:bg-dark-border'
                            }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                security.twoFactorAuth ? 'translate-x-6' : 'translate-x-0'
                            }`}></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-light-border dark:border-dark-border">
                        <div>
                            <p className="text-light-text dark:text-dark-text font-medium">Login Alerts</p>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">Get notified of new login attempts</p>
                        </div>
                        <button
                            onClick={() => onToggle('loginAlerts')}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                security.loginAlerts 
                                    ? 'bg-orange-primary' 
                                    : 'bg-light-surface-2 dark:bg-dark-border'
                            }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                security.loginAlerts ? 'translate-x-6' : 'translate-x-0'
                            }`}></div>
                        </button>
                    </div>
                    <div className="py-3">
                        <label className="block text-light-text dark:text-dark-text font-medium mb-2">Session Timeout</label>
                        <select
                            value={security.sessionTimeout}
                            onChange={(e) => onSelectChange(e.target.value)}
                            className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:border-global-blue transition-colors"
                        >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="120">2 hours</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface backdrop-blur-sm border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="text-light-text dark:text-dark-text font-semibold text-lg mb-6">Change Password</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-light-text-secondary dark:text-dark-text-secondary text-sm mb-2">Current Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:border-global-blue transition-colors"
                                placeholder="Enter current password"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-light-text-secondary dark:text-dark-text-secondary text-sm mb-2">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:border-global-blue transition-colors"
                                placeholder="Enter new password"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-light-text-secondary dark:text-dark-text-secondary text-sm mb-2">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:border-global-blue transition-colors"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-orange-primary hover:bg-blue-primary text-white rounded-lg text-sm font-medium transition-colors">
                        Update Password
                    </button>
                </div>
            </div>
        </div>
    )
}
    
export default Security
