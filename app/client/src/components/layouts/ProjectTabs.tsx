import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { FiActivity, FiClipboard, FiList, FiSettings, FiUsers } from 'react-icons/fi';

/**
 * Sub-navigation inside a project workspace.
 *
 * **Issues stays the landing route, not Overview.** During an incident you want
 * "what is broken" in zero clicks; the overview is a review surface. Making it
 * the default would penalise the frequent case to serve the occasional one — so
 * it sits one click away here instead.
 *
 * Rendered per page rather than in `AppLayout` because only `/p/:slug/*` has a
 * project in scope; putting it in the layout would mean every other page
 * carrying a nav that has nothing to point at.
 */
const ProjectTabs: FC<{ slug: string }> = ({ slug }) => {
    const tabs = [
        { to: `/p/${slug}/overview`, label: 'Overview', icon: <FiActivity size={15} /> },
        { to: `/p/${slug}/issues`, label: 'Issues', icon: <FiList size={15} /> },
        { to: `/p/${slug}/board`, label: 'Board', icon: <FiClipboard size={15} /> },
        // Visible to every role, not just owner/admin: `GET /:slug/members` is a
        // list any member is entitled to, and "who else can see this workspace"
        // is a question a member has a legitimate reason to ask. What they cannot
        // see is the pending-invite list, and that is enforced server-side.
        { to: `/p/${slug}/members`, label: 'Members', icon: <FiUsers size={15} /> },
        { to: `/p/${slug}/settings`, label: 'Settings', icon: <FiSettings size={15} /> },
    ];

    return (
        <nav aria-label="Project sections" className="flex gap-1 border-b border-gray-200 dark:border-white/10">
            {tabs.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    // `end` so /issues does not stay highlighted on /issues/:id...
                    // except it should: a child of Issues is still Issues. Only the
                    // exact-match tabs need it, and none of these are prefixes of
                    // each other, so default matching is correct here.
                    className={({ isActive }) =>
                        [
                            '-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium outline-none transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:focus-visible:ring-brand-accent/40',
                            isActive
                                ? 'border-brand-dark text-brand-dark dark:border-brand-accent dark:text-brand-accent'
                                : 'border-transparent text-gray-500 hover:text-brand-dark dark:text-gray-400 dark:hover:text-white',
                        ].join(' ')
                    }
                >
                    {t.icon}
                    {t.label}
                </NavLink>
            ))}
        </nav>
    );
};

export default ProjectTabs;
