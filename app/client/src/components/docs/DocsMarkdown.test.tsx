import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDoc } from '@/lib/docsMarkdown';
import DocsMarkdown from './DocsMarkdown';

/**
 * The XSS proof (criterion 7, S9-D4) — asserted on **rendered output**, not on
 * the parse tree.
 *
 * Asserting on the tree would prove the parser classified something as text; it
 * would not prove the renderer kept it that way, and the renderer is where a
 * future `dangerouslySetInnerHTML` would go. `renderToStaticMarkup` produces the
 * exact string React would put in the DOM, with no jsdom and no browser, so the
 * assertion is about what a visitor to the public page actually receives.
 */

const render = (body: string): string => {
    const doc = parseDoc(body);
    return renderToStaticMarkup(<DocsMarkdown blocks={[...doc.intro, ...doc.sections.flatMap((s) => s.blocks)]} />);
};

describe('DocsMarkdown rendered output', () => {
    it('renders an injected img tag as inert text', () => {
        const html = render('An admin typed <img src=x onerror=alert(1)> into the body.');

        // The word `onerror` is still in the output — as five characters of prose
        // inside an escaped string. What must not exist is a tag carrying it, so
        // the assertion is about the angle brackets, which is what decides
        // whether the browser sees an element or text.
        expect(html).not.toMatch(/<img/i);
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('renders an injected script tag as inert text', () => {
        const html = render('<script>alert(document.cookie)</script>');

        expect(html).not.toContain('<script');
        expect(html).toContain('&lt;script&gt;');
    });

    it('drops a javascript: href and keeps the link text', () => {
        const html = render('[click me](javascript:alert(1))');

        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('<a ');
        expect(html).toContain('click me');
    });

    it('keeps an allowlisted href navigable', () => {
        const html = render('[the docs](https://example.com/x) and [projects](/projects)');

        expect(html).toContain('href="https://example.com/x"');
        expect(html).toContain('href="/projects"');
    });

    it('renders callouts, tables, endpoints and code through the shared primitives', () => {
        const html = render(
            [
                '| Field {w-36} | Notes |',
                '| --- | --- |',
                '| `level` | One of :endpoint[GET /api/x] |',
                '',
                ':::callout{tone=warn title="Careful"}',
                'No grace period.',
                ':::',
                '',
                '```bash',
                'curl -X POST /api/ingest',
                '```',
            ].join('\n')
        );

        expect(html).toContain('Careful');
        expect(html).toContain('No grace period.');
        expect(html).toContain('curl -X POST /api/ingest');
        expect(html).toContain('<table');
        // The width class from the header cell reaches the column, so a migrated
        // table keeps the proportions the JSX version had.
        expect(html).toContain('w-36');
    });
});
