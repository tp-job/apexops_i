import type { FC } from 'react';
import Hero from '@/components/ui/homepage/Hero.tsx';
import About from '@/components/ui/homepage/About.tsx';
import Footer from '@/components/ui/homepage/Footer.tsx';
import Present from '@/components/ui/homepage/Present';
import Content from '@/components/ui/homepage/Content';

const Homepage: FC = () => {
    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-300">
            <main className="opacity-section shadow-blue-primary">
                <Hero />
                <About />
                <Present />
                <Content />
                <Footer />
            </main>
        </div>
    );
};

export default Homepage;
