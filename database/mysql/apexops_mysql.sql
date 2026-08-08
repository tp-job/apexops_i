-- =====================================================================
-- ApexOps — MySQL 8.0 schema
--
-- Purpose: reverse-engineer this file in MySQL Workbench to get the EER
--          (ER) diagram, or run it directly to create the schema.
--
--   MySQL Workbench →  Database → Reverse Engineer…  (for a live server)
--                  or  File → Import → Reverse Engineer MySQL Create Script…
--                      ✔ "Place imported objects on a diagram"
--
-- Source of truth: database/prisma/schema.prisma (PostgreSQL).
-- Translation notes: .agents/docs/architecture/er-and-dfd.md
--
-- Table order is FK-safe: parents before children, no forward references.
-- =====================================================================

SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS, UNIQUE_CHECKS = 0;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_MODE = @@SQL_MODE, SQL_MODE = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE SCHEMA IF NOT EXISTS `apexops`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE `apexops`;


-- ─────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `first_name`     VARCHAR(100)  NOT NULL,
  `last_name`      VARCHAR(100)  NOT NULL,
  `email`          VARCHAR(255)  NOT NULL COMMENT 'unique; see collation note in er-and-dfd.md',
  `password`       VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash, never plaintext',
  `phone`          VARCHAR(32)   NULL,
  `company`        VARCHAR(150)  NULL,
  `position`       VARCHAR(150)  NULL,
  `location`       VARCHAR(150)  NULL,
  `timezone`       VARCHAR(64)   NULL DEFAULT 'Asia/Bangkok (GMT+7)',
  `bio`            TEXT          NULL,
  `avatar_url`     VARCHAR(1024) NULL,
  `role`           VARCHAR(32)   NULL DEFAULT 'user' COMMENT 'global role; authorize() reads this column, never the JWT claim',
  `gender`         VARCHAR(32)   NULL,
  `birth_date`     DATE          NULL,
  `language`       VARCHAR(64)   NULL DEFAULT 'Thai',
  `theme`          VARCHAR(16)   NULL DEFAULT 'system' COMMENT 'light | dark | system; per account, not per device',
  `is_active`      TINYINT(1)    NULL DEFAULT 1,
  `email_verified` TINYINT(1)    NULL DEFAULT 0,
  `created_at`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_users_email` (`email` ASC)
) ENGINE = InnoDB
  COMMENT = 'Accounts. Root of every ownership chain in the system.';


-- ─────────────────────────────────────────────────────────────────────
-- user_settings  (1:1 with users)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`             INT UNSIGNED NOT NULL,
  `email_notifications` TINYINT(1) NOT NULL DEFAULT 1,
  `push_notifications`  TINYINT(1) NOT NULL DEFAULT 1,
  `bug_alerts`          TINYINT(1) NOT NULL DEFAULT 1,
  `weekly_reports`      TINYINT(1) NOT NULL DEFAULT 0,
  `team_updates`        TINYINT(1) NOT NULL DEFAULT 1,
  `two_factor_auth`     TINYINT(1) NOT NULL DEFAULT 0,
  `session_timeout`     INT UNSIGNED NOT NULL DEFAULT 480 COMMENT 'idle window in MINUTES; bounds the refresh token, not just the access token',
  `login_alerts`        TINYINT(1) NOT NULL DEFAULT 1,
  `profile_visibility`  TINYINT(1) NOT NULL DEFAULT 1,
  `activity_status`     TINYINT(1) NOT NULL DEFAULT 1,
  `data_collection`     TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_user_settings_user` (`user_id` ASC),
  CONSTRAINT `fk_user_settings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Per-account preferences and the session idle timeout.';


-- ─────────────────────────────────────────────────────────────────────
-- refresh_tokens  (active sessions)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `token`      VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(3)  NOT NULL COMMENT 'sliding idle window, extended on each rotation',
  `absolute_expires_at` DATETIME(3) NULL COMMENT 'hard session end, stamped at login and carried across rotations; NULL = legacy uncapped row',
  `user_agent` VARCHAR(512) NULL COMMENT 'context for the active-sessions list',
  `ip_address` VARCHAR(45)  NULL COMMENT 'IPv6-safe length',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_refresh_tokens_token` (`token` ASC),
  INDEX `idx_refresh_tokens_user` (`user_id` ASC),
  CONSTRAINT `fk_refresh_tokens_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'One row per active session. Deleting a row logs that device out.';


-- ─────────────────────────────────────────────────────────────────────
-- logs  (ApexOps own server log — trusted, first-party)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `logs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `level`      VARCHAR(16)  NOT NULL,
  `message`    TEXT         NOT NULL,
  `source`     VARCHAR(255) NULL,
  `stack`      MEDIUMTEXT   NULL,
  `user_id`    INT UNSIGNED NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_logs_user` (`user_id` ASC),
  INDEX `idx_logs_created` (`created_at` ASC),
  CONSTRAINT `fk_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'First-party server log. NOT the same as events: that table is untrusted third-party input.';


-- ─────────────────────────────────────────────────────────────────────
-- notes  (notes + calendar)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notes` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED  NULL,
  `title`           VARCHAR(255)  NOT NULL,
  `content`         MEDIUMTEXT    NULL,
  `type`            VARCHAR(32)   NULL DEFAULT 'text',
  `is_pinned`       TINYINT(1)    NOT NULL DEFAULT 0,
  `color`           VARCHAR(32)   NULL,
  `tags`            JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  `image_url`       VARCHAR(1024) NULL,
  `link_url`        VARCHAR(1024) NULL,
  `checklist_items` JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  `quote`           JSON          NOT NULL DEFAULT (JSON_OBJECT()),
  `scheduled_for`   DATETIME(3)   NULL COMMENT 'day the note is planned for; NULL falls back to created_at on the calendar',
  `due_date`        DATETIME(3)   NULL COMMENT 'deadline, independent of scheduled_for',
  `created_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_notes_user` (`user_id` ASC),
  INDEX `idx_notes_pinned` (`is_pinned` ASC),
  INDEX `idx_notes_user_scheduled` (`user_id` ASC, `scheduled_for` ASC),
  INDEX `idx_notes_user_due` (`user_id` ASC, `due_date` ASC),
  CONSTRAINT `fk_notes_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Notes; also the backing store for the calendar view.';


-- ─────────────────────────────────────────────────────────────────────
-- projects  (workspace = scoping root for all SDK data)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `projects` (
  `id`                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(150)  NOT NULL,
  `slug`                VARCHAR(100)  NOT NULL COMMENT 'URL segment /p/:slug',
  `ingest_key`          VARCHAR(64)   NOT NULL COMMENT 'PUBLIC by design: ships in a script tag. Write-only, rate limited, rotatable.',
  `allowed_origins`     JSON          NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'empty array = any origin',
  `capture_levels`      JSON          NOT NULL DEFAULT (JSON_ARRAY('error','warn')),
  `retention_days`      INT UNSIGNED  NOT NULL DEFAULT 30 COMMENT 'applies to raw events only; issues are never pruned',
  `alert_on_regression` TINYINT(1)    NOT NULL DEFAULT 1 COMMENT 'alerting is per project, not per user',
  `webhook_url`         VARCHAR(2048) NULL COMMENT 'USER-SUPPLIED => SSRF surface; all sends go through lib/urlGuard.ts',
  `owner_id`            INT UNSIGNED  NOT NULL,
  `archived_at`         DATETIME(3)   NULL,
  `created_at`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_projects_slug` (`slug` ASC),
  UNIQUE INDEX `uq_projects_ingest_key` (`ingest_key` ASC),
  INDEX `idx_projects_owner` (`owner_id` ASC),
  INDEX `idx_projects_archived` (`archived_at` ASC),
  CONSTRAINT `fk_projects_owner`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Workspace. Every issue, event, ticket and source map is scoped to exactly one.';


-- ─────────────────────────────────────────────────────────────────────
-- project_members  (M:N resolver, composite PK)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `project_members` (
  `project_id` INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED NOT NULL,
  `role`       ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`project_id`, `user_id`),
  INDEX `idx_project_members_user` (`user_id` ASC),
  CONSTRAINT `fk_project_members_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_members_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Resolves the many-to-many between users and projects, and carries the per-project role.';


-- ─────────────────────────────────────────────────────────────────────
-- project_invites
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `project_invites` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`     INT UNSIGNED NOT NULL,
  `email`          VARCHAR(255) NOT NULL COMMENT 'lowercased at write time; invite is BOUND to this address',
  `role`           ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  `token_hash`     CHAR(64)     NOT NULL COMMENT 'SHA-256 hex. Raw token returned once at creation and never stored.',
  `status`         ENUM('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
  `invited_by_id`  INT UNSIGNED NOT NULL,
  `expires_at`     DATETIME(3)  NOT NULL,
  `accepted_at`    DATETIME(3)  NULL,
  `accepted_by_id` INT UNSIGNED NULL,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_project_invites_token` (`token_hash` ASC),
  UNIQUE INDEX `uq_project_invites_project_email` (`project_id` ASC, `email` ASC)
    COMMENT 'one live invite per address per project; re-inviting updates the row',
  INDEX `idx_project_invites_project_status` (`project_id` ASC, `status` ASC),
  INDEX `idx_project_invites_inviter` (`invited_by_id` ASC),
  CONSTRAINT `fk_project_invites_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_invites_inviter`
    FOREIGN KEY (`invited_by_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Pending grant of membership, delivered as a one-time link.';


-- ─────────────────────────────────────────────────────────────────────
-- tickets  (bug tracker board)  — created BEFORE issues (issues.ticket_id FK)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tickets` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`   INT UNSIGNED NOT NULL,
  `title`        VARCHAR(255) NOT NULL,
  `description`  MEDIUMTEXT   NULL,
  `status`       ENUM('open','in-progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority`     ENUM('low','medium','high','critical')         NOT NULL DEFAULT 'medium',
  `assignee`     VARCHAR(150) NULL COMMENT 'LEGACY free-text display denorm; assignee_id is the source of truth',
  `reporter`     VARCHAR(150) NULL DEFAULT 'System' COMMENT 'LEGACY free-text display denorm',
  `assignee_id`  INT UNSIGNED NULL,
  `reporter_id`  INT UNSIGNED NULL,
  `tags`         JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `related_logs` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `archived_at`  DATETIME(3)  NULL COMMENT 'soft delete: DELETE /:id archives instead of destroying',
  `created_at`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_tickets_project_status` (`project_id` ASC, `status` ASC),
  INDEX `idx_tickets_assignee` (`assignee_id` ASC),
  INDEX `idx_tickets_reporter` (`reporter_id` ASC),
  INDEX `idx_tickets_status` (`status` ASC),
  INDEX `idx_tickets_archived` (`archived_at` ASC),
  CONSTRAINT `fk_tickets_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_assignee`
    FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_reporter`
    FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Tracked work on the Bug Tracker board. Two distinct FKs to users: assignee and reporter.';


-- ─────────────────────────────────────────────────────────────────────
-- ticket_comments  (human comments + system activity, one stream)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ticket_comments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id`  INT UNSIGNED NOT NULL,
  `author_id`  INT UNSIGNED NULL COMMENT 'NULL for system activity rows, or once the author is deleted',
  `kind`       ENUM('comment','activity') NOT NULL DEFAULT 'comment',
  `body`       MEDIUMTEXT NOT NULL,
  `meta`       JSON NOT NULL DEFAULT (JSON_OBJECT()) COMMENT 'activity rows carry { field, from, to }',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_ticket_comments_ticket_created` (`ticket_id` ASC, `created_at` ASC),
  INDEX `idx_ticket_comments_author` (`author_id` ASC),
  CONSTRAINT `fk_ticket_comments_ticket`
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_comments_author`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'One chronological thread per ticket: comments and status/assignee changes together.';


-- ─────────────────────────────────────────────────────────────────────
-- issues  (grouped, deduplicated errors)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `issues` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`  INT UNSIGNED NOT NULL,
  `fingerprint` CHAR(64)     NOT NULL COMMENT 'hash(project, level, normalized message, top frame)',
  `level`       VARCHAR(16)  NOT NULL,
  `title`       VARCHAR(512) NOT NULL COMMENT 'first line of the message',
  `culprit`     VARCHAR(512) NULL COMMENT 'top stack frame, e.g. app.js:42',
  `status`      ENUM('unresolved','resolved','ignored') NOT NULL DEFAULT 'unresolved',
  `count`       INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'denormalized occurrence count; events is the raw source',
  `first_seen`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ticket_id`   INT UNSIGNED NULL COMMENT 'set when promoted to tracked work; 1:1 with tickets',
  `reopen_count`     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'denormalized; issue_status_changes is the source of truth',
  `last_reopened_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_issues_project_fingerprint` (`project_id` ASC, `fingerprint` ASC)
    COMMENT 'the ingest upsert target; makes repeated ingest idempotent',
  UNIQUE INDEX `uq_issues_ticket` (`ticket_id` ASC),
  INDEX `idx_issues_project_status_lastseen` (`project_id` ASC, `status` ASC, `last_seen` ASC),
  CONSTRAINT `fk_issues_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_issues_ticket`
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'The unit the UI lists. 100k identical throws = ONE row with count 100000.';


-- ─────────────────────────────────────────────────────────────────────
-- events  (raw occurrences; the only table with a path to 10^8 rows)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `events` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'BIGINT deliberate: INT overflow at 2.1B is an outage with no fast fix',
  `project_id` INT UNSIGNED  NOT NULL COMMENT 'denormalized from issue so the retention prune does not join',
  `issue_id`   INT UNSIGNED  NOT NULL,
  `level`      VARCHAR(16)   NOT NULL,
  `message`    TEXT          NOT NULL,
  `stack`      MEDIUMTEXT    NULL,
  `url`        VARCHAR(2048) NULL,
  `user_agent` VARCHAR(512)  NULL,
  `release`    VARCHAR(191)  NULL COMMENT 'from the SDK data-release attribute; joins to source_maps.release',
  `context`    JSON          NOT NULL DEFAULT (JSON_OBJECT()) COMMENT 'SDK tags / breadcrumbs',
  `created_at` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_events_issue_created` (`issue_id` ASC, `created_at` ASC),
  INDEX `idx_events_project_created` (`project_id` ASC, `created_at` ASC) COMMENT 'drives the retention prune job',
  CONSTRAINT `fk_events_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_events_issue`
    FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Untrusted, attacker-controllable, high-volume third-party input. Pruned on the project retention window.';


-- ─────────────────────────────────────────────────────────────────────
-- issue_status_changes  (append-only audit; source of truth for regressions)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `issue_status_changes` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `issue_id`    INT UNSIGNED NOT NULL,
  `project_id`  INT UNSIGNED NOT NULL COMMENT 'denormalized so the cross-project roll-up does not join through issues',
  `from_status` ENUM('unresolved','resolved','ignored') NOT NULL,
  `to_status`   ENUM('unresolved','resolved','ignored') NOT NULL,
  `reason`      ENUM('regression','manual') NOT NULL,
  `actor_id`    INT UNSIGNED NULL COMMENT 'NULL for automatic regressions: ingest has no signed-in user',
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_isc_issue_created` (`issue_id` ASC, `created_at` ASC),
  INDEX `idx_isc_project_reason_created` (`project_id` ASC, `reason` ASC, `created_at` ASC)
    COMMENT 'drives "regressions in the last N days"',
  CONSTRAINT `fk_isc_issue`
    FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_isc_actor`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Every status transition. Without it, "3 regressions this week" is uncomputable.';


-- ─────────────────────────────────────────────────────────────────────
-- notifications  (in-app feed AND the system of record for alerting)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `kind`       ENUM('regression','invite') NOT NULL,
  `project_id` INT UNSIGNED NOT NULL COMMENT 'denormalized so the feed can filter/link without a join',
  `issue_id`   INT UNSIGNED NULL,
  `title`      VARCHAR(512) NOT NULL,
  `body`       TEXT         NULL,
  `read_at`    DATETIME(3)  NULL COMMENT 'NULL = unread; timestamp not boolean so "when did they see it" stays answerable',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_notifications_feed` (`user_id` ASC, `read_at` ASC, `created_at` ASC),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Written first and unconditionally, before any webhook or email. Fan-out is one row per member per event.';


-- ─────────────────────────────────────────────────────────────────────
-- source_maps  (stored in the DB deliberately; content is NEVER served)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `source_maps` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`     INT UNSIGNED NOT NULL,
  `release`        VARCHAR(191) NOT NULL COMMENT 'must match events.release exactly',
  `file_name`      VARCHAR(191) NOT NULL COMMENT 'BASENAME only, e.g. index-BwlN_KfP.js — works behind a CDN or subpath',
  `content`        LONGTEXT     NOT NULL COMMENT 'raw .map JSON. NEVER SERVED. No endpoint returns this column and none may be added.',
  `size`           INT UNSIGNED NOT NULL COMMENT 'bytes, denormalized so the settings list never touches content',
  `uploaded_by_id` INT UNSIGNED NULL,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_source_maps_project_release_file` (`project_id` ASC, `release` ASC, `file_name` ASC)
    COMMENT 're-uploading the same file for the same release REPLACES it',
  INDEX `idx_source_maps_project_release` (`project_id` ASC, `release` ASC),
  INDEX `idx_source_maps_uploader` (`uploaded_by_id` ASC),
  CONSTRAINT `fk_source_maps_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_source_maps_uploader`
    FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  COMMENT = 'Uploaded JS source maps, used at read time to turn minified frames back into original file/line/function.';


SET SQL_MODE = @OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
