# Production beta execution

## Approved product decisions

The founder approved these defaults during this implementation session:

- Beta minimum age: 18+.
- One-way follows; follow edges belong to users, not replaceable planet records.
- New private messages require mutual follow and recipient permission.
- Member-visible profiles and posts by default; community content follows community access.
- Matching/calibration is optional.
- A galaxy is the presentation of a community for beta, not a separate entity.

These approvals do not establish legal compliance or authorize inventing retention rules.
Legal entity/address, support/privacy contacts, retention, moderation staffing, processor
details, and production release sign-off remain pending. The implementation below does
not yet enforce the approved future product defaults.

## Tranche 1: database tooling, truthful content, join authorization, validation

- Database fixtures and integration tests require `TEST_DATABASE_URL`, restricted to
  loopback PostgreSQL and a database name ending in `_test` or `_e2e`.
- Both Playwright's server and fixtures use that same database. Tests build and start
  their own production server on port 3200 and never reuse an existing app server.
- Test-only auth/provider settings replace application credentials. OAuth tests verify
  URL generation; they do not verify Google or Apple consent round trips.
- Sample seeding requires `SEED_DATABASE_URL` on loopback with a `_dev`, `_test`, or
  `_e2e` suffix and `ALLOW_SAMPLE_DATA=1`. It does not claim existing communities.
- `db:push` and `db:migrate` require a loopback `DEV_DATABASE_URL` ending in `_dev`.
  Production uses reviewed SQL and `db:deploy` (`prisma migrate deploy`) only.
- Community discussion GET no longer creates/updates topics, replies, or heat.
- Galaxy post/discussion empty and error states no longer substitute canned content;
  likes and replies only succeed after a real API write.
- Joining never assigns community ownership/admin roles, including concurrent joins.
- Planet, calibration, message, event, and join input schemas reject malformed,
  oversized, out-of-range, and unknown fields. JSON parsing has a 64 KiB byte limit.
- Scoped handlers return safe errors; activity telemetry cannot invalidate a valid session.
- Message composition shares the server's 2,000-character limit. Unconfirmed sends
  retain the draft and show an error instead of a successful-looking message. IME
  composition Enter does not send. Delivery retry idempotency remains future work.

No schema changes, production migrations, credential rotation, existing-data cleanup,
or production deployment were performed in this tranche. Existing seeded database
records remain untouched. Static galaxy metadata/member examples and legacy product
routes remain subject to the approved Galaxy/relationship implementation, not deletion
as supposedly unused files. The landing and CosmicGlobe showcase are preserved.

## Running checks

Use a separately provisioned local PostgreSQL database with an explicit test name.
Never copy the application's Neon URL into `TEST_DATABASE_URL`.

```sh
export TEST_DATABASE_URL='postgresql://LOCAL_ROLE@127.0.0.1:LOCAL_PORT/gravity_souls_e2e'
DIRECT_URL="$TEST_DATABASE_URL" npm run db:deploy
npm test
npm run test:models
npm run test:e2e:db
npm run lint
npm run typecheck
npx prisma validate
npm run build
npm run test:e2e
```

`test:models` creates/deletes its own fixtures. `test:e2e:db` creates/deletes named
test accounts and safety-test content. Run the suites sequentially. The browser DB
suite builds with test-specific public auth settings; run the normal production build
afterwards before deployment or other production checks.

## Reviewed next designs

Follow: unique `(followerId, followingId)`, no self-edge, reverse lookup index;
only the actor can alter outgoing edges. Block: unique `(blockerId, blockedId)`,
no self-edge, reverse lookup index. Blocking prevents both-direction new contact and
removes/disables follows transactionally. Neither a follow nor a score overrides
visibility. Authorize resource reads, writes, notifications, and discovery on the server.

Galaxy: `/galaxy/[slug]` resolves the existing Community by its unique slug, membership
comes from CommunityMembership, events keep their Community foreign key, and global
posts stay separate from community posts initially. Stable IDs survive any future
authorized slug rename. Preserve genuine posts/replies when replacing static lookups.

Schema work needs a separate design/migration review. Generate new SQL, inspect it,
apply to staging, test rollback/restore, and use expand/backfill/switch/contract for
risky evolution. Never edit applied migrations or run reset/db push in production.

## Remaining launch gates

The repository is not yet ready to invite real users. Follow/block enforcement,
visibility, moderation/reporting, recovery email, policy acceptance, data-rights
workflows, content CRUD/media lifecycle, reliable message delivery, and progressive
onboarding remain separate reviewed changes. Real iPhone Safari and a staging restore
drill are required before release. Confirm exposed credentials have been rotated in
the secret manager; never put their replacements in this document or chat.
