import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { 
    Camera, 
    User, 
    Users, 
    Mail, 
    Phone, 
    Calendar, 
    Globe, 
    ChevronRight,
    Pencil,
    X,
    Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface EditableFieldProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    onEdit?: () => void;
    editable?: boolean;
}

const EditableField: FC<EditableFieldProps> = ({ 
    icon, 
    label, 
    value, 
    subValue, 
    onEdit,
    editable = true 
}) => {
    return (
        <div 
            className={`group flex items-center gap-4 px-6 py-5 border-b border-light-border/50 dark:border-dark-border/50 
                ${editable ? 'hover:bg-light-surface/80 dark:hover:bg-dark-surface/80 cursor-pointer' : ''} 
                transition-all duration-200`}
            onClick={editable ? onEdit : undefined}
        >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-0.5">{label}</p>
                <p className="text-base text-light-text dark:text-dark-text font-medium truncate">{value || 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸°à¸šà¸¸'}</p>
                {subValue && (
                    <p className="text-xs text-light-text-secondary/70 dark:text-dark-text-secondary/70 mt-0.5">{subValue}</p>
                )}
            </div>
            {editable && (
                <ChevronRight className="w-5 h-5 text-light-text-secondary/50 dark:text-dark-text-secondary/50 group-hover:text-light-text-secondary dark:group-hover:text-dark-text-secondary transition-colors" />
            )}
        </div>
    );
};

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave: () => void;
    saving?: boolean;
}

const EditModal: FC<EditModalProps> = ({ isOpen, onClose, title, children, onSave, saving }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-light-surface-2 dark:hover:bg-dark-border transition-colors"
                    >
                        <X className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="px-6 py-5">
                    {children}
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-light-border dark:border-dark-border">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-border rounded-xl transition-colors"
                    >
                        à¸¢à¸à¹€à¸¥à¸´à¸
                    </button>
                    <button 
                        onClick={onSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-global-blue hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                à¸šà¸±à¸™à¸—à¸¶à¸
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PersonalInfo: FC = () => {
    const { user, updateProfile } = useAuth();
    const [editingField, setEditingField] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    
    const [localData, setLocalData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        birthDate: '',
        language: 'à¹„à¸—à¸¢ (Thai)',
        avatarUrl: ''
    });

    const [editValue, setEditValue] = useState('');
    const [editValue2, setEditValue2] = useState('');

    useEffect(() => {
        if (user) {
            setLocalData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                gender: user.gender || '',
                birthDate: user.birthDate || '',
                language: user.language || 'à¹„à¸—à¸¢ (Thai)',
                avatarUrl: user.avatarUrl || ''
            });
        }
    }, [user]);

    const getInitials = () => {
        const first = localData.firstName?.charAt(0) || '';
        const last = localData.lastName?.charAt(0) || '';
        return (first + last).toUpperCase() || 'U';
    };

    const getFullName = () => {
        return `${localData.firstName} ${localData.lastName}`.trim() || 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸°à¸šà¸¸';
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('th-TH', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
        } catch {
            return dateStr;
        }
    };

    const openEdit = (field: string) => {
        setEditingField(field);
        switch (field) {
            case 'name':
                setEditValue(localData.firstName);
                setEditValue2(localData.lastName);
                break;
            case 'gender':
                setEditValue(localData.gender);
                break;
            case 'phone':
                setEditValue(localData.phone);
                break;
            case 'birthDate':
                setEditValue(localData.birthDate);
                break;
            case 'language':
                setEditValue(localData.language);
                break;
            default:
                setEditValue('');
        }
    };

    const handleSave = async () => {
        if (!editingField) return;
        
        setSaving(true);
        try {
            let updates: any = {};
            switch (editingField) {
                case 'name':
                    updates = { firstName: editValue, lastName: editValue2 };
                    break;
                case 'gender':
                    updates = { gender: editValue };
                    break;
                case 'phone':
                    updates = { phone: editValue };
                    break;
                case 'birthDate':
                    updates = { birthDate: editValue };
                    break;
                case 'language':
                    updates = { language: editValue };
                    break;
            }
            
            await updateProfile(updates);
            setLocalData(prev => ({ ...prev, ...updates }));
            setEditingField(null);
        } catch (err) {
            console.error('Error updating:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-light-text-secondary dark:text-dark-text-secondary">à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¹€à¸žà¸·à¹ˆà¸­à¸”à¸¹à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8 animate-fade-in-up">
                <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text mb-2">
                    à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥
                </h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm md:text-base">
                    à¸ˆà¸±à¸”à¸à¸²à¸£à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§à¹à¸¥à¸°à¹€à¸¥à¸·à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸ˆà¸°à¹à¸ªà¸”à¸‡à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸­à¸·à¹ˆà¸™à¹€à¸«à¹‡à¸™
                </p>
            </div>

            {/* Profile Card */}
            <div className="bg-light-surface dark:bg-dark-surface rounded-2xl border border-light-border/50 dark:border-dark-border/50 overflow-hidden shadow-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {/* Profile Photo Section */}
                <div className="px-6 py-5 border-b border-light-border/50 dark:border-dark-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
                                <Camera className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-0.5">à¸£à¸¹à¸›à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</p>
                                <p className="text-sm text-light-text dark:text-dark-text">
                                    à¸£à¸¹à¸›à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¸Šà¹ˆà¸§à¸¢à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸­à¸·à¹ˆà¸™à¸ˆà¸”à¸ˆà¸³à¸„à¸¸à¸“à¹„à¸”à¹‰
                                </p>
                            </div>
                        </div>
                        <div className="relative group cursor-pointer">
                            {localData.avatarUrl ? (
                                <img 
                                    src={localData.avatarUrl} 
                                    alt="Profile" 
                                    className="w-16 h-16 rounded-full object-cover ring-2 ring-light-border dark:ring-dark-border"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-primary via-blue-secondary to-orange-primary rounded-full flex items-center justify-center text-white text-xl font-bold ring-2 ring-light-border dark:ring-dark-border">
                                    {getInitials()}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Pencil className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal Info Fields */}
                <div className="divide-y divide-light-border/30 dark:divide-dark-border/30">
                    <EditableField 
                        icon={<User className="w-6 h-6" />}
                        label="à¸Šà¸·à¹ˆà¸­"
                        value={getFullName()}
                        onEdit={() => openEdit('name')}
                    />
                    
                    <EditableField 
                        icon={<Users className="w-6 h-6" />}
                        label="à¹€à¸žà¸¨"
                        value={localData.gender || 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸°à¸šà¸¸'}
                        onEdit={() => openEdit('gender')}
                    />
                    
                    <EditableField 
                        icon={<Mail className="w-6 h-6" />}
                        label="à¸­à¸µà¹€à¸¡à¸¥"
                        value={localData.email}
                        subValue="à¸­à¸µà¹€à¸¡à¸¥à¸«à¸¥à¸±à¸à¸‚à¸­à¸‡à¸šà¸±à¸à¸Šà¸µ"
                        editable={false}
                    />
                    
                    <EditableField 
                        icon={<Phone className="w-6 h-6" />}
                        label="à¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ"
                        value={localData.phone || 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸°à¸šà¸¸'}
                        onEdit={() => openEdit('phone')}
                    />
                    
                    <EditableField 
                        icon={<Calendar className="w-6 h-6" />}
                        label="à¸§à¸±à¸™à¹€à¸à¸´à¸”"
                        value={formatDate(localData.birthDate) || 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸°à¸šà¸¸'}
                        onEdit={() => openEdit('birthDate')}
                    />
                    
                    <EditableField 
                        icon={<Globe className="w-6 h-6" />}
                        label="à¸ à¸²à¸©à¸²"
                        value={localData.language}
                        onEdit={() => openEdit('language')}
                    />
                </div>
            </div>

            {/* Info Note */}
            <div className="mt-6 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    ðŸ’¡ à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸šà¸²à¸‡à¸ªà¹ˆà¸§à¸™à¸­à¸²à¸ˆà¹à¸ªà¸”à¸‡à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸£à¸²à¸¢à¸­à¸·à¹ˆà¸™à¹€à¸«à¹‡à¸™à¹ƒà¸™à¸šà¸£à¸´à¸à¸²à¸£à¸‚à¸­à¸‡à¹€à¸£à¸²{' '}
                    <a href="#" className="underline hover:no-underline">à¹€à¸£à¸µà¸¢à¸™à¸£à¸¹à¹‰à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡</a>
                </p>
            </div>

            {/* Edit Modals */}
            <EditModal 
                isOpen={editingField === 'name'}
                onClose={() => setEditingField(null)}
                title="à¹à¸à¹‰à¹„à¸‚à¸Šà¸·à¹ˆà¸­"
                onSave={handleSave}
                saving={saving}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡</label>
                        <input 
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-xl text-light-text dark:text-dark-text focus:outline-none focus:border-orange-primary transition-colors"
                            placeholder="à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</label>
                        <input 
                            type="text"
                            value={editValue2}
                            onChange={(e) => setEditValue2(e.target.value)}
                            className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-xl text-light-text dark:text-dark-text focus:outline-none focus:border-orange-primary transition-colors"
                            placeholder="à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥"
                        />
                    </div>
                </div>
            </EditModal>

            <EditModal 
                isOpen={editingField === 'gender'}
                onClose={() => setEditingField(null)}
                title="à¹à¸à¹‰à¹„à¸‚à¹€à¸žà¸¨"
                onSave={handleSave}
                saving={saving}
            >
                <div className="space-y-2">
                    {['à¸Šà¸²à¸¢', 'à¸«à¸à¸´à¸‡', 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸', 'à¸­à¸·à¹ˆà¸™à¹†'].map((gender) => (
                        <label key={gender} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-border cursor-pointer transition-colors">
                            <input 
                                type="radio" 
                                name="gender" 
                                value={gender}
                                checked={editValue === gender}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-5 h-5 text-orange-primary"
                            />
                            <span className="text-light-text dark:text-dark-text">{gender}</span>
                        </label>
                    ))}
                </div>
            </EditModal>

            <EditModal 
                isOpen={editingField === 'phone'}
                onClose={() => setEditingField(null)}
                title="à¹à¸à¹‰à¹„à¸‚à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ"
                onSave={handleSave}
                saving={saving}
            >
                <div>
                    <label className="block text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ</label>
                    <input 
                        type="tel"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-xl text-light-text dark:text-dark-text focus:outline-none focus:border-orange-primary transition-colors"
                        placeholder="0XX XXX XXXX"
                    />
                </div>
            </EditModal>

            <EditModal 
                isOpen={editingField === 'birthDate'}
                onClose={() => setEditingField(null)}
                title="à¹à¸à¹‰à¹„à¸‚à¸§à¸±à¸™à¹€à¸à¸´à¸”"
                onSave={handleSave}
                saving={saving}
            >
                <div>
                    <label className="block text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">à¸§à¸±à¸™à¹€à¸à¸´à¸”</label>
                    <input 
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-xl text-light-text dark:text-dark-text focus:outline-none focus:border-orange-primary transition-colors"
                    />
                </div>
            </EditModal>

            <EditModal 
                isOpen={editingField === 'language'}
                onClose={() => setEditingField(null)}
                title="à¹€à¸¥à¸·à¸­à¸à¸ à¸²à¸©à¸²"
                onSave={handleSave}
                saving={saving}
            >
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[
                        'à¹„à¸—à¸¢ (Thai)', 
                        'English (US)', 
                        'English (UK)', 
                        'æ—¥æœ¬èªž (Japanese)', 
                        'í•œêµ­ì–´ (Korean)',
                        'ä¸­æ–‡ (Chinese)'
                    ].map((lang) => (
                        <label key={lang} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-border cursor-pointer transition-colors">
                            <input 
                                type="radio" 
                                name="language" 
                                value={lang}
                                checked={editValue === lang}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-5 h-5 text-orange-primary"
                            />
                            <span className="text-light-text dark:text-dark-text">{lang}</span>
                        </label>
                    ))}
                </div>
            </EditModal>
        </div>
    );
};

export default PersonalInfo;

