-- =====================================================================
-- Verify: overview surfaces + regression tracking
-- (.agents/docs/features/overview-and-regressions.md, shipped 2026-07-29)
-- =====================================================================
-- For a SQL client (SQL Workbench/J, DBeaver, pgAdmin, TablePlus, psql).
-- Read-only except the final "state-changing" queries, which are commented
-- out and require you to uncomment + fill in an id on purpose.
--
-- Connection: uses the same DATABASE_URL as app/server/.env
--   (Prisma names: users, projects, issues, issue_status_changes, events,
--    project_members, tickets)
-- =====================================================================


-- 1) Sanity: do the new objects exist?
-- ---------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('issue_status_changes')
ORDER BY table_name;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'issues'
  AND column_name IN ('reopen_count', 'last_reopened_at')
ORDER BY column_name;


-- 2) Every issue that has ever regressed, newest first
-- ---------------------------------------------------------------------
SELECT
    p.slug          AS project_slug,
    i.id            AS issue_id,
    i.title,
    i.status,
    i.reopen_count,
    i.last_reopened_at,
    i.count         AS occurrences,
    i.ticket_id
FROM issues i
JOIN projects p ON p.id = i.project_id
WHERE i.reopen_count > 0
ORDER BY i.last_reopened_at DESC;


-- 3) The audit trail for one issue — replace the id
-- ---------------------------------------------------------------------
SELECT
    isc.id,
    isc.from_status,
    isc.to_status,
    isc.reason,          -- 'manual' (a person) or 'regression' (ingest, no actor)
    isc.actor_id,
    u.email          AS actor_email,
    isc.created_at
FROM issue_status_changes isc
LEFT JOIN users u ON u.id = isc.actor_id
WHERE isc.issue_id = 297   -- <<< replace with a real issue id from query 2
ORDER BY isc.created_at ASC;


-- 4) Regressions per project in the last 7 days — what the rollup/overview
--    "regressions" KPI is computed from
-- ---------------------------------------------------------------------
SELECT
    p.slug,
    p.name,
    COUNT(*) FILTER (WHERE isc.reason = 'regression') AS regressions_7d
FROM issue_status_changes isc
JOIN projects p ON p.id = isc.project_id
WHERE isc.created_at >= now() - interval '7 days'
GROUP BY p.slug, p.name
ORDER BY regressions_7d DESC;


-- 5) Data-integrity check: a no-op status PATCH must never have written
--    a row where from_status = to_status. Should return ZERO rows.
-- ---------------------------------------------------------------------
SELECT *
FROM issue_status_changes
WHERE from_status = to_status;


-- 6) Data-integrity check: every 'regression' row must have no actor,
--    and every 'manual' row must have one. Should return ZERO rows.
-- ---------------------------------------------------------------------
SELECT *
FROM issue_status_changes
WHERE (reason = 'regression' AND actor_id IS NOT NULL)
   OR (reason = 'manual'     AND actor_id IS NULL);


-- 7) Event volume + release, mirrors GET /api/projects/:slug/overview
--    Replace the project_id (see query 8 for the id/slug map).
--    NOTE: this is a *rolling* 24h window against wall-clock now() — old test
--    data will legitimately fall out of it and return zero rows. That is not
--    a bug in the query; re-run ingest or widen to interval '30 days' to see
--    older fixtures again.
-- ---------------------------------------------------------------------
SELECT
    date_trunc('hour', created_at) AS bucket,
    COUNT(*)                       AS events
FROM events
WHERE project_id = 6              -- <<< replace
  AND created_at >= (now() - interval '24 hours')::timestamp
GROUP BY 1
ORDER BY 1;

SELECT
    "release",
    MIN(created_at) AS first_seen,
    COUNT(*)         AS total_events
FROM events
WHERE project_id = 6              -- <<< replace
  AND "release" IS NOT NULL AND "release" <> ''
GROUP BY "release"
ORDER BY first_seen DESC;


-- 8) Project id/slug map, and who is a member of what — handy lookup
--    for filling in the placeholders above
-- ---------------------------------------------------------------------
SELECT
    p.id,
    p.slug,
    p.name,
    p.archived_at,
    pm.user_id,
    u.email,
    pm.role
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN users u ON u.id = pm.user_id
ORDER BY p.id, pm.role;


-- =====================================================================
-- State-changing (commented out on purpose — uncomment + fill in an id
-- to actually run). Use these to manufacture a regression by hand if you
-- want to watch the audit trail appear without waiting on the SDK/ingest.
-- =====================================================================

-- -- 9a) Resolve an issue manually (mirrors PATCH /issues/:id { status: 'resolved' })
-- UPDATE issues SET status = 'resolved' WHERE id = 297;
-- INSERT INTO issue_status_changes (issue_id, project_id, from_status, to_status, reason, actor_id)
-- SELECT id, project_id, 'unresolved', 'resolved', 'manual', 7 FROM issues WHERE id = 297;

-- -- 9b) Simulate the SAME error recurring (mirrors ingest's auto-reopen path)
-- UPDATE issues
--   SET status = 'unresolved', reopen_count = reopen_count + 1, last_reopened_at = now()
--   WHERE id = 297 AND status = 'resolved';
-- INSERT INTO issue_status_changes (issue_id, project_id, from_status, to_status, reason, actor_id)
-- SELECT id, project_id, 'resolved', 'unresolved', 'regression', NULL FROM issues WHERE id = 297;
