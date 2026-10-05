# ADR 0005: Chat quotation references and message reactions

- Date: 2026-10-05 (Europe/Paris)
- Status: Accepted under the user's authorized continuation of the chat roadmap;
  product-architect reviewed. Production migration and deployment remain separate.

Replies remain text/share/image messages with nullable scalar replyToId, not a new type.
No copied text, author name, resource title, thumbnail or media bytes are stored. Scalar
references preserve unavailable placeholders if the original is removed, without blocking
future deletion or losing quotation intent through SET NULL. New sends validate the source
in the same authorized thread. Reads scope both source ID and conversation ID, one level
only. Current text gets a short plain excerpt; image/share quotations use generic localized
labels. Hidden shared targets and missing originals return only {available:false}.

Transactions lock the participant pair/thread and recheck both accounts/contact. Persisted
matching retries compare sender/type/payload/replyToId before requiring the source for a
new creation. This includes strengthening the existing text send's permission race. Quote
selection and read-only endpoints never send, follow, mark read or grant resource access.
Displaying a full original acknowledges only that visible incoming message through the
existing read endpoint; previews do not acknowledge their referenced source. Clicking a
quote locates a loaded source, or opens its authorized original in a dialog, without merging
an incomplete historical window into the thread. The original dialog rechecks permissions.

Each participant may hold one allowlisted emoji per message (unique messageId,userId).
Explicit PUT desired emoji/null replaces/removes it; retries are idempotent. Reads return
counts and the viewer's choice, no extra actor identities. Two live accounts and current
contact are required for mutation, including retries. These changes never create messages,
notifications, unread increments, XP or thread lastMessageAt changes. Self-tombstoning
removes the actor's reactions; message/user hard deletion cascades ancillary rows.

Each actual mutation increments a per-message reactionVersion, including removal and
account deletion. This avoids stale polling responses overwriting a newer confirmed UI
state. Reaction counts and version are read together in one SQL snapshot. Idempotent requests do not advance the version. Client mutations are serialized per
message; versions do not claim ordering of conflicting intents from multiple tabs. After
uncertain delivery retry the same desired state, not a freshly calculated toggle.

A bounded authorized message-state refresh covers already-loaded historical messages,
not only the latest 40. Restricted quotes/cards/reactions fail closed on refresh failures;
overall conversation failure hides the history. Missing historical messages show an
unavailable placeholder. All new states cover English, French and Chinese.

Add nullable replyToId, reactionVersion with default 0, a reaction table, unique pair,
cascading FKs and an allowlist CHECK; existing messages need no backfill. Do not edit old
migrations. Test real additive SQL locally; production migrate-deploy remains a release
step. Application rollback retains additive structures. No new message retention, copied
quotation history, editing/retraction semantics, custom emoji, moderation or production
configuration changes are introduced. Implemented from MR37, now merged into main;
private storage provisioning remains separate.
