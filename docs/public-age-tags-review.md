# Public age and gender tags release review

Public planets can show a computed age and selected gender only through separate
explicit opt-ins. Date of birth remains private; clearing it removes the age opt-in.
The additive nullable birth-date migration is present but has not been applied.

## Verification

- `npm run lint`: passed with 0 errors and 17 warnings (existing navigation,
  effect-dependency, and unused-variable warnings).
- `npm run typecheck`: passed.
- `npx prisma validate`: passed; the schema is valid.
- `npm run build`: passed. Database URLs were pinned to an unreachable loopback
  `_test` target. Build emitted Better Auth warnings that the Apple social provider
  is missing its client ID/secret in this environment.
- `npm test`: passed, 31 tests.
- `npm run test:registration`: passed, 27 tests across registration basics,
  discovery preferences, and public age tags. The route/migration lifecycle tests
  use embedded PGlite and did not contact a configured database.
- Targeted no-database Playwright run:
  `npm run test:e2e -- --project=desktop --project=mobile e2e/demo/public-age-tags.spec.ts e2e/demo/registration-basics.spec.ts`:
  passed, 12 tests across desktop and mobile Chromium, in English, French, and
  Chinese. The specs use isolated API fixtures; the server's database URLs were
  pinned to an unreachable loopback `_test` target.
- `npm run test:models`: not run; it requires `TEST_DATABASE_URL`, and no approved
  loopback `_test`/`_e2e` database URL was configured.
- Full `npm run test:e2e` and database browser verification were not run.
  `npm run test:e2e:db`, migrations, and other database-writing commands were
  intentionally not run.
- Follow-up CI fixes align older shared-card assertions with public pseudonyms,
  preserve the star map's unfiltered eligible totals while checking filtered nodes,
  and read the failed-post error from the current Chinese translation.
  `npm run test:galaxy` passed all 171 embedded tests; targeted ESLint and
  typecheck passed. The post-context spec passed on desktop/mobile Chromium.
  Local WebKit failed at navigation with an internal engine error, including an
  isolated retry, before reaching the changed assertion; Safari verification
  remains dependent on CI.

## Release boundaries

- The additive SQL in
  `prisma/migrations/20261006190000_add_private_birth_date/migration.sql` adds a
  nullable `DATE` column only. It remains unapplied; the schema target is unselected.
  No database was modified or verified. Applying it requires explicit approval and
  a separately selected database target.
- Private birth-date collection and display of computed age are not identity or
  documentary age verification. Privacy-policy wording and a DOB retention period
  remain subject to founder/legal review; this change does not establish either.
- The beta is not ready for real-user invitations. Follow/block enforcement,
  visibility, moderation/reporting, export and tombstone deletion, and
  policy-acceptance logging are marked shipped in `docs/beta-execution.md`.
- The real-iPhone Safari suite has a narrow post-sign-in redirect timing race with a
  CI-only retry; it remains unroot-caused. The desktop/mobile run here used
  Chromium, not WebKit or physical iPhone hardware.
- Terms of Service, Privacy Policy, and Community Guidelines remain structured
  drafts pending the legal entity name/address, support/privacy contact,
  jurisdiction, retention periods, and processor list. They must not be treated as
  binding.
- Recovery email, content CRUD/media lifecycle, reliable message delivery, and
  progressive onboarding remain separate reviewed work.
- A staging restore drill remains required before release.
- Confirm exposed credentials have been rotated in the secret manager; do not put
  replacements in this document or chat.
