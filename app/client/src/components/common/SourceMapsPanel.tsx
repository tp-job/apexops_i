import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheck, FiFileText, FiTrash2 } from 'react-icons/fi';
import { AccentButton, Badge, EmptyState, Surface } from '@/components/design-system';
import { sourceMapsAPI } from '@/services/sourcemaps';
import { getErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/format';
import type { ReleaseSummary, SourceMapSummary } from '@/types/projects';

const humanSize = (bytes: number): string =>
    bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * What CI actually uploaded, grouped by release.
 *
 * This panel exists because without it an upload is **unfalsifiable from the
 * product**: a failed CI step, a typo in the release string, and a map uploaded
 * under the wrong file name all present identically — as a stack that stays
 * minified. Naming what is stored turns three indistinguishable failures into
 * three obvious ones.
 *
 * There is deliberately no upload control here. A source map is a build
 * artifact; it belongs to the pipeline that produced it, not to a file picker in
 * a browser where nobody can say which build it came from.
 */
const SourceMapsPanel: FC<{ slug: string }> = ({ slug }) => {
    const [maps, setMaps] = useState<SourceMapSummary[]>([]);
    const [releases, setReleases] = useState<ReleaseSummary[]>([]);
    const [totalBytes, setTotalBytes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            // Fetched together: the useful question is not "what did I upload"
            // but "which releases are producing errors with no maps", and that
            // needs both halves on screen at once.
            const [res, rel] = await Promise.all([
                sourceMapsAPI.list(slug),
                sourceMapsAPI.releases(slug),
            ]);
            setMaps(res.sourceMaps);
            setTotalBytes(res.totalBytes);
            setReleases(rel.releases);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Could not load source maps'));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void load();
    }, [load]);

    const remove = async (id: number) => {
        setBusyId(id);
        setError(null);
        try {
            await sourceMapsAPI.remove(slug, id);
            await load();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not delete that source map'));
        } finally {
            setBusyId(null);
        }
    };

    // Grouped by release. The server already orders release-desc, file-asc, so
    // this preserves that rather than imposing an order of its own.
    const byRelease = maps.reduce<Record<string, SourceMapSummary[]>>((acc, m) => {
        (acc[m.release] ??= []).push(m);
        return acc;
    }, {});

    return (
        <Surface variant="panel" padding="md" className="flex flex-col gap-4">
            <div>
                <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                    Source maps
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Uploaded from your build and matched to events by{' '}
                    <code className="font-mono text-xs">release</code> and file name. They are stored
                    privately and never served back — only resolved file, line and function names
                    reach the browser.{' '}
                    <Link
                        to="/docs/sdk#source-maps"
                        className="font-medium text-brand-dark underline underline-offset-2 dark:text-brand-accent"
                    >
                        Upload recipe
                    </Link>
                </p>
            </div>

            {error && (
                <p role="alert" className="text-xs font-medium text-global-red">
                    {error}
                </p>
            )}

            {loading ? (
                <p className="text-xs text-gray-400">Loading…</p>
            ) : maps.length === 0 ? (
                <EmptyState
                    size="sm"
                    icon={<FiFileText size={18} />}
                    title="No source maps uploaded"
                    description="Until a map is uploaded for a release, stack traces from that release stay minified. Adding the upload to your deploy pipeline is one curl."
                />
            ) : (
                <div className="flex flex-col gap-4">
                    {Object.entries(byRelease).map(([release, files]) => (
                        <div key={release} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Badge tone="outline">{release}</Badge>
                                <span className="text-[11px] text-gray-400">
                                    {files.length} file{files.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <ul className="flex flex-col divide-y divide-gray-200 dark:divide-white/10">
                                {files.map((m) => (
                                    <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-brand-dark dark:text-gray-200">
                                            {m.fileName}
                                        </span>
                                        <span className="text-[11px] text-gray-400">
                                            {humanSize(m.size)}
                                        </span>
                                        <span className="text-[11px] text-gray-400">
                                            {m.uploadedBy ? `${m.uploadedBy} · ` : ''}
                                            {formatDate(m.updatedAt)}
                                        </span>
                                        <AccentButton
                                            size="sm"
                                            variant="ghost"
                                            icon={<FiTrash2 size={13} />}
                                            disabled={busyId === m.id}
                                            onClick={() => void remove(m.id)}
                                        >
                                            Delete
                                        </AccentButton>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <p className="text-[11px] text-gray-400">
                        {humanSize(totalBytes)} stored across {maps.length} file
                        {maps.length === 1 ? '' : 's'}.
                    </p>
                </div>
            )}

            {/* Releases actually seen in events, with coverage.
                A list of uploads answers "what did I upload"; this answers the
                question people have, which is "which of my live releases will
                produce a stack trace nobody can read". */}
            {!loading && releases.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Releases seen in events
                    </p>
                    <ul className="flex flex-col divide-y divide-gray-200 dark:divide-white/10">
                        {releases.map((r) => {
                            const covered = (r.sourceMaps ?? 0) > 0;
                            return (
                                <li key={r.release} className="flex flex-wrap items-center gap-3 py-2">
                                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-brand-dark dark:text-gray-200">
                                        {r.release}
                                    </span>
                                    <span className="text-[11px] text-gray-400">
                                        {r.events} event{r.events === 1 ? '' : 's'} · last{' '}
                                        {formatDate(r.lastSeen)}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                                            covered
                                                ? 'text-brand-dark dark:text-brand-accent'
                                                : 'text-global-red'
                                        }`}
                                    >
                                        {covered ? <FiCheck size={11} /> : <FiAlertCircle size={11} />}
                                        {covered
                                            ? `${r.sourceMaps} map${r.sourceMaps === 1 ? '' : 's'}`
                                            : 'no maps'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </Surface>
    );
};

export default SourceMapsPanel;
