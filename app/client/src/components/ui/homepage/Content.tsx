import type { FC } from 'react';
import Background from './Background';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import EvolutionSection from './EvolutionSection';
import PrinciplesSection from './PrinciplesSection';
import RoadmapSection from './RoadmapSection';
import FooterSection from './FooterSection';

const Content: FC = () => {
    return (
        <div className="bg-background-dark text-text-main-dark font-sans transition-colors duration-300 antialiased selection:bg-[var(--color-orange-primary)] selection:text-white overflow-x-hidden">
            <Background />
            <Navbar />
            <HeroSection />
            <EvolutionSection />
            <PrinciplesSection />
            <RoadmapSection />
            <FooterSection />
        </div>
    );
};

export default Content;

