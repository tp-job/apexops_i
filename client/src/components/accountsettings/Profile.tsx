import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Globe, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Profile: FC = () => {
    const { user, updateProfile } = useAuth();
    const [localData, setLocalData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        location: '',
        timezone: 'Asia/Bangkok (GMT+7)',
        bio: ''
    });

    // Sync localData with user data when user changes
    useEffect(() => {
        if (user) {
            setLocalData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                company: user.company || '',
                position: user.position || '',
                location: user.location || '',
                timezone: user.timezone || 'Asia/Bangkok (GMT+7)',
                bio: user.bio || ''
            });
        }
    }, [user]);

    const handleInputChange = (field: string, value: string) => {
        setLocalData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await updateProfile(localData);
        } catch (err) {
            console.error('Error updating profile:', err);
        }
    };

    const getInitials = () => {
        const first = localData.firstName?.charAt(0) || '';
        const last = localData.lastName?.charAt(0) || '';
        return (first + last).toUpperCase() || 'U';
    };

    if (!user) {
        return <div className="text-light-text-secondary dark:text-dark-text-secondary">Please login to view profile</div>;
    }

    return (
        <div className="space-y-6">
            {/* Profile Picture */}
            <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="font-semibold text-lg mb-6 text-light-text dark:text-dark-text">Profile Picture</h3>
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo to-wine rounded-full flex items-center justify-center text-white text-3xl font-bold">
                            {getInitials()}
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-global-blue hover:bg-blue-700 dark:hover:bg-blue-600 rounded-full flex items-center justify-center border-2 border-light-bg dark:border-dark-bg transition-colors">
                            <Camera className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <div>
                        <p className="font-medium mb-1 text-light-text dark:text-dark-text">Upload new picture</p>
                        <p className="text-sm mb-3 text-light-text-secondary dark:text-dark-text-secondary">JPG, PNG or GIF. Max size 2MB</p>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-global-blue hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                                Upload
                            </button>
                            <button className="px-4 py-2 bg-light-surface-2 dark:bg-dark-border border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-surface dark:hover:bg-dark-surface rounded-lg text-sm font-medium transition-colors">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal Information */}
            <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="font-semibold text-lg mb-6 text-light-text dark:text-dark-text">Personal Information</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">First Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                value={localData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Last Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                value={localData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="email"
                                value={localData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="tel"
                                value={localData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Professional Information */}
            <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6">
                <h3 className="font-semibold text-lg mb-6 text-light-text dark:text-dark-text">Professional Information</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Company</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                value={localData.company}
                                onChange={(e) => handleInputChange('company', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Position</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                value={localData.position}
                                onChange={(e) => handleInputChange('position', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                value={localData.location}
                                onChange={(e) => handleInputChange('location', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Timezone</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                            <select
                                value={localData.timezone}
                                onChange={(e) => handleInputChange('timezone', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors appearance-none"
                            >
                                <option value="Asia/Bangkok (GMT+7)">Asia/Bangkok (GMT+7)</option>
                                <option value="Asia/Tokyo (GMT+9)">Asia/Tokyo (GMT+9)</option>
                                <option value="America/New_York (GMT-5)">America/New_York (GMT-5)</option>
                                <option value="Europe/London (GMT+0)">Europe/London (GMT+0)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    <label className="block text-sm mb-2 text-light-text-secondary dark:text-dark-text-secondary">Bio</label>
                    <textarea
                        value={localData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg focus:outline-none focus:border-ember transition-colors resize-none"
                        placeholder="Tell us about yourself..."
                    />
                </div>
                <div className="mt-6">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-global-blue hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
