# Activity review hub and exploration semantics

2026-10-05 (Europe/Paris), based on merged MR39. Chat follow-up remains deferred until
configuration. No new schema, service, secret or deployment is required by this slice.

## Activities

The canonical Activities page gains To review, distinct from the viewer's own awaiting
attendance applications. It lists future PENDING event proposals in galaxies managed by
the viewer (owner/admin/configured operator), plus APPROVED events with permitted pending
attendance that the viewer organizes or administers. Ordinary organizers can review
attendance but cannot approve their own event proposal. Search/category and bounded
20-row deterministic paging still apply. Empty queues never substitute invented activities.

Cards identify pending proposals and manager-only pending-attendance counts. Counts use
one bounded aggregate query and exclude blocked/deleted attendees; ordinary readers do not
receive them. Detail opens the existing real event/attendance approval, rejection, edit,
resubmit and cancel workflows. Successful RSVP/removal refreshes tab membership and totals;
attendance review refreshes manager rows, the detail count and the queue. Failed review
retains the prior status. Focus/foreground reloads the list and selected detail. Failed
reads clear stale detail/list metadata; latest-request IDs fence delayed responses after
selection/closure. A fresh detail mount clears prior rejection controls on another event.

Permission enforcement remains in server helpers: no role is inferred client-side.
Shared locked-event mutations now reject deleted viewers and unavailable proposers;
attendance management reads and reviews enforce both-direction blocks/deletion and use
private/no-store responses. An invisible applicant cannot be approved by a direct ID call.
Existing capacity locks and one-time attendance/approval rewards remain. Approval consumes
capacity; rejection does not. Event cancellation preserves an existing CANCELLED attendance
row for the permitted personal-history path; no new retention policy is introduced.

## Resonance motion

Previously only the ambient particles rotated. The actual recommended buttons had fixed
positions and disabled texture rotation. The existing shared motion clock now moves those
planet buttons and their guide lines around the source, together with the field. Built-in
surfaces self-rotate; uploaded custom portraits retain their original image while the
planet node moves. Scores, ordering and target IDs remain canonical and unchanged.

Hover/focus pauses movement so a click or keyboard target stays in place. There is no new
pause/refresh control. Reduced-motion starts static; hidden/offscreen scenes stop. One
existing 2D canvas/clock serves the at-most-five recommendations; no additional WebGL
contexts or React updates per frame. DPR stays capped at 1 mobile/1.5 desktop and teardown
cleans up observers/animation callbacks. Missing canvas keeps the DOM buttons/list usable.

## What the star map represents

| View | Real selectable object | Meaning of count |
| --- | --- | --- |
| Discovery | Permitted planet | Permitted planets grouped by self-described climate |
| My star map | Permitted saved/followed planet | The current viewer's private collection |
| Galaxies | Real Community | Living members with a membership row; pending requests are separate |

A galaxy's particle cloud is illustrative, not its roster or one dot per member. One
selectable node enters that galaxy. Galaxy-specific object labels and notes no longer
call it a planet or repeat unrelated resonance-score advice. Galaxy counts exclude deleted
accounts. No member identity or profile is exposed by the map. Member planets are shown
on the galaxy page only under its membership/profile/block permissions.

## Verification boundaries

Real migration/Prisma/PostgreSQL fixture checks cover review roles, own requests, pending
proposal rejection/resubmission/approval, attendance approvals/full capacity/rejection,
cancellation/history, admin demotion, both-direction blocks, deleted actor/applicant,
galaxy aggregate semantics and pending-membership exclusion. UI checks cover all three
locales and deterministic motion geometry. 118 database/component/locale checks plus 24 baseline tests pass (142 total). TypeScript,
changed-file lint (zero errors/warnings), en/fr/zh key parity and production webpack build pass.

Browser specifications cover manager failure/retry/count/queue refresh and permission
revocation in three locales, plus actual node movement, keyboard pause and reduced motion.
21 browser project scenarios across the review and resonance specs are discovered.
Browser engines are absent: these specifications are not claimed executed.
Physical iPhone/desktop visual quality, real multi-account flows, true concurrent PostgreSQL
capacity races, and production acceptance remain separate. Embedded SQL serializes sessions.
No production writes, approval actions, messages, migration or deployment are performed.
Rollback is a code revert; no application records are removed.
