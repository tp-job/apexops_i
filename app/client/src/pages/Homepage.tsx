import type { FC } from 'react';
import LandingNav from '@/components/ui/homepage/landing/LandingNav';
import LandingHero from '@/components/ui/homepage/landing/LandingHero';
import LandingFeatures from '@/components/ui/homepage/landing/LandingFeatures';
import LandingMetrics from '@/components/ui/homepage/landing/LandingMetrics';
import LandingShowcase from '@/components/ui/homepage/landing/LandingShowcase';
import LandingCTA from '@/components/ui/homepage/landing/LandingCTA';
import LandingFooter from '@/components/ui/homepage/landing/LandingFooter';

const Homepage: FC = () => {
    return (
        <div className="min-h-screen font-body text-brand-dark antialiased transition-colors duration-300 dark:text-white">
            <LandingNav />
            <main>
                <LandingHero />
                <LandingFeatures />
                <LandingMetrics />
                <LandingShowcase />
                <LandingCTA />
            </main>
            <LandingFooter />
        </div>
    );
};

export default Homepage;
