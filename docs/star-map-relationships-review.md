# Star-map relationships and return navigation

Date: 2026-10-05 (Europe/Paris). Builds on merged MR32. Implemented in this slice;
deployment and real multi-account/device acceptance remain separate.

## Behavior

- Discovery map list and selected preview show the current viewer's saved orbit,
  following, incoming/mutual follows and existing conversation markers. Plain text
  labels avoid new rings, borders or claims that decorative clusters are social edges.
- Selected planets offer the shared real save/remove, follow/unfollow/follow-back and
  beam controls. Existing threads show Continue chat; opening sends no message.
  New threads keep the existing mutual-follow requirement and rate limit.
- Successful mutations refresh the authoritative map batch without clearing the
  selected planet, filter or camera. Failed mutations emit no success change and
  preserve the control state. Map loading failures show an explicit retry, not fake data.
- Re-entry, window focus and foreground visibility refresh server visibility and
  relationship state. There is no background social subscription; cross-account changes
  while continuously visible are not advertised as instant updates.
- Selected ID, search, group, cursor, camera and mobile sidebar openness are stored per
  tab/map instance. Detail and chat links carry a fixed exploration origin; their return
  link restores either the discovery map or the independent home-map state. Unknown or
  external origin values are ignored. Opening an unavailable target does not grant access.
- A fresh successful batch removes a selected ID no longer present. Browser return never
  restores cached relationship metadata: the server supplies current permitted nodes.

## Data and privacy

The existing /api/star-map discovers at most 36 permitted planets. Three additional
bounded queries read the viewer's saved IDs, the viewer's follow edges in both directions,
and threads involving the viewer and that batch. There are no per-node relationship
queries, message bodies, other viewers' saved collections or message read mutations.
Selected action controls retain their existing single-target authoritative status reads.
Responses remain private, no-store. Shared discovery visibility excludes own, private,
blocked, inactive and deleted targets; this slice adds the explicit deleted-user filter.

No schema change, migration or independent beam invitation mechanism is introduced.
Galaxy mode remains real communities and membership counts, without planet relationship
markers. The separate resonance recommendation renderer is unchanged in this slice.

## Validation and rollout

- 82 isolated Prisma/PostgreSQL, locale and component checks pass, including viewer
  isolation, save/follow/mutual transitions, established chat after unfollow, no send on
  open, both block directions, private/inactive/deleted removal and restored visibility.
- Three-language relation labels, existing-chat control, fixed return paths and invalid
  origin rejection are exercised with actual component rendering and helper calls.
- 24 baseline checks, TypeScript, changed-file ESLint, complete en/fr/zh key parity and
  production webpack build pass.
- Browser regression specifications cover action failure/retry, live selection retention,
  detail/chat return, persisted filter/mobile sidebar, existing chat without another
  thread creation, and removal of a now unavailable selected planet. Six project cases
  are discoverable (desktop, mobile Chromium, iPhone WebKit); they are not executed because
  browser engines are absent. Physical Safari layout, gestures and performance remain open.

After merge/deploy, verify with two real accounts on desktop and phone in en/fr/zh.
Returning after save/unfollow/follow-back must keep the map location and update markers.
Changing privacy or block settings must never expose hidden metadata through a return link.
No production writes, migration deployment, actual messages or deployment are performed
by these local tests. Rollback is the code revert; existing relationship data stays intact.
