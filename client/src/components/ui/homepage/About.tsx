import type { FC } from 'react';

const About: FC = () => {
    return (
        <main id="work" className="w-full px-[12%] py-10 scroll-mt-20">
            {/* title */}
            <header>
                <h4 className="mb-2 text-lg text-center text-light-text dark:text-dark-text">Introduction</h4>
                <h2 className="mb-2 text-5xl text-center text-light-text dark:text-dark-text">What is ApexOps?</h2>
                <h2 className="text-2xl text-center font-zen text-light-text-secondary dark:text-dark-text/80">私の最新の作品</h2>
                <p className="max-w-2xl mx-auto mt-5 mb-12 text-center">ApexOps is a powerful Bug & Log Management System designed for developers to efficiently monitor, debug, and resolve issues. It provides a comprehensive suite of tools to track console logs, manage bugs through a JIRA-style ticketing system, and visualize real-time application health.</p>
            </header>
            {/* about section */}
            <section className="w-full min-h-screen">
                {/* header section */}
                <div className="px-8 md:px-16 py-20 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                        {/* 3D graphic - enhanced with more details */}
                        <section className="relative w-72 h-72 flex-shrink-0">
                            {/* large blue ring with enhanced gradient */}
                            <div className="absolute top-0 right-0 w-56 h-36 bg-gradient-to-br from-blue-500 via-blue-400 to-blue-200 rounded-full transform rotate-45 opacity-90 transition-transform duration-700 hover:scale-110 hover:rotate-90" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4)' }}></div>

                            {/* blue sphere */}
                            <div className="absolute bottom-6 left-2 w-28 h-28 bg-gradient-to-br from-blue-700 to-blue-500 rounded-full shadow-2xl transition-transform duration-500 hover:scale-110 cursor-pointer"></div>

                            {/* small white sphere */}
                            <div className="absolute top-20 left-24 w-10 h-10 bg-white rounded-full shadow-xl animate-bounce" style={{ animationDuration: '3s' }}></div>

                            {/* black abstract shape with wavy lines */}
                            <div className="absolute top-16 left-20 w-24 h-28 bg-gradient-to-b from-light-text-primary via-dark-surface to-light-text rounded-full transform -rotate-12 transition-all duration-500 hover:rotate-12 hover:scale-105 overflow-hidden">
                                {/* wavy lines inside black shape */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-full h-full opacity-40" viewBox="0 0 100 100">
                                        <path d="M20 50 Q 35 30, 50 50 T 80 50" stroke="white" strokeWidth="2" fill="none" />
                                        <path d="M20 60 Q 35 40, 50 60 T 80 60" stroke="white" strokeWidth="2" fill="none" />
                                        <path d="M20 40 Q 35 20, 50 40 T 80 40" stroke="white" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                            {/* small blue sphere */}
                            <div className="absolute bottom-16 left-28 w-8 h-8 bg-blue-600 rounded-full shadow-lg animate-pulse"></div>
                        </section>
                        {/* portfolio title */}
                        <section className="flex-1 text-center md:text-right">
                            <div className="flex justify-center md:justify-end items-center gap-6 mb-6">
                                <div className="text-right">
                                    <div className="text-sm text-light-text dark:text-dark-text font-medium tracking-wider">2025</div>
                                </div>
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black text-light-text-primary dark:text-dark-text-primary mb-8 tracking-tight leading-none">APEXOPS</h1>
                            <div className="text-xs text-light-text dark:text-dark-text space-y-1.5 font-light text-right">
                                <p>React</p>
                                <p>TypeScript</p>
                                <p>Tailwind css</p>
                                <p>Node.js</p>
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default About;