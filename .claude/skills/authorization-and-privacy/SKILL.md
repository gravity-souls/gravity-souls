---
name: authorization-and-privacy
description: Per-request access control mechanics - lib/visibility.ts (isBlocked, canViewProfile, canContact, mutualFollow) must be the only enforcement path for "can this user see/contact/act on that user," never reimplemented ad hoc or filtered client-side. Also flags lib/requireLevel.ts's EARLY_ACCESS bypass as a standing pre-launch risk. Use when writing or reviewing any route that reads/mutates another user's data, profile visibility, or follow/block/contact logic. Do not use for abuse-report handling or the admin moderation queue - that's trust-safety-moderation.
---

# Authorization and privacy enforcement

`prisma/schema.prisma`'s comment on `Block` is the governing invariant: *"never disclosed
to the blocked user ... enforced server-side in `lib/visibility.ts`, never by client
filtering."* Every check in this skill exists to protect that invariant.

## The enforcement surface

All of it lives in `lib/visibility.ts`:

- `isBlocked(a, b)` — bidirectional block check.
- `blockedUserIds(userId)` — set of ids to exclude from listings/discovery.
- `canViewProfile(viewer, target)` — owner always sees own; blocked → false; `MEMBERS`
  visibility → any authed viewer; `PRIVATE` → only if a follow exists in either direction.
- `canContact(a, b)` — blocks always win over everything else.
- `mutualFollow(a, b)` — required for a *new* DM thread only; an existing thread survives
  a lapsed follow.

A route that touches another user's data and does **not** call one of these is a defect,
full stop — not a style preference.

## Auth layer

- `lib/session.ts`: `requireUser()` throws a 401 `Response` if unauthenticated;
  `getOptionalUserSession()` returns null instead of throwing.
- `lib/requireLevel.ts`: `requireLevel(request, minLevel)` reads `user.userLevel` and
  authorizes if `EARLY_ACCESS || userLevel >= minLevel`. **The `EARLY_ACCESS` flag
  currently no-ops all level gating.** Treat any route relying on `requireLevel` for real
  protection as unverified until that flag's production behavior is confirmed — flag it,
  don't assume it's already safe.

## Review checklist

- Server-side enforcement only — no visibility/block logic duplicated or filtered in a
  client component.
- No response (including error messages, timing, or list omission vs. explicit
  "not found") discloses block status to the blocked party.
- New-DM-thread creation calls `mutualFollow`; existing threads don't re-check it on every
  message.
- `PRIVATE` profiles are only visible to the owner or a follow-connected viewer.
- Any route gated only by `requireLevel` is flagged if `EARLY_ACCESS` would let it through
  regardless of actual level.

## Reads first

`lib/visibility.ts`, `lib/requireLevel.ts`, `lib/session.ts`, and the `Block`/`Follow`/
`Profile.visibility` model comments in `prisma/schema.prisma`.
