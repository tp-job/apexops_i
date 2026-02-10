import type { FC } from 'react';
import { useState } from 'react';

const About: FC = () => {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const getCardStyles = (cardIndex: number) => {
        const isHovered = hoveredCard === cardIndex;
        const baseClasses = "p-10 rounded-sm shadow-md transition-all duration-500 hover:shadow-xl hover:scale-105 hover:-translate-y-2 cursor-pointer border";

        if (isHovered) {
            return `${baseClasses} bg-gradient-to-br from-blue-600 to-blue-700 text-white border-transparent`;
        }
        return `${baseClasses} bg-gray-50 text-light-text-primary border-gray-100`;
    };
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
                            <div className="absolute top-16 left-20 w-24 h-28 bg-gradient-to-b from-light-text-primary via-gray-800 to-light-text rounded-full transform -rotate-12 transition-all duration-500 hover:rotate-12 hover:scale-105 overflow-hidden">
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
                {/* contents section 1 - our goal */}
                <section className="px-8 md:px-16 py-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-20">
                            <div className="relative">
                                <div className="flex items-baseline gap-4">
                                    <h2 className="text-5xl md:text-6xl font-black text-light-text-primary dark:text-dark-text-primary">Contents</h2>
                                    <span className="text-2xl text-gray-400 font-light">/ Our Goal</span>
                                </div>
                                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-blue-500 rounded-full"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {/* section 01 - taller vertical card (original blue) */}
                            <article className={getCardStyles(1)} onMouseEnter={() => setHoveredCard(1)} onMouseLeave={() => setHoveredCard(null)}>
                                <span className={`text-7xl font-black mb-6 transition-all duration-500 ${hoveredCard === 1 ? 'scale-110 text-white' : 'text-light-text-primary'}`}>01</span>
                                <h3 className="text-3xl font-bold mb-2">インターフェース設計</h3>
                                <h4 className={`text-sm mb-8 font-light ${hoveredCard === 1 ? 'text-blue-200' : 'text-light-text-secondary'}`}>Powerful & Scalable</h4>
                                <ul className={`space-y-3 text-sm font-light ${hoveredCard === 1 ? 'text-white' : 'text-light-text'}`}>
                                    <li className={`transition-transform duration-300 hover:translate-x-2 ${hoveredCard === 1 ? '' : 'hover:text-blue-600'}`}>Scales seamlessly with teams of any size.</li>
                                    <li className={`transition-transform duration-300 hover:translate-x-2 ${hoveredCard === 1 ? '' : 'hover:text-blue-600'}`}>Handles complex bug and log tracking with reliability and efficiency.</li>
                                </ul>
                            </article>
                            {/* section 02 - updated with dynamic styles */}
                            <article className={getCardStyles(2)} onMouseEnter={() => setHoveredCard(2)} onMouseLeave={() => setHoveredCard(null)}>
                                <span className={`text-7xl font-black mb-6 transition-all duration-500 ${hoveredCard === 2 ? 'scale-110 text-white' : 'text-light-text-primary'}`}>02</span>
                                <h3 className="text-3xl font-bold mb-2">クリエイティブ設計</h3>
                                <h4 className={`text-sm mb-8 font-light ${hoveredCard === 2 ? 'text-blue-200' : 'text-gray-400'}`}>Simple & Developer-Friendly</h4>
                                <ul className={`space-y-3 text-sm font-light ${hoveredCard === 2 ? 'text-white' : 'text-light-text'}`}>
                                    <li className={`transition-transform duration-300 hover:translate-x-2 ${hoveredCard === 2 ? '' : 'hover:text-blue-600'}`}>Intuitive and easy to use for developers.</li>
                                    <li className={`transition-transform duration-300 hover:translate-x-2 ${hoveredCard === 2 ? '' : 'hover:text-blue-600'}`}>Sleek, developer-focused UI that boosts productivity.</li>
                                </ul>
                            </article>
                            {/* section 03 - updated with dynamic styles */}
                            <article className={getCardStyles(3)} onMouseEnter={() => setHoveredCard(3)} onMouseLeave={() => setHoveredCard(null)}>
                                <span className={`text-7xl font-black mb-6 transition-all duration-500 ${hoveredCard === 3 ? 'scale-110 text-white' : 'text-light-text-primary'}`}>03</span>
                                <h3 className="text-3xl font-bold mb-2">生産性の向上</h3>
                                <h4 className={`text-sm mb-8 font-light ${hoveredCard === 3 ? 'text-blue-200' : 'text-gray-400'}`}>Boost Developer Productivity</h4>
                                <ul className={`space-y-3 text-sm font-light ${hoveredCard === 3 ? 'text-white' : 'text-light-text'}`}>
                                    <li className={`transition-transform duration-300 hover:translate-x-2 ${hoveredCard === 3 ? '' : 'hover:text-blue-600'}`}>Simplifies bug and log tracking across teams.</li>
                                    <li className={`transition-transform duration-300 hover:translate-x-2 ${hoveredCard === 3 ? '' : 'hover:text-blue-600'}`}>Lets developers focus on building great software.</li>
                                </ul>
                            </article>
                        </div>
                    </div>
                </section>
                {/* contents section 2 - features */}
                <section className="px-8 md:px-16 py-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-20">
                            <div className="relative">
                                <div className="flex items-baseline gap-4">
                                    <h2 className="text-5xl md:text-6xl font-black text-light-text-primary dark:text-dark-text-primary">Contents</h2>
                                    <span className="text-2xl text-gray-400 font-light">/ Features</span>
                                </div>
                                {/* blue accent line */}
                                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-blue-500 rounded-full"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {/* card 01 */}
                            <article className="group cursor-pointer">
                                <span className="text-right text-base text-light-text dark:text-dark-text mb-4 font-light">·01</span>
                                <h3 className="text-center text-2xl font-bold mb-6 text-light-text-primary dark:text-dark-text-primary transition-colors duration-300 group-hover:text-blue-600">Log Management</h3>
                                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-300 aspect-square rounded-xl relative overflow-hidden shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:scale-105 group-hover:-translate-y-2">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-white bg-opacity-20 rounded-full transition-all duration-700 group-hover:scale-125 group-hover:rotate-180"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-300 rounded-full shadow-2xl transition-all duration-700 group-hover:scale-110"></div>
                                    <div className="absolute bottom-10 right-10 w-10 h-10 bg-white rounded-full shadow-lg transition-all duration-500 group-hover:scale-125 group-hover:animate-bounce"></div>
                                </div>
                            </article>
                            {/* card 02 */}
                            <article className="group cursor-pointer">
                                <span className="text-right text-base text-gray-500 mb-4 font-light">·02</span>
                                <h3 className="text-center text-2xl font-bold mb-6 text-light-text-primary transition-colors duration-300 group-hover:text-orange-600">Ticket Management</h3>
                                <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 aspect-square rounded-xl relative overflow-hidden shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:scale-105 group-hover:-translate-y-2">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-44 h-44 bg-gradient-to-br from-pink-400 to-orange-300 rounded-full transition-all duration-700 group-hover:scale-125 group-hover:rotate-90"></div>
                                    <div className="absolute bottom-8 left-8 w-20 h-20 bg-blue-400 rounded-lg transition-all duration-500 group-hover:rotate-45 group-hover:scale-110"></div>
                                    <div className="absolute top-8 right-8 w-16 h-16 bg-teal-400 rounded-lg transition-all duration-500 group-hover:-rotate-45 group-hover:scale-110"></div>
                                </div>
                            </article>
                            {/* card 03 */}
                            <article className="group cursor-pointer">
                                <span className="text-right text-base text-gray-500 mb-4 font-light">·03</span>
                                <h3 className="text-center text-2xl font-bold mb-6 text-light-text-primary transition-colors duration-300 group-hover:text-orange-700">Real-time Dashboard</h3>
                                <div className="bg-gradient-to-br from-orange-800 via-orange-600 to-orange-400 aspect-square rounded-xl relative overflow-hidden shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:scale-105 group-hover:-translate-y-2">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-52 h-52 bg-gradient-to-br from-orange-300 to-yellow-200 rounded-full transition-all duration-700 group-hover:scale-110 group-hover:rotate-180"></div>
                                    <div className="absolute top-1/3 left-1/3 w-28 h-28 bg-orange-700 rounded-full shadow-2xl transition-all duration-700 group-hover:scale-125"></div>
                                    <div className="absolute bottom-10 right-10 w-20 h-3 bg-orange-900 rounded-full transition-all duration-500 group-hover:w-24"></div>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
};

export default About;