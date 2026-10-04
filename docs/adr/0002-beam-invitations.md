# ADR 0002: Explicit beam invitations

- Date: 2026-10-05 (Europe/Paris)
- Status: Accepted for implementation under the user's authorized next-development request;
  deployment remains separate. Reviewed by the project product-architect workflow.

Current beams open chat; new threads require mutual following. We add a separate private
contact invitation rather than placing unsolicited messages in a conversation. Keeping
mutual-follow-only contact would not deliver this planned lifecycle; treating invitations
as messages would confuse delivery and unread counters.

An invitation contains no free text. A unique directed sender/recipient pair has PENDING,
ACCEPTED, REJECTED or CANCELLED state. Repeated sends return the existing state without
another notification. Rejected or cancelled pairs cannot resend in that direction. A
reverse pending request is handled in the received list, never silently auto-accepted.
Five new invitations per actor per 24-hour fixed window limit unsolicited contact.

Only the recipient accepts/rejects; only the sender cancels. Terminal decisions cannot
change. Accepting atomically creates/reuses the canonical sorted ConversationThread,
without follows, messages or XP. Thus new chat requires mutual follows OR recipient
acceptance. Existing thread behavior is preserved. Opening chat never sends a message.

Both users must be live and allowed to view/contact each other under shared server
permissions. Blocks and visibility loss hide invitations and prevent acceptance. No
invitation grants profile access. Status reads belong only to participants. Notifications
are invitation notices, separate from chat unread counts, and use recipient language.
All invitation rows involving a self-deleted account are removed with its private data.
This introduces no legal/retention commitment or launch approval.

Migration adds one enum/table with directed uniqueness, participant-list indexes and
foreign keys, plus distinct notification types. No backfill or existing-table destruction.
Production needs reviewed migrate-deploy SQL before release; implementation only tests
isolated embedded PostgreSQL. Revert application code to roll back; keep additive storage.
