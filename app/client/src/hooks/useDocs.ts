import { useCallback, useEffect, useMemo, useState } from 'react';
import { docsAPI } from '@/services/docs';
import type { DocPageContent, DocPageSummary } from '@/services/docs';
import { parseDoc } from '@/lib/docsMarkdown';
import type { ParsedDoc } from '@/lib/docsMarkdown';
import { ApiError } from '@/api/request';
import { getErrorMessage } from '@/utils/error';

export interface UseDocsResult {
    /** The rail. Loads once and is not refetched per page. */
    pages: DocPageSummary[];
    page: DocPageContent | null;
    parsed: ParsedDoc | null;
    loading: boolean;
    /** True when the slug is unknown or unpublished — the caller redirects. */
    notFound: boolean;
    error: string | null;
    reload: () => Promise<void>;
}

/**
 * The public `/docs` data.
 *
 * The rail and the page are two requests rather than one payload carrying every
 * body: the sidebar needs six titles, and shipping six full Markdown documents
 * to render one of them is the kind of thing that is invisible in development
 * and obvious on a phone.
 *
 * Parsing happens here rather than in the page component so a body is parsed
 * once per fetch instead of once per render — the parse is pure and cheap, but
 * re-running it on every keystroke of the admin preview is avoidable work.
 *
 * A **404 is not an error state.** An unknown or draft slug is a normal thing
 * for a visitor to hit (a stale link, an unpublished page) and the answer is a
 * redirect to the default page, not a red box.
 */
export function useDocs(slug: string | undefined): UseDocsResult {
    const [pages, setPages] = useState<DocPageSummary[]>([]);
    const [page, setPage] = useState<DocPageContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setNotFound(false);
        try {
            const [list, content] = await Promise.all([
                docsAPI.list(),
                slug ? docsAPI.read(slug).catch((err) => {
                    if (err instanceof ApiError && err.status === 404) return null;
                    throw err;
                }) : Promise.resolve(null),
            ]);

            setPages(list.pages);
            setPage(content?.page ?? null);
            setNotFound(Boolean(slug) && content === null);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load documentation'));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void load();
    }, [load]);

    const parsed = useMemo(() => (page ? parseDoc(page.body) : null), [page]);

    return { pages, page, parsed, loading, notFound, error, reload: load };
}
