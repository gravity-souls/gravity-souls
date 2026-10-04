# Optional Post context review

Updated 2026-10-04. User reports MR #28 deployed. This slice follows ADR 0001:
Community remains the galaxy model; Post and CommunityPost remain separate.

## Delivered behavior

- Publishing and author editing can select a member galaxy and optionally its event.
  Event selection resolves its galaxy; the server rejects inconsistent references.
  Search and paged choices use real permitted records; failed writes preserve drafts.
- Linked posts are member-scoped. The creator and members can read and interact;
  authors retain management access after leaving. A global post remains global.
  Explicitly removing both references republishes globally after UI confirmation.
- Context cards link to galaxy/event detail. Related global signals appear in a
  separate detail section, without copying them into CommunityPost.
- New links require approved/passed events. Pending/rejected events suppress member
  reads and event metadata. Existing cancelled/passed associations remain readable.
  Blocks and deleted proposers are checked; private avatar configuration is masked.
- Nested likes, comments, replies and comment mutations share the Post read boundary.
  Author-only edit/delete and existing contact restrictions remain enforced.
- Deleting a target clears its nullable foreign key, while contextRestricted remains
  true. A deleted galaxy does not turn its previously restricted posts public.
- Publishing awards XP atomically; editing does not award it again.
- Picker, cards, editing, errors and status labels support en/zh/fr.

## Media limitation

The existing upload pipeline produces public CDN/dev media links. An authorized
reader can forward a media URL independently of Post access checks. The composer
warns that files must not be private. This release restricts application Post reads;
it does not provide private file storage or revoke previously distributed links.

## Migration and release

New additive migration: 20261004230000_link_posts_to_context. It adds nullable
Post.galaxyId/eventId, a default-false contextRestricted flag, two indexes and
SET NULL foreign keys. Existing migrations are untouched. Apply this migration
before running the new application. No production database was modified here.

Once restricted posts exist, rolling back to pre-context application code is unsafe:
old readers ignore contextRestricted. Keep the guarded release or backport the
same read/interaction guards to any rollback build. Retain the additive schema and
user content; do not drop fields or delete user posts as a rollback shortcut.

## Verification

24 baseline tests and 74 database/locale suite tests pass. The latter exercise real
Prisma against embedded PostgreSQL with actual migrations and fixture authentication:
author/member/outsider, association validation, direct-ID read/interaction denials,
blocks, approval changes, cancellation/history, membership loss, target deletion,
explicit unlinking, pagination, private avatars and three-language UI rendering.
TypeScript, changed-file ESLint and production webpack build pass.

The browser specification covers publish selection and preserving a failed draft
on desktop/mobile/WebKit projects, but browser engines are absent. It is not an
executed browser acceptance result. Embedded PostgreSQL serializes connections;
real multi-connection permission-change races remain unverified. Association writes
lock targets, but interaction authorization is checked at request entry and does
not claim an atomic membership-revocation barrier across the whole mutation.

Deployed multi-account verification remains required for publishing/editing, detail
handoffs, denied requests, audience changes, media warning and all three locales on
desktop and phones. No deployment, production fixture writes or actual user messages
were performed.
