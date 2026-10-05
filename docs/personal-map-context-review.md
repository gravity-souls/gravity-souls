# Personal star map: galaxies and activities

The personal map now has three explicit layers rather than mixing planets, real
Community galaxies and Event activities into one count. Each layer supports the
existing map/list, search, bounded pages, selection and per-tab camera state.
The top-level global galaxies view retains its existing behavior.

## What each node means

| Layer/group | Inclusion rule |
| --- | --- |
| Planets | Existing saved/outgoing-follow/mutual collections, unchanged |
| Galaxies: created | Viewer is current creator, with or without a membership row |
| Galaxies: joined | Viewer has a real membership and is not creator; unowned galaxies are allowed |
| Activities: attendance approved | Future approved event with viewer APPROVED RSVP |
| Activities: attendance pending | Future approved event with viewer PENDING RSVP |
| Activities: interested | Future approved event with viewer interest and no pending, approved or cancelled RSVP |
| Activities: history | Accessible ended/cancelled event, or viewer withdrew (CANCELLED RSVP) |

Activity inclusion starts with a real viewer interest or RSVP in
PENDING/APPROVED/CANCELLED state. A rejected RSVP alone does not include an activity;
if interest remains, it appears as interested with the rejected request explicitly
labelled. History takes precedence, then approval, then pending, then interest.
A record appears once even if both interest and RSVP exist. Interest is also shown
independently on its detail card. Pending galaxy applications are not memberships.
Merely browsing, chatting or receiving a beam does not add galaxy/activity nodes.

The node count is galaxies or activities, never participant planets. Galaxy cards
show separate membership counts for non-deleted users. Particles are decorative;
selectable square nodes represent galaxies, diamond nodes activities, and circular
nodes retain their planet role. No particle-to-member edges are invented.

## Authorization and lifecycle

`/api/star-map?mode=personal&layer=galaxies|activities` requires a live authenticated
viewer and returns private/no-store. Unknown query fields, inappropriate collection
or group/layer combinations and oversized strings are rejected. Caller cannot
choose another owner. Existing planet behavior remains the default.

Galaxy reads use real creator/membership relations and central bidirectional block
IDs; blocked/deleted creators are excluded, null creators remain eligible via
membership. Activity reads reuse `eventProposerWhere` and current galaxy
membership/ownership, exposing only approved/ended/cancelled events. No organizer
profile, avatar, roster, private meeting URL or pending counts are serialized.

Leaving the galaxy removes related activities from the map even when an interest
record remains. Blocks, organizer deletion and later permission loss hide activity
names, counts and links. Rejoining restores only records currently accessible.
Cancellation and elapsed dates move nodes to history without a GET mutation.

Queries filter/count in SQL rather than loading whole user collections. Context
pages contain at most 24 nodes plus one lookahead, ordered by stable ID. Cursor
anchors must satisfy the current permitted query; a removed/inaccessible anchor
returns 400. The client clears stale results and restarts at the first batch.
Focus/foreground refresh and existing abort fencing update statuses and remove
failed/expired content. Existing context APIs validate access again at destination.

## Navigation and layout

`from` accepts four new fixed origins (galaxies/activities, map/list) in the existing
return helper. Galaxy pages and activity dialogs return to the correct personal
layer and view; per-layer session storage preserves search, page, selection and
camera. Origin query parameters are now inserted before `#events`, which preserves
activity deep linking. No arbitrary redirect or permission is encoded in an origin.

The scene reuses the existing single 2D canvas and list alternative. No new renderer,
WebGL resources, pause/refresh buttons or production notification/mutation path.
DPR remains capped at 1 mobile/1.5 desktop; reduced motion remains static;
hidden/offscreen animation and listeners clean up via existing lifecycle.
Physical touch, safe-area and device visual acceptance remain unverified.

## Validation and release

- 134 database/component/navigation/locale checks plus 24 baseline tests pass (158).
- Real SQL cases cover membership vs application, unowned galaxies, deleted-member
  counts, activity deduplication/states, real interest deletion/attendance approval,
  both block directions, organizer deletion, leave/rejoin, live auth, bounded pages
  and inaccessible/deleted cursors. Only authentication is a fixture in this harness.
- TypeScript, changed-file ESLint with zero errors/warnings, locale-key parity and
  final production webpack build pass.
- Three browser scenarios (en/fr/zh), nine project cases across desktop/mobile/WebKit,
  cover both return paths, permission expiry, read retry, list/map switching and
  reduced-motion rendering. An actual desktop run stops before scenario execution:
  Chromium headless shell 1228 is absent. All nine browser project cases remain
  unverified; engine launch failure is not counted as a passing scenario.
- Existing embedded PostgreSQL serializes connections; production multi-account,
  real multi-connection races, physical devices and remote CI are not claimed passed.

This slice follows still-open MR41 (which follows MR40). Review against MR41's
branch so only this slice appears. Merge dependencies first, then retarget/rebase
onto main. No schema migration, new storage/configuration, production writes or
deployment; rollback is a code revert. Chat follow-up stays deferred until configuration.

Future work: actual self-planet centering, mixed membership/activity overlays with
clear independent units, and temporary activity constellations with explicit lifetime
and permissions. These are distinct from the implemented layer switch.
