/**
 * Retired 2026-08-04 (Sprint 5, criterion 10).
 *
 * This file declared `NotificationSettings` and `SecuritySettings` — eight fields
 * covering email/push notifications, weekly reports, team updates, 2FA and login
 * alerts, plus a commented-out `UserData`. Not one had a consumer, and neither
 * interface was imported by a single module.
 *
 * They are gone rather than kept "for later" because a type that names a setting
 * is the first step toward a control that renders it, and S-D1's whole point is
 * that a switch ships only once something enforces it. The shape is recoverable
 * from git the day the feature behind it is real.
 *
 * The one account setting that *is* enforced lives on `UserSettings` in
 * `./auth.ts`. Notification preferences, when they land, are per-project (S-D4)
 * and belong with the project types, not here.
 */
export {};
