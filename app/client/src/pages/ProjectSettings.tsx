import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiAlertTriangle, FiCheck, FiCopy, FiRadio, FiRefreshCw } from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    Checkbox,
    ConfirmDialog,
    Field,
    Input,
    SkeletonText,
    Surface,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { useProject } from '@/hooks/useProject';
import { getApiBaseUrl } from '@/api/config';
import { getErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/format';
import { CAPTURE_LEVELS, type CaptureLevel } from '@/types/projects';

const LEVEL_HINTS: Record<CaptureLevel, string> = {
    error: 'Uncaught exceptions, rejections and console.error',
    warn: 'console.warn',
    info: 'console.info — opt-in, high volume',
    log: 'console.log — opt-in, very high volume',
    debug: 'console.debug — opt-in, very high volume',
};

const ProjectSettings: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { project, stats, loading, error, waitingForFirstEvent, update, rotateKey } = useProject(slug);

    const [copied, setCopied] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const [levels, setLevels] = useState<CaptureLevel[]>([]);
    const [retention, setRetention] = useState('30');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Seed the form once the project arrives. Keyed on id so switching projects
    // re-seeds rather than showing the previous project's settings.
    useEffect(() => {
        if (!project) return;
        setLevels(project.captureLevels);
        setRetention(String(project.retentionDays));
    }, [project?.id, project?.captureLevels, project?.retentionDays, project]);

    const snippet = project
        ? `<script src="${getApiBaseUrl()}/sdk/v1.js" data-project="${project.ingestKey}" defer></script>`
        : '';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setSaveError('Could not copy — select the snippet and copy manually.');
        }
    };

    const toggleLevel = (level: CaptureLevel) =>
        setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));

    const save = async () => {
        if (!levels.length) {
            setSaveError('At least one capture level is required.');
            return;
        }
        const days = Number.parseInt(retention, 10);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
            setSaveError('Retention must be between 1 and 365 days.');
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            await update({ captureLevels: levels, retentionDays: days });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            setSaveError(getErrorMessage(err, 'Could not save settings'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonText lines={6} lineHeight="h-16" />;

    if (error || !project) {
        return (
            <Surface variant="panel" padding="md">
                <p className="flex items-center gap-2 text-sm text-global-red">
                    <FiAlertTriangle size={16} />
                    {error ?? 'Project not found'}
                </p>
            </Surface>
        );
    }

    const canAdminister = project.role === 'owner' || project.role === 'admin';

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={project.name} subtitle={`Project settings · /${project.slug}`} />

            {/* ── Install ─────────────────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                        Install
                    </h2>
                    {waitingForFirstEvent ? (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
                            {/* A live indicator, not a static empty state: the page polls
                                and flips to success the instant the first event lands, so
                                the user never has to guess whether to refresh. */}
                            <FiRadio size={13} className="animate-pulse" />
                            Waiting for first event…
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-brand-accent/20 px-2.5 py-1 text-xs font-semibold text-brand-dark dark:text-brand-accent">
                            <FiCheck size={13} />
                            Receiving events
                        </span>
                    )}
                </div>

                <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Paste this into the <code className="font-mono text-xs">&lt;head&gt;</code> of the app you
                    want to monitor. The key is public by design — it can only write events to this
                    project, never read them.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 overflow-x-auto whitespace-pre rounded-xl border border-gray-200 bg-white/60 px-3.5 py-2.5 font-mono text-xs text-brand-dark dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                        {snippet}
                    </code>
                    <AccentButton
                        size="sm"
                        variant={copied ? 'dark' : 'accent'}
                        icon={copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                        onClick={copy}
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </AccentButton>
                </div>

                {waitingForFirstEvent && (
                    <p className="text-xs text-gray-400">
                        Nothing received yet. This updates on its own — no need to refresh.
                    </p>
                )}

                {stats && stats.lastEventAt && (
                    <p className="text-xs text-gray-400">
                        Last event {formatDate(stats.lastEventAt)} · {stats.eventsLast24h} in the last 24h
                    </p>
                )}
            </Surface>

            {/* ── Capture ─────────────────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                <div>
                    <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                        Capture
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        Enforced server-side, not just in the SDK — the script runs on a page we do not
                        control, so its config is a hint and this is the rule.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CAPTURE_LEVELS.map((level) => (
                        <Checkbox
                            key={level}
                            label={level}
                            hint={LEVEL_HINTS[level]}
                            checked={levels.includes(level)}
                            onChange={() => toggleLevel(level)}
                            disabled={!canAdminister || saving}
                        />
                    ))}
                </div>

                <div className="max-w-xs">
                    <Field
                        label="Retention"
                        hint="Days of raw events to keep. Issue totals are never pruned."
                        id="retention-days"
                    >
                        <Input
                            type="number"
                            min={1}
                            max={365}
                            value={retention}
                            onChange={(e) => setRetention(e.target.value)}
                            disabled={!canAdminister || saving}
                        />
                    </Field>
                </div>

                {saveError && (
                    <p role="alert" className="text-xs font-medium text-global-red">
                        {saveError}
                    </p>
                )}

                {canAdminister && (
                    <div className="flex items-center gap-3">
                        <AccentButton size="sm" onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </AccentButton>
                        {saved && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                <FiCheck size={13} /> Saved
                            </span>
                        )}
                    </div>
                )}
            </Surface>

            {/* ── Danger zone ─────────────────────────────────────── */}
            {canAdminister && (
                <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                    <div>
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            Ingest key
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Rotating takes effect immediately with no grace period. Every page still
                            embedding the current snippet stops reporting until it is updated.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <code className="rounded-lg bg-black/5 px-2.5 py-1.5 font-mono text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                            {project.ingestKey}
                        </code>
                        <Badge tone="outline">write-only</Badge>
                        <AccentButton
                            size="sm"
                            variant="ghost"
                            icon={<FiRefreshCw size={14} />}
                            onClick={() => setConfirmRotate(true)}
                        >
                            Rotate key
                        </AccentButton>
                    </div>
                </Surface>
            )}

            <ConfirmDialog
                open={confirmRotate}
                onOpenChange={setConfirmRotate}
                title="Rotate ingest key?"
                description="Every page embedding the current snippet stops reporting until it is updated with the new key. There is no grace period — that is the point of rotation."
                confirmLabel="Rotate key"
                destructive
                onConfirm={async () => {
                    await rotateKey();
                }}
            />
        </div>
    );
};

export default ProjectSettings;
