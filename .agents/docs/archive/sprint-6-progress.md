# Progress — Sprint 6 gates G3–G5 (team invites + roles, client)

Spec: [`.agents/docs/features/team-and-roles.md`](.agents/docs/features/team-and-roles.md)
Ledger: [`feature-list.json`](feature-list.json)

## 2026-08-03 — G3, G4 and G5 shipped. 12/12 features verified.

All three gates were UI only; the server half shipped with G2 on 2026-08-01 and was not touched.

**Built**

| Area | Files |
| --- | --- |
| Form kit | `components/design-system/Select.tsx` (+ index export, `/design-system` showcase) |
| Data layer | `types/team.ts`, `services/team.ts`, `hooks/useMembers.ts` |
| Screens | `pages/ProjectMembers.tsx`, `pages/InviteAccept.tsx` |
| Wiring | `routes/AppRoutes.tsx`, `components/layouts/ProjectTabs.tsx`, `components/layouts/NotificationBell.tsx`, `types/projects.ts` |

**Decisions taken during the build**

- **`Select` is a native `<select>`, not a Radix listbox.** Every use is a two-or-three option enum,
  and native brings the platform picker on touch plus keyboard type-ahead for free. Radix earns its
  place in the overlay kit because focus trapping is genuinely hard; a listbox over three strings is
  not. Documented in the component so the next person does not "upgrade" it.
- **`/invite/:token` sits inside `ProtectedRoute` but outside `AppLayout`.** Inside the guard because
  the guard already carries `state.from`, so signed-out → login → back-to-the-invite costs nothing.
  Outside the layout because an invitee may have zero projects and the nav rail would render empty
  chrome around a single decision.
- **`useMembers` refetches after every mutation instead of patching state.** Removal and transfer both
  have server-side effects the client cannot reproduce (T-D4, T-D5); a locally-patched roster after
  either would be a plausible-looking lie.
- **The `invite` bell row does not navigate.** See the "Known gap" section of the spec — the token is
  never stored, so there is no destination. Named rather than papered over.

**Verified in-browser against the running API** (two accounts, real project `test`): owner and member
views of the roster, invite → copy-once link → reopen shows nothing, 409 on re-inviting a member,
inline role change persisting and re-sorting, invite revoke, all four accept-screen states, leave,
remove-with-ticket-unassignment, and a full ownership transfer where `Project.ownerId` and the `owner`
member row were then checked to agree. Test fixtures restored afterwards.

`tsc -b` and `vite build` both green. No console errors.

## Open follow-ups (not blockers)

1. **`GET /api/invites/mine`** — would make the bell's invite row actionable. Backend work; see spec.
2. **`express-rate-limit` logs an `ERR_ERL_KEY_GEN_IPV6` ValidationError at boot**, from
   `inviteLimiter`'s custom `keyGenerator` in `middleware/rateLimit.ts:44`. Pre-existing, non-fatal,
   and a false positive here — the key is the project slug, not an IP — but it is noise on every start
   and would be silenced by the library's `ipKeyGenerator` helper in the fallback branch.
3. The client bundle is past 500 kB and warns on every build. Pre-existing; route-level code splitting
   is the fix when someone has an afternoon.
