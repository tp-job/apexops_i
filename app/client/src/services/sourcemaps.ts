import { apiRequest } from '@/api/request';
import type { ReleasesResponse, SourceMapsResponse } from '@/types/projects';

/**
 * Source-map management.
 *
 * **There is no `get(id)` here, and there must never be one.** The API returns
 * metadata only — release, file name, size, uploader. The map content is the
 * customer's original source; the server reads it in exactly one module
 * (`lib/sourcemaps.ts`) and what leaves the process is a resolved *position*,
 * never source text. A client method to fetch content would require an endpoint
 * that does not and should not exist.
 *
 * Upload is deliberately absent too: the map is a build artifact, so it is
 * uploaded from CI with the documented `curl`, not pasted through a browser.
 * This module exists so the settings panel can show what CI actually uploaded —
 * without it, a failed upload step and a wrong release string look identical.
 */
export const sourceMapsAPI = {
    list: (slug: string): Promise<SourceMapsResponse> =>
        apiRequest<SourceMapsResponse>(`/api/projects/${slug}/sourcemaps`),

    remove: (slug: string, id: number): Promise<{ deleted: boolean; id: number }> =>
        apiRequest(`/api/projects/${slug}/sourcemaps/${id}`, { method: 'DELETE' }),

    /**
     * Releases seen in this project's events, each with a map count.
     *
     * Read from `events` rather than a `Release` table: a release exists because
     * something reported it, and a table would drift from that the first time a
     * deploy was rolled back.
     */
    releases: (slug: string): Promise<ReleasesResponse> =>
        apiRequest<ReleasesResponse>(`/api/projects/${slug}/releases`),
};
