# ADR 0003: Permission-aware chat share cards

- Date: 2026-10-05 (Europe/Paris)
- Status: Accepted for implementation under the user's authorized next-development
  request; production migration/deployment remain separate. Product-architect reviewed.

## Decision and alternatives

Store typed stable references, not inferred URLs or presentation snapshots. URL inference
breaks on slug changes; frozen snapshots retain private titles and obsolete avatars.
Galaxy remains Community (ADR 0001); contact consent remains ADR 0002.

Add nullable shareKind and shareTargetId to DirectMessage. Existing text type is unchanged.
Type share stores empty content and one planet/galaxy/event reference, no caption. Resource
FKs are deliberately absent: deleting targets preserves history with an unavailable card.
New sends and selection require both participants' current permissions. Retries compare
sender, message type and exact reference; a matching persisted retry remains idempotent
if permissions later change. Response hydration always uses the requesting viewer's
current permissions, and unavailable cards omit target IDs, URLs, names and images.

Planet: active, live owner, canViewProfile (private permits either-direction follow;
blocks always win). Galaxy: existing authenticated directory metadata, no member content;
APPROVAL join policy does not make metadata private. Event: existing detail semantics:
live/unblocked proposer and admin/operator, proposer, or current member plus
APPROVED/PASSED/CANCELLED. No online URL, attendee list or administrative data in cards.

Cards grant no contact, follow, membership or attendance. Destinations recheck access.
Use current custom planet configuration and current galaxy slug. Inbox summaries and
notifications are generic/localized, without target presentation. Export adds scalar
references only. Existing self-deletion tombstones identity and retains counterpart conversation history;
new sends to deleted participants are denied. Deleting a target planet/account makes its
reference unavailable. No retention policy is introduced.

Loaded older cards need explicit batch revalidation as the normal message poll reads only
the latest 40 rows. Hydrate under current viewer access, replace stale snapshots and fail
closed for share presentation on request failure. This is periodic synchronization, not
instant push revocation; already delivered information cannot be retrospectively erased.

## Migration and validation

Add two nullable TEXT columns and a share-reference shape CHECK, compatible with existing
rows whose references are null. No backfill, target FKs, new resource model or destructive
SQL. Generate/validate locally; run real migrations only on isolated test storage. Production
requires reviewed migrate-deploy before application release; application rollback retains
columns (old clients show empty share text). No production migration is authorized here.

Cover both-party access, private/follow/block/delete changes, event membership/status/admin/
proposer/operator rules, stable IDs after slug change, real DIY avatar hydration, unavailable
response minimization, retries/cross-kind conflicts, unread/notices/export, and all locales.
Separate browser fixture checks from deployed real-account and physical-device acceptance.

No new founder decision blocks this authorized reference-card stage. Private attachments,
rich captions, moderation and legal/retention choices remain outside this change.
