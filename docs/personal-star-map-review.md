# Personal star map

2026-10-05 (Europe/Paris), based on merged MR38. Chat follow-up work is deferred until
configuration; this slice needs no image-storage configuration and no schema migration.

## Product behavior

The existing `/star-map` gains My star map alongside global discovery and galaxies.
This is the current viewer's private collection, not another public profile or discoverable
social graph. My Planet, desktop My Space, and the mobile explore menu link to the same page;
the five bottom tabs remain unchanged.

| Collection | Inclusion |
| --- | --- |
| All | A planet saved by me OR belonging to a user I follow; one node per planet |
| Saved orbit | A planet saved by me |
| Following | Current active planets belonging to users I follow |
| Mutual | Active planets belonging to users who follow me and whom I follow |

A visit, incoming-only follow, beam invitation or existing conversation does not add a
planet. Interest in a planet uses the existing private orbit save; event interest remains
its own object. Removing a save does not unfollow; unfollowing does not remove a save.
The planet leaves All after neither condition applies. These reads send no message or notice,
do not join galaxies, and do not acknowledge chat messages.

The same renderer provides map and list formats, all four collections, climate grouping,
search, bounded pages and return to first batch. The list format removes the canvas and
shows the loaded nodes without needing to expand each cluster. Both formats use identical
server data, avatars and actions; map particles remain decorative and lines are navigation
guides rather than actual social edges. No rings, new borders, pause or refresh button added.

Detail/chat origins use eight fixed collection/format values; arbitrary or external origins
are ignored. Return restores the exact collection and format, then the per-tab search,
group, selected ID, camera and sidebar state. No names, avatars or relationship data are
stored in browser exploration state. Local successful actions, focus and foreground refresh
current server permissions. Failures clear displayed metadata and offer retry; failed
mutations retain the confirmed relationship state. Cross-account changes while continuously
visible are not claimed instant.

## Access and scale

`personalMapPlanetWhere` lives in `lib/visibility.ts` and follows `canViewProfile`'s rule:
member-visible/missing profiles may be viewed; PRIVATE needs a follow in either direction.
Saved-only private planets remain hidden. Blocks in either direction, inactive planets,
deleted targets, self planets and deleted viewers are excluded. No caller-provided owner ID
is accepted. A connected private planet may be visible here while absent from conservative
global discovery; this is not a strict subset of the global discovery query.

Relationship inclusion uses SQL relation predicates, without loading all saved/follow IDs.
At most 36 permitted nodes are fetched plus one lookahead; stable ID cursor pagination,
counts and climate groups share the permission and collection boundary. Relationship
metadata hydration still queries only the viewer and this bounded batch. Responses are
private/no-store; never return someone else's saved collection.

## Validation and limits

- 107 isolated real Prisma/PostgreSQL and component/locale checks pass, including collection
  deduplication, owner isolation, all four filters, auth/strict query validation, private
  permission transitions, both block directions, target/viewer deletion, inactive targets,
  avatar refresh, independent real save/unfollow removals, no new notices/messages, and
  collections larger than one batch.
- 24 baseline checks also pass (131 total). Typecheck, changed-file lint (zero errors or
  warnings), full en/fr/zh key parity and production webpack build pass.
- Nine browser scenarios (three locales × desktop/mobile/WebKit) cover list selection,
  detail/return restoration, failed removal/retry, filter/format changes and revoked visibility.
  Browser engines are absent; these scenarios are discovered, not claimed executed.
- This extends the existing 2D canvas without new GPU/WebGL resources. Existing DPR caps,
  reduced-motion preference, hidden/offscreen pause and teardown remain. List mode mounts
  no canvas. Existing map touch-action:none keeps in-canvas rotation/pinch; scrolling the
  surrounding page and physical iPhone gestures/performance still require device acceptance.
- No production write, deployment or migration is performed. No new services or secrets.
  Rollback is code revert; existing saves, follows and conversations remain intact.

## Next slices

Non-chat work next: activity discovery → interest → membership approval → attendance
approval → cancellation/history and organizer/admin decisions; then contextual post return
flows and revoked visibility. Future personal overlays can show the own central planet,
real galaxy memberships and permitted interested/joined activities; temporary activity
clusters need clear object identity, duration and permission rules before implementation.
