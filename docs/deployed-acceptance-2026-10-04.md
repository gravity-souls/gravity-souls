# Deployed acceptance — 2026-10-04 (Europe/Paris)

User reports MR #29 deployed. Browser: cloud Chrome desktop, real signed-in
Oren Brooks account. All actions below use the normal website UI, not database
fixtures or direct production database writes. This is partial acceptance.

## Confirmed live

- Home loads 10 visible planets, existing galaxies and stream posts.
- Created QA Acceptance 2026-10-04; creator becomes Owner, one member, management
  and event review available. Slug: qa-acceptance-2026-10-04-af1220d6.
- Proposed QA Activity Acceptance for October 5; pending review appears; Owner
  approves and event becomes selectable/listed. Event: cmuubikfa000004jvja6evsg2.
- Interested save survives navigation and language refresh. RSVP increments to 1;
  cancellation restores 0 and preserves interest. Independent activity page lists it.
- Published a linked Post; valid galaxy/activity choices, member audience copy,
  context cards and correct event deep link. Edited text persists in detail, stream
  and related-signal lists. Like and comment succeed. Post: cmuubkx9d000004lcz53ak7lv.
- Activity entry and interested view render English, Chinese and French labels,
  status/date/navigation. This is not a full three-language review of all pages.
- Star-map climate selection opens a real planet, whose detail has beam/save/follow.
- Saving planet cmusva7tq000104l2gwgcfd8x appears in saved orbit. Removing it restores
  the empty list. Following persists in relationships. Non-mutual beam attempt
  shows mutual-follow guidance, not a sent message. Messages remains empty.

## Live failures and corrective change

1. RSVP changes duplicate the Related stream signals section (DOM count rises
   from 1 to 2, then 3), reproducible on /activities and galaxy deep links.
   RelatedSignals and EventManagement shared the same sibling key. Fixed by
   assigning distinct keys.
2. RSVP count changes while attendee avatars and management list retain stale
   data. Fixed by reloading authoritative detail after RSVP in both entry pages
   and reloading the management list when attendance state changes. Late detail
   results do not replace a closed or different selection or newer RSVP state.

Regression browser specification: e2e/demo/event-detail-refresh.spec.ts. Local
browser engines remain absent; it is not claimed executed. TypeScript, 74
database/locale tests, changed-file ESLint and production build pass. The fix
requires deployment and live recheck before these two failures are closed.

## Test data and remaining acceptance

The clearly labelled QA galaxy, activity, linked post and comment are retained
for another-account verification; no permanent deletion performed. Activity has
0 attendees and Oren's interested save remains. Oren follows the test planet;
the temporary orbit save was removed. No chat message sent. Locale ends French.

Still required: a second account to verify outsider denial, join/request approval,
member visibility, follow-back, actual message receipt/read/reply and recipient
notifications. Also pending: mobile/Safari and touch/performance, permission
revocation/deletion and upload failure cases, full three-language and custom
avatar consistency. This desktop partial result is not all-flow acceptance.

## Second-account acceptance continuation

- Miro Laurent was denied linked Post access before joining. Direct joining changed
  the member count to 2, exposed permitted event/related signal, and enabled real
  like/comment. No author edit/delete controls appeared.
- Miro saved interest and RSVP; the Going list retained the activity. Leaving
  removed member/event visibility and the linked Post became unavailable again.
- Oren received Miro's comment, follow and RSVP notices in French (current recipient
  locale). Follow notice opened the correct Miro planet. Oren followed back,
  enabling a real empty conversation; opening it sent nothing.
- Oren sent one QA message. Miro's message list displayed one unread, with matching
  message notification. Notification deep link opened the right thread. Miro sent
  a QA reply; returning to the list showed no unread, and the message notice was
  read while the unrelated follow notice stayed unread. Thread:
  cmuucigmh000204jsoculj4sr. Oren later received the reply via its French notification, saw the original
  message marked read, and his own message unread cleared after viewing.
- QA galaxy now requires administrator approval. Miro submitted a fresh join
  request; Pending review appears and member/event content stays hidden. Oren opened the request notice, approved Miro and verified zero pending
  requests and two members. Miro-side access after this approval is not yet rechecked.
- Additional live copy failures: a received-only conversation showed the first
  beam sent hint; it now requires an own sent message. The unavailable stream
  deep-link page remained English in French; it now uses existing localized
  loading/unavailable messages. Both corrections need deployed recheck.

Current retained data: Miro's join request is approved, Oren and Miro mutually
follow, the QA thread contains two messages; the QA galaxy/activity/post/comments
are retained. No destructive cleanup was performed.

Final desktop outcome: direct join/member read/interaction/leave denial, join request
and Owner approval, follow-back, actual two-way chat, read receipts and independent
notification unread states were exercised live. The corrective branch also fixes
received-only first-send hint and localized unavailable Post-page copy; TypeScript,
changed-file ESLint and production build pass after these changes. No mobile/Safari
claim, no full avatar/localization claim, and no claimed live verification of an
un-deployed fix. Test-only activity has no current attendees after Miro left.
