# Galaxy workflows

Galaxies use the existing Community table; there is no separate Galaxy entity.

## User paths

- `/galaxies`: discover, filter joined/managed galaxies, or create a galaxy.
- `/galaxies/create`: an authenticated user with an active planet creates a galaxy and becomes its owner and first ADMIN.
- `/galaxy/[slug]`: join or request membership, withdraw a request, leave, see visible member planets, create posts/discussions and reply, and submit/view events.
- `/galaxy/[slug]/manage`: administrators edit identity and membership policy, review join requests and remove members. Only owners/platform operators appoint administrators or transfer ownership.
- Galaxy Events: upcoming, past, My proposals and administrator review tabs. Event notifications deep-link into the correct tab or detail.
- `/galaxies/events`: joined-galaxy events, confirmed participation, attendance awaiting approval, own proposals and history.
- Event details: RSVP/request attendance, withdraw/cancel attendance; organizers and galaxy administrators edit/resubmit, cancel and review/remove participants.

## Rules

- Galaxy joining defaults to OPEN; APPROVAL keeps applicants outside membership until accepted. Withdrawn/declined requests can be resubmitted. Switching to OPEN accepts pending requests and awards first-join XP once.
- Every event proposal starts PENDING, including administrator proposals. An ADMIN/owner approves or rejects it. Changes resubmit the event; existing registrations remain and receive notifications. Repeated approvals do not repeat approval XP.
- Attendance defaults to direct confirmation. Organizers can require approval. Only approved attendance occupies capacity or appears in attendee counts; requests remain separate. PostgreSQL parent/child locks serialize membership and event mutations and capacity checks.
- Past, cancelled and unapproved events cannot accept new attendance. A confirmed attendee can repeat RSVP safely even at full capacity. Cancel/reapply does not repeat attendance XP.
- Owners must transfer before leaving. Admins cannot remove the owner or another admin. Leaving/removal cancels future attendance. Account deletion transfers ownership to a living administrator/member when available; otherwise the galaxy becomes unowned. Future events organized by a deleted account are cancelled.
- Members see real planet appearance, subject to private-profile and block protections. Public/nonmember visitors do not receive the full roster.
- Authors and galaxy admins can delete posts/discussions; deletion cascades to replies. Membership still gates writing/replying.
- Existing ownerless galaxies are never assigned to the first person who joins. A configured platform operator can claim them, then transfer to a member. An ownerless galaxy without administrators refuses proposals/moderated join requests with an explicit explanation rather than silently creating an unreviewable queue.

## Deployment

Vercel runs `npm run build:deploy`: apply reviewed migrations, generate Prisma Client, then build Next.js. Migration failure prevents the replacement deployment; the currently deployed application remains available. Non-Vercel deployments must run `npm run db:deploy` before serving this version. The migration adds tables/columns and preserves existing confirmed attendance; it does not remove application data.

Platform operators are identified by the existing comma-separated `OPERATOR_EMAILS` allow-list. This change does not add or guess real operator identities. To assign owners to existing unowned galaxies, a configured operator signs in, opens that galaxy’s management page, claims responsibility and optionally transfers it to a member.

## Verification

`npm run test:galaxy` applies every real migration to an isolated PostgreSQL-in-WASM database and executes real Prisma-backed route handlers. Only authentication is replaced with fixture identities; no production database URL is used. It covers permission boundaries, ownership, join approval, notifications/locales, event review/edit/cancel, attendance capacity/idempotence, privacy, discussions/moderation and account deletion. The embedded engine serializes connections, so it does not replace multi-connection concurrency testing on production-like PostgreSQL.

Locale rendering tests use the real en/zh/fr NextIntl provider. The existing baseline suite runs with `npm test`. Live browser acceptance still requires deploying the new version and testing real owner/member/organizer accounts.
