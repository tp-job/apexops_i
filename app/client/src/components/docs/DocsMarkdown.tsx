import type { FC, ReactNode } from 'react';
import type { Block, Inline } from '@/lib/docsMarkdown';
import { A, C, Callout, Code, Endpoint, LI, Lead, OL, P, Table, UL } from './DocsPrimitives';

/**
 * Renders the parsed doc tree (`lib/docsMarkdown.ts`) through the primitives the
 * hand-authored JSX used.
 *
 * **There is no `dangerouslySetInnerHTML` in this file and none may be added.**
 * That is the whole escaping story (S9-D4): a text node reaches the DOM as a
 * React child, so `<img src=x onerror=alert(1)>` in a body is a string on the
 * page rather than an element in it. Nothing about that depends on the author
 * being an admin — which matters, because `/docs` is public and the day an admin
 * account is compromised is not the day to discover the renderer trusted it.
 *
 * The admin preview and the public page both render through this component, so
 * preview is a guarantee rather than an approximation (S9-D3).
 */

const renderInline = (nodes: Inline[], keyPrefix = ''): ReactNode[] =>
    nodes.map((node, i) => {
        const key = `${keyPrefix}${i}`;
        switch (node.type) {
            case 'text':
                return <span key={key}>{node.value}</span>;
            case 'code':
                return <C key={key}>{node.value}</C>;
            case 'strong':
                return <strong key={key}>{renderInline(node.children, `${key}-`)}</strong>;
            case 'em':
                return <em key={key}>{renderInline(node.children, `${key}-`)}</em>;
            case 'endpoint':
                return <Endpoint key={key} method={node.method} path={node.path} />;
            case 'link':
                // A refused href (S9-D4) keeps its text and loses its link. The
                // reader sees the words; nothing navigable is produced.
                return node.href === null ? (
                    <span key={key}>{renderInline(node.children, `${key}-`)}</span>
                ) : (
                    <A key={key} href={node.href}>
                        {renderInline(node.children, `${key}-`)}
                    </A>
                );
        }
    });

/**
 * `bare` — inside a callout, where text inherits the callout's tone and size.
 * `lead` — the page intro, which is one size up and lighter, as `Lead` was in
 * the JSX version.
 */
type ParagraphStyle = 'body' | 'bare' | 'lead';

const renderBlock = (block: Block, key: string, style: ParagraphStyle = 'body'): ReactNode => {
    switch (block.type) {
        case 'paragraph': {
            const children = renderInline(block.children, `${key}-`);
            if (style === 'bare') return <p key={key}>{children}</p>;
            if (style === 'lead') return <Lead key={key}>{children}</Lead>;
            return <P key={key}>{children}</P>;
        }

        case 'list': {
            const items = block.items.map((item, i) => (
                <LI key={`${key}-${i}`}>{renderInline(item, `${key}-${i}-`)}</LI>
            ));
            return block.ordered ? <OL key={key}>{items}</OL> : <UL key={key}>{items}</UL>;
        }

        case 'code':
            return (
                <Code key={key} lang={block.lang}>
                    {block.value}
                </Code>
            );

        case 'table':
            return (
                <Table
                    key={key}
                    columns={block.columns}
                    rows={block.rows.map((row, i) => row.map((cell, j) => renderInline(cell, `${key}-${i}-${j}-`)))}
                />
            );

        case 'callout':
            return (
                <Callout key={key} tone={block.tone} title={block.title}>
                    <div className="flex flex-col gap-2">
                        {block.children.map((child, i) => renderBlock(child, `${key}-${i}`, 'bare'))}
                    </div>
                </Callout>
            );

        case 'endpoint':
            return <Endpoint key={key} method={block.method} path={block.path} />;
    }
};

const DocsMarkdown: FC<{ blocks: Block[]; lead?: boolean }> = ({ blocks, lead = false }) => (
    <div className="flex flex-col gap-4">
        {blocks.map((block, i) => renderBlock(block, String(i), lead ? 'lead' : 'body'))}
    </div>
);

export default DocsMarkdown;
