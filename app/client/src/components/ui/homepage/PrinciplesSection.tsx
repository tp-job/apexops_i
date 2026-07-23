import type { FC } from 'react';
import { PrincipleCard } from '@/components/common/PrincipleCard';

const principles = [
    {
        variant: 'blue' as const,
        imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNh2AcaJiZ839vlkUXHVU2dzX2G6ifRocGFvRoo-X9iIPxbGUKh-C9D3-4v053V3DZ-pmB4adxGn4ektmtioVLd66WA9ZrBglGqChjGdpAKYTHTV9yv2VHYEy2x9XGOS1eDPEY_7hmzZN68c3iLhBCyWLwasjpA3GI2PB7rCaTCvp7n9M-3Oa8zWYK1Japt6g8xsnrbqCRlVCGbD_O9czRHYDhu57qegQXYcKOsCByoSQAGeC-CtxUytm54FKRDvY5mlPTLjJK213D',
        imageAlt: 'Abstract architectural detail',
        number: '01',
        title: 'Minimalist Infrastructure',
        description: 'Removing the superfluous. Focusing on clean code, efficient pipelines, and bare-metal performance where it matters most.',
        exploreHref: '#',
    },
    {
        variant: 'orange' as const,
        imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnef1NEealoMNRlvm5el5KAk6ssRRqBJy01poX_j1Lj8qSajGJelgoI5v9Qm2NM2JSZRLA3BqX8fPFBdpo_lNfVMsUdIaFOs2_BFCR8on-xTwLuLpouan1aspuhJUUoImYcEc8BPjeVOAJKWc-rJsF1rcEXtJ6S1JwbSFnjxGtX7kwjuHx-WJkGrx_BaUw-86iaBiLqJOxUT_1HuqkxyOF98e-1lrSgkh2L422j64c8FmGTGgTvgMJJS6ckpHF58nY6OqvGne8e0Su',
        imageAlt: 'Corporate clean office space',
        number: '02',
        title: 'Strategic Vision',
        description: 'Forward-thinking strategies that align technical capabilities with long-term business objectives.',
        exploreHref: '#',
    },
    {
        variant: 'violet' as const,
        imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcmfWKsXoUB8E1BsJSWfIdnE6EUhdOtrA0iLsybfbJsYFsH2TgJTu0uiGon4csaDyOIuvRMqDvI4E0Gd_jQPRc47f1NGfG1SK23LjJy30MsMnqcLX_38e1F2tu1-fMFGG-U_LkABrAS4JTUWZO7iqQuj26NaYOLQMkbsi1SqGYpvNBJW8RjHzAlAFQ-76wJth79mIC5J1mTTiB8vDXh6xQLIH5WAkfrC-0LGcO_gZXJ0YsVNAMefSFfAIA-dHWmZWiILM2yUIKXu5C',
        imageAlt: 'Network connections abstract',
        number: '03',
        title: 'Global Connectivity',
        description: 'Building bridges between disparate systems. Creating a unified language for your entire tech stack.',
        exploreHref: '#',
    },
];

const PrinciplesSection: FC = () => (
    <section className="py-32 px-6 lg:px-12 relative bg-[#080c14]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-[var(--color-blue-primary)]/5 blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-24 max-w-3xl mx-auto">
                <h2 className="font-display text-5xl lg:text-7xl text-white mb-6 tracking-tight drop-shadow-xl">
                    Core{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-blue-primary)] to-[var(--color-green)]">
                        Principles
                    </span>
                </h2>
                <p className="text-light-text-secondary dark:text-dark-text-secondary font-light text-xl">
                    Design is an inherent part of corporate identity.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {principles.map((p) => (
                    <PrincipleCard key={p.number} {...p} />
                ))}
            </div>
        </div>
    </section>
);

export default PrinciplesSection;
