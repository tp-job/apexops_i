import type { FC, ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { EASE_LUX, SPRING } from '@/lib/motion';

/**
 * Landing-page effects, in the style of the React Bits catalogue but written
 * against this system rather than pasted in.
 *
 * **Why not the library.** Its components arrive with their own easing, their own
 * gradients and, for several of them, WebGL. Design-system law 05 says every
 * transition comes from `@/lib/motion`, and law "neutral plus lime" rules out the
 * blue-violet gradients most of those effects ship with — a dropped-in aurora
 * would look like a different product on the one page that has to introduce this
 * one. So: same ideas, this system's curve, this system's palette, no new
 * dependency and nothing to keep in sync.
 *
 * **Reduced motion is a contract here, not a courtesy** (design.md). Every effect
 * below resolves to its end state when the user asks for less movement: text is
 * simply text, cards keep their spotlight but stop chasing the cursor, and the
 * magnet stops pulling. Nothing depends on an animation finishing to be readable.
 */

// ── SplitText ─────────────────────────────────────────────────

/**
 * Reveals a line word by word — rise, unblur, settle.
 *
 * Split on words rather than characters on purpose: per-character staggering on a
 * headline this size reads as a novelty, and it breaks text selection and
 * screen-reader flow into confetti. The whole string stays in one accessible
 * label; only the visual pieces are split.
 */
export const SplitText: FC<{ text: string; className?: string; delay?: number }> = ({
    text,
    className = '',
    delay = 0,
}) => {
    const reduce = useReducedMotion();
    const words = text.split(' ');

    return (
        <span className={className} aria-label={text}>
            {words.map((word, i) => (
                <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                    <motion.span
                        aria-hidden
                        className="inline-block"
                        initial={reduce ? false : { y: '0.9em', opacity: 0, filter: 'blur(6px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.62, delay: delay + i * 0.055, ease: EASE_LUX }}
                    >
                        {word}
                    </motion.span>
                    {i < words.length - 1 && <span className="inline-block">&nbsp;</span>}
                </span>
            ))}
        </span>
    );
};

// ── ShinyText ─────────────────────────────────────────────────

/**
 * A slow sheen crossing a short label.
 *
 * Kept to small text — a sheen over a paragraph is a distraction that never
 * stops. The animation is pure CSS so it costs nothing on the main thread, and
 * `motion-safe:` is what turns it off for reduced motion.
 */
export const ShinyText: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <span
        className={[
            'relative inline-flex items-center overflow-hidden',
            'motion-safe:before:absolute motion-safe:before:inset-0',
            'motion-safe:before:-translate-x-full motion-safe:before:animate-[shine_3.6s_ease-in-out_infinite]',
            'motion-safe:before:bg-gradient-to-r motion-safe:before:from-transparent',
            'motion-safe:before:via-brand-accent/40 motion-safe:before:to-transparent',
            className,
        ].join(' ')}
    >
        {children}
    </span>
);

// ── SpotlightCard ─────────────────────────────────────────────

/**
 * A card that lights where the cursor is.
 *
 * The highlight is drawn from `--color-brand-accent` at low alpha rather than a
 * new colour, so the effect belongs to the palette instead of introducing one.
 * Pointer position is written to CSS custom properties — no React state per
 * mousemove, so a grid of these does not re-render on every pixel.
 */
export const SpotlightCard: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();

    const track = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (reduce || !ref.current) return;
            const r = ref.current.getBoundingClientRect();
            ref.current.style.setProperty('--x', `${e.clientX - r.left}px`);
            ref.current.style.setProperty('--y', `${e.clientY - r.top}px`);
        },
        [reduce],
    );

    return (
        <div ref={ref} onMouseMove={track} className={`group relative overflow-hidden ${className}`}>
            {/* Visibility is `group-hover`, i.e. CSS `:hover` — deliberately NOT a
                piece of React state. An `onMouseEnter` flag would duplicate what
                the browser already knows, and the two can disagree (a pointer
                leaving the window without a `mouseleave`, most obviously). */}
            {!reduce && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        background:
                            'radial-gradient(320px circle at var(--x, 50%) var(--y, 0%), color-mix(in srgb, var(--color-brand-accent) 22%, transparent), transparent 70%)',
                    }}
                />
            )}
            <div className="relative">{children}</div>
        </div>
    );
};

// ── Magnet ────────────────────────────────────────────────────

/**
 * Pulls its child a few pixels toward the cursor.
 *
 * Bounded to `pull` pixels and springy on release, because the point is that the
 * control feels responsive — not that it runs away from the pointer. Uses the
 * system's own `SPRING`, so it settles like everything else that moves here.
 */
export const Magnet: FC<{ children: ReactNode; pull?: number; className?: string }> = ({
    children,
    pull = 10,
    className = '',
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, SPRING);
    const y = useSpring(my, SPRING);

    const track = (e: React.MouseEvent<HTMLDivElement>) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        mx.set(Math.max(-1, Math.min(1, dx)) * pull);
        my.set(Math.max(-1, Math.min(1, dy)) * pull);
    };

    return (
        <motion.div
            ref={ref}
            className={`inline-block ${className}`}
            style={{ x, y }}
            onMouseMove={track}
            onMouseLeave={() => {
                mx.set(0);
                my.set(0);
            }}
        >
            {children}
        </motion.div>
    );
};

// ── AuroraBackdrop ────────────────────────────────────────────

/**
 * The page ground: two slow lime blooms over a dot grid.
 *
 * Neutral plus lime, per the palette rule — the blue-violet aurora these effects
 * usually ship with would be the loudest thing in the product and the first
 * exception to a rule this page is meant to demonstrate. It is `aria-hidden`,
 * fixed, and behind everything; it never intercepts a pointer.
 */
export const AuroraBackdrop: FC = () => {
    const reduce = useReducedMotion();

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* Dot grid — structure, not decoration: it gives the glass surfaces
                something to sit above so they read as layered rather than flat. */}
            <div
                className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-brand-dark) 22%, transparent) 1px, transparent 0)',
                    backgroundSize: '28px 28px',
                    maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
                }}
            />
            <motion.div
                className="absolute -top-40 -left-32 h-[38rem] w-[38rem] rounded-full bg-brand-accent/25 blur-[120px] dark:bg-brand-accent/15"
                animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
                transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -right-40 top-24 h-[32rem] w-[32rem] rounded-full bg-brand-steel/25 blur-[130px] dark:bg-brand-steel/10"
                animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 60, 0] }}
                transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
            />
        </div>
    );
};

// ── Reveal ────────────────────────────────────────────────────

/**
 * A scroll-triggered rise, for anything below the fold.
 *
 * `initial={false}` under reduced motion is what makes the end state the *only*
 * state — the element is simply there, rather than there after a shorter
 * animation.
 */
export const Reveal: FC<{ children: ReactNode; delay?: number; className?: string }> = ({
    children,
    delay = 0,
    className = '',
}) => {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.55, delay, ease: EASE_LUX }}
        >
            {children}
        </motion.div>
    );
};
