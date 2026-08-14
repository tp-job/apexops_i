import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FiArrowDown,
    FiArrowUp,
    FiFileText,
    FiPlus,
    FiTrash2,
} from 'react-icons/fi';
import {
    PageHeader,
    AccentButton,
    Badge,
    ConfirmDialog,
    EmptyState,
    Field,
    Input,
    SegmentedControl,
    Surface,
} from '@/components/design-system';
import AdminRefusal from '@/components/common/AdminRefusal';
import DocsArticle from '@/components/docs/DocsArticle';
import DocsToc from '@/components/docs/DocsToc';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ApiError } from '@/api/request';
import { adminDocsAPI, groupDocPages, type AdminDocPage, type DocPageInput } from '@/services/docs';
import { parseDoc } from '@/lib/docsMarkdown';

/**
 * `/admin/docs` — the documentation CMS (F006, S9-D3).
 *
 * **Preview is a guarantee, not an approximation.** It renders the draft body
 * through `DocsMarkdown` — the same component `/docs` uses, from the same parse
 * — so "it looked right in preview" and "it looks right in public" cannot come
 * apart. A second preview renderer would be a second thing to keep in sync, and
 * the one that drifts is always the one nobody looks at.
 *
 * The nav entry is admin-only, but that is presentation (`Sidebar.tsx:26`).
 * Every route this screen calls is `authorize('admin')` server-side, resolved
 * from the database on each request — so an admin demoted with this page open
 * gets a 403 on their next save, which is handled below rather than assumed away.
 */

const BLANK: DocPageInput = {
    slug: '',
    title: '',
    group: 'Get started',
    summary: '',
    body: '## First section\n\nWrite in Markdown. Directives available:\n\n:::callout{tone=info title="A callout"}\nContainer directives render through the same primitives the docs already use.\n:::\n',
    status: 'draft',
};

const textarea =
    'w-full rounded-xl border border-gray-200 bg-white/70 px-3.5 py-2.5 font-mono text-[13px] leading-6 ' +
    'text-brand-dark outline-none transition-colors placeholder:text-gray-400 ' +
    'focus-visible:border-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/25 ' +
    'dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:border-brand-accent ' +
    'dark:focus-visible:ring-brand-accent/30';

const AdminDocs: FC = () => {
    const { user } = useAuth();
    const toast = useToast();

    const [pages, setPages] = useState<AdminDocPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedId, setSelectedId] = useState<number | 'new' | null>(null);
    const [draft, setDraft] = useState<DocPageInput>(BLANK);
    /** The slug as loaded, so a rename can be detected and confirmed (S9-D8). */
    const [originalSlug, setOriginalSlug] = useState<string | null>(null);
    const [view, setView] = useState<'edit' | 'preview'>('edit');
    const [saving, setSaving] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);

    const [confirmSlug, setConfirmSlug] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<AdminDocPage | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminDocsAPI.list();
            setPages(res.pages);
            setError(null);
        } catch (err) {
            setPages([]);
            setError(
                err instanceof ApiError && err.status === 403
                    ? 'You no longer have administrator access.'
                    : err instanceof Error
                        ? err.message
                        : 'Could not load pages'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const open = useCallback(async (id: number) => {
        try {
            const { page } = await adminDocsAPI.read(id);
            setSelectedId(id);
            setOriginalSlug(page.slug);
            setFieldError(null);
            setView('edit');
            setDraft({
                slug: page.slug,
                title: page.title,
                group: page.group,
                summary: page.summary,
                body: page.body,
                status: page.status,
            });
        } catch (err) {
            toast.showError(err instanceof Error ? err.message : 'Could not open that page');
        }
    }, [toast]);

    const startNew = () => {
        setSelectedId('new');
        setOriginalSlug(null);
        setFieldError(null);
        setView('edit');
        setDraft(BLANK);
    };

    // Parsed on every keystroke: the parse is a pure pass over a few kilobytes,
    // and a preview that lags behind the textarea is worse than one that costs a
    // fraction of a frame.
    const parsed = useMemo(() => parseDoc(draft.body ?? ''), [draft.body]);

    const save = useCallback(async (overrides: DocPageInput = {}) => {
        const payload = { ...draft, ...overrides };
        setSaving(true);
        setFieldError(null);
        try {
            if (selectedId === 'new') {
                const { page } = await adminDocsAPI.create(payload);
                setSelectedId(page.id);
                setOriginalSlug(page.slug);
                toast.showSuccess(`“${page.title}” created`);
            } else if (typeof selectedId === 'number') {
                const { page } = await adminDocsAPI.update(selectedId, payload);
                setOriginalSlug(page.slug);
                toast.showSuccess(
                    payload.status === 'published' ? `“${page.title}” is live at /docs/${page.slug}` : 'Draft saved'
                );
            }
            setDraft(payload);
            await load();
        } catch (err) {
            // A slug collision is a field error, not a toast that disappears: the
            // input that needs changing is on screen and should say so.
            if (err instanceof ApiError && err.status === 409) setFieldError(err.message);
            else toast.showError(err instanceof Error ? err.message : 'Could not save');
        } finally {
            setSaving(false);
        }
    }, [draft, load, selectedId, toast]);

    /** Save, but stop first if the slug changed on an existing page (S9-D8). */
    const requestSave = (overrides: DocPageInput = {}) => {
        if (originalSlug && draft.slug !== originalSlug) {
            setConfirmSlug(true);
            return;
        }
        void save(overrides);
    };

    const move = useCallback(async (page: AdminDocPage, direction: -1 | 1) => {
        const siblings = pages.filter((p) => p.group === page.group);
        const index = siblings.findIndex((p) => p.id === page.id);
        const target = siblings[index + direction];
        if (!target) return;

        // The whole group is renumbered from its new sequence rather than the two
        // rows swapping values: seeded pages share positions, and swapping inside
        // a set with duplicates produces an order that is stable on screen and
        // wrong on reload.
        const reordered = [...siblings];
        reordered.splice(index, 1);
        reordered.splice(index + direction, 0, page);

        try {
            await adminDocsAPI.reorder(
                reordered.map((p, i) => ({ id: p.id, group: p.group, groupOrder: p.groupOrder, order: i }))
            );
            await load();
        } catch (err) {
            toast.showError(err instanceof Error ? err.message : 'Could not reorder');
        }
    }, [load, pages, toast]);

    const remove = useCallback(async (page: AdminDocPage) => {
        try {
            await adminDocsAPI.remove(page.id);
            if (selectedId === page.id) { setSelectedId(null); setOriginalSlug(null); }
            toast.showSuccess(`“${page.title}” deleted`);
            await load();
        } catch (err) {
            toast.showError(err instanceof Error ? err.message : 'Could not delete');
        }
    }, [load, selectedId, toast]);

    const groups = useMemo(() => groupDocPages(pages), [pages]);

    // The fast path only. Every route this page calls refuses a non-admin too.
    if (user && user.role !== 'admin') {
        return (
            <AdminRefusal
                title="Documentation"
                description="Editing the public documentation requires an administrator role. The pages themselves stay readable at /docs, signed in or not."
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Documentation"
                subtitle="Edit the public /docs pages. Published changes are live immediately — no deploy."
            />

            <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
                {/* ── The rail, in the order visitors see ─────────── */}
                <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-brand-dark dark:text-white">Pages</p>
                        <AccentButton size="sm" variant="ghost" onClick={startNew}>
                            <FiPlus size={14} /> New
                        </AccentButton>
                    </div>

                    {error && <p className="text-[13px] text-global-red">{error}</p>}
                    {loading && <p className="text-[13px] text-gray-500">Loading…</p>}

                    {!loading && !error && pages.length === 0 && (
                        <EmptyState
                            icon={<FiFileText size={20} />}
                            title="No pages yet"
                            description="Create one, and it appears at /docs once published."
                        />
                    )}

                    <div className="flex flex-col gap-5">
                        {groups.map(({ group, pages: groupPages }) => (
                            <div key={group} className="flex flex-col gap-1">
                                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                    {group}
                                </p>
                                {groupPages.map((page, i) => (
                                    <div
                                        key={page.id}
                                        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
                                            selectedId === page.id
                                                ? 'bg-brand-dark/[0.06] dark:bg-brand-accent/10'
                                                : 'hover:bg-black/[0.04] dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => void open(page.id)}
                                            className="min-w-0 flex-1 text-left outline-none"
                                        >
                                            <span className="flex items-center gap-2 truncate text-[13.5px] font-medium text-brand-dark dark:text-gray-100">
                                                {page.title}
                                                {page.status === 'draft' && <Badge tone="outline">draft</Badge>}
                                            </span>
                                            <span className="truncate text-[11px] text-gray-400">/docs/{page.slug}</span>
                                        </button>

                                        <button
                                            type="button"
                                            aria-label={`Move ${page.title} up`}
                                            disabled={i === 0}
                                            onClick={() => void move(page, -1)}
                                            className="grid h-6 w-6 place-items-center rounded-md text-gray-400 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-white"
                                        >
                                            <FiArrowUp size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Move ${page.title} down`}
                                            disabled={i === groupPages.length - 1}
                                            onClick={() => void move(page, 1)}
                                            className="grid h-6 w-6 place-items-center rounded-md text-gray-400 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-white"
                                        >
                                            <FiArrowDown size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </Surface>

                {/* ── Editor ──────────────────────────────────────── */}
                <Surface variant="panel" padding="md" className="flex min-w-0 flex-col gap-4">
                    {selectedId === null ? (
                        <EmptyState
                            icon={<FiFileText size={22} />}
                            title="Nothing open"
                            description="Choose a page on the left, or create a new one."
                        />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <SegmentedControl
                                    size="sm"
                                    value={view}
                                    onChange={(v) => setView(v as 'edit' | 'preview')}
                                    segments={[
                                        { value: 'edit', label: 'Edit' },
                                        { value: 'preview', label: 'Preview' },
                                    ]}
                                />
                                <span className="ml-auto flex items-center gap-2">
                                    <Badge tone={draft.status === 'published' ? 'accent' : 'outline'}>
                                        {draft.status}
                                    </Badge>
                                    <AccentButton
                                        size="sm"
                                        variant="ghost"
                                        disabled={saving}
                                        onClick={() =>
                                            requestSave({ status: draft.status === 'published' ? 'draft' : 'published' })
                                        }
                                    >
                                        {draft.status === 'published' ? 'Unpublish' : 'Publish'}
                                    </AccentButton>
                                    <AccentButton size="sm" disabled={saving} onClick={() => requestSave()}>
                                        {saving ? 'Saving…' : 'Save'}
                                    </AccentButton>
                                </span>
                            </div>

                            {view === 'edit' ? (
                                <div className="flex flex-col gap-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Title">
                                            <Input
                                                value={draft.title ?? ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                                            />
                                        </Field>
                                        <Field
                                            label="Slug"
                                            error={fieldError ?? undefined}
                                            hint="The URL segment: /docs/<slug>"
                                        >
                                            <Input
                                                value={draft.slug ?? ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                                            />
                                        </Field>
                                        <Field label="Group" hint="The heading it sits under in the rail">
                                            <Input
                                                value={draft.group ?? ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}
                                            />
                                        </Field>
                                        <Field label="Summary" hint="One line. Matched by the docs search box">
                                            <Input
                                                value={draft.summary ?? ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                                            />
                                        </Field>
                                    </div>

                                    <Field label="Body" hint="Markdown, plus :::callout and :::endpoint directives">
                                        <textarea
                                            value={draft.body ?? ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                                            spellCheck={false}
                                            rows={28}
                                            className={textarea}
                                        />
                                    </Field>

                                    {typeof selectedId === 'number' && (
                                        <div className="flex justify-end border-t border-gray-200 pt-3 dark:border-white/10">
                                            <AccentButton
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    const page = pages.find((p) => p.id === selectedId);
                                                    if (page) setConfirmDelete(page);
                                                }}
                                            >
                                                <FiTrash2 size={14} /> Delete page
                                            </AccentButton>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Same renderer as /docs, from the same parse — see the
                                   header comment. The chrome differs; the content path
                                   does not. */
                                <div className="flex gap-6">
                                    <div className="min-w-0 flex-1">
                                        <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-tight">
                                            {draft.title || 'Untitled'}
                                        </h1>
                                        <DocsArticle doc={parsed} />
                                    </div>
                                    <aside className="hidden w-52 shrink-0 xl:block">
                                        <DocsToc sections={parsed.sections} />
                                    </aside>
                                </div>
                            )}
                        </>
                    )}
                </Surface>
            </div>

            {/* Renaming a slug breaks every existing link to it and there is no
                redirect table in v1 (S9-D8) — so the consequence is named, not
                discovered later by whoever linked to it. */}
            <ConfirmDialog
                open={confirmSlug}
                onOpenChange={setConfirmSlug}
                title="Change the slug?"
                description={`Anything linking to /docs/${originalSlug} will stop working. There is no redirect.`}
                confirmLabel="Change it"
                destructive
                onConfirm={async () => { setConfirmSlug(false); await save(); }}
            />

            <ConfirmDialog
                open={confirmDelete !== null}
                onOpenChange={(open) => !open && setConfirmDelete(null)}
                title={`Delete “${confirmDelete?.title ?? ''}”?`}
                description="The page and its content are removed. This cannot be undone from here."
                confirmLabel="Delete page"
                destructive
                onConfirm={async () => {
                    const target = confirmDelete;
                    setConfirmDelete(null);
                    if (target) await remove(target);
                }}
            />
        </div>
    );
};

export default AdminDocs;
