import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiSearch, FiUsers } from 'react-icons/fi';
import {
    PageHeader,
    AccentButton,
    Badge,
    ConfirmDialog,
    DataTable,
    EmptyState,
    Input,
    Pagination,
    Select,
    Surface,
    type Column,
} from '@/components/design-system';
import AdminRefusal from '@/components/common/AdminRefusal';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ApiError } from '@/api/request';
import { fullName, usersAPI, type AdminUser } from '@/services/users';
import { formatDate } from '@/utils/format';

/**
 * `/admin/users` — who may sign in to this instance, and what they may do.
 *
 * **Not under `/settings`** (spec D8). S-D4's boundary rule is that `/settings`
 * is about *you*; this is about the instance, and mixing the two is how someone
 * looking for their own password ends up staring at a list of everyone's email.
 *
 * The nav entry is admin-only, but that is presentation. Every route this screen
 * calls is gated server-side by `authorize('admin')`, which resolves the role
 * from the database rather than the token — so an admin demoted while this page
 * is open starts getting 403s on their next action. That is handled below rather
 * than assumed away.
 */

const PAGE_SIZE = 15;

const AdminUsers: FC = () => {
    const { user } = useAuth();
    const toast = useToast();

    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const [confirm, setConfirm] = useState<{ target: AdminUser; next: boolean } | null>(null);
    const [selfDemote, setSelfDemote] = useState<AdminUser | null>(null);

    // Debounced so typing a name is one request, not one per keystroke against an
    // endpoint that scans every account.
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            setDebounced(query.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer.current);
    }, [query]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await usersAPI.list({ q: debounced || undefined, page, pageSize: PAGE_SIZE });
            setRows(res.users);
            setTotal(res.total);
            setError(null);
        } catch (err) {
            setRows([]);
            setTotal(0);
            setError(
                err instanceof ApiError && err.status === 403
                    ? 'You no longer have administrator access.'
                    : err instanceof Error
                        ? err.message
                        : 'Could not load users',
            );
        } finally {
            setLoading(false);
        }
    }, [debounced, page]);

    useEffect(() => { void load(); }, [load]);

    /** Applies a change and re-reads, so the row never shows a value the server refused. */
    const apply = useCallback(
        async (id: number, run: () => Promise<unknown>, successMessage: string) => {
            setBusyId(id);
            try {
                await run();
                toast.showSuccess(successMessage);
                await load();
            } catch (err) {
                // 409 is the last-admin guard. Its `detail` carries the part that
                // tells you what to do about it ("promote another user first"),
                // and dropping that leaves a refusal with no way forward.
                const detail =
                    err instanceof ApiError && typeof err.data?.detail === 'string'
                        ? ` ${err.data.detail}`
                        : '';
                toast.showError(
                    (err instanceof Error ? err.message : 'Could not update the account') + detail,
                );
                await load();
            } finally {
                setBusyId(null);
            }
        },
        [load, toast],
    );

    const changeRole = useCallback(
        (target: AdminUser, role: 'admin' | 'user') =>
            apply(
                target.id,
                () => usersAPI.setRole(target.id, role),
                role === 'admin' ? `${fullName(target)} is now an administrator` : `${fullName(target)} is now a standard user`,
            ),
        [apply],
    );

    const columns = useMemo<Column<AdminUser>[]>(
        () => [
            {
                key: 'name',
                header: 'User',
                render: (u) => (
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate font-medium text-brand-dark dark:text-gray-100">
                            {fullName(u)}
                            {u.id === user?.id && <Badge tone="accent">you</Badge>}
                        </p>
                        <p className="truncate text-[11px] text-gray-400">{u.email}</p>
                    </div>
                ),
            },
            {
                key: 'role',
                header: 'Role',
                className: 'w-40',
                render: (u) => (
                    <Select
                        size="sm"
                        aria-label={`Role for ${fullName(u)}`}
                        value={u.role === 'admin' ? 'admin' : 'user'}
                        disabled={busyId === u.id || u.isActive === false}
                        options={[
                            { value: 'user', label: 'User' },
                            { value: 'admin', label: 'Administrator' },
                        ]}
                        onChange={(e) => {
                            const next = e.target.value as 'admin' | 'user';
                            // Removing your own access is the one change on this
                            // page you cannot undo from this page.
                            if (u.id === user?.id && next !== 'admin') { setSelfDemote(u); return; }
                            void changeRole(u, next);
                        }}
                    />
                ),
            },
            {
                key: 'status',
                header: 'Status',
                className: 'w-32',
                // `Badge` has no semantic red/green tone, and inventing one here
                // rather than in the design system is how a palette forks. Solid
                // vs. outline reads as the same "this one is different" signal.
                render: (u) =>
                    u.isActive === false
                        ? <Badge tone="solid">Deactivated</Badge>
                        : <Badge tone="outline">Active</Badge>,
            },
            {
                key: 'createdAt',
                header: 'Joined',
                className: 'w-36',
                hideOnMobile: true,
                render: (u) => <span className="text-gray-500 dark:text-gray-400">{formatDate(u.createdAt)}</span>,
            },
            {
                key: 'actions',
                header: '',
                className: 'w-32 text-right',
                render: (u) => (
                    <AccentButton
                        size="sm"
                        variant="ghost"
                        disabled={busyId === u.id || u.id === user?.id}
                        onClick={() => {
                            if (u.isActive === false) void apply(u.id, () => usersAPI.setActive(u.id, true), `${fullName(u)} reactivated`);
                            else setConfirm({ target: u, next: false });
                        }}
                    >
                        {u.isActive === false ? 'Reactivate' : 'Deactivate'}
                    </AccentButton>
                ),
            },
        ],
        [apply, busyId, changeRole, user?.id],
    );

    // The fast path only. The server refuses regardless — see the header comment.
    if (user && user.role !== 'admin') {
        return (
            <AdminRefusal
                title="Users"
                description="Managing accounts requires an administrator role. If you think this is wrong, ask an administrator to check your access."
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Users"
                subtitle="Who can sign in to this instance, and what they can do."
            />

            <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-56 flex-1">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by name or email"
                            icon={<FiSearch size={15} />}
                            aria-label="Search users"
                        />
                    </div>
                    <span className="text-xs text-gray-400">
                        {total === 1 ? '1 account' : `${total} accounts`}
                    </span>
                </div>

                {error && (
                    <p role="alert" className="flex items-center gap-2 text-sm text-global-red">
                        <FiAlertTriangle size={15} />
                        {error}
                    </p>
                )}

                <DataTable
                    caption="User accounts"
                    columns={columns}
                    rows={rows}
                    rowKey={(u) => u.id}
                    loading={loading}
                    empty={
                        <EmptyState
                            icon={<FiUsers size={22} />}
                            title={debounced ? 'No matching accounts' : 'No accounts'}
                            description={
                                debounced
                                    ? 'Nothing matches that name or email.'
                                    : 'Accounts appear here as people register.'
                            }
                        />
                    }
                />

                {total > PAGE_SIZE && (
                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={total}
                        onPageChange={setPage}
                        itemLabel="accounts"
                    />
                )}
            </Surface>

            <p className="text-xs text-gray-400">
                Deactivating an account ends its sessions immediately. Roles apply to the whole
                instance — a project&rsquo;s own members and their permissions live on that project.
            </p>

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={confirm ? `Deactivate ${fullName(confirm.target)}?` : ''}
                description="They are signed out everywhere and cannot sign in again until the account is reactivated. Nothing they created is deleted."
                confirmLabel="Deactivate"
                destructive
                onConfirm={async () => {
                    if (!confirm) return;
                    await apply(
                        confirm.target.id,
                        () => usersAPI.setActive(confirm.target.id, false),
                        `${fullName(confirm.target)} deactivated`,
                    );
                    setConfirm(null);
                }}
            />

            <ConfirmDialog
                open={selfDemote !== null}
                onOpenChange={(open) => !open && setSelfDemote(null)}
                title="Give up your own administrator access?"
                description="You will lose access to this page immediately, and only another administrator can give it back."
                confirmLabel="Remove my access"
                destructive
                onConfirm={async () => {
                    if (!selfDemote) return;
                    await changeRole(selfDemote, 'user');
                    setSelfDemote(null);
                }}
            />
        </div>
    );
};

export default AdminUsers;
