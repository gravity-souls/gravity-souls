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
- Community post and discussion authors are displayed using the current `User.name`
  public pseudonym, not `Planet.name`. Historical discussion replies without a
  surviving author retain their stored author name. Planet links/appearance use
  `canViewProfile`; authenticated listings and reply totals exclude blocked
  authors through `lib/visibility.ts`. Public community text remains public;
  private planet details are not included in public responses.
- Community publishing uses strict, bounded JSON validation (posts/opening messages:
  2–1,000 characters; replies: 2–600; discussion titles: 2–160).
  Posts/discussions share the existing `POST_CREATE` limit of 30/hour; replies use
  `MESSAGE_SEND` at 60/hour. Community post creation, XP and localized notices are
  one transaction, so a notification failure cannot leave a failed-looking
  publication persisted. Reply creation and its returned count are transactional
  and lock the community before checking membership.
- The galaxy page retains drafts on failed or malformed acknowledgements, locks
  pending controls, and shows localized confirmation/error feedback. Successful
  posts/replies/deletions update the current list/thread without a catalogue reload.
  Discussion creation refreshes only discussions; stale reads cannot overwrite
  confirmed mutations. Reply drafts survive closing/reopening their discussion.
  Partial community reply previews have an explicit load-all/retry action.
- Authors can delete their own replies through the existing author-only APIs.
  Deletion requires confirmation and keeps content visible until acknowledged;
  moderators' post/discussion deletion rights are unchanged.
- Both community post replies and discussion replies have real like/unlike edges.
  `POST /api/communities/[id]/posts/[postId]/replies/[replyId]/like` and
  `POST /api/communities/[id]/discussions/[discussionId]/replies/[replyId]/like`
  accept only `{ "liked": true | false }` within the existing 64 KiB JSON bound,
  and return `{ "liked": boolean, "likes": number }`. Setting an existing state
  does not add/remove extra edges; retrying unlike is safe. Authentication and
  membership are required (no owner/operator bypass), with validated scoped IDs
  and `canViewProfile` for both parent and reply authors. Blocks/private-profile
  denials return the same not-found response; historical authorless discussion
  replies remain supported. Own replies can be liked, as with stream comments.
  Both kinds share `MESSAGE_REACTION` (120/hour per actor); no XP/notices are added.
  User-before-community locks fence account deletion; community locks serialize
  like sets with membership changes and parent/reply deletes.
- Every reply preview, full post-reply read, reply creation and discussion-opening
  reply includes live `likes` and viewer `likedByMe` (false for public reads),
  without exposing liker identities. Counts derive from edges, not counters.
  The en/fr/zh heart controls include count, `aria-pressed`, pending locks and
  explicit retryable errors; malformed/failed acknowledgements never change state.
  Reply drafts remain editable while liking, and confirmed state updates both the
  open discussion and its list. Self-export includes only own reply IDs/timestamps.
  Tombstone account deletion removes own edges; reply/parent/user FK cascades
  remove orphaned edges without altering the existing content-retention policy.
- Community post/discussion/reply editing is **not implemented**: these models'
  routes currently provide no PATCH handler or editor. Global stream `Post`
  editing is a different feature and is not reused as a substitute.
- Existing ownerless galaxies are never assigned to the first person who joins. A configured platform operator can claim them, then transfer to a member. An ownerless galaxy without administrators refuses proposals/moderated join requests with an explicit explanation rather than silently creating an unreviewable queue.

## Deployment

The reply-like increment adds only two tables in
`prisma/migrations/20261006210000_add_community_reply_likes/migration.sql`, each
with unique `(replyId,userId)`, a `(userId,createdAt)` index, and cascading reply/user
foreign keys. SQL has been inspected; no applied migration was edited. No backfill
is needed: existing replies start with zero likes. The migration target remains
**unselected and unapplied to persistent databases**; only disposable PGlite
tests apply it. Founder-approved deployment must apply this artifact before
the new routes are served. Application rollback can leave the additive tables
intact; dropping them would discard likes and needs separate approval.

Vercel runs `npm run build:deploy`: apply reviewed migrations, generate Prisma Client, then build Next.js. Migration failure prevents the replacement deployment; the currently deployed application remains available. Non-Vercel deployments must run `npm run db:deploy` before serving this version. The migration adds tables/columns and preserves existing confirmed attendance; it does not remove application data.

Platform operators are identified by the existing comma-separated `OPERATOR_EMAILS` allow-list. This change does not add or guess real operator identities. To assign owners to existing unowned galaxies, a configured operator signs in, opens that galaxy’s management page, claims responsibility and optionally transfers it to a member.

## Verification

`npm run test:galaxy` applies every real migration to an isolated PostgreSQL-in-WASM database and executes real Prisma-backed route handlers. Only authentication is replaced with fixture identities; no production database URL is used. It covers permission boundaries, ownership, join approval, notifications/locales, event review/edit/cancel, attendance capacity/idempotence, privacy, discussions/moderation and account deletion. Community content checks also cover distinct pseudonym/planet names, strict validation, exact rate limits, atomic publication rollback, blocked contact, private planet links and author-only reply deletion. The embedded engine serializes connections, so it does not replace multi-connection concurrency testing on production-like PostgreSQL.

Reply-like route checks cover both kinds: anonymous/nonmember access, parent/reply
blocks in both directions, inaccessible profiles/follow permission, scoped IDs,
bounded strict bodies, repeated and parallel same-state sets, repeated unlike,
own likes, exact counts on public/viewer/create/refresh serializers, atomic failed
writes, rate-limit threshold, minimal self-export, tombstone cleanup, and hard
user/reply/parent cascades. Browser checks in the same no-DB content spec cover
both kinds in en/fr/zh on desktop/mobile: HTTP/network/malformed failures,
pending/duplicate controls, preserved editable drafts, pressed state/count,
unlike failure/success, discussion reopen, and full reload count refresh.

Locale rendering tests use the real en/zh/fr NextIntl provider. The no-database
`e2e/demo/galaxy-content.spec.ts` browser checks exercise both sections on desktop
and mobile in all three locales with intercepted HTTP responses: loaders,
pseudonyms, wrapping, draft retention, pending controls, confirmed mutations,
delete confirmation, reply retries and stale-read reconciliation. Run it with
`npm run test:e2e -- galaxy-content.spec.ts --project=desktop --project=mobile`
after building. The existing baseline suite runs with `npm test`. Live browser
acceptance still requires deploying the new version and testing real
owner/member/organizer accounts. Reply-like set requests are server-idempotent
after lost acknowledgements; publishing and existing top-level post toggle likes
are not. Multi-connection concurrency still requires separate production-like
PostgreSQL verification.
