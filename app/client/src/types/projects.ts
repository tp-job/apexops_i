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

export interface IssueDetail extends Issue {
    latestEvent: IssueEvent | null;
    recentEvents: IssueEvent[];
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

export interface PromotedTicket {
    id: number;
    displayId: string;
    title: string;
    status: string;
    priority: string;
    projectId: number;
}
