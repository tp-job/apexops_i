import type { FC } from 'react';

const NoteShare: FC = () => {
    return (
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-2xl bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border-light dark:border-border-dark">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <span className="material-icons-outlined text-xl">share</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share "Q3 Product Roadmap"</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Manage access and real-time collaboration</p>
                            </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                        <section>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invite people</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-icons-outlined text-xl">mail_outline</span>
                                    </span>
                                    <input className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary transition-shadow" placeholder="Add emails or groups" type="email" />
                                </div>
                                <div className="relative w-32">
                                    <select className="w-full h-full pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer">
                                        <option>Can edit</option>
                                        <option>Can view</option>
                                        <option>Can comment</option>
                                    </select>
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <span className="material-icons-outlined text-base">expand_more</span>
                                    </span>
                                </div>
                                <button className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-1">
                                    Send <span className="material-icons-outlined text-sm">send</span>
                                </button>
                            </div>
                        </section>
                        <section className="border border-border-light dark:border-border-dark rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-300">
                                    <span className="material-icons-outlined text-xl">public</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Public Access</h3>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input className="sr-only peer" type="checkbox" value="" />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Anyone with the link can view this document.</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-md px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                            https://wecraft.ai/notes/share/8s9d8s9d8...
                                        </div>
                                        <button className="text-primary hover:text-primary-hover text-sm font-medium px-2 py-1 transition-colors">Copy Link</button>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">People with access</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img alt="Royal Parvej" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBG48zxbxKCy9ORbLpokeYNRfRR9Nu2cTIzedON_wuZp8Wx_VWnDT4lzykNEdcA1o4oJas54RpH6BW39jznCttz-G4O0UNAfB9UdT3a2Sl53aYL-CimoLuR0cwpMIdXiEWf5bwUPVBQ1lfwnYWVw7PnNf463AagplIt_f9dwdYW01l5AixzB179JZX_0gkwhk64ONMn6IMK8sP0HqAoLsAas5hPsDIc-5GH2zZzOABmuI8ysvjRzX0KCZ6-KCTNIwTm38n-a7PP_ww6" />
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Royal Parvej (You)</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">royal@wecraft.com</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium px-2">Owner</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img alt="Brooklyn Simmons" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcIlbfkDRiyVeHJtOf-4sk2T3PRROZxQENGvrPlfAyN7cctgrmI41Qv8BoGuCSkGbdoRJJel69fQXWxY_0FicD2tZ3m1wHT-VOnmuMGsv7NSWL0CmQnZElwrCrkwT_Pc1k-t9qFqcNFOtHSAIN2Ku_eQrwM4gjTJTS77Cd9vy3z3OFAbmGDbQFKovLl-Hz7sHcVGDZMML-chFoYts4XXJDU4cpmO3efn55jekY7QXv1yRVZb_Q_GSgJlLAEkgIQTgebmZuh27r8_59" />
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 border-2 border-white dark:border-gray-800 rounded-full" title="Away"></span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Brooklyn Simmons</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">brooklyn@design.co</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 group-hover:visible">
                                            Editor <span className="material-icons-outlined text-sm">arrow_drop_down</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img alt="Arlene McCoy" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQqdiZyXgxAGT4VCitUuXBt3jYJqfWi4SLLUt7Mon6zvDofw2zXM6J210z8UfTu0fW0brbkT_zBi04FJ6cIb7gRa9r8GEKLktu0g95ChLmU_1q6JeaxhYLAbQ6DHfHsErtCNvvW8T8tSzdyPoi5puOLBcU4I05--y1_Hlkkx7bEXx-2h3LglcmHfGVxF-KXnGAad5v5pdtdahnIkS0i7c5jK3w0erH_Om-N2nFuzjO5tEGc7ZucpFlZP2UoMd7DupNGQq72Wq5RoI7" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Arlene McCoy</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">arlene@marketing.com</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                                            Viewer <span className="material-icons-outlined text-sm">arrow_drop_down</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="pt-4 border-t border-border-light dark:border-border-dark">
                            <button className="flex items-center justify-between w-full group">
                                <div className="flex items-center gap-2 text-left">
                                    <span className="material-icons-outlined text-primary text-xl">tune</span>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">Real-time Settings</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage cursor visibility &amp; presence</p>
                                    </div>
                                </div>
                                <span className="material-icons-outlined text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-transform transform group-hover:rotate-180">expand_more</span>
                            </button>
                            <div className="mt-4 space-y-3 pl-7">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Show collaborator cursors</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input checked={false} className="sr-only peer" type="checkbox" value="" />
                                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:left-[0px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Show active presence avatars</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input checked={false} className="sr-only peer" type="checkbox" value="" />
                                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:left-[0px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-between items-center border-t border-border-light dark:border-border-dark">
                        <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                            <span className="material-icons-outlined text-base">help_outline</span> Learn more about sharing
                        </button>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 border border-border-light dark:border-border-dark text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteShare;
