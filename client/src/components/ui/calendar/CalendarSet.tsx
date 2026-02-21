import type { FC } from 'react';

const CalendarSet: FC = () => {
    return (
        <div>
            <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm z-0"></div>
            <div className="relative z-10 w-full max-w-4xl bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden border border-border-light dark:border-border-dark fade-in">
                <div className="px-8 py-6 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-[#1f2026]">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Schedule New Tech Activity</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create a new event, meeting, or maintenance window.</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <span className="material-icons-round text-2xl">close</span>
                    </button>
                </div>
                <div className="flex flex-col lg:flex-row h-full">
                    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Activity Title</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 group-focus-within:text-primary transition-colors">
                                    <span className="material-icons-round">edit</span>
                                </span>
                                <input className="w-full bg-gray-50 dark:bg-[#1a1c22] border border-gray-200 dark:border-border-dark rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner-custom" placeholder="e.g. Q4 Server Migration" type="text" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</label>
                            <textarea className="w-full bg-gray-50 dark:bg-[#1a1c22] border border-gray-200 dark:border-border-dark rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner-custom resize-none" placeholder="Add detailed notes regarding this activity..." rows={4}></textarea>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Categorization</label>
                            <div className="flex flex-wrap gap-3">
                                <label className="cursor-pointer">
                                    <input checked={true} className="peer sr-only" name="category" type="radio" />
                                    <div className="px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(94,114,228,0.4)] transition-all flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        <span className="text-sm font-medium">Development</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input className="peer sr-only" name="category" type="radio" />
                                    <div className="px-4 py-2 rounded-full border border-secondary/30 bg-secondary/10 text-secondary peer-checked:bg-secondary peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(45,206,204,0.4)] transition-all flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        <span className="text-sm font-medium">Server Maint.</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input className="peer sr-only" name="category" type="radio" />
                                    <div className="px-4 py-2 rounded-full border border-tertiary/30 bg-tertiary/10 text-tertiary peer-checked:bg-tertiary peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(245,54,92,0.4)] transition-all flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        <span className="text-sm font-medium">Client Meeting</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input className="peer sr-only" name="category" type="radio" />
                                    <div className="px-4 py-2 rounded-full border border-quaternary/30 bg-quaternary/10 text-quaternary peer-checked:bg-quaternary peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(251,99,64,0.4)] transition-all flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        <span className="text-sm font-medium">Marketing</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                        <span className="material-icons-round text-xl">notifications_active</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Push Notification</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Alert 15 mins before</p>
                                    </div>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-300 dark:border-gray-600 appearance-none cursor-pointer transition-all duration-300" id="toggle-push" name="toggle" type="checkbox" />
                                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer" htmlFor="toggle-push"></label>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <span className="material-icons-round text-xl">email</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Reminder</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Send to attendees</p>
                                    </div>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input checked={true} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-300 dark:border-gray-600 appearance-none cursor-pointer transition-all duration-300" id="toggle-email" name="toggle-email" type="checkbox" />
                                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer" htmlFor="toggle-email"></label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full lg:w-96 bg-gray-50 dark:bg-[#1a1c22] border-l border-border-light dark:border-border-dark p-8 flex flex-col justify-between">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Select Date &amp; Time</label>
                            <div className="bg-white dark:bg-[#252830] rounded-xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-border-dark">
                                <div className="flex items-center justify-between mb-4">
                                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                                        <span className="material-icons-round">chevron_left</span>
                                    </button>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">November 2023</span>
                                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                                        <span className="material-icons-round">chevron_right</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    <div className="text-[10px] text-gray-400 font-medium">M</div>
                                    <div className="text-[10px] text-gray-400 font-medium">T</div>
                                    <div className="text-[10px] text-gray-400 font-medium">W</div>
                                    <div className="text-[10px] text-gray-400 font-medium">T</div>
                                    <div className="text-[10px] text-gray-400 font-medium">F</div>
                                    <div className="text-[10px] text-gray-400 font-medium">S</div>
                                    <div className="text-[10px] text-gray-400 font-medium">S</div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-300 dark:text-gray-600">29</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-300 dark:text-gray-600">30</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-300 dark:text-gray-600">31</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">1</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">2</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">3</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">4</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-white bg-primary rounded-full font-bold shadow-lg shadow-primary/40">5</div>
                                    <div className="h-8 w-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">6</div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#252830] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark">
                                <div className="flex justify-center items-center gap-4 text-gray-900 dark:text-white font-mono">
                                    <div className="flex flex-col items-center group">
                                        <button className="text-gray-400 hover:text-primary mb-1"><span className="material-icons-round text-sm">expand_less</span></button>
                                        <div className="bg-gray-100 dark:bg-gray-800 w-16 h-14 rounded-lg flex items-center justify-center text-3xl font-bold border border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            09
                                        </div>
                                        <button className="text-gray-400 hover:text-primary mt-1"><span className="material-icons-round text-sm">expand_more</span></button>
                                    </div>
                                    <div className="text-2xl font-bold pb-2 text-gray-400">:</div>
                                    <div className="flex flex-col items-center group">
                                        <button className="text-gray-400 hover:text-primary mb-1"><span className="material-icons-round text-sm">expand_less</span></button>
                                        <div className="bg-gray-100 dark:bg-gray-800 w-16 h-14 rounded-lg flex items-center justify-center text-3xl font-bold border border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            30
                                        </div>
                                        <button className="text-gray-400 hover:text-primary mt-1"><span className="material-icons-round text-sm">expand_more</span></button>
                                    </div>
                                    <div className="flex flex-col gap-2 ml-2">
                                        <button className="px-2 py-1 text-xs font-bold rounded bg-primary text-white shadow-md">AM</button>
                                        <button className="px-2 py-1 text-xs font-bold rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600">PM</button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    <span>Duration</span>
                                    <span className="text-primary font-bold">1h 30m</span>
                                </div>
                                <input className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" max="240" min="15" type="range" value="90" />
                                <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                                    <span>15m</span>
                                    <span>4h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-8 py-5 bg-white dark:bg-[#1f2026] border-t border-border-light dark:border-border-dark flex justify-end items-center gap-4">
                    <button className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Cancel
                    </button>
                    <button className="px-8 py-2.5 rounded-lg bg-primary text-white font-medium text-sm shadow-[0_0_15px_rgba(94,114,228,0.5)] hover:shadow-[0_0_25px_rgba(94,114,228,0.65)] hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:ring-offset-gray-900 flex items-center gap-2">
                        <span className="material-icons-round text-lg">calendar_today</span>
                        Create Activity
                    </button>
                </div>
            </div>
            <div className="fixed top-20 left-20 w-72 h-72 bg-primary opacity-10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="fixed bottom-20 right-20 w-96 h-96 bg-tertiary opacity-10 blur-[120px] rounded-full pointer-events-none"></div>
        </div>
    );
};

export default CalendarSet;
