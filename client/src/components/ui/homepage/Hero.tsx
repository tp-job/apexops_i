import type { FC } from 'react';
import { Link } from 'react-router-dom';

const Hero: FC = () => {
    return (
        <main className="w-full h-screen bg-transparent overflow-hidden relative transition-colors duration-300">
            <section className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-80px)] px-6">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-primary to-orange-primary rounded-lg transform rotate-45"></div>
                    <span className="text-xl font-normal text-light-text-primary dark:text-dark-text-primary">ApexOps</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-bold text-center mb-4 max-w-5xl text-light-text-primary dark:text-dark-text-primary">Apex Optimization Platform</h1>
                <h2 className="text-5xl md:text-6xl font-normal text-center text-light-text-secondary dark:text-dark-text-secondary mb-12 max-w-5xl">Elevate Your Apex Legends Experience</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Link to="/dashboard" className="bg-light-text-primary dark:bg-white text-dark-text-primary dark:text-light-text-primary px-8 py-4 rounded-full flex items-center gap-3 hover:bg-light-text-primary/90 dark:hover:bg-white/90 transition-all text-lg cursor-pointer shadow-lg shadow-blue-primary/20">
                        <span>Get started</span>
                    </Link>
                    <Link to="/learn" className="text-light-text-secondary dark:text-dark-text-secondary px-8 py-4 hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors text-lg cursor-pointer">
                        <span>Learning</span>
                    </Link>
                </div>
            </section>
        </main>
    );
};

export default Hero;