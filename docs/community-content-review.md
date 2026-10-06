# Community content workflow review

Reviewed on October 6, 2026. Community posts and discussions now display public
user pseudonyms rather than planet names. The galaxy page has explicit loading,
pending, draft-preserving error, success, and mutation-reconciliation states;
authors can delete their own replies. Server writes use visibility enforcement,
strict input validation, existing rate limits, and transactional publication.
Community post/discussion editing remains explicitly deferred.

## Verification

- `npm run lint`: passed with zero errors and 17 warnings.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm test`: passed (31 tests).
- `npm run test:galaxy`: passed (172 tests), including PGlite-backed route and
  workflow coverage.
- `npm run build -- --webpack`: passed on Next.js 16.3.8 using the cached-font
  webpack build. All database URLs were unreachable loopback `_test` URLs and
  outbound requests were blocked; no external font request was made. The default
  Turbopack build was not verified.
- `npm run test:e2e -- galaxy-content.spec.ts --project=desktop --project=mobile`:
  passed (36 tests across desktop and mobile Chromium, en/fr/zh). The initial
  runner attempt timed out because the outbound proxy intercepted localhost;
  the rerun excluded localhost from the proxy and passed.
- Focused `iphone-safari` run: failed (18/18). Each case stopped at `page.goto`
  with `WebKit encountered an internal error`; a one-case retry without proxy
  variables reproduced it. No feature assertion ran successfully in that
  project. This is reported as an unresolved WebKit verification failure, not a
  product pass.
- No `test:e2e:db`, model suite, database-writing command, migration, or live
  account test was run. No schema change was made.

## Release boundaries

Community post/discussion editing has no API route or editor and remains
explicitly deferred. Retries after an unknown network acknowledgement are not
server-idempotent. PGlite serializes its connections, so multi-connection
concurrency behavior still requires testing against production-like PostgreSQL.
The passing no-database browser suite intercepts API traffic; live owner/member
acceptance on a deployed version remains outstanding.

The focused iPhone/WebKit suite failed locally as recorded above. Separately,
PR #60's latest CI report left unresolved the database-suite Safari sign-in
redirect race (`next=/resonance`) and Safari demo failures involving unavailable
`MediaRecorder`, stream-filter assertions, and a detached round-trip element;
the match-report suite also had a flaky attempt. The post-sign-in race has a
CI-only retry but is not root-caused.

Carry-forward launch gates from `docs/beta-execution.md`: legal review and
founder-supplied legal entity/address, support and privacy contacts, jurisdiction,
retention periods, and processor list are still needed before the Terms,
Privacy Policy, and Community Guidelines drafts are binding; recovery email,
content CRUD/media lifecycle, reliable message delivery, and progressive
onboarding remain separate work; a staging restore drill is required; and
exposed credentials must be confirmed rotated in the secret manager. The
temporary `EARLY_ACCESS` authorization bypass also remains a pre-real-user
launch gate. No production deployment or database change was performed.
