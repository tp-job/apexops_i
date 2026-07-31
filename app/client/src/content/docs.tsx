/* eslint-disable react-refresh/only-export-components --
 * This is a content registry, not a component module: it exports data (`DOCS`,
 * `DOC_GROUPS`, `findDoc`) whose values happen to contain JSX bodies. It exports
 * no components, so there is nothing for Fast Refresh to update granularly —
 * editing prose triggers a full reload either way.
 *
 * The codebase's usual answer to this rule is to split the file (see
 * `field-context.ts`, `auth-context.ts`). That does not apply here: the whole
 * point of this file is that section metadata and section bodies live in ONE
 * array, so a heading cannot exist without a matching entry in the "On this
 * page" rail. Splitting them to satisfy a dev-ergonomics rule would trade a
 * real correctness property for a hot-reload nicety.
 */
import type { ReactNode } from 'react';
import {
    A,
    C,
    Callout,
    Code,
    Endpoint,
    LI,
    Lead,
    OL,
    P,
    Table,
    UL,
} from '@/components/docs/DocsPrimitives';

/**
 * The documentation content registry.
 *
 * **Sections are data, not markup.** Both the page body and the "On this page"
 * rail render from this one array, so a heading can never exist without a TOC
 * entry or vice versa. Deriving the TOC by scraping rendered DOM headings is the
 * usual approach and it drifts the first time someone adds an `<h2>` by hand.
 *
 * Everything here is checked against the code it documents. If an attribute,
 * limit or endpoint below is wrong, the fix belongs in whichever is actually
 * incorrect — not in a second copy of the truth.
 */

export interface DocSection {
    id: string;
    title: string;
    /** 3 renders as a nested entry in the right-hand rail. */
    level?: 2 | 3;
    body: ReactNode;
}

export interface DocPage {
    slug: string;
    title: string;
    /** Sidebar grouping. Order of first appearance defines group order. */
    group: string;
    /** One line, shown under the title and used by search. */
    summary: string;
    intro?: ReactNode;
    sections: DocSection[];
}

export const DOCS: DocPage[] = [
    // ── Get started ──────────────────────────────────────────
    {
        slug: 'overview',
        title: 'Overview',
        group: 'Get started',
        summary: 'What ApexOps is, and how errors get from a browser into a tracked ticket.',
        intro: (
            <Lead>
                ApexOps is a centralized bug tracker for multiple projects. A one-line script reports
                errors from any React, Node or TypeScript app; identical errors are grouped into a
                single issue; and any issue can be promoted to a tracked ticket on a board.
            </Lead>
        ),
        sections: [
            {
                id: 'how-it-works',
                title: 'How it works',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>Four steps, each of which maps to a real surface in the product:</P>
                        <OL>
                            <LI>
                                <strong>Create a project.</strong> Every project has its own ingest key,
                                issues, board and retention policy. Nothing crosses between projects.
                            </LI>
                            <LI>
                                <strong>Install the snippet.</strong> One <C>&lt;script&gt;</C> tag on the
                                app you want to monitor. No build step, no npm package.
                            </LI>
                            <LI>
                                <strong>Errors group into issues.</strong> A render loop that throws
                                100,000 times is <em>one</em> issue with a count of 100,000 — not 100,000
                                rows.
                            </LI>
                            <LI>
                                <strong>Promote to a ticket.</strong> When an issue is worth fixing, turn
                                it into tracked work with an assignee and a status.
                            </LI>
                        </OL>
                    </div>
                ),
            },
            {
                id: 'projects',
                title: 'Projects are the scope',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            A project is the boundary for everything: events, issues, tickets, the ingest
                            key and the retention window. Access is by membership — being signed in is not
                            enough to read another project's issues.
                        </P>
                        <P>
                            The project appears in the URL as <C>/p/:slug</C> rather than living in a
                            client-side store, so deep links, the back button and two tabs on two different
                            projects all behave the way you would expect.
                        </P>
                    </div>
                ),
            },
            {
                id: 'what-is-not-here',
                title: 'What this is not',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Being explicit about the edges is more useful than implying coverage that does
                            not exist yet:
                        </P>
                        <UL>
                            <LI>
                                <strong>No source maps yet.</strong> Minified stacks are reported verbatim.
                                Frames resolve to the bundled filename and line.
                            </LI>
                            <LI>
                                <strong>No alerting.</strong> Nothing emails or pages you; issues are read
                                in the dashboard.
                            </LI>
                            <LI>
                                <strong>Browser only.</strong> There is no server-side or Node SDK — the
                                ingest API is public and documented, so a server integration is a plain
                                HTTP POST.
                            </LI>
                            <LI>
                                <strong>Not multi-tenant.</strong> Projects are per-user workspaces, not an
                                organization boundary with billing and isolation guarantees.
                            </LI>
                        </UL>
                    </div>
                ),
            },
        ],
    },

    {
        slug: 'quickstart',
        title: 'Quickstart',
        group: 'Get started',
        summary: 'Report your first error in about two minutes.',
        intro: <Lead>From zero to a grouped issue in three steps.</Lead>,
        sections: [
            {
                id: 'create-a-project',
                title: '1. Create a project',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Go to <A href="/projects">Projects</A> and choose <strong>New project</strong>.
                            The slug is derived from the name and becomes part of every URL for that
                            workspace.
                        </P>
                        <P>
                            You land on the project's settings page, which is where the snippet lives —
                            already filled in with the real key.
                        </P>
                    </div>
                ),
            },
            {
                id: 'install-the-snippet',
                title: '2. Install the snippet',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Paste this into the <C>&lt;head&gt;</C> of the app you want to monitor,
                            replacing the key with your own:
                        </P>
                        <Code lang="html">{`<script
  src="https://your-apexops-host/sdk/v1.js"
  data-project="pk_your_ingest_key"
  defer
></script>`}</Code>
                        <P>
                            That is the whole integration. The script patches <C>console.error</C> and{' '}
                            <C>console.warn</C>, listens for uncaught errors and unhandled promise
                            rejections, and batches what it captures to the ingest endpoint.
                        </P>
                        <Callout title="The key is public on purpose">
                            It ships inside a script tag on a page you do not control, so it can never be a
                            secret. It is <strong>write-only</strong> — it can report events to exactly one
                            project and can never read anything. Reads use your signed-in session.
                        </Callout>
                    </div>
                ),
            },
            {
                id: 'verify',
                title: '3. Verify it works',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            The project settings page shows <strong>Waiting for first event…</strong> until
                            something arrives, then flips to <strong>Receiving events</strong> on its own.
                            You do not need to refresh.
                        </P>
                        <P>To force an error from the browser console of the monitored page:</P>
                        <Code lang="js">{`console.error(new Error('ApexOps test error'));`}</Code>
                        <P>
                            Events are batched and flush every 5 seconds, so allow a moment. Then open the
                            project's <strong>Issues</strong> tab.
                        </P>
                    </div>
                ),
            },
            {
                id: 'promote',
                title: '4. Turn an issue into work',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            On any issue row, choose <strong>Create ticket</strong>. That opens a ticket on
                            the project's board, pre-filled with the issue title, culprit, occurrence count
                            and the latest stack trace.
                        </P>
                        <P>
                            An issue can only be promoted once. Afterwards the row links to the ticket
                            instead of offering to create a second one.
                        </P>
                    </div>
                ),
            },
        ],
    },

    // ── SDK ──────────────────────────────────────────────────
    {
        slug: 'sdk',
        title: 'Browser SDK',
        group: 'SDK',
        summary: 'Script tag configuration, capture behaviour and payload limits.',
        intro: (
            <Lead>
                The SDK is a single script with no dependencies and no build step. It is configured
                entirely through <C>data-*</C> attributes on its own script tag.
            </Lead>
        ),
        sections: [
            {
                id: 'configuration',
                title: 'Configuration',
                body: (
                    <div className="flex flex-col gap-4">
                        <Table
                            columns={[
                                { header: 'Attribute', width: 'w-44' },
                                { header: 'Default', width: 'w-32' },
                                { header: 'Purpose' },
                            ]}
                            rows={[
                                [
                                    <C>data-project</C>,
                                    <span className="text-gray-400">required</span>,
                                    'Your ingest key. If absent the SDK does nothing at all, silently.',
                                ],
                                [
                                    <C>data-levels</C>,
                                    <C>error,warn</C>,
                                    <>
                                        Comma-separated console levels to capture. <C>info</C>, <C>log</C>{' '}
                                        and <C>debug</C> are opt-in.
                                    </>,
                                ],
                                [
                                    <C>data-release</C>,
                                    <span className="text-gray-400">none</span>,
                                    'Version string attached to every event. Recorded for future source-map support.',
                                ],
                                [
                                    <C>data-sample</C>,
                                    <C>1.0</C>,
                                    <>
                                        Fraction of <strong>non-error</strong> events kept. Errors are never
                                        sampled away.
                                    </>,
                                ],
                                [
                                    <C>data-endpoint</C>,
                                    <span className="text-gray-400">script origin</span>,
                                    'Override the ingest host when self-hosting.',
                                ],
                            ]}
                        />
                        <P>A fully configured tag:</P>
                        <Code lang="html">{`<script
  src="https://your-apexops-host/sdk/v1.js"
  data-project="pk_your_ingest_key"
  data-levels="error,warn"
  data-release="storefront@2.4.1"
  data-sample="0.25"
  defer
></script>`}</Code>
                        <Callout title="Configuration is read from the tag, not from globals">
                            Earlier versions read <C>window.BUG_TRACKER_*</C>, which had to be set before
                            the script loaded — a foot-gun with <C>defer</C> and <C>async</C> that silently
                            reported everything under the wrong name.
                        </Callout>
                    </div>
                ),
            },
            {
                id: 'what-is-captured',
                title: 'What is captured',
                body: (
                    <div className="flex flex-col gap-4">
                        <UL>
                            <LI>
                                Console calls at the levels named in <C>data-levels</C>.
                            </LI>
                            <LI>
                                Uncaught exceptions, via <C>window.onerror</C>.
                            </LI>
                            <LI>
                                Unhandled promise rejections, via <C>unhandledrejection</C>.
                            </LI>
                        </UL>
                        <P>
                            The last two are always on regardless of <C>data-levels</C> — an uncaught
                            exception is the event the product exists to capture.
                        </P>
                        <P>
                            Each event carries the message, stack, page URL, user agent, and the release
                            string if set. The host page's own console output is never suppressed: the
                            original console method is called first, unconditionally.
                        </P>
                    </div>
                ),
            },
            {
                id: 'batching',
                title: 'Batching and delivery',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Events queue in memory and flush every 5 seconds, or immediately when a batch
                            reaches 100 events.
                        </P>
                        <UL>
                            <LI>
                                <strong>Repeats are collapsed.</strong> Identical message and stack inside a
                                5-second window increment a local counter instead of queueing again, so a
                                tight error loop costs one request rather than five hundred.
                            </LI>
                            <LI>
                                <strong>The final batch survives unload.</strong> On <C>pagehide</C>,{' '}
                                <C>visibilitychange</C> and <C>beforeunload</C> the queue is sent with{' '}
                                <C>navigator.sendBeacon</C>, which the browser delivers during teardown —
                                a <C>fetch</C> there is cancelled, and that batch is usually the one
                                containing the crash.
                            </LI>
                            <LI>
                                <strong>A dead server is not retried forever.</strong> After three
                                consecutive failures the SDK backs off exponentially, up to five minutes.
                            </LI>
                        </UL>
                    </div>
                ),
            },
            {
                id: 'limits',
                title: 'Limits',
                body: (
                    <div className="flex flex-col gap-4">
                        <Table
                            columns={[{ header: 'Limit', width: 'w-64' }, { header: 'Value' }]}
                            rows={[
                                ['Message length', <C>8 KB</C>],
                                ['Stack length', <C>16 KB</C>],
                                ['Batch size', <>64 KB, or 100 events</>],
                                ['In-memory queue', <>200 events (oldest dropped first)</>],
                                ['Client dedupe window', <C>5s</C>],
                            ]}
                        />
                        <P>
                            Oversized values are truncated client-side rather than rejected server-side: a
                            rejected batch loses the crash, a truncated one still reports it.
                        </P>
                    </div>
                ),
            },
            {
                id: 'safety',
                title: 'Running on someone else’s page',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            The worst possible failure for an embedded script is taking down the page that
                            embeds it. Three properties guard against that:
                        </P>
                        <UL>
                            <LI>
                                All SDK-internal logging goes through the <em>captured</em> console methods,
                                never the patched ones, and a re-entrancy flag prevents recursion.
                            </LI>
                            <LI>
                                Every capture path is wrapped so an internal error can never propagate into
                                host-page code.
                            </LI>
                            <LI>
                                No global is exposed. There is no <C>window.__BugTracker</C> for a host page
                                or a third-party script to tamper with.
                            </LI>
                        </UL>
                    </div>
                ),
            },
        ],
    },

    // ── Concepts ─────────────────────────────────────────────
    {
        slug: 'grouping',
        title: 'Grouping & retention',
        group: 'Concepts',
        summary: 'How events collapse into issues, and how long raw events are kept.',
        intro: (
            <Lead>
                Grouping is the decision that makes the product usable. Without it, the first real
                integration makes the interface useless and the database large on the same afternoon.
            </Lead>
        ),
        sections: [
            {
                id: 'fingerprints',
                title: 'Fingerprints',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>Every event is hashed into a fingerprint from four inputs:</P>
                        <Code lang="text">{`fingerprint = hash(projectId, level, normalizedMessage, culprit)`}</Code>
                        <P>
                            Events sharing a fingerprint are the same issue. The issue's count increases;
                            no new row appears in the list.
                        </P>
                    </div>
                ),
            },
            {
                id: 'normalization',
                title: 'Message normalization',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Before hashing, the message has its variable parts replaced: numbers, UUIDs and
                            quoted strings. This is what makes the following two messages one issue rather
                            than two:
                        </P>
                        <Code lang="text">{`User 4821 not found   ─┐
                       ├─→  User <n> not found
User 9134 not found   ─┘`}</Code>
                        <P>
                            Without normalization, an error containing an id produces a new issue on every
                            occurrence, which is the same failure as having no grouping at all.
                        </P>
                    </div>
                ),
            },
            {
                id: 'culprit',
                title: 'Culprit',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            The culprit is the first stack frame that belongs to your application, reduced
                            to <C>filename:line</C>. Frames inside the SDK itself are skipped — otherwise
                            every captured error would share one culprit and unrelated bugs would collapse
                            into a single issue.
                        </P>
                        <Callout tone="warn" title="Two different failure modes">
                            Over-splitting is obvious: a flood of near-identical issues. Over-collapsing is
                            not — the list looks tidy while hiding distinct bugs behind one row.
                        </Callout>
                    </div>
                ),
            },
            {
                id: 'counts',
                title: 'Counts vs stored events',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            An issue's <strong>count</strong> and the number of stored events are different
                            numbers, and only the first grows without bound.
                        </P>
                        <P>
                            When the SDK collapses 500 repeats inside its dedupe window, it sends one event
                            carrying <C>count: 500</C>. The issue total rises by 500; one event row is
                            stored. So <em>how often it happened</em> stays accurate while <em>how many
                            samples we kept</em> stays bounded.
                        </P>
                    </div>
                ),
            },
            {
                id: 'status',
                title: 'Status behaviour',
                body: (
                    <div className="flex flex-col gap-4">
                        <Table
                            columns={[{ header: 'Status', width: 'w-36' }, { header: 'Meaning' }]}
                            rows={[
                                [<C>unresolved</C>, 'Open. The default for anything newly seen.'],
                                [
                                    <C>resolved</C>,
                                    <>
                                        Fixed. <strong>If it recurs it flips back to unresolved</strong> — a
                                        regression belongs at the top of the list.
                                    </>,
                                ],
                                [
                                    <C>ignored</C>,
                                    <>
                                        Known and unwanted. A recurrence does <strong>not</strong> reopen it;
                                        you asked not to be told.
                                    </>,
                                ],
                            ]}
                        />
                    </div>
                ),
            },
            {
                id: 'retention',
                title: 'Retention',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Raw events are kept for the project's retention window — 30 days by default,
                            configurable from 1 to 365 in project settings. <strong>Issue aggregates are
                            never pruned</strong>, so counts and first-seen dates survive after the
                            underlying events are gone.
                        </P>
                        <P>
                            A prune job runs on a schedule and deletes in bounded batches, so the first
                            prune after a busy period does not lock the table the SDK is writing into.
                        </P>
                    </div>
                ),
            },
        ],
    },

    // ── API reference ────────────────────────────────────────
    {
        slug: 'ingest-api',
        title: 'Ingest API',
        group: 'API reference',
        summary: 'The single public endpoint the SDK posts to. Key-authenticated, write-only.',
        intro: (
            <Lead>
                If you cannot use the browser SDK — a server runtime, a mobile app, a CI job — post
                events directly. This is the only endpoint that does not use a session token.
            </Lead>
        ),
        sections: [
            {
                id: 'post-ingest',
                title: 'POST /api/ingest',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Authenticate with the project's ingest key, either as the{' '}
                            <C>X-Apexops-Key</C> header or as <C>key</C> in the body. The body form exists
                            because <C>navigator.sendBeacon</C> cannot set custom headers.
                        </P>
                        <Code lang="bash">{`curl -X POST https://your-apexops-host/api/ingest \\
  -H 'Content-Type: application/json' \\
  -H 'X-Apexops-Key: pk_your_ingest_key' \\
  -d '{
    "events": [{
      "level": "error",
      "message": "Payment provider timed out",
      "stack": "Error: timeout\\n    at charge (https://app.example.com/pay.js:42:9)",
      "url": "https://app.example.com/checkout",
      "release": "storefront@2.4.1",
      "count": 1
    }]
  }'`}</Code>
                    </div>
                ),
            },
            {
                id: 'event-fields',
                title: 'Event fields',
                body: (
                    <Table
                        columns={[
                            { header: 'Field', width: 'w-36' },
                            { header: 'Type', width: 'w-28' },
                            { header: 'Notes' },
                        ]}
                        rows={[
                            [
                                <C>level</C>,
                                'string',
                                <>
                                    One of <C>error warn info log debug</C>. Anything else becomes{' '}
                                    <C>error</C>.
                                </>,
                            ],
                            [<C>message</C>, 'string', 'Max 8 KB.'],
                            [<C>stack</C>, 'string?', 'Max 16 KB. Drives the culprit.'],
                            [<C>url</C>, 'string?', 'Max 2048 characters.'],
                            [<C>userAgent</C>, 'string?', 'Max 512 characters.'],
                            [<C>release</C>, 'string?', 'Max 128 characters.'],
                            [
                                <C>count</C>,
                                'number?',
                                <>
                                    Occurrences this event represents, 1–10000. Defaults to <C>1</C>.
                                </>,
                            ],
                            [<C>context</C>, 'object?', 'Free-form tags or breadcrumbs.'],
                            [
                                <C>timestamp</C>,
                                'string?',
                                'Advisory only — the server always stamps its own time.',
                            ],
                        ]}
                    />
                ),
            },
            {
                id: 'ingest-response',
                title: 'Response',
                body: (
                    <div className="flex flex-col gap-4">
                        <Code lang="json">{`{ "accepted": 50, "issues": 1, "dropped": 0 }`}</Code>
                        <P>
                            <C>dropped</C> counts events filtered out because their level is not in the
                            project's capture levels. That is a normal outcome, not an error — level
                            filtering is enforced on the server, because the SDK's configuration is a hint
                            from a client nobody controls.
                        </P>
                    </div>
                ),
            },
            {
                id: 'ingest-limits',
                title: 'Limits and errors',
                body: (
                    <div className="flex flex-col gap-4">
                        <Table
                            columns={[{ header: 'Limit', width: 'w-64' }, { header: 'Value' }]}
                            rows={[
                                ['Events per request', <C>100</C>],
                                ['Request body', <C>1 MB</C>],
                                ['Rate limit, per key', <>300 requests / minute</>],
                                ['Rate limit, per IP', <>600 requests / minute</>],
                            ]}
                        />
                        <Table
                            columns={[{ header: 'Status', width: 'w-24' }, { header: 'Meaning' }]}
                            rows={[
                                [<C>202</C>, 'Accepted. Some or all events may have been dropped by level.'],
                                [<C>400</C>, 'Payload failed validation.'],
                                [<C>401</C>, 'Unknown or rotated ingest key.'],
                                [<C>403</C>, "Origin not in the project's allowlist."],
                                [<C>413</C>, 'Body exceeded 1 MB.'],
                                [<C>429</C>, 'Rate limited. Back off before retrying.'],
                            ]}
                        />
                        <Callout tone="warn" title="Rotating a key has no grace period">
                            That is the point of rotation — it exists to cut off a key that is being
                            abused. Every page still embedding the old snippet stops reporting immediately.
                        </Callout>
                    </div>
                ),
            },
        ],
    },

    {
        slug: 'rest-api',
        title: 'REST API',
        group: 'API reference',
        summary: 'Session-authenticated endpoints for projects, issues and tickets.',
        intro: (
            <Lead>
                Everything except ingest uses your signed-in session. Send{' '}
                <C>Authorization: Bearer &lt;accessToken&gt;</C>.
            </Lead>
        ),
        sections: [
            {
                id: 'auth',
                title: 'Authentication',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            Sign in for an access token and a refresh token. Access tokens are short-lived;
                            exchange the refresh token at <C>/api/auth/refresh</C> when one expires.
                        </P>
                        <Code lang="bash">{`curl -X POST https://your-apexops-host/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","password":"..."}'`}</Code>
                        <Callout title="An ingest key will not work here">
                            It is write-only by design and is rejected by every endpoint on this page.
                        </Callout>
                    </div>
                ),
            },
            {
                id: 'projects-endpoints',
                title: 'Projects',
                body: (
                    <Table
                        columns={[{ header: 'Endpoint', width: 'w-[22rem]' }, { header: 'Description' }]}
                        rows={[
                            [
                                <Endpoint method="GET" path="/api/projects" />,
                                'Projects you are a member of, with unresolved counts and last-event times.',
                            ],
                            [<Endpoint method="POST" path="/api/projects" />, 'Create a project.'],
                            [<Endpoint method="GET" path="/api/projects/:slug" />, 'One project.'],
                            [
                                <Endpoint method="PATCH" path="/api/projects/:slug" />,
                                'Update name, capture levels, allowed origins or retention.',
                            ],
                            [
                                <Endpoint method="POST" path="/api/projects/:slug/rotate-key" />,
                                'Issue a new ingest key and revoke the old one immediately.',
                            ],
                            [
                                <Endpoint method="DELETE" path="/api/projects/:slug" />,
                                'Archive. Reversible via restore; owner only.',
                            ],
                            [
                                <Endpoint method="POST" path="/api/projects/:slug/restore" />,
                                'Unarchive.',
                            ],
                        ]}
                    />
                ),
            },
            {
                id: 'issues-endpoints',
                title: 'Issues',
                body: (
                    <div className="flex flex-col gap-4">
                        <Table
                            columns={[
                                { header: 'Endpoint', width: 'w-[22rem]' },
                                { header: 'Description' },
                            ]}
                            rows={[
                                [
                                    <Endpoint method="GET" path="/api/projects/:slug/issues" />,
                                    <>
                                        Filter by <C>level</C>, <C>status</C>, <C>q</C>, <C>since</C>; sort by{' '}
                                        <C>lastSeen</C>, <C>firstSeen</C> or <C>count</C>.
                                    </>,
                                ],
                                [
                                    <Endpoint method="GET" path="/api/projects/:slug/issues/stats" />,
                                    'Counts by status, events in the last 24h, last event time.',
                                ],
                                [
                                    <Endpoint method="GET" path="/api/projects/:slug/issues/:id" />,
                                    'One issue with its latest and recent events.',
                                ],
                                [
                                    <Endpoint method="PATCH" path="/api/projects/:slug/issues/:id" />,
                                    'Set status. The only mutable field on an issue.',
                                ],
                                [
                                    <Endpoint method="POST" path="/api/projects/:slug/issues/:id/ticket" />,
                                    'Promote to a ticket. 409 if already promoted, carrying the existing id.',
                                ],
                            ]}
                        />
                        <P>
                            Lists are paginated with <C>limit</C> (max 100) and <C>offset</C>, and return a{' '}
                            <C>total</C> reflecting the current filters.
                        </P>
                    </div>
                ),
            },
            {
                id: 'errors',
                title: 'Error semantics',
                body: (
                    <div className="flex flex-col gap-4">
                        <P>
                            A project you are not a member of returns <C>404</C>, never <C>403</C>. A 403
                            would confirm the slug exists, which turns these endpoints into a way to
                            enumerate other people's project names one guess at a time.
                        </P>
                        <P>
                            Errors are JSON with an <C>error</C> field holding a message suitable for
                            showing to a user.
                        </P>
                    </div>
                ),
            },
        ],
    },
];

export const DOC_GROUPS: string[] = DOCS.reduce<string[]>((groups, page) => {
    if (!groups.includes(page.group)) groups.push(page.group);
    return groups;
}, []);

export const findDoc = (slug: string | undefined): DocPage | undefined =>
    DOCS.find((d) => d.slug === slug);

export const DEFAULT_DOC = DOCS[0].slug;
