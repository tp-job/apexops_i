export type DocBlock =
    | { type: 'p'; text: string }
    | { type: 'h2'; text: string; id?: string }
    | { type: 'h3'; text: string; id?: string }
    | { type: 'list'; items: string[] }
    | { type: 'callout'; title: string; text: string; tone?: 'info' | 'warning' | 'success' }
    | { type: 'code'; language?: string; code: string };

export type DocPage = {
    id: string;
    title: string;
    subtitle?: string;
    category: string;
    breadcrumbs?: string[];
    blocks: DocBlock[];
};

export type DocNavItem = {
    id: string;
    title: string;
    to: string;
};

export type DocNavGroup = {
    title: string;
    items: Array<DocNavItem | { title: string; items: DocNavItem[] }>;
};

const docTo = (id: string) => `/about/docs/${id}`;

export const DOC_NAV: DocNavGroup[] = [
    {
        title: 'Getting Started',
        items: [
            { id: 'introduction', title: 'Introduction', to: docTo('introduction') },
            { id: 'quickstart', title: 'Quickstart Guide', to: docTo('quickstart') },
            { id: 'authentication', title: 'Authentication', to: docTo('authentication') },
            { id: 'errors', title: 'Errors & Rate Limits', to: docTo('errors') },
        ],
    },
    {
        title: 'Core Resources',
        items: [
            {
                title: 'Logs',
                items: [
                    { id: 'logs-list', title: 'List all logs', to: docTo('logs-list') },
                    { id: 'logs-retrieve', title: 'Retrieve a log', to: docTo('logs-retrieve') },
                    { id: 'logs-ingest', title: 'Ingest logs', to: docTo('logs-ingest') },
                ],
            },
            { id: 'metrics', title: 'Metrics', to: docTo('metrics') },
            { id: 'events', title: 'Events', to: docTo('events') },
        ],
    },
    {
        title: 'AI Diagnostics',
        items: [
            { id: 'analyze', title: 'Analyze Stack Trace', to: docTo('analyze') },
            { id: 'report', title: 'Generate Report', to: docTo('report') },
        ],
    },
];

export const DOC_PAGES: Record<string, DocPage> = {
    introduction: {
        id: 'introduction',
        title: 'Introduction',
        subtitle: 'What ApexOps is, and how to think about the platform.',
        category: 'Getting Started',
        breadcrumbs: ['Architecture Hub', 'Getting Started'],
        blocks: [
            {
                type: 'p',
                text: 'ApexOps is an observability + incident workflow platform designed for teams that want fast, actionable signal. It connects application logs, console telemetry, tickets, and AI diagnostics into one narrative so you can go from “something broke” to “here is the fix” with less context switching.',
            },
            { type: 'h2', text: 'What you can do', id: 'what-you-can-do' },
            {
                type: 'list',
                items: [
                    'Collect logs from client & server with consistent context.',
                    'Track incidents as tickets with a clear lifecycle.',
                    'Analyze errors and stack traces with AI-assisted suggestions.',
                    'Visualize activity and health on dashboards.',
                ],
            },
            {
                type: 'callout',
                tone: 'info',
                title: 'Design principle',
                text: 'Prefer “few, high-quality primitives” over scattered features. If a workflow cannot be explained in one screen, we simplify it.',
            },
        ],
    },
    quickstart: {
        id: 'quickstart',
        title: 'Quickstart Guide',
        subtitle: 'A minimal path from zero to useful signal.',
        category: 'Getting Started',
        breadcrumbs: ['Architecture Hub', 'Getting Started'],
        blocks: [
            { type: 'h2', text: '1) Get access', id: 'get-access' },
            {
                type: 'list',
                items: [
                    'Sign in and open the Dashboard.',
                    'Create an API key for your environment (sandbox vs production).',
                    'Store the key securely (server-side or secret manager).',
                ],
            },
            { type: 'h2', text: '2) Send your first log', id: 'send-first-log' },
            {
                type: 'code',
                language: 'bash',
                code: 'curl https://api.devplatform.com/v1/logs \\\n  -u sk_test_***: \\\n  -d source="web-app" \\\n  -d level="info" \\\n  -d message="Hello from ApexOps" \\\n  -G',
            },
            {
                type: 'callout',
                tone: 'warning',
                title: 'Security reminder',
                text: 'Never ship secret API keys in client-side code. Use a server proxy, edge function, or secure runtime.',
            },
            { type: 'h2', text: '3) Validate in the UI', id: 'validate' },
            { type: 'p', text: 'Open Logs in the Dashboard and confirm your event appears. From there, you can filter by source, level, user, release, or correlation IDs.' },
        ],
    },
    authentication: {
        id: 'authentication',
        title: 'Authentication',
        subtitle: 'API keys, environments, and safe usage patterns.',
        category: 'Getting Started',
        breadcrumbs: ['API Reference', 'Authentication'],
        blocks: [
            { type: 'p', text: 'The API uses API keys to authenticate requests. Treat keys like passwords: minimize exposure, rotate regularly, and scope privileges where possible.' },
            { type: 'h2', text: 'Bearer / Basic auth', id: 'auth-schemes' },
            { type: 'p', text: 'For basic auth, provide your API key as the username. You do not need a password.' },
            {
                type: 'code',
                language: 'bash',
                code: 'curl https://api.devplatform.com/v1/logs \\\n  -u sk_test_***: \\\n  -G',
            },
            { type: 'h2', text: 'Production vs sandbox', id: 'prod-vs-sandbox' },
            { type: 'p', text: 'Use sandbox keys for development and CI previews. Use production keys only in trusted server environments.' },
        ],
    },
    errors: {
        id: 'errors',
        title: 'Errors & Rate Limits',
        subtitle: 'How to interpret failures and recover safely.',
        category: 'Getting Started',
        breadcrumbs: ['API Reference', 'Errors'],
        blocks: [
            { type: 'p', text: 'ApexOps uses conventional HTTP status codes. Errors are designed to be actionable: you should be able to answer “what happened?” and “what should I do next?” quickly.' },
            { type: 'h2', text: 'Status codes', id: 'status-codes' },
            {
                type: 'list',
                items: [
                    '2xx — success.',
                    '4xx — client errors (invalid params, missing auth).',
                    '5xx — server errors (transient; retry with backoff).',
                ],
            },
            { type: 'h2', text: 'Rate limits', id: 'rate-limits' },
            { type: 'p', text: 'When rate limited, back off exponentially and add jitter. Prefer buffering on the client and batching on the server.' },
        ],
    },
    'logs-list': {
        id: 'logs-list',
        title: 'List all logs',
        subtitle: 'GET /v1/logs',
        category: 'Core Resources',
        breadcrumbs: ['API Reference', 'Logs'],
        blocks: [
            { type: 'p', text: 'Returns a list of logs sorted by creation time, with newest first.' },
            { type: 'h2', text: 'Example', id: 'example' },
            {
                type: 'code',
                language: 'bash',
                code: 'curl https://api.devplatform.com/v1/logs \\\n  -u sk_test_***: \\\n  -d limit=10 \\\n  -G',
            },
            { type: 'h2', text: 'Parameters', id: 'parameters' },
            { type: 'list', items: ['limit (optional): 1–100', 'starting_after (optional): cursor for pagination'] },
        ],
    },
    'logs-retrieve': {
        id: 'logs-retrieve',
        title: 'Retrieve a log',
        subtitle: 'GET /v1/logs/{id}',
        category: 'Core Resources',
        breadcrumbs: ['API Reference', 'Logs'],
        blocks: [
            { type: 'p', text: 'Fetch a single log record by id.' },
            {
                type: 'code',
                language: 'bash',
                code: 'curl https://api.devplatform.com/v1/logs/log_123 \\\n  -u sk_test_***: \\\n  -G',
            },
        ],
    },
    'logs-ingest': {
        id: 'logs-ingest',
        title: 'Ingest logs',
        subtitle: 'POST /v1/logs',
        category: 'Core Resources',
        breadcrumbs: ['API Reference', 'Logs'],
        blocks: [
            { type: 'p', text: 'Ingest a log event. Use stable “source” identifiers so dashboards remain consistent.' },
            {
                type: 'code',
                language: 'bash',
                code: 'curl https://api.devplatform.com/v1/logs \\\n  -u sk_test_***: \\\n  -d source="web-app" \\\n  -d level="error" \\\n  -d message="Unhandled exception" \\\n  -d user_id="u_123"',
            },
        ],
    },
    metrics: {
        id: 'metrics',
        title: 'Metrics',
        subtitle: 'Track performance and service health over time.',
        category: 'Core Resources',
        breadcrumbs: ['Architecture Hub', 'Metrics'],
        blocks: [
            { type: 'p', text: 'Metrics summarize behavior over time: latency, throughput, error rate, and custom business signals. In ApexOps, metrics are designed to correlate with logs and incidents.' },
            { type: 'h2', text: 'Recommended baseline metrics', id: 'baseline' },
            { type: 'list', items: ['p50/p95/p99 latency', 'error rate', 'requests per minute', 'CPU/memory (service)', 'queue depth (workers)'] },
        ],
    },
    events: {
        id: 'events',
        title: 'Events',
        subtitle: 'A unified timeline across your stack.',
        category: 'Core Resources',
        breadcrumbs: ['Architecture Hub', 'Events'],
        blocks: [
            { type: 'p', text: 'Events power the timeline: deployments, alerts, ticket transitions, and system notifications. A well-modeled event stream is the backbone of fast incident response.' },
        ],
    },
    analyze: {
        id: 'analyze',
        title: 'Analyze Stack Trace',
        subtitle: 'Turn raw traces into an action plan.',
        category: 'AI Diagnostics',
        breadcrumbs: ['AI Diagnostics'],
        blocks: [
            { type: 'p', text: 'Paste a stack trace (or attach logs) and let ApexOps suggest likely root causes, impacted components, and next steps. The goal is not to replace engineers—it is to compress the time-to-first-hypothesis.' },
            { type: 'h2', text: 'Best input', id: 'best-input' },
            { type: 'list', items: ['Full stack trace with symbols', 'Recent deploy/release id', 'User/session correlation id', 'Relevant log excerpts'] },
        ],
    },
    report: {
        id: 'report',
        title: 'Generate Report',
        subtitle: 'Share findings with your team.',
        category: 'AI Diagnostics',
        breadcrumbs: ['AI Diagnostics'],
        blocks: [
            { type: 'p', text: 'Generate a clean report with context, suspected root cause, evidence, and suggested remediation. Reports are optimized for handoff: on-call to product, or engineering to leadership.' },
            { type: 'h2', text: 'Report structure', id: 'structure' },
            { type: 'list', items: ['Summary', 'Impact', 'Evidence', 'Root cause hypothesis', 'Mitigation', 'Follow-ups'] },
        ],
    },
};

export const DEFAULT_DOC_ID = 'introduction';

