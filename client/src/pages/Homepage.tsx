import type { FC } from 'react';
import Hero from '@/components/ui/homepage/Hero.tsx';
import About from '@/components/ui/homepage/About.tsx';
import Footer from '@/components/ui/homepage/Footer.tsx';

const Homepage: FC = () => {

    return (
        <div className="bg-transparent transition-colors duration-300">
            <main>
                <Hero />
                <About />
                <Footer />
            </main>
        </div>
    );
};

export default Homepage;

