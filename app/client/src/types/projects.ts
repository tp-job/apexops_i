/**
 * Project workspace + issue types.
 *
 * Mirrors the server's `formatProject` (`api/projects.ts`) and `formatIssue`
 * (`api/issues.ts`) response shapes. Dates arrive as ISO strings — the API
 * serializes them rather than handing over `Date`, and `Event.id` arrives as a
 * **string** because it is a `BigInt` column that `JSON.stringify` cannot emit.
 */

export type ProjectRole = 'owner' | 'admin' | 'member';
export type IssueStatus = 'unresolved' | 'resolved' | 'ignored';
export type CaptureLevel = 'error' | 'warn' | 'info' | 'log' | 'debug';

export const CAPTURE_LEVELS: CaptureLevel[] = ['error', 'warn', 'info', 'log', 'debug'];

export interface ProjectStats {
    unresolvedIssues: number;
    /** `null` means the project has never received an event — not "zero lately". */
    lastEventAt: string | null;
}

export interface Project {
    id: number;
    name: string;
    slug: string;
    /** Public by design (spec D4): write-only, rate limited, rotatable. */
    ingestKey: string;
    allowedOrigins: string[];
    captureLevels: CaptureLevel[];
    retentionDays: number;
    /** Alerting is per-project, not per-user (spec S-D4). */
    alertOnRegression: boolean;
    /** https only, validated + SSRF-checked server-side. Null when unset. */
    webhookUrl: string | null;
    ownerId: number;
    /** The *caller's* role in this project, not a property of the project. */
    role: ProjectRole;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
    stats?: ProjectStats;
}

export interface Issue {
    id: number;
    projectId: number;
    fingerprint: string;
    level: string;
    title: string;
    culprit: string | null;
    status: IssueStatus;
    /** Total occurrences, including repeats the SDK deduped client-side. */
    count: number;
    firstSeen: string;
    lastSeen: string;
    /** Non-null once promoted — render a link to the ticket, not a promote button. */
    ticketId: number | null;
    /** > 0 means this was fixed and came back. Badge it as a regression. */
    reopenCount: number;
    lastReopenedAt: string | null;
}

export interface IssueEvent {
    /** String, not number: `Event.id` is a BigInt column. */
    id: string;
    level: string;
    message: string;
    stack: string | null;
    url: string | null;
    userAgent: string | null;
    release: string | null;
    context: Record<string, unknown>;
    createdAt: string;
}

export type IssueRange = '24h' | '7d' | '30d';

export interface TimelineBucket {
    /** ISO start of the bucket — hourly for 24h, daily for 7d/30d. */
    start: string;
    count: number;
}

export interface BreakdownEntry {
    name: string;
    count: number;
}

export interface IssueBreakdown {
    browsers: BreakdownEntry[];
    os: BreakdownEntry[];
    releases: BreakdownEntry[];
    /** How many events the proportions were computed from (capped server-side). */
    sampledFrom: number;
}

/**
 * One stack frame after symbolication. `raw` is always the line exactly as the
 * browser reported it — the `view minified` toggle and Copy both render from it,
 * so a bad map can never destroy the evidence.
 */
export interface ResolvedFrame {
    raw: string;
    functionName: string | null;
    url: string | null;
    line: number | null;
    column: number | null;
    /** The `TypeError: ...` line. Rendered, never treated as a frame. */
    isHeader: boolean;
    resolved: boolean;
    originalFile: string | null;
    originalLine: number | null;
    originalColumn: number | null;
    originalFunction: string | null;
}

/**
 * Why the stack does or does not show original source. The reason is shown to
 * the user, so each value maps to a different fix — `no-release` means wire up
 * `data-release`, `no-maps-for-release` means upload, `no-matching-file` means
 * the file names don't line up.
 */
export type SymbolicationReason =
    | 'ok'
    | 'no-stack'
    | 'no-release'
    | 'no-maps-for-release'
    | 'no-matching-file'
    | 'no-mappings-hit';

export interface Symbolication {
    frames: ResolvedFrame[];
    /** True when at least one frame resolved — what the toggle keys off. */
    applied: boolean;
    release: string | null;
    mapsUsed: number;
    resolvedCount: number;
    frameCount: number;
    reason: SymbolicationReason;
}

/** Metadata only. The map content is never returned by any endpoint. */
export interface SourceMapSummary {
    id: number;
    release: string;
    fileName: string;
    size: number;
    uploadedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

/** One release the project has actually reported, from `events`. */
export interface ReleaseSummary {
    release: string;
    events: number;
    firstSeen: string;
    lastSeen: string;
    /** Null for a `member`, who is not entitled to the source-map list at all. */
    sourceMaps: number | null;
}

export interface ReleasesResponse {
    releases: ReleaseSummary[];
    canManage: boolean;
}

export interface SourceMapsResponse {
    sourceMaps: SourceMapSummary[];
    totalBytes: number;
    maxBytes: number;
}

export interface IssueDetail extends Issue {
    latestEvent: IssueEvent | null;
    /** Resolved frames for `latestEvent`. Null when there is no stored event. */
    symbolication: Symbolication | null;
    recentEvents: IssueEvent[];
    range: IssueRange;
    /**
     * Occurrence histogram. Counts **stored events**, not occurrences: the SDK
     * collapses repeats into one row carrying a count, so these bars will not sum
     * to `count`. Label it as sampled wherever it is drawn.
     */
    timeline: TimelineBucket[];
    storedInRange: number;
    storedTotal: number;
    breakdown: IssueBreakdown;
}

export interface IssueListResponse {
    issues: Issue[];
    /** Count of rows matching the *current filters*, which is what the pager needs. */
    total: number;
    limit: number;
    offset: number;
}

export interface IssueStats {
    totalIssues: number;
    unresolved: number;
    resolved: number;
    ignored: number;
    eventsLast24h: number;
    lastEventAt: string | null;
}

export interface IssueFilters {
    level?: string;
    status?: IssueStatus;
    q?: string;
    since?: number;
    sort?: 'lastSeen' | 'firstSeen' | 'count';
    direction?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// ── Overview surfaces ────────────────────────────────────────

/** One row of the cross-project roll-up on the global dashboard. */
export interface RollupProject {
    id: number;
    name: string;
    slug: string;
    role: ProjectRole;
    unresolved: number;
    events: number;
    regressions: number;
    newIssues: number;
    /** `null` means the project has never received an event — not "quiet". */
    lastEventAt: string | null;
    /**
     * Event volume bucketed across the selected range — hourly for 24h, daily
     * otherwise, gap-filled so quiet buckets are zeroes rather than absences.
     *
     * This is what the heatmap and the row sparklines are drawn from. The scalars
     * above cannot substitute: they say how much, never when.
     */
    series: TimelineBucket[];
}

export interface RollupResponse {
    range: IssueRange;
    /** Pre-ranked by the server: regressions, then unresolved, then volume. */
    projects: RollupProject[];
    totals: {
        projects: number;
        unresolved: number;
        events: number;
        regressions: number;
        awaitingFirstEvent: number;
    };
}

export interface ReleaseMarker {
    release: string;
    firstSeenAt: string;
    eventsInWindow: number;
}

export interface OverviewIssue {
    id: number;
    title: string;
    culprit: string | null;
    level: string;
    count: number;
    lastSeen?: string;
    reopenCount: number;
    lastReopenedAt?: string | null;
    status?: IssueStatus;
    ticketId?: number | null;
}

export interface ProjectOverview {
    project: { id: number; name: string; slug: string; role: ProjectRole };
    range: IssueRange;
    windowStart: string;
    bucket: 'hour' | 'day';
    kpis: {
        unresolved: number;
        totalIssues: number;
        newIssues: number;
        regressions: number;
        eventsInWindow: number;
        openTickets: number;
        lastEventAt: string | null;
    };
    volume: TimelineBucket[];
    /** Releases first seen inside the window — these pin onto the chart. */
    releases: ReleaseMarker[];
    /** Every known release, newest first. Context when none deployed in-window. */
    allReleases: ReleaseMarker[];
    topIssues: OverviewIssue[];
    regressedIssues: OverviewIssue[];
}

export interface PromotedTicket {
    id: number;
    displayId: string;
    title: string;
    status: string;
    priority: string;
    projectId: number;
}

// ── Notifications (alerting) ─────────────────────────────────

/**
 * `invite` is written when an invited address already has an account (T-D1) —
 * the common case in a small team. Unlike `regression` it carries no `issueId`
 * and, deliberately, no token, so it announces the invitation without being a
 * way to accept it. See `NotificationBell` for why that row does not navigate.
 */
export type NotificationKind = 'regression' | 'invite';

export interface AppNotification {
    id: number;
    kind: NotificationKind;
    projectId: number;
    issueId: number | null;
    title: string;
    body: string | null;
    /** Null until read. */
    readAt: string | null;
    createdAt: string;
    /** Resolved server-side so the feed can link without an extra fetch. */
    projectSlug: string | null;
    projectName: string | null;
}

export interface NotificationsResponse {
    /** Always the unread total, regardless of any filter — it drives the badge. */
    unreadCount: number;
    notifications: AppNotification[];
}
