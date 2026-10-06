# Production beta execution

## Approved product decisions

The founder approved these defaults during this implementation session:

- Beta minimum age: 18+.
- Exact age (for example, `26岁`) and gender may be shared independently through
  explicit public-tag opt-ins; both remain hidden by default. The founder approved
  privately saving a voluntarily supplied date of birth solely to confirm adulthood
  and automatically calculate age. No date is inferred or backfilled for existing
  users. Date of birth is available only in self registration/settings/export, never
  public DTOs or matching scores. Clearing it also removes the age opt-in atomically.
- Public age/gender tags share a compact icon-and-number badge when both are
  opted in. Women and men use Venus/Mars icons; nonbinary and other use a neutral
  icon. Gender-only shows just the icon; age-only keeps its localized text label.
  Localized accessible names and hover titles retain the full meaning.
  Gender badges use soft pink for women, light blue for men and lavender for
  nonbinary/other, retaining distinct icons rather than relying on color alone.
- One-way follows; follow edges belong to users, not replaceable planet records.
- New chats require mutual follow or explicit recipient acceptance of a separate beam
  invitation (ADR 0002); recipient permissions still apply. Neither opening nor accepting sends a message.
- Member-visible profiles and posts by default; community content follows community access.
- Matching/calibration is optional.
- A galaxy is the presentation of a community for beta, not a separate entity.
- `User.name` is the public pseudonym and primary identity beside avatars and social
  interactions. `Planet.name` remains the distinct planet name and is labelled as such
  when shown on a profile; existing names and the database schema remain unchanged.

These approvals do not establish legal compliance or authorize inventing retention rules.
Legal entity/address, support/privacy contacts, retention, moderation staffing, processor
details, and production release sign-off remain pending. The implementation below does
not yet enforce the approved future product defaults.

### Private birth date / public age implementation

- `RegistrationBasics.birthDate` is a nullable PostgreSQL `DATE`, with canonical
  UTC-midnight Prisma values and `YYYY-MM-DD` self API/export values. Public tags
  contain only the computed numeric age when `publicTags` includes `age` and the
  date is valid and adult. Birthdays use UTC calendar arithmetic; February 29
  advances on March 1 in non-leap years.
- Supplied malformed, future or under-18 dates are rejected even with adult
  confirmation. `null` explicitly clears a date; omitted dates are retained on
  ordinary updates. Adult declaration evidence remains unchanged on later edits.
- Additive SQL artifact: `prisma/migrations/20261006190000_add_private_birth_date/migration.sql`.
  Reviewed as one nullable column, no default, backfill, index or destructive SQL.
  **Schema target remains unselected** until the founder authorizes a loopback or
  staging database. No database-writing command or deployment is authorized here.
- This approval covers only the described data use, not legal compliance.
  Privacy-policy wording and DOB retention require founder/legal review before
  release; no retention period or new policy claim is established.

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
- Stream list, route, paging, and post-detail reads reuse the shared PlanetLoadingState
  visual while awaiting verification, including overlays and direct links. Loading states reveal no
  unverified content, respect reduced motion, and retain the overlay close control;
  failed or unavailable reads keep their explicit error/retry states.
- Stream/my-planet publishing uses an indeterminate, localized pending state. Duplicate
  clicks, draft changes, and local close controls are locked until the request settles;
  failures retain the draft and selected media. Confirmed success closes immediately,
  resets every creation field, and leaves a persistent parent-owned status message.
- Stream post edits validate the returned post before applying it immediately to the
  detail and originating stream/my-planet/home list. Loaded comments are retained when
  PATCH omits them; saved feedback lives outside the keyed editor. Pending edits lock
  local close/navigation and editing controls.
- Feed requests use abort/generation guards, deduplication, explicit errors/retry, and
  callback refs rather than callback-driven refetching. Local changes respect category,
  tag, search, and author filters; deleted local posts cannot be re-prepended. Refreshes
  retain loaded cards and paging/scroll state instead of replacing them with skeletons.
- Galaxy/activity round trips retain an allowlisted stream, my-planet, or home origin.
  Local overlay closes do not navigate. Session-local filter/scroll snapshots restore
  after the destination list is ready; they contain no post content or media drafts.
  See [the stream workflow review](./stream-post-loading-review.md) for verification
  and the explicit delivery/media-lifecycle boundaries.
- Galaxy and activity related-signal lists now show the first image or a paused,
  muted inline video preview with a play marker and additional-attachment count.
  Cards use a manual horizontal strip with touch/keyboard/arrow navigation and
  next-page loading near its end, so more signals do not expand page height.
  Text-only signals remain text-only; failed media has an explicit localized state.
  Clicking the preview retains the existing verified detail/context-return path.
  No generated thumbnails, storage, or access-policy changes are included.
  See [the media preview review](./related-signal-media-review.md).

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
visibility, moderation/reporting, data-rights workflows (self-serve export, tombstone
account deletion), and policy-acceptance logging (a required sign-up checkbox recording
acceptance per `lib/policy-versions.ts`) have shipped. Real iPhone Safari e2e coverage
now runs alongside the Chromium suites (`playwright.mobile.config.ts`); a narrow (~1-in-3)
WebKit-specific timing race on the post-sign-in redirect is mitigated with a CI-only
retry but not yet root-caused. The Terms of Service, Privacy Policy, and Community
Guidelines pages are structured drafts, not final — they still need the legal entity
name/address, support/privacy contact, jurisdiction, retention periods, and processor
list from the founder before they're real; nothing on those pages should be treated as
binding yet. Recovery email, content CRUD/media lifecycle, reliable message delivery,
and progressive onboarding remain separate reviewed changes. A staging restore
drill is still required before release. Confirm exposed credentials have been rotated in
the secret manager; never put their replacements in this document or chat.
