# Personal map: genuine relationship connections

The personal overview now renders the bounded batch of real nodes around the
owner's separate planet and connects only those nodes with current relationship
evidence. Particles remain decorative; they and climate/status group centers have
no personal relationship edges. Global discovery and global galaxy drawing remain
unchanged. Focusing a group hides the owner, so it has no owner relationship lines;
the list and detail card retain readable relation labels.

| Relation | Evidence and rendering |
| --- | --- |
| Saved | Current viewer's savedPlanet; gold dotted line |
| Outgoing follow | Current viewer follows target; blue arrow toward target |
| Mutual follow | Both directions exist; green double arrow, replacing outgoing line |
| Created galaxy | Current creatorId equals viewer; violet solid line |
| Joined galaxy | Actual viewer membership row; green dashed line |
| Interested activity | Actual current viewer interest; gold dotted line |
| Attendance requested | PENDING RSVP; blue dashed line |
| Attendance approved | APPROVED RSVP; green solid line |
| Historical activity | Existing past/ended/cancelled/withdrawn group; grey spaced dots |

One node can have saved + follow, created + joined, or interest + attendance lines.
Parallel lines and visible textual labels preserve their independent meanings.
Incoming-only follows, conversations, received beams, decorative groups and scores
create no edges. Rejected attendance never implies approval. Historical nodes show
only a history edge; interest/attendance details remain visible separately.

## Data and lifecycle

The existing permission-filtered galaxy batch additionally selects only the current
viewer's membership ID and returns independent created/joined booleans. It never
returns membership IDs or a roster. Creator-only galaxies do not fabricate membership.
No new endpoint, schema, mutation, storage, external service or configuration.

Planet and event reads reuse existing relationship evidence and visibility rules.
Counts still represent objects in their own layer, not edges; multiple relations do
not duplicate a node or inflate counts. Search, pages, owner return origins, foreground
refresh, action refresh and abort fencing are retained. Lines are omitted while
loading, after read failure or when there is no active owner planet.

The current canvas is reused with existing DPR, reduced-motion, visibility and
cleanup behavior. Actual overview nodes are selectable; list alternatives and a
three-language legend describe the same relations using text as well as color and
line pattern. Small projected distances are moved clear of the owner anchor. This
is not a guarantee of collision-free target positions at every camera angle or zoom.

## Validation

- 144 database/component/navigation checks, 24 baseline checks and 7 new relation
  mapping/layout/translated-component checks pass (175 total). Real SQL additionally
  verifies creator-only, member-only, unowned joined and creator+member cases,
  independent membership deletion, deduplication and no roster serialization.
- TypeScript, changed-file ESLint with zero warnings/errors, 1,742 locale-key parity
  and production webpack build pass.
- New browser specifications cover independent save removal, creator/member
  removal, pending-to-approved attendance, retained interest and list/map switching
  in en/fr/zh across desktop, mobile and iPhone WebKit (9 discovered cases).
  Actual English desktop execution stops before the scenario because Chromium
  headless shell 1228 is missing. Installation returned empty/corrupt ZIP downloads.
  These scenarios and new canvas visual/touch acceptance are not claimed passed.

## MR43 production smoke acceptance

MR43 was merged into main at 2026-10-05 16:58:34 UTC, commit
`0f949642630ee42ad7ca7ffa3d046992eca07911`. GitHub's Vercel commit status is success.
The consolidated merge includes MR40–43; no separate earlier merge is required.

Read-only checks in the existing Oren Brooks session at www.gravitysouls.com,
French desktop, observed the current owner Soft Singularity, its details and
return to the personal collection, three personal layers, map/list switching,
one real galaxy with a separate two-member count, and the ended/withdrawn activity
with retained interest. Activity details expose the correct personal activity-list
return origin. The activity-linked post exposes and uses a return URL for that
exact activity. No approval, attendance, save, follow, avatar or production data
was changed during this smoke check.

This is partial acceptance, not complete deployment validation: role-specific
approval actions, cross-account permission changes, edited-avatar synchronization,
physical mobile interactions and production races remain unverified. Embedded
PostgreSQL serializes connections. New relationship drawing is a subsequent code
change and is not covered by MR43's observed production pages.

## Release

Based directly on merged main, independent of the earlier stacked PRs. Submit this
single relation change for review; maintenance approval and production deployment
remain with the maintainer. Rollback is a code revert. Temporary activity star
groups are a separate future slice. Chat work remains deferred until configuration.
