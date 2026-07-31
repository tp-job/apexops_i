import type { FC } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    FiAlertTriangle,
    FiArchive,
    FiCopy,
    FiEdit2,
    FiExternalLink,
    FiFolder,
    FiKey,
    FiMoreHorizontal,
    FiPlus,
    FiRadio,
    FiRotateCcw,
    FiSettings,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    ConfirmDialog,
    ContextMenu,
    EmptyState,
    Field,
    Input,
    Modal,
    SkeletonText,
    Surface,
    Switch,
    useContextMenu,
    type ContextMenuItem,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/context/toast-context';
import { getErrorMessage } from '@/utils/error';
import { relativeTime } from '@/utils/format';
import { fadeUp, stagger } from '@/lib/motion';
import type { Project } from '@/types/projects';

interface CardProps {
    project: Project;
    onContextMenu: (e: React.MouseEvent, p: Project) => void;
    onMenuButton: (e: React.MouseEvent, p: Project) => void;
}

const ProjectCard: FC<CardProps> = ({ project, onContextMenu, onMenuButton }) => {
    const unresolved = project.stats?.unresolvedIssues ?? 0;
    const lastEventAt = project.stats?.lastEventAt ?? null;
    const archived = project.archivedAt !== null;

    return (
        <motion.div variants={fadeUp} onContextMenu={(e) => onContextMenu(e, project)}>
            <Link
                to={`/p/${project.slug}/issues`}
                className={`block outline-none group ${archived ? 'opacity-60' : ''}`}
            >
                <Surface
                    interactive
                    padding="md"
                    className="h-full transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-brand-dark/40 dark:group-focus-visible:ring-brand-accent/50"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate font-heading text-base font-bold text-brand-dark dark:text-white">
                                {project.name}
                            </p>
                            <p className="truncate font-mono text-xs text-gray-400">/{project.slug}</p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                            {archived && <Badge tone="outline">archived</Badge>}
                            <Badge tone={project.role === 'owner' ? 'accent' : 'neutral'}>
                                {project.role}
                            </Badge>

                            {/* The keyboard- and touch-reachable twin of the right-click
                                gesture. Same menu, same items — without it these actions
                                would exist only for mouse users who think to try. */}
                            <button
                                type="button"
                                aria-label={`Actions for ${project.name}`}
                                aria-haspopup="menu"
                                onClick={(e) => {
                                    // The card is a Link; without this the click navigates.
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onMenuButton(e, project);
                                }}
                                className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-brand-accent/40"
                            >
                                <FiMoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                            <p className="font-numbers text-2xl font-bold tabular-nums text-brand-dark dark:text-white">
                                {unresolved}
                            </p>
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Unresolved
                            </p>
                        </div>

                        {/* "Never" and "quiet for a while" are different states and must
                            not render the same — silence in a monitoring tool is
                            ambiguous, and ambiguity is worse than an error. */}
                        {lastEventAt === null ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1 text-[11px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
                                <FiRadio size={12} />
                                Awaiting first event
                            </span>
                        ) : (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                Last event {relativeTime(lastEventAt)}
                            </span>
                        )}
                    </div>
                </Surface>
            </Link>
        </motion.div>
    );
};

const Projects: FC = () => {
    const [showArchived, setShowArchived] = useState(false);
    const { projects, loading, error, create, rename, archive, restore } = useProjects(showArchived);
    const navigate = useNavigate();
    const toast = useToast();
    const menu = useContextMenu<Project>();

    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [renameTarget, setRenameTarget] = useState<Project | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameError, setRenameError] = useState<string | null>(null);

    const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

    const submitCreate = async () => {
        if (!name.trim()) {
            setFormError('Project name is required');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const project = await create({ name: name.trim() });
            setCreateOpen(false);
            setName('');
            // Straight to settings, not the issue list: a project with no key
            // installed anywhere has nothing to show, and the snippet is the only
            // useful next action.
            navigate(`/p/${project.slug}/settings`);
        } catch (err) {
            setFormError(getErrorMessage(err, 'Could not create project'));
        } finally {
            setSaving(false);
        }
    };

    const submitRename = async () => {
        if (!renameTarget) return;
        const next = renameValue.trim();
        if (!next) {
            setRenameError('Project name is required');
            return;
        }
        if (next === renameTarget.name) {
            setRenameTarget(null);
            return;
        }
        setSaving(true);
        setRenameError(null);
        try {
            await rename(renameTarget.slug, next);
            setRenameTarget(null);
            toast.showSuccess(`Renamed to “${next}”`);
        } catch (err) {
            setRenameError(getErrorMessage(err, 'Could not rename project'));
        } finally {
            setSaving(false);
        }
    };

    const copyKey = async (project: Project) => {
        try {
            await navigator.clipboard.writeText(project.ingestKey);
            toast.showSuccess('Ingest key copied');
        } catch {
            toast.showError('Could not copy — open project settings to copy it manually.');
        }
    };

    /**
     * Menu items are built per project, from that project's own role. Hiding an
     * action the server would reject is presentation; the server decides. But
     * showing an owner-only control to a member guarantees a 403 the user cannot
     * act on, so the two should agree.
     */
    const itemsFor = (project: Project): ContextMenuItem[] => {
        const canAdminister = project.role === 'owner' || project.role === 'admin';
        const isOwner = project.role === 'owner';
        const archived = project.archivedAt !== null;

        const items: ContextMenuItem[] = [
            {
                id: 'open',
                label: 'Open issues',
                icon: <FiExternalLink size={15} />,
                onSelect: () => navigate(`/p/${project.slug}/issues`),
            },
            {
                id: 'settings',
                label: 'Project settings',
                icon: <FiSettings size={15} />,
                onSelect: () => navigate(`/p/${project.slug}/settings`),
            },
            {
                id: 'copy-key',
                label: 'Copy ingest key',
                icon: <FiKey size={15} />,
                separatorBefore: true,
                onSelect: () => void copyKey(project),
            },
            {
                id: 'copy-link',
                label: 'Copy link',
                icon: <FiCopy size={15} />,
                onSelect: () => {
                    void navigator.clipboard
                        .writeText(`${window.location.origin}/p/${project.slug}/issues`)
                        .then(() => toast.showSuccess('Link copied'))
                        .catch(() => toast.showError('Could not copy link'));
                },
            },
            {
                id: 'rename',
                label: 'Rename…',
                icon: <FiEdit2 size={15} />,
                separatorBefore: true,
                disabled: !canAdminister,
                onSelect: () => {
                    setRenameTarget(project);
                    setRenameValue(project.name);
                    setRenameError(null);
                },
            },
        ];

        if (archived) {
            items.push({
                id: 'restore',
                label: 'Restore project',
                icon: <FiRotateCcw size={15} />,
                disabled: !isOwner,
                onSelect: () => {
                    void restore(project.slug)
                        .then(() => toast.showSuccess(`Restored “${project.name}”`))
                        .catch((err) =>
                            toast.showError(getErrorMessage(err, 'Could not restore project'))
                        );
                },
            });
        } else {
            items.push({
                id: 'archive',
                label: 'Archive project',
                icon: <FiArchive size={15} />,
                destructive: true,
                disabled: !isOwner,
                onSelect: () => setArchiveTarget(project),
            });
        }

        return items;
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Projects"
                subtitle="Each project has its own ingest key, issues and board"
                actions={
                    <AccentButton icon={<FiPlus size={16} />} onClick={() => setCreateOpen(true)}>
                        New project
                    </AccentButton>
                }
            />

            {error && (
                <Surface variant="panel" padding="md">
                    <p className="flex items-center gap-2 text-sm text-global-red">
                        <FiAlertTriangle size={16} />
                        {error}
                    </p>
                </Surface>
            )}

            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Right-click a project — or use its <span aria-hidden>⋯</span> button — for actions.
                </p>
                <Switch
                    justified
                    label="Show archived"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="w-auto"
                />
            </div>

            {loading ? (
                <SkeletonText lines={4} lineHeight="h-28" />
            ) : projects.length === 0 ? (
                <Surface variant="panel" padding="md">
                    <EmptyState
                        icon={<FiFolder size={22} />}
                        title={showArchived ? 'No projects' : 'No projects yet'}
                        description="A project is the scope for everything the SDK reports — issues, events and tickets all hang off one."
                        action={
                            <AccentButton icon={<FiPlus size={16} />} onClick={() => setCreateOpen(true)}>
                                Create your first project
                            </AccentButton>
                        }
                    />
                </Surface>
            ) : (
                <motion.div
                    variants={stagger()}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                    {projects.map((p) => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onContextMenu={menu.openAtCursor}
                            onMenuButton={menu.openAtElement}
                        />
                    ))}
                </motion.div>
            )}

            {/* One menu for the whole grid — see use-context-menu.ts. */}
            <ContextMenu
                open={menu.open}
                position={menu.position}
                onClose={menu.close}
                label={menu.target ? `Actions for ${menu.target.name}` : 'Project actions'}
                items={menu.target ? itemsFor(menu.target) : []}
            />

            {/* ── Create ──────────────────────────────────────── */}
            <Modal
                open={createOpen}
                onOpenChange={(v) => {
                    if (!saving) {
                        setCreateOpen(v);
                        setFormError(null);
                    }
                }}
                title="New project"
                description="The slug is derived from the name and becomes part of every URL."
                dismissible={!saving}
                footer={
                    <>
                        <AccentButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setCreateOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </AccentButton>
                        <AccentButton size="sm" onClick={submitCreate} disabled={saving}>
                            {saving ? 'Creating…' : 'Create project'}
                        </AccentButton>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submitCreate();
                    }}
                >
                    <Field label="Project name" required error={formError ?? undefined} id="new-project-name">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Acme Storefront"
                            autoFocus
                            disabled={saving}
                        />
                    </Field>
                    <button type="submit" className="sr-only" disabled={saving}>
                        Create project
                    </button>
                </form>
            </Modal>

            {/* ── Rename ──────────────────────────────────────── */}
            <Modal
                open={renameTarget !== null}
                onOpenChange={(v) => {
                    if (!v && !saving) setRenameTarget(null);
                }}
                title="Rename project"
                description="The slug stays the same — it is in every embedded snippet's dashboard link and every bookmark."
                dismissible={!saving}
                footer={
                    <>
                        <AccentButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setRenameTarget(null)}
                            disabled={saving}
                        >
                            Cancel
                        </AccentButton>
                        <AccentButton size="sm" onClick={submitRename} disabled={saving}>
                            {saving ? 'Saving…' : 'Save name'}
                        </AccentButton>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submitRename();
                    }}
                >
                    <Field
                        label="Project name"
                        required
                        error={renameError ?? undefined}
                        hint={renameTarget ? `Slug stays /${renameTarget.slug}` : undefined}
                        id="rename-project-name"
                    >
                        <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            disabled={saving}
                        />
                    </Field>
                    <button type="submit" className="sr-only" disabled={saving}>
                        Save name
                    </button>
                </form>
            </Modal>

            {/* ── Archive ─────────────────────────────────────── */}
            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(v) => {
                    if (!v) setArchiveTarget(null);
                }}
                title={archiveTarget ? `Archive “${archiveTarget.name}”?` : 'Archive project'}
                description="The project stops accepting events and leaves this list. Nothing is deleted — issues, tickets and the ingest key are kept, and you can restore it from “Show archived”."
                confirmLabel="Archive project"
                destructive
                onConfirm={async () => {
                    if (!archiveTarget) return;
                    try {
                        await archive(archiveTarget.slug);
                        toast.showSuccess(`Archived “${archiveTarget.name}”`);
                        setArchiveTarget(null);
                    } catch (err) {
                        toast.showError(getErrorMessage(err, 'Could not archive project'));
                        throw err; // Keeps the dialog open so the failure is visible.
                    }
                }}
            />
        </div>
    );
};

export default Projects;
