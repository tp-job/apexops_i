Everything except ingest uses your signed-in session. Send `Authorization: Bearer <accessToken>`.

## Authentication

Sign in for an access token and a refresh token. Access tokens are short-lived; exchange the refresh token at `/api/auth/refresh` when one expires.

```bash
curl -X POST https://your-apexops-host/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"..."}'
```

:::callout{title="An ingest key will not work here"}
It is write-only by design and is rejected by every endpoint on this page.
:::

## Projects

| Endpoint {w-[22rem]} | Description |
| --- | --- |
| :endpoint[GET /api/projects] | Projects you are a member of, with unresolved counts and last-event times. |
| :endpoint[POST /api/projects] | Create a project. |
| :endpoint[GET /api/projects/:slug] | One project. |
| :endpoint[PATCH /api/projects/:slug] | Update name, capture levels, allowed origins or retention. |
| :endpoint[POST /api/projects/:slug/rotate-key] | Issue a new ingest key and revoke the old one immediately. |
| :endpoint[DELETE /api/projects/:slug] | Archive. Reversible via restore; owner only. |
| :endpoint[POST /api/projects/:slug/restore] | Unarchive. |

## Issues

| Endpoint {w-[22rem]} | Description |
| --- | --- |
| :endpoint[GET /api/projects/:slug/issues] | Filter by `level`, `status`, `q`, `since`; sort by `lastSeen`, `firstSeen` or `count`. |
| :endpoint[GET /api/projects/:slug/issues/stats] | Counts by status, events in the last 24h, last event time. |
| :endpoint[GET /api/projects/:slug/issues/:id] | One issue with its latest and recent events. |
| :endpoint[PATCH /api/projects/:slug/issues/:id] | Set status. The only mutable field on an issue. |
| :endpoint[POST /api/projects/:slug/issues/:id/ticket] | Promote to a ticket. 409 if already promoted, carrying the existing id. |

Lists are paginated with `limit` (max 100) and `offset`, and return a `total` reflecting the current filters.

## Error semantics

A project you are not a member of returns `404`, never `403`. A 403 would confirm the slug exists, which turns these endpoints into a way to enumerate other people's project names one guess at a time.

Errors are JSON with an `error` field holding a message suitable for showing to a user.
