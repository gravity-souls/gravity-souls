# Social flow development plan and stage-one implementation

Updated: 2026-10-04 (Europe/Paris). Canonical backlog:
`product-flow-verification-backlog.md`. Star-map implementation: MR #23 merged,
`star-map-production.md`; deployment and browser/device acceptance unconfirmed.

## Staged work

| Stage | Scope | Implementation status | Acceptance status |
| --- | --- | --- | --- |
| 1 | Conversations, notifications and unread synchronization | Implemented in this change | Real Prisma/PostgreSQL fixture workflow checks; browser/multi-account checks pending |
| 2 | Discovery → planet → message/beam, orbit save, follow | Contact, follow and save server boundaries improved; current beam meaning clarified | Route lifecycle exercised; discovery UI/real multi-account/device acceptance pending |
| 3 | Star-map exploration and return navigation | First real-data version merged in MR #23 | Browser gestures, visual clarity and physical iPhone performance pending |
| 4 | Activity entry, interested collection and feed associations | Entry and private interests implemented; feed associations next | 65 database/locale tests; migration deployment and browser/multi-account acceptance pending |

### Stage 1: concrete behavior

- Conversation list: bounded pages (30 default, limit ≤50), last-message preview, one
  filtered unread count per thread in the query, cursor header for existing array clients.
- Message history: latest 40, earlier-history pagination with no omitted lookahead row.
  GET has no read side effects. PATCH acknowledges ≤50 displayed IDs for that recipient
  and conversation; a concurrent new arrival remains unread. Sends and read confirmations
  lock the same parent thread row to prevent a new notice being swept into a completed read. Message notifications become
  read only after the thread has no unread received messages.
- Message sends retain clientMessageId deduplication and rate limits. Opening a thread
  never sends. A new thread requires mutual follows; an established thread can continue
  after a follow lapses, unless blocked or the recipient is deleted.
- Inbox and conversation reads obey bidirectional blocks. Private planet images are
  withheld when profile visibility no longer permits them. Deleted users' historic text
  remains readable; their accounts cannot receive new contact.
- Visible conversations poll for new messages/read receipts; pending drafts persist on
  send failure. Own/received message identity comes from viewerId rather than a second me
  fetch. Earlier history uses an explicit load action.
- Notifications have owner-bound pagination and strict read-body validation. Relative
  times and controls are localized; mutation failures retain old state. Stored targets
  are sanitized to internal application paths. Opening a notice does not authorize its
  target: the destination still checks permissions.
- Bell/space/list refresh after local read/send actions and window focus. Notifications
  and direct-message unread counts remain separate. Marking all notifications read does
  not mark conversation messages read.
- Future notification templates resolve recipient language (en/zh/fr), including follow,
  comments/replies, galaxy posts and level progression. Existing stored English notices
  keep their original text; no speculative rewriting of old data.

### Stage 2: current server-path verification

Following creates the relation and recipient-localized notice atomically, with duplicate
requests creating neither duplicate edge nor notice. Blocks win in status/list queries.
Orbit saving validates JSON/fields, is idempotent, rejects own/inactive/unavailable planets,
and never lets another user delete the owner's save. Hidden/inactive planets disappear
from orbit responses. Detail/list avatar configuration uses the existing shared resolver.

A "beam" currently opens the existing text-message workflow. UI copy clarifies that opening
is not delivery and mutual following is required to start. A separate unsolicited beam
invitation and accept/reject flow would require an explicit product/model decision; it is
not silently invented here. Existing independent routes for discovery, orbit and follows
still need desktop/mobile end-to-end acceptance.

### Next priority: star-map planet actions (recorded 2026-10-04)

Scheduled before Post→Community/Event associations. Shared save/follow/beam controls,
My Planet and mobile relationship entries, failure handling and focus/action refresh are
implemented in the current slice; see `planet-action-flow-review.md`. Server/locale/transport
checks are separate from pending deployed browser acceptance. Independent invitations and
social relationship graphics on the map remain proposals.

1. Unify actions across star-map detail handoff, planet detail, discovery/resonance
   previews and saved cards. Fix the detail link `/saved?add=...`: the saved page
   currently does not consume `add`, so navigation alone does not persist a save.
   Prefer a shared save/remove action with explicit success, failure and retry states.
2. Give My Planet clear entry points to private saved orbit and relationships, reusing
   `/saved` and `/relationships`. Distinguish saved, following, followers and mutual
   follows; preserve five mobile bottom tabs and avoid duplicate destination pages.
3. Complete follow/unfollow failure handling, persistence and cross-entry refresh.
   Follow creates one recipient-localized notice; saving remains private and sends no
   notice. An unsuccessful removal must retain the prior state.
4. Explain current beam behavior at every entry: opening a conversation is not sending
   a message; a new conversation requires mutual follows. Guide non-mutual users to
   follow/relationship status, then support composer→send→recipient notice→read→reply.
   Existing threads remain usable after unfollow unless blocked or otherwise unavailable.
5. Decide separately whether beam becomes an invitation with send/receive/accept/reject
   states. This mechanism is not implemented or authorized by recording the plan;
   define permissions, rate limits, notifications and schema before developing it.
6. Reflect saved/following/mutual/chat status in permitted planet previews and lists,
   and restore selection/filter/view on return to the map. Never infer real social edges
   from decorative clusters or recommendation scores; avoid rings and conspicuous
   border lines. Exact map presentation remains a design decision.
7. Verify two accounts on desktop/mobile in en/zh/fr: save→refresh→orbit→remove;
   follow→notice→follow-back→chat→send→read→reply; failed writes, duplicate clicks,
   own planets, unauthenticated access, private/blocked/deleted/inactive targets,
   membership/visibility changes, custom avatars and return-state synchronization.
   Record server tests and real browser acceptance separately.

### Stage 4: current delivery

Steps 1–2 are implemented in `activity-interest-review.md`: canonical `/activities`, private
interest saves independent of attendance, lifecycle retention and personal history. The
user reports the previous unified resonance release deployed; this does not establish
browser acceptance for the new activity slice. Before optional Post association, complete the Stage 2 action-chain follow-up below.
Then implement related detail cards and deployed multi-account acceptance.

### Stage 4: implementation sequence

1. Add event-interest storage independent of RSVP and capacity, with unique user/event
   identity, owner-only removal and permitted event visibility. Prefer an additive migration;
   retention/cancellation rules must be documented and tested before deployment.
2. Expose Activities prominently, reuse the event page and split discovery, interested and
   personal participation. Preserve the five-item mobile navigation and avoid duplicate pages.
3. Add optional Post→Community/Event associations with write/read permission checks and
   automatic galaxy consistency when choosing an event. Preserve Post vs CommunityPost per
   ADR 0001; record a new ADR before any model-merging proposal.
4. Show contextual activity/galaxy cards and approved related signals on detail pages.
   Expired/deleted/private targets must not expose hidden metadata.
5. Verify author/member/outsider/organizer/admin cases and all locales, then deployed
   multi-account discovery→interest→join→RSVP→review→cancel/history flows.

## Verification limits

The embedded PostgreSQL test harness uses real migrations, Prisma, permissions, transaction
logic, notifications and rate-limit buckets; authentication alone uses fixture identities.
It covers messaging retries, concurrent-arrival read preservation, outsiders/blocks, private
avatars, deleted users, message and notification pages, owner-only mutation, internal target
sanitization, localized follow notices and save idempotence/privacy/ownership.

No production DB writes, migration, deployment or actual user messages are performed.
The embedded engine serializes connections: multi-connection races and physical-device
behavior remain separate acceptance tasks. Browser engines are absent and their earlier
download failed; included browser specifications are not claimed as executed.

Validation: 24 baseline tests and 53 tests reported by the database/locale suite passed; TypeScript and production webpack build passed. ESLint: zero errors, 18 existing warnings. Browser specifications were added but not executed.
