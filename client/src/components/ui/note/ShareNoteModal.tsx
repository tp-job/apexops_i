import { useEffect, type FC } from 'react';

interface ShareNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteTitle: string;
}

const ShareNoteModal: FC<ShareNoteModalProps> = ({ isOpen, onClose, noteTitle }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-dark-bg/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative w-full max-w-2xl bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-light-border dark:border-dark-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-primary/10 rounded-lg text-blue-secondary">
                            <span className="material-symbols-outlined text-xl">share</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Share "{noteTitle}"</h2>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Manage access and real-time collaboration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary hover:text-light-text dark:hover:text-dark-text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">

                    {/* Invite Section */}
                    <section>
                        <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">Invite people</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-light-text-secondary">
                                    <span className="material-symbols-outlined text-xl">mail</span>
                                </span>
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-blue-primary focus:border-blue-primary transition-all outline-none"
                                    placeholder="Add emails or groups"
                                    type="email"
                                />
                            </div>
                            <div className="relative w-32">
                                <select className="w-full h-full pl-3 pr-8 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:ring-2 focus:ring-blue-primary focus:border-blue-primary appearance-none cursor-pointer outline-none">
                                    <option>Can edit</option>
                                    <option>Can view</option>
                                    <option>Can comment</option>
                                </select>
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-light-text-secondary">
                                    <span className="material-symbols-outlined text-base">expand_more</span>
                                </span>
                            </div>
                            <button className="px-5 py-2.5 bg-blue-primary hover:bg-blue-600 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-1">
                                Send <span className="material-symbols-outlined text-sm">send</span>
                            </button>
                        </div>
                    </section>

                    {/* Public Access Section */}
                    <section className="border border-light-border dark:border-dark-border rounded-xl p-4 bg-light-bg/50 dark:bg-dark-bg/30">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-light-surface-2 dark:bg-dark-surface-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary">
                                <span className="material-symbols-outlined text-xl">public</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Public Access</h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input className="sr-only peer" type="checkbox" />
                                        <div className="w-9 h-5 bg-light-surface-2 peer-focus:outline-none rounded-full peer dark:bg-dark-surface-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-light-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-dark-border peer-checked:bg-blue-primary"></div>
                                    </label>
                                </div>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-3">Anyone with the link can view this document.</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md px-3 py-1.5 text-xs text-light-text-secondary dark:text-dark-text-secondary truncate font-mono">
                                        https://apexops.ai/notes/share/8s9d8s9d8...
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText("https://apexops.ai/notes/share/8s9d8s9d8...");
                                            // Optional: Show a "Copied!" feedback
                                        }}
                                        className="text-blue-primary hover:text-blue-600 text-sm font-medium px-2 py-1 transition-colors"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* People List */}
                    <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-4">People with access</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-blue-primary flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-dark-bg">
                                            RP
                                        </div>
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green border-2 border-white dark:border-dark-bg rounded-full"></span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">Royal Parvej (You)</h4>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">royal@apexops.com</p>
                                    </div>
                                </div>
                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium px-2">Owner</span>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-blue-secondary/20 flex items-center justify-center text-blue-secondary font-bold ring-2 ring-white dark:ring-dark-bg">
                                            BS
                                        </div>
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-orange-primary border-2 border-white dark:border-dark-bg rounded-full"></span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">Brooklyn Simmons</h4>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">brooklyn@design.co</p>
                                    </div>
                                </div>
                                <button className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                                    Editor <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Collaboration Settings Panel */}
                    <section className="pt-4 border-t border-light-border dark:border-dark-border">
                        <div className="flex items-center justify-between w-full group cursor-pointer">
                            <div className="flex items-center gap-2 text-left">
                                <span className="material-symbols-outlined text-blue-primary text-xl">tune</span>
                                <div>
                                    <h3 className="text-sm font-medium text-light-text dark:text-dark-text group-hover:text-blue-primary transition-colors">Real-time Settings</h3>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Manage cursor visibility & presence</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-light-text-secondary group-hover:text-light-text dark:group-hover:text-dark-text transition-transform">expand_more</span>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="bg-light-bg dark:bg-dark-bg/50 px-6 py-4 flex justify-between items-center border-t border-light-border dark:border-dark-border">
                    <button className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">help</span>
                        Learn about sharing
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary rounded-lg text-sm font-medium hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-blue-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 shadow-lg shadow-blue-primary/20 transition-all font-bold"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareNoteModal;
