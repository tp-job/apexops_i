import type { FC } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FiAlertTriangle, FiFolder, FiPlus, FiRadio } from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    EmptyState,
    Field,
    Input,
    Modal,
    SkeletonText,
    Surface,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { useProjects } from '@/hooks/useProjects';
import { getErrorMessage } from '@/utils/error';
import { relativeTime } from '@/utils/format';
import { fadeUp, stagger } from '@/lib/motion';
import type { Project } from '@/types/projects';

const ProjectCard: FC<{ project: Project }> = ({ project }) => {
    const unresolved = project.stats?.unresolvedIssues ?? 0;
    const lastEventAt = project.stats?.lastEventAt ?? null;

    return (
        <motion.div variants={fadeUp}>
            <Link to={`/p/${project.slug}/issues`} className="block outline-none group">
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
                        <Badge tone={project.role === 'owner' ? 'accent' : 'neutral'}>{project.role}</Badge>
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
    const { projects, loading, error, create } = useProjects();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim()) {
            setFormError('Project name is required');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const project = await create({ name: name.trim() });
            setOpen(false);
            setName('');
            // Straight to settings, not the issue list: a project with no key
            // installed anywhere has nothing to show, and the snippet is the
            // only useful next action.
            navigate(`/p/${project.slug}/settings`);
        } catch (err) {
            setFormError(getErrorMessage(err, 'Could not create project'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Projects"
                subtitle="Each project has its own ingest key, issues and board"
                actions={
                    <AccentButton icon={<FiPlus size={16} />} onClick={() => setOpen(true)}>
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

            {loading ? (
                <SkeletonText lines={4} lineHeight="h-28" />
            ) : projects.length === 0 ? (
                <Surface variant="panel" padding="md">
                    <EmptyState
                        icon={<FiFolder size={22} />}
                        title="No projects yet"
                        description="A project is the scope for everything the SDK reports — issues, events and tickets all hang off one."
                        action={
                            <AccentButton icon={<FiPlus size={16} />} onClick={() => setOpen(true)}>
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
                        <ProjectCard key={p.id} project={p} />
                    ))}
                </motion.div>
            )}

            <Modal
                open={open}
                onOpenChange={(v) => {
                    if (!saving) {
                        setOpen(v);
                        setFormError(null);
                    }
                }}
                title="New project"
                description="The slug is derived from the name and becomes part of every URL."
                dismissible={!saving}
                footer={
                    <>
                        <AccentButton variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </AccentButton>
                        <AccentButton size="sm" onClick={submit} disabled={saving}>
                            {saving ? 'Creating…' : 'Create project'}
                        </AccentButton>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
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
                    {/* Submits on Enter without a visible duplicate button. */}
                    <button type="submit" className="sr-only" disabled={saving}>
                        Create project
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Projects;
