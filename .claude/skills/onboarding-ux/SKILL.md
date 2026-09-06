---
name: onboarding-ux
description: Activation-flow mechanics - questionnaire to planet calibration, first-XP grant only on isFirstPlanet, first-session hints, dismissal persistence via lib/hints-preferences.ts, notification templates for activation moments. Use for work under app/api/onboarding/**, app/api/questionnaire/**, or first-session/activation UI (FirstSessionHint, FirstMatchCTA). Do not use for general messaging/notification work unrelated to activation.
---

# Onboarding and activation

## The flow

- `app/api/questionnaire/route.ts` — append-only: `POST` creates a new
  `QuestionnaireResult`, `GET` returns the latest via `findFirst` + `orderBy createdAt
  desc`. No upsert, no XP, no level gating.
- `app/api/onboarding/complete/route.ts` — one transaction: upserts `Profile`, deactivates
  prior `Planet`s (`active: false`), creates the new active `Planet`, appends a
  `QuestionnaireResult`. Calls `grantXP(userId, 'PROFILE_COMPLETED')` **only if
  `isFirstPlanet`** (computed via `prisma.planet.count`) — recalibration must never
  re-grant this XP.
- `lib/hints-preferences.ts` — `getHintDismissed(key)`/`dismissHint(key)`, localStorage
  with in-memory fallback, dispatches a `gs-hint-change` window event. This is the only
  dismissal mechanism — don't add a second one for a new hint.
- Activation UI: `FirstSessionHint.tsx`, `FirstMatchCTA.tsx` — both key off
  `hints-preferences.ts`.
- Notifications relevant to activation come from `lib/createNotification.ts`'s
  `NotificationTemplates` (e.g. `newMatch`, `levelUp` via `lib/grantXP.ts`).

## Rules

- XP for profile completion is granted exactly once per user, at first calibration —
  never on recalibration.
- Matching/calibration is optional (per `docs/beta-execution.md`) — don't make any part of
  onboarding mandatory without that being a founder-approved product decision routed
  through `gravitysouls-product`.
- New hints reuse `lib/hints-preferences.ts`, keyed uniquely, not a bespoke
  localStorage/cookie scheme.
- Any new onboarding-facing string ships in `en`, `fr`, and `zh`.

## Reads first

`app/api/onboarding/complete/route.ts`, `lib/grantXP.ts`, `lib/hints-preferences.ts`.

## Validation

- XP granted once per user, only on first calibration.
- Hint dismissal is per-key and persists across reload.
- No duplicate onboarding-moment notifications for the same event.
