# Planet action lifecycle

Date: 2026-10-04 (Europe/Paris). User reports MR #27 deployed. This implements the
recorded next-priority save/follow/chat handoff, before feed associations.

## Delivered behavior

- SavePlanetButton reads owner-specific persisted status and performs real save/remove
  mutations. Detail hero, discovery/resonance preview and saved cards share it. A successful
  write synchronizes local controls and lists; failed writes do not announce success or
  replace prior state. Re-entering or focusing reads current server state.
- The previous detail `/saved?add=...` link did not create a save. The hero now performs
  the mutation directly. Old URLs display a clear save confirmation control with target
  detail link; GET navigation itself never writes a collection. Saving remains private.
- Saved-status reads require an active, non-deleted, permitted target and shared profile
  visibility checks; return no configuration or other users' collection data. Owner-only
  removal is idempotent even after visibility loss. Personalized reads are not cached.
- FollowButton shows outgoing/incoming/mutual relationship status, available targets,
  failures and retry. SafetyMenu uses the same control. Failed unfollow retains the edge
  on screen. Relationship page checks mutation results, offers retry of the failed action,
  preserves existing cards on load failure and refreshes on focus/local successful writes.
  Deleted users are excluded from lists/status; blocks remain undisclosed.
- My Planet has saved orbit and follows/followers entry points. Desktop My Space submenu
  and expanded mobile navigation reuse `/saved` and `/relationships`; five bottom tabs remain.
- BeamButton opens a conversation and explicitly explains that the user must compose/send.
  A new thread requires mutual follows; failure provides follow status/action, relationship
  entry and retry. Existing threads follow existing contact permissions after unfollow.
  Legacy message links return to the target planet when mutual-follow conditions fail.
- Actions, relationship badges, saved/relationship dates and errors are localized in en/zh/fr.
  Custom avatar configuration continues through the existing shared resolver.

## Verification

24 baseline tests and 70 database/locale/client transport tests pass. Tests exercise real
Prisma and migrations on isolated embedded PostgreSQL-compatible PGlite, replacing only
route authentication. New saved-status checks cover owner isolation, idempotent cleanup,
private/blocked/inactive/deleted targets and non-disclosure. Relationship checks cover
outgoing/mutual changes, new/established threads and no silent message on open. Client
transport checks require failures to reject without emitting success events; localized
render checks cover action labels, saved state, relationship badges and navigation.

TypeScript, changed-file ESLint and production webpack build pass. Browser specs cover
legacy save confirmation, persistence, failed removal/retry, failed unfollow and mutual
follow→chat without sending. Desktop/mobile/WebKit specification discovery is checked;
execution remains blocked by the missing browser executable. No claim of physical iPhone
or deployed multi-account acceptance is made. Embedded transactions do not verify real
multi-connection races.

No schema change, migration deployment, production writes or actual messages were performed.

## Remaining work

- Verify deployed two-account save→refresh→remove and follow→notice→follow-back→chat→send→
  recipient notice→read→reply on desktop/mobile, including privacy changes and return to
  the stored map view. Real message read/reply routes remain those from the previous slice.
- Cross-account changes refresh on re-entry/window focus and authoritative action checks;
  no new live social-state subscription is introduced.
- Map preview social-state labels/visual design and independent beam invitation acceptance
  remain design proposals; decorative clusters do not imply saved/follow/chat edges.
- Continue Post→Community/Event associations and contextual cards after this slice and its
  acceptance, preserving ADR 0001's distinct global and community content models.
