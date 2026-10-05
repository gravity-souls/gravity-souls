# Activity star groups

The personal star map adds a fourth `constellations` layer using the existing
star-map canvas, particle rotation, projected camera, zoom, focus and list view.
The owner's planet remains a separate center. This is a personal grouping of real
related activities, not an additional Community, participant roster or bulk RSVP.

## Inclusion and lifecycle

- Reuse the personal activity visibility query: current galaxy creator/membership,
  visible organizer, approved/ended/cancelled event and the viewer's real interest
  or pending/approved/cancelled attendance. No relation means no activity node.
- Group by the real galaxy ID, never galaxy name or keyword similarity. Upcoming
  and historical activities have separate groups, including for the same galaxy.
- Interest, requested attendance and approved attendance remain independent node
  labels/lines. Registration and review take place in the existing event detail.
  A pending attendance overview link is available from this layer.
- Withdrawal, cancellation, passed status or elapsed event date move the node to
  history. As in the existing activity layer, elapsed date is the lifecycle cutoff;
  there is no new duration or scheduled cleanup write. An active group disappears
  when it has no eligible upcoming nodes in the current batch.
- Removing interest removes a node with no qualifying RSVP. A withdrawn RSVP is
  still history. Leaving the galaxy, blocking or organizer deletion hides its data;
  rejoining restores only currently accessible records.
- History connections stay historical even when a previous RSVP was approved.
  Creating groups never creates attendance, membership, reminders or notifications.
  Existing attendance request/approval notifications remain handled by their routes;
  new start-time reminders and chat/push configuration remain separate work.

## Counts, pagination and navigation

Each read loads at most 24 activities plus a lookahead. Groups are derived only
from this batch, and their labels explicitly say activities in the loaded batch.
The total remains all eligible personal activities matching the search, not the
number of groups, participants or relationships. Galaxy names and lifecycle phases
name groups; multiple relationships never duplicate a node.

Focus accepts only `active:<galaxyId>` or `history:<galaxyId>` with a bounded strict
selector. It adds a filter to the same authorized query and never grants access.
Cursor anchors must match current visibility, galaxy, phase and search. Deleted,
inaccessible or phase-changed anchors return 400; existing client recovery restarts
the batch. Foreground refresh, abort fencing and failure clearing are retained.

New fixed `personal-star-map-constellations[-list]` origins preserve detail return
to this layer and map/list view, with the event query before its fragment. Per-layer
tab storage retains camera, search, batch and selection; it stores no roster.
All existing layers and discovery retain their prior semantics.

## Validation and release

- 156 galaxy database/component/relationship checks plus 24 baseline checks pass
  (180 total). New real SQL checks cover interest removal, actual RSVP request,
  organizer approval and withdrawal, expiry/cancellation, block/deletion/leave,
  separate galaxy IDs, 24+4 pagination, invalid selectors and invalid cursors.
- TypeScript, changed-file ESLint with zero warnings/errors, en/fr/zh parity of
  1,752 keys and production webpack build pass.
- The existing context browser scenarios now also cover star-group list/map,
  event detail return, history labels and loss of visibility in en/fr/zh across
  desktop, mobile and iPhone WebKit (9 discovered cases). An actual English desktop
  run stops at launch because Chromium headless shell 1228 is absent. No scenario
  execution, new visual/touch acceptance or physical-device results are claimed.
- Embedded PostgreSQL serializes connections; production multi-account races and
  full deployed acceptance remain pending.

Based on main after MR44's merge (`4994c7dd95d1ebbd64805c10e550f23c41ca05c4`).
No migrations, new services, configuration or production writes. Submit one PR
directly to main; maintainer controls merge/deployment. Rollback is a code revert.
Chat work remains deferred until its configuration is complete.
