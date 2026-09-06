---
name: trust-safety-moderation
description: Abuse-reporting, moderation-queue, and admin-surface conventions - Report lifecycle, isOperatorEmail admin gating, rate-limited report filing, and France/EU-relevant policy constraints (18+ minimum, and the still-open items in docs/beta-execution.md's "Remaining launch gates"). Use for work on app/api/reports/**, app/api/admin/**, or anything touching age-gating, content moderation policy, or the report queue. Do not use for general per-request visibility/contact checks - that's authorization-and-privacy.
---

# Trust & safety and moderation

## Where it lives

- `app/api/reports/route.ts` — `POST` files a report, rate-limited via
  `RATE_LIMITS.REPORT`.
- `app/api/admin/reports/route.ts` — `GET` lists the queue, `PATCH` updates status; both
  gated by `isOperatorEmail`, never by `requireLevel` alone.
- `Report` model: `ReportTargetType`/`ReportStatus` enums in `prisma/schema.prisma`.
- `app/api/blocks/route.ts` — blocking transactionally removes existing follows in both
  directions; this is a safety primitive as much as a social one.

## Rules

- Admin/moderation routes are gated by `isOperatorEmail`, not by trust level or a generic
  role field — don't substitute a different gate.
- Report filing stays rate-limited; don't relax `RATE_LIMITS.REPORT` without a stated
  reason.
- **Never invent a compliance answer.** `docs/beta-execution.md` is explicit that its
  approvals "do not establish legal compliance." If a task requires deciding retention
  periods, moderation staffing levels, legal entity/support/privacy contact details, or a
  data-rights (access/erasure) workflow, surface that as an open founder decision — do not
  pick a default and implement it.
- The "Remaining launch gates" list in `docs/beta-execution.md` is the current source of
  truth for what's still open (moderation staffing, retention policy, data-rights
  workflows, real iPhone Safari pass, staging restore drill, legal contacts). Any
  moderation-adjacent task should check whether it touches one of these and say so
  explicitly rather than silently assuming it's resolved.

## Reads first

`docs/beta-execution.md` ("Remaining launch gates" section), the `Report`/
`ReportTargetType`/`ReportStatus` schema, `app/api/admin/reports/route.ts`.

## Output

Findings plus an explicit "still pending founder sign-off" flag for any legal/policy gap
surfaced — never a confident-sounding invented answer to a compliance question.
