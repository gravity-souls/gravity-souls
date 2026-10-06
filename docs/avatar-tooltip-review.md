# Avatar tooltip and motion release review

Reviewed on October 6, 2026. This change adjusts star-map hover tooltips, adds a
personal-map owner tooltip, and keeps resonance movement running while a planet
is hovered. Keyboard focus still pauses resonance targets for accessible
selection. The browser fixtures check tooltip placement 6px from the
planet radius and owner avatar, and verify that motion does not stop while the
star-map tooltip tracks a moving planet.

## Verification

- `npm run lint`: completed with zero errors and 17 warnings. Warnings are in
  existing navigation, effect-dependency, and unused-variable sites.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed; no schema or migration files changed.
- `npm test`: passed (31 tests).
- `npm run build`: passed (Next.js 16.3.8 production build). Build output warned
  that the Apple auth provider has no client ID or secret configured.
- Focused production Playwright run on a fresh build:
  `npm run test:e2e -- e2e/demo/planet-feedback.spec.ts e2e/demo/star-map.spec.ts e2e/demo/star-map-relationships.spec.ts e2e/demo/personal-star-map.spec.ts e2e/demo/resonance-unified.spec.ts`
  Initial run: 49 passed, 32 failed. Restored resonance keyboard-focus pause
  (hover continues animating), and updated hover fixtures to acquire and dispatch
  current canvas coordinates after responsive layout settles.
  Rebuilt and reran the same five specifications with
  `--project=desktop --project=mobile`: **54 passed**.
  The initial 27 iPhone Safari cases failed during navigation with
  “WebKit encountered an internal error”; Safari remains unverified.
- No database-writing tests or commands, external-service checks, deployments,
  or pushes were run. Playwright used API fixtures and its own production server
  on port 3100; the existing server on port 3000 was left running.

## Release boundaries

This review verifies only the requested UI changes and focused browser paths.
It does not verify real-user database behavior, physical iPhone Safari, live
auth-provider flows, production integrations, or launch readiness.

Open launch gates carried forward from `docs/beta-execution.md`:

- A narrow WebKit-specific timing race on the post-sign-in redirect remains
  mitigated by a CI-only retry but has not been root-caused. The WebKit internal
  navigation errors in this run also need a successful Safari-engine run before
  browser coverage can be considered verified.
- The Terms of Service, Privacy Policy, and Community Guidelines are drafts;
  the founder still needs to provide the legal entity name/address,
  support/privacy contact, jurisdiction, retention periods, and processor list.
  They must not be treated as binding until finalized.
- Recovery email, content CRUD/media lifecycle, reliable message delivery, and
  progressive onboarding remain separate reviewed changes.
- A staging restore drill is still required before release.
- Confirm exposed credentials have been rotated in the secret manager; never
  include replacement values in this document or chat.
