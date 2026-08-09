import type { FC } from 'react';
import { FiShield } from 'react-icons/fi';
import { EmptyState, Surface } from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';

/**
 * What an admin page shows to someone who is not an admin.
 *
 * **This is presentation, not access control**, and that is worth saying in the
 * one place it now lives: every route behind these screens refuses
 * independently with `authorize('admin')`, resolved from the database on each
 * request. If this component were deleted the boundary would still hold — which
 * is the property that makes it safe to share.
 *
 * It exists because three pages (`AdminUsers`, `AdminDocs`, `AdminConsole`) each
 * hand-rolled the same header-plus-panel, and three copies of a refusal is three
 * chances for one of them to reassure someone the API is about to turn away.
 *
 * `title` matches the page's own heading so the rail and the page still agree
 * about where you are; `description` stays per-page because "you cannot manage
 * accounts" and "you cannot read every app's console output" are different
 * things to be told.
 */
const AdminRefusal: FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="flex flex-col gap-6">
        <PageHeader title={title} subtitle="Administrator access is required." />
        <Surface variant="panel" padding="md">
            <EmptyState icon={<FiShield size={22} />} title="Not available" description={description} />
        </Surface>
    </div>
);

export default AdminRefusal;
