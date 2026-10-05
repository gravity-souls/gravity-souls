# Chat draft recovery

Text and reply target IDs are saved in browser localStorage after editing, scoped
by the authenticated viewer ID returned by the conversation API and conversation
ID. Reopening the conversation restores them without submitting a message.
The server remains authoritative for access and reply availability; no quote
snapshot, attachment, private image URL or account name is stored in drafts.
Blocked/unavailable conversations hide the draft and disable sending.

An unchanged failed text send retains its clientMessageId across reloads. This
uses the existing server idempotency contract when a response was lost. Text or
reply changes get a new key. Only acknowledged sends clear their own revision;
a late response preserves newer local or remote drafts. Image/card sending
continues to use existing retry handling and does not clear unsent text.

An inactive, unedited tab follows other tabs' draft changes. An active editor
keeps its own text and sees explicit choices to use the other draft or keep its
own; sending and attachments wait until that choice is made. Storage is checked
again before sending and writing, including when its event has not arrived.
localStorage is not a transactional cross-device database. Concurrent edits are
resolved in the browser UI; no claim of atomic global locking is made.

Drafts are plaintext on the current browser profile, recoverable for 7 days
since the last edit. Expired/corrupt records are removed when that conversation
is opened; a closed browser cannot run timed deletion. Explicit discard, sign-out
from either UI, and successful account deletion clear drafts. Sign-out purges
all accounts' drafts in this browser and resets open tabs. If browser storage is
disabled/full, a localized notice explains that the draft is in memory only.

English, Chinese and French notices/choices are provided. No database migration,
new environment variable or third-party configuration. No image draft, cloud
sync, OS push or message editing/withdrawal feature is included. These remain
separate work; push requires subscription, explicit permission and delivery work.

Validation: 30 chat tests pass (including 10 draft state/storage regressions).
TypeScript and production build are checked for this change. The new browser
spec covers refresh/retry, reply restore, conversation/account isolation,
discard and two-tab conflict. Browser engines are absent locally; execution is
left to remote CI, so this is not a deployed or physical-phone acceptance claim.
Legacy sign-out/account navigation lint warnings remain; changed draft/composer
files have no lint errors.
