import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { getIcon } from '@/utils/iconMapping';
import type { NotificationSettings, SecuritySettings } from '../types/accountSettings';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Notifications from '@/components/accountsettings/Notifications';
import Security from '@/components/accountsettings/Security';
import Privacy from '@/components/accountsettings/Privacy';
import Profile from '@/components/accountsettings/Profile';
import PersonalInfo from '@/components/accountsettings/PersonalInfo';
import AccessAccount from '@/components/common/alert/AccessAccount';

// ── Shared style helpers ───────────────────────────────────────
const card = 'bg-white dark:bg-dark-surface rounded-2xl border border-light-border/60 dark:border-dark-border/60 shadow-sm';
const sectionPad = 'p-6 sm:p-8';
const textPrimary = 'text-light-text dark:text-dark-text';
const textSecondary = 'text-light-text-secondary dark:text-dark-text-secondary';
const btnOutline = 'px-5 py-2.5 text-sm font-medium rounded-xl border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-border transition-colors';

// ── Tab config ─────────────────────────────────────────────────
const tabs = [
    { id: 'personal-info', label: 'ข้อมูลส่วนบุคคล', icon: 'ri-user-circle-fill' },
    { id: 'profile', label: 'โปรไฟล์', icon: 'ri-user-circle-fill' },
    { id: 'security', label: 'ความปลอดภัย', icon: 'ri-key-fill' },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: 'ri-notification-3-fill' },
    { id: 'privacy', label: 'ความเป็นส่วนตัว', icon: 'ri-lock-fill' },
];

// ── Toggle button for theme / language ─────────────────────────
const ToggleButton: FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            active
                ? 'bg-orange-primary text-white shadow-md shadow-orange-primary/20'
                : `bg-white dark:bg-dark-surface-2 border border-light-border dark:border-dark-border ${textSecondary} hover:border-orange-primary/40 hover:text-orange-primary`
        }`}
    >
        {icon}
        {label}
    </button>
);

// ── Main Component ─────────────────────────────────────────────
const AccountSettings: FC = () => {
    const { user, settings, updateSettings, updateProfile, loading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('personal-info');
    const [showSuccess, setShowSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => theme);

    const [currentLanguage, setCurrentLanguage] = useState<'th' | 'en'>(() =>
        user?.language?.includes('English') ? 'en' : 'th'
    );

    const [notifications, setNotifications] = useState<NotificationSettings>({
        emailNotifications: true,
        pushNotifications: true,
        bugAlerts: true,
        weeklyReports: false,
        teamUpdates: true
    });

    const [security, setSecurity] = useState<SecuritySettings>({
        twoFactorAuth: false,
        sessionTimeout: '30',
        loginAlerts: true
    });

    // ── Effects ────────────────────────────────────────────────
    useEffect(() => {
        if (settings) {
            setNotifications({
                emailNotifications: settings.emailNotifications ?? true,
                pushNotifications: settings.pushNotifications ?? true,
                bugAlerts: settings.bugAlerts ?? true,
                weeklyReports: settings.weeklyReports ?? false,
                teamUpdates: settings.teamUpdates ?? true
            });
            setSecurity({
                twoFactorAuth: settings.twoFactorAuth ?? false,
                sessionTimeout: String(settings.sessionTimeout ?? 30),
                loginAlerts: settings.loginAlerts ?? true
            });
        }
    }, [settings]);

    useEffect(() => {
        if (user?.language) {
            setCurrentLanguage(user.language.includes('English') ? 'en' : 'th');
        }
    }, [user]);

    // ── Handlers ───────────────────────────────────────────────
    const handleNotificationToggle = (field: keyof NotificationSettings) => {
        setNotifications(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSecurityToggle = (field: keyof SecuritySettings) => {
        if (field === 'sessionTimeout') return;
        setSecurity(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleThemeChange = (nextTheme: 'light' | 'dark') => {
        setCurrentTheme(nextTheme);
        setTheme(nextTheme); // ThemeProvider will toggle .dark class + persist to localStorage
    };

    const handleLanguageChange = async (lang: 'th' | 'en') => {
        setCurrentLanguage(lang);
        try {
            await updateProfile({ language: lang === 'th' ? 'ไทย (Thai)' : 'English (US)' });
        } catch (err) {
            console.error('Error updating language:', err);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateSettings({
                emailNotifications: notifications.emailNotifications,
                pushNotifications: notifications.pushNotifications,
                bugAlerts: notifications.bugAlerts,
                weeklyReports: notifications.weeklyReports,
                teamUpdates: notifications.teamUpdates,
                twoFactorAuth: security.twoFactorAuth,
                sessionTimeout: parseInt(security.sessionTimeout),
                loginAlerts: security.loginAlerts
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
        } finally {
            setSaving(false);
        }
    };

    const getInitials = () => {
        if (!user) return 'U';
        return ((user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')).toUpperCase() || 'U';
    };

    // ── Guard states ───────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
                <div className={textSecondary}>Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
                <AccessAccount />
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            {/* ── Success Toast ── */}
            {showSuccess && (
                <div className="fixed top-24 right-6 z-50 bg-global-green/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-in-right">
                    {(() => {
                        const CheckIcon = getIcon('ri-check-fill');
                        return CheckIcon ? <CheckIcon className="w-5 h-5 transition-colors duration-200" /> : null;
                    })()}
                    <span className="font-medium">บันทึกสำเร็จ!</span>
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* ── Header ── */}
                <div className="mb-10 animate-fade-in-up">
                    <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${textPrimary}`}>
                        การตั้งค่าบัญชี
                    </h1>
                    <p className={textSecondary}>อัปเดตโปรไฟล์และข้อมูลส่วนตัวของคุณ</p>
                </div>

                {/* ── Profile Photo ── */}
                <div className={`${card} ${sectionPad} mb-8 animate-fade-in-up`} style={{ animationDelay: '0.05s' }}>
                    <div className="flex items-center gap-6">
                        <div className="relative group shrink-0">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt="Profile"
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-light-surface-2 dark:ring-dark-border"
                                />
                            ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-primary via-blue-secondary to-orange-primary flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ring-4 ring-light-surface-2 dark:ring-dark-border">
                                    {getInitials()}
                                </div>
                            )}
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-primary hover:bg-blue-secondary rounded-full flex items-center justify-center border-2 border-white dark:border-dark-surface transition-colors shadow-md">
                                {(() => {
                                    const CameraIcon = getIcon('ri-camera-fill');
                                    return CameraIcon ? <CameraIcon className="w-4 h-4 text-white transition-colors duration-200" /> : null;
                                })()}
                            </button>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-bold mb-0.5 ${textPrimary}`}>รูปโปรไฟล์</h3>
                            <p className={`text-sm mb-4 ${textSecondary}`}>รูปนี้จะแสดงบนโปรไฟล์ของคุณ</p>
                            <div className="flex items-center gap-3">
                                <button className={btnOutline}>เปลี่ยนรูป</button>
                                <button className="px-5 py-2.5 text-sm font-medium rounded-xl text-orange-primary hover:bg-orange-primary/10 transition-colors">
                                    ลบรูป
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Display Settings ── */}
                <div className={`${card} ${sectionPad} mb-10 animate-fade-in-up`} style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-full bg-orange-primary/10 dark:bg-orange-primary/20 flex items-center justify-center">
                            {(() => {
                                const GlobeIcon = getIcon('ri-globe-fill');
                                return GlobeIcon ? <GlobeIcon className="w-4 h-4 text-orange-primary transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <h2 className={`text-xl font-bold ${textPrimary}`}>การตั้งค่าการแสดงผล</h2>
                    </div>
                    <p className={`text-sm mb-8 ml-11 ${textSecondary}`}>ปรับแต่ง Theme และภาษาตามต้องการ</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Theme */}
                        <div className="bg-light-surface-2/50 dark:bg-dark-bg/50 rounded-2xl p-6 border border-light-border/40 dark:border-dark-border/40">
                            <div className="flex items-center gap-2.5 mb-1">
                                {(() => {
                                    const SunIcon = getIcon('ri-sun-fill');
                                    return SunIcon ? <SunIcon className="w-5 h-5 text-peach transition-colors duration-200" /> : null;
                                })()}
                                <h3 className={`font-bold ${textPrimary}`}>ธีมหน้าจอ</h3>
                            </div>
                            <p className={`text-xs mb-5 ${textSecondary}`}>เลือกระหว่างโหมดสว่างและมืด</p>

                            <div className="grid grid-cols-2 gap-3">
                                <ToggleButton
                                    active={currentTheme === 'light'}
                                    onClick={() => handleThemeChange('light')}
                                    icon={(() => {
                                        const SunIcon = getIcon('ri-sun-fill');
                                        return SunIcon ? <SunIcon className="w-4 h-4 transition-colors duration-200" /> : null;
                                    })()}
                                    label="สว่าง"
                                />
                                <ToggleButton
                                    active={currentTheme === 'dark'}
                                    onClick={() => handleThemeChange('dark')}
                                    icon={(() => {
                                        const MoonIcon = getIcon('ri-moon-fill');
                                        return MoonIcon ? <MoonIcon className="w-4 h-4 transition-colors duration-200" /> : null;
                                    })()}
                                    label="มืด"
                                />
                            </div>

                            <p className={`text-xs mt-4 text-center ${textSecondary}`}>
                                ปัจจุบัน: <span className={`font-semibold ${textPrimary}`}>{currentTheme === 'light' ? 'Light' : 'Dark'}</span>
                            </p>
                        </div>

                        {/* Language */}
                        <div className="bg-light-surface-2/50 dark:bg-dark-bg/50 rounded-2xl p-6 border border-light-border/40 dark:border-dark-border/40">
                            <div className="flex items-center gap-2.5 mb-1">
                                {(() => {
                                    const GlobeIcon = getIcon('ri-globe-fill');
                                    return GlobeIcon ? <GlobeIcon className="w-5 h-5 text-blue-primary transition-colors duration-200" /> : null;
                                })()}
                                <h3 className={`font-bold ${textPrimary}`}>ภาษา</h3>
                            </div>
                            <p className={`text-xs mb-5 ${textSecondary}`}>เลือกภาษาที่ต้องการแสดงผล</p>

                            <div className="grid grid-cols-2 gap-3">
                                <ToggleButton
                                    active={currentLanguage === 'th'}
                                    onClick={() => handleLanguageChange('th')}
                                    icon={<span className="text-xs font-bold">TH</span>}
                                    label="ไทย"
                                />
                                <ToggleButton
                                    active={currentLanguage === 'en'}
                                    onClick={() => handleLanguageChange('en')}
                                    icon={<span className="text-xs font-bold">US</span>}
                                    label="English"
                                />
                            </div>

                            <p className={`text-xs mt-4 text-center ${textSecondary}`}>
                                ปัจจุบัน: <span className={`font-semibold ${textPrimary}`}>{currentLanguage === 'th' ? 'ไทย' : 'English'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Tab Navigation ── */}
                <div className="border-b border-light-border/60 dark:border-dark-border/60 mb-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <div className="flex overflow-x-auto scrollbar-none -mb-px">
                        {tabs.map((tab) => {
                            const TabIcon = getIcon(tab.icon);
                            return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'text-orange-primary'
                                        : `${textSecondary} hover:text-light-text dark:hover:text-dark-text`
                                }`}
                            >
                                {TabIcon && <TabIcon className={`text-lg transition-colors duration-200 ${
                                    activeTab === tab.id
                                        ? 'text-orange-primary'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary'
                                }`} />}
                                {tab.label}
                                {activeTab === tab.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-primary rounded-t-full" />
                                )}
                            </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Save Bar ── */}
                {activeTab !== 'personal-info' && (
                    <div className="flex items-center justify-end gap-3 mb-6 animate-fade-in">
                        <button className={btnOutline}>ยกเลิก</button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-orange-primary hover:bg-blue-primary text-white shadow-md shadow-orange-primary/20 hover:shadow-orange-primary/40 transition-all duration-200 flex items-center gap-2 disabled:opacity-60"
                        >
                            {(() => {
                                const SaveIcon = saving ? getIcon('ri-loader-line') : getIcon('ri-save-fill');
                                return SaveIcon ? <SaveIcon className={`w-4 h-4 transition-colors duration-200 ${saving ? 'animate-spin' : ''}`} /> : null;
                            })()}
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
                    </div>
                )}

                {/* ── Tab Content ── */}
                <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {activeTab === 'personal-info' && <PersonalInfo />}
                    {activeTab === 'profile' && <Profile />}
                    {activeTab === 'notifications' && (
                        <Notifications notifications={notifications} onToggle={handleNotificationToggle} />
                    )}
                    {activeTab === 'security' && (
                        <Security
                            security={security}
                            onToggle={handleSecurityToggle}
                            onSelectChange={(v) => setSecurity(prev => ({ ...prev, sessionTimeout: v }))}
                        />
                    )}
                    {activeTab === 'privacy' && <Privacy />}
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
