import type { FC } from 'react';
import { useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { AccentButton, Badge, Surface } from '@/components/design-system';

/**
 * How to point the ApexOps browser extension at this project.
 *
 * The whole hand-off is one URL. The extension reads `/apexops.json` from this
 * web app to learn where the API is, signs in as its own session, and fetches
 * the project (ingest key included) over the API — so nothing sensitive is
 * pasted anywhere, and rotating the key later needs no re-setup.
 *
 * Shown to every member, not just owners: binding a site only *reads* the
 * project, and members can already see the key it carries.
 */
const ExtensionConnectCard: FC<{ slug: string; restrictsOrigins: boolean }> = ({ slug, restrictsOrigins }) => {
    const [copied, setCopied] = useState(false);
    // The URL as this browser reaches the app, which is what the extension
    // must be able to reach too. Not derived from the API URL: they differ.
    const projectUrl = `${window.location.origin}/p/${slug}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(projectUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* the URL is on screen; selecting it works */
        }
    };

    return (
        <Surface variant="panel" padding="md" className="flex flex-col gap-4">
            <div>
                <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                    Browser extension
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Capture errors from the site you are testing straight into this project, with no snippet to add
                    to it.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <code className="break-all rounded-lg bg-black/5 px-2.5 py-1.5 font-mono text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {projectUrl}
                </code>
                <AccentButton
                    size="sm"
                    variant="ghost"
                    icon={copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                    onClick={() => void copy()}
                >
                    {copied ? 'Copied' : 'Copy project URL'}
                </AccentButton>
            </div>

            <ol className="max-w-2xl list-decimal space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-300">
                <li>Open the site you want to test, then click the ApexOps extension icon.</li>
                <li>Choose “Connect this site” and paste the project URL above.</li>
                <li>Sign in once. That site is now bound to this project, and only that site.</li>
            </ol>

            {restrictsOrigins && (
                <p className="flex max-w-2xl flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Badge tone="outline">origin allowlist on</Badge>
                    This project only accepts events from listed origins, and the extension sends from its own
                    (<code className="font-mono text-xs">chrome-extension://&hellip;</code>, shown in its popup), so
                    its events are refused until that origin is listed. This page has no control for the list yet;
                    set <code className="font-mono text-xs">allowedOrigins</code> with{' '}
                    <code className="font-mono text-xs">PATCH /api/projects/{slug}</code>.
                </p>
            )}
        </Surface>
    );
};

export default ExtensionConnectCard;
