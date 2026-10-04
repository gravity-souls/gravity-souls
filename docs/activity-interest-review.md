# Activities and private interest collection

Date: 2026-10-04. Stage 4, steps 1–2 of `social-flow-development.md`.

## Behavior and boundaries

- `/activities` is the canonical activity hub: upcoming, interested, attending,
  organized, pending attendance requests, and personal history. Desktop main navigation,
  mobile expanded navigation and My Planet use this route. Five mobile bottom tabs remain.
  `/galaxies/events` redirects and preserves query parameters.
- Discovery lists approved upcoming activities in joined or owned galaxies. It does not
  publish member-only activities to outsiders. Join/discover handoff links to Galaxies.
- Interest belongs only to its authenticated owner. Saving is idempotent and independent
  of RSVP, approval, capacity, rewards and notifications. Cards and details synchronize
  through a shared change event. Failures retain the previous saved state.
- New saves require a visible, approved future event; parent galaxy then event are locked
  using the existing membership/event workflow convention. Bidirectional blocks and deleted
  proposers are excluded. Private avatar configuration is withheld by shared visibility rules.
- Saved activities remain after expiry/cancellation while still visible. Pending or rejected
  revisions are hidden until approved again. Leaving a galaxy or losing visibility hides
  its saves, without destroying them. Removal remains idempotent and owner-only after access
  loss; no resource existence is disclosed. Physical event/user deletion cascades.
- Personal history includes ended/cancelled activities organized or attended by the viewer.
  Saving alone does not count as participation. Meetings' online URLs are withheld from
  non-attendees except organizers/managers on the authorized detail path.
- Filters are bounded and validated, results have deterministic date/id pagination, and
  personalized responses use `Cache-Control: private, no-store`.

## Migration plan

New additive migration: `20261004220000_add_event_interest`. It creates only
`event_interest`, with a unique `(userId,eventId)` key, owner/date and event indexes,
foreign keys to existing users/events and cascading deletion. No existing rows,
columns, enum values or rewards are rewritten. No backfill is necessary.

Validation target: isolated embedded PostgreSQL-compatible PGlite with the real Prisma
adapter and all checked-in migration SQL, including legacy records before the prior
workflow migration. No production or shared database migration, seeding or writes ran.

Deploy the reviewed migration through the existing `build:deploy`/`prisma migrate deploy`
pipeline before exposing the updated app. Old application code can run with the additive
new table; rollback the application while retaining the table and saves. Do not reset the
schema or delete saves as an application rollback. A future table removal requires its
own reviewed migration and retention decision.

## Verification and remaining acceptance

24 baseline tests and 65 database/locale tests pass. New route checks cover authentication,
outsiders, unique/idempotent saving, owner removal, no RSVP/XP/notification side effects,
blocks, deleted proposers, pending/rejected revisions, expiry/cancellation, membership loss,
cascades, private avatar/meeting data, malformed filters and gap-free pagination. UI render
checks cover saved/unsaved/closed behavior and mobile navigation in English, Chinese and
French. Prisma validate/generate, TypeScript and production webpack build pass.

Browser specifications cover failure retention, interested-list refresh, no RSVP mutation
and legacy redirects on desktop/mobile/WebKit projects. Browser execution remains pending:
this environment has no installed browser engine. Embedded tests serialize connections;
real concurrent requests, multi-account staging acceptance and physical iPhone gestures
remain deployment checks.

Next slice: optional global Post associations to Community/Event, consistent write/read
permissions and contextual related cards. Post remains distinct from CommunityPost under
ADR 0001; these associations are not implemented in this slice.
