# ADR 0004: Private chat image attachments

- Date: 2026-10-05 (Europe/Paris)
- Status: Accepted under the user's authorized next-development request. Product-architect
  reviewed; production storage provisioning, migration and deployment remain separate.

Store private objects behind an authenticated byte API, not publicly reachable media URLs
or database binaries. Add ChatImage metadata and nullable unique DirectMessage.imageId.
Owner/conversation IDs on uploads are scalar cleanup references, without cascade FKs;
message-to-image FK is Restrict. New image messages have empty text and no share references.
No backfill or existing data changes. Existing counterpart history survives self-tombstoning.

Client chooses/previews one JPEG/PNG/WebP; this slice rejects oversized input before upload,
without client compression.
Binary requests are limited to 3 MiB; server decodes at most 16 MP, rotates, strips metadata,
resizes to 2048 and re-encodes WebP. Reject invalid/animated formats. Original filename,
EXIF and file bytes are never stored. Explicit private Blob token only, never public-token
fallback. Development filesystem is explicitly configured outside public and prohibited
in production. No E2E encryption claim: the application/storage provider can process bytes.

Upload creates no message, notification, unread or XP. UUID retries match owner, conversation
and input digest. Each reservation has one immutable object key and one writer. No lease
handover reuses a key: an unfinished attempt returns busy for two minutes, then is fenced
for cleanup; the client retains the selection and creates a fresh UUID on explicit retry.
Successful ready uploads retry idempotently. External storage calls stay outside DB locks.

Send rechecks both accounts/contact, locks pair/thread/image, binds an unexpired ready
upload exactly once, and uses ordinary message idempotency/rate/notification rules. Bytes
require current conversation participation and contact permission; before binding, only
owner may read. Deleted counterpart history remains readable by the live viewer. All byte
responses are private/no-store; no object key, storage URL or digest reaches client/export.

Unsent uploads expire after one hour (technical orphan handling, no legal retention rule).
Discard/self-delete fences own unused uploads. Cleanup fences under the same image row
lock as send; attached images cannot be cleaned, fenced images cannot be sent. Delete
storage first, then metadata; failures keep the row for retry. Inflight failed reservations
wait until expiry before deletion, well beyond the 60-second function/30-second write cap.
No successful later worker reuses their immutable key. Bounded secret-protected cleanup
runs daily and on explicit discard; unsent objects can persist until the next successful
sweep. Attached images have no automatic TTL in this change.

Validate real codecs, metadata removal, spoofed MIME/oversize, upload/send retries, cross-
conversation/owner abuse, block/delete access, cleanup failures and secret auth, all locales.
Test storage locally and provider adapter with injected SDK failures; neither proves live
private Blob configuration. Embedded DB tests serialize connections; real concurrent
PostgreSQL/provider races and physical mobile acceptance remain pending release checks.

Deployment requires new additive migration, a private store token CHAT_PRIVATE_BLOB_TOKEN
and CRON_SECRET. No production writes or new legal/moderation/retention decisions here.
