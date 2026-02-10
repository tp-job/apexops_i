import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
}

const Hero: FC = () => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        // Initialize particles
        const initialParticles: Particle[] = [];
        for (let i = 0; i < 120; i++) {
            initialParticles.push({
                id: i,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 5 + 2,
                opacity: Math.random() * 0.5 + 0.3,
            });
        }
        setParticles(initialParticles);
    }, []);

    useEffect(() => {
        const animate = () => {
            setParticles(prev =>
                prev.map(p => {
                    let { x, y, vx, vy } = p;

                    x += vx;
                    y += vy;

                    // Wrap around edges
                    if (x < 0) x = window.innerWidth;
                    if (x > window.innerWidth) x = 0;
                    if (y < 0) y = window.innerHeight;
                    if (y > window.innerHeight) y = 0;

                    return { ...p, x, y };
                })
            );

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <main className="w-full h-screen bg-transparent overflow-hidden relative transition-colors duration-300">
            {/* particles */}
            <div ref={canvasRef} className="absolute inset-0 pointer-events-none">
                {particles.map(p => (
                    <div key={p.id} className="absolute rounded-full bg-ember" style={{ left: `${p.x}px`, top: `${p.y}px`, width: `${p.size}px`, height: `${p.size}px`, opacity: p.opacity, transform: 'translate(-50%, -50%)', }} />
                ))}
            </div>
            {/* hero */}
            <section className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-80px)] px-6">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo to-ember rounded-lg transform rotate-45"></div>
                    <span className="text-xl font-normal text-light-text-primary dark:text-dark-text-primary">ApexOps</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-bold text-center mb-4 max-w-5xl text-light-text-primary dark:text-dark-text-primary">Apex Optimization Platform</h1>
                <h2 className="text-5xl md:text-6xl font-normal text-center text-light-text-secondary dark:text-dark-text-secondary mb-12 max-w-5xl">Elevate Your Apex Legends Experience</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Link to="/dashboard" className="bg-light-text-primary dark:bg-white text-dark-text-primary dark:text-light-text-primary px-8 py-4 rounded-full flex items-center gap-3 hover:bg-light-text-primary/90 dark:hover:bg-white/90 transition-all text-lg cursor-pointer shadow-lg shadow-indigo/20">
                        <span>Get started</span>
                    </Link>
                    <Link to="/learn" className="text-light-text-secondary dark:text-dark-text-secondary px-8 py-4 hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors text-lg cursor-pointer">
                        <span>Learning</span>
                    </Link>
                </div>
            </section>

            {/* connecting lines between some particles */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                {particles.map((p, i) => {
                    if (i % 10 === 0 && i < particles.length - 1) {
                        const next = particles[i + 1];
                        const distance = Math.sqrt((p.x - next.x) ** 2 + (p.y - next.y) ** 2);
                        if (distance < 150) {
                            return (
                                <line key={`line-${i}`} x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="#F64668" strokeWidth="1" opacity={0.2} />
                            );
                        }
                    }
                    return null;
                })}
            </svg>
        </main>
    );
};

export default Hero;