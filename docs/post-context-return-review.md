# Dynamic signal context return (2026-10-05)

Signals are real `Post` records, distinct from galaxy `CommunityPost` discussions.
This slice closes the contextual navigation loop without merging those models.

## Navigation

| Starting point | Destination | Return |
| --- | --- | --- |
| Signal galaxy card | Galaxy | Original signal |
| Signal activity card | Same galaxy, selected activity modal | Original signal |
| Galaxy related signals | Signal detail | Originating galaxy |
| Activity related signals | Signal detail | Originating activity |
| Signal becomes unavailable or is deleted | Unavailable state or close | Validated origin, otherwise stream |

`returnPost` is a bounded ID; `fromContext` allows only a single internal galaxy
path, optionally a bounded activity ID and `#events`. External origins, path
traversal, malformed escapes, duplicate event parameters, arbitrary query fields
and oversized identifiers fail closed. Unicode slugs are encoded canonically.
Navigation hints contain no names/avatar snapshots and confer no authorization.
Destination APIs retain current membership, event visibility, blocks and deletion
checks. A database assertion checks that forged hints do not unlock a signal.

Galaxy and activity views provide a return link; the activity modal includes its
actual selected activity in that link. Same-galaxy query changes now update the
selected activity using Next search parameters behind a Suspense boundary.

## Refresh and failures

Signal details recheck their own API on focus/foreground. Detail and related
signal failures remove previously displayed content, author/media/context metadata
and comment cursors; loading, unavailable and transient error states have retry
and close controls. Draft comments survive a failed read of the same signal,
but clear when signal/viewer identity changes. Confirmed refreshes update parent
cards; editing triggers a fresh authorized read.

Read generations and cancellation prevent old detail, related pagination and
interaction completions from restoring a closed, changed or invalidated view.
Pagination deduplicates IDs. Mutation access denials remove detail immediately.
Galaxy activity URL selection, manual selection, closing and foreground reads
also fence late selections. List failures clear old event rows; detail errors
remain separate from list errors so a successful list cannot erase an unavailable
detail warning. Retry targets the failed activity as well as the list.

## Verification and limits

- 122 database/component/navigation/locale checks plus 24 baseline tests pass.
- TypeScript and changed-file ESLint pass with zero errors/warnings.
- Full en/fr/zh key parity and production webpack build pass.
- 11 browser scenarios across desktop, Android viewport and iPhone WebKit
  produce 33 discovered project cases. Coverage includes round trips, foreground
  expiry/retry, unsafe origins, same-galaxy activity changes and late pagination.
- Actual browser execution is blocked at launch: Chromium headless shell 1228
  is absent. The attempted desktop run stops before any scenario executes;
  remaining browser cases and physical-device acceptance are unverified.
- The existing embedded PostgreSQL harness uses real migrations/Prisma/server
  permission logic but serializes connections. Production multi-account and real
  multi-connection race acceptance are not claimed. Remote CI is not claimed passed.
- Existing stream media remains shareable public file links; clearing UI metadata
  cannot revoke already copied URLs. Private chat storage is a separate feature.

## Release and next work

No schema migration, new secret/service, deployment or production writes.
This branch follows MR40, which was still open during development; review only
this slice against that branch. Merge MR40 first and retarget/rebase this MR onto
main, without dropping the activity review/motion changes. Rollback is a code revert.

Chat follow-up remains deferred until configuration. The next non-chat slice is
personal star map overlays using actual galaxy memberships and activity interests
or attendance, with clear distinction from decorative constellations and fresh
visibility checks.
