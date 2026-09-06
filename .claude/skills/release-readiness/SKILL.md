---
name: release-readiness
description: Runs lint/typecheck/prisma validate/build plus the relevant Playwright suite (test:e2e if no DB dependency, test:e2e:db if there is one), then writes docs/<feature>-review.md in the same format as docs/cosmic-globe-review.md. Use for "is this ready to ship," "review this before release," or finishing a PR-sized increment that touches a production path. Do not use mid-implementation or for exploratory prototyping.
---

# Release readiness review

`docs/cosmic-globe-review.md` is the format template — don't invent a new report
structure, follow that one: a short description of what changed, a `## Verification`
section, and a `## Release boundaries` section stating what's explicitly *not* covered.

## Verification commands

Run whichever of these actually apply to the feature (mirror `.github/workflows/ci.yml`,
don't invent extra steps):

```
npm run lint
npm run typecheck
npx prisma validate
npm run build
npm run test
npm run test:models       # only if the change touches Prisma models
npm run test:e2e          # if the feature has no DB dependency
npm run test:e2e:db       # if it does — loopback _test/_e2e database only, per
                          # docs/beta-execution.md; never a shared/production database
```

## Rules

- Only report a check as "passed" if it was actually run this session — never assume or
  extrapolate from a prior run.
- `test:e2e:db` and any DB-writing command always prompt for approval (see
  `.claude/settings.local.json`); if that approval isn't given, report the check as **not
  verified**, not as passing.
- Carry forward every relevant open item from `docs/beta-execution.md`'s "Remaining launch
  gates" into the new review doc's release-boundaries section — don't silently drop them
  because this particular feature isn't the one that will close them.
- Write the review to `docs/<feature>-review.md` — a new file, not an edit to
  `docs/cosmic-globe-review.md` or `docs/beta-execution.md`.

## Reads first

`docs/cosmic-globe-review.md` (format), `.github/workflows/ci.yml` (what CI actually
checks), `docs/beta-execution.md` ("Remaining launch gates").
