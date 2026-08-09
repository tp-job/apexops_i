ApexOps is a centralized bug tracker for multiple projects. A one-line script reports errors from any React, Node or TypeScript app; identical errors are grouped into a single issue; and any issue can be promoted to a tracked ticket on a board.

## How it works

Four steps, each of which maps to a real surface in the product:

1. **Create a project.** Every project has its own ingest key, issues, board and retention policy. Nothing crosses between projects.
2. **Install the snippet.** One `<script>` tag on the app you want to monitor. No build step, no npm package.
3. **Errors group into issues.** A render loop that throws 100,000 times is *one* issue with a count of 100,000 — not 100,000 rows.
4. **Promote to a ticket.** When an issue is worth fixing, turn it into tracked work with an assignee and a status.

## Projects are the scope

A project is the boundary for everything: events, issues, tickets, the ingest key and the retention window. Access is by membership — being signed in is not enough to read another project's issues.

The project appears in the URL as `/p/:slug` rather than living in a client-side store, so deep links, the back button and two tabs on two different projects all behave the way you would expect.

## What this is not

Being explicit about the edges is more useful than implying coverage that does not exist yet:

- **No source maps yet.** Minified stacks are reported verbatim. Frames resolve to the bundled filename and line.
- **No alerting.** Nothing emails or pages you; issues are read in the dashboard.
- **Browser only.** There is no server-side or Node SDK — the ingest API is public and documented, so a server integration is a plain HTTP POST.
- **Not multi-tenant.** Projects are per-user workspaces, not an organization boundary with billing and isolation guarantees.
