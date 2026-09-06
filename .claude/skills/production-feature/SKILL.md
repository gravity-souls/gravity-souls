---
name: production-feature
description: End-to-end checklist for shipping a new authenticated production feature - auth gating, lib/visibility.ts enforcement, rate limiting, zod validation, i18n across all three locales, an e2e spec, and no mock fallback on authenticated paths. Use when implementing/extending any app/api/**/route.ts that touches real user data, or a page under proxy.ts's authenticated matcher. Do not use for app/demo/** (non-production, use release-readiness instead) or pure UI/demo work.
---

# Shipping a production feature correctly

This is the checklist form of how existing routes in this repo (e.g. `app/api/follows/route.ts`,
`app/api/blocks/route.ts`, `app/api/conversations/route.ts`) are actually built. Match the
nearest existing sibling route's shape before inventing a new pattern.

## Non-negotiable: no mock fallback

`lib/mock-posts.ts` and `lib/mock-relationships.ts` were deleted, not patched around, when
`/relationships` and `/stream` moved to real data. Never add a mock/placeholder fallback
to an authenticated production path. An empty/error state is correct; invented content is
not.

## Checklist

1. **Auth**: gate with `requireUser()` (throws 401) from `lib/session.ts`, or
   `requireLevel(request, minLevel)` from `lib/requireLevel.ts` if the route needs a
   trust-level floor. Note `requireLevel` currently has an `EARLY_ACCESS` bypass — don't
   rely on it as real gating in anything meant to ship to real users; flag it instead of
   building on top of it silently (see `.claude/skills/authorization-and-privacy/SKILL.md`).
2. **Visibility/contact**: if the route reads or writes another user's data, it must go
   through `lib/visibility.ts` (`canViewProfile`, `canContact`, `isBlocked`,
   `mutualFollow`) — never re-implement this client-side or ad hoc.
3. **Rate limiting**: if the route is spam-able (message sends, report filing, contact
   requests), apply the matching `RATE_LIMITS` bucket (see `lib/rate-limit.ts` and its
   usage in `app/api/conversations/route.ts`, `app/api/reports/route.ts`).
4. **Validation**: zod schema that rejects unknown and oversized fields — the repo's
   existing convention caps JSON bodies at 64 KiB (see `docs/beta-execution.md`).
5. **i18n**: any new user-facing string is added to all three of `messages/en.json`,
   `messages/fr.json`, `messages/zh.json` — never just `en`.
6. **Tests**: add or extend an `e2e/phaseN.spec.ts` covering the new behavior, following
   the existing one-feature-slice-per-phase convention.
7. **Notifications**: if the action is something the recipient should be told about, use
   `createNotification`/`NotificationTemplates` from `lib/createNotification.ts` rather
   than inventing a new notification path.

## Reads first

`docs/beta-execution.md`, plus the nearest existing sibling route as a concrete pattern —
don't design a new shape from scratch when one already exists for a similar action.
