# Stream post loading and frontend workflow release review

Reviewed on October 6, 2026. Baseline: `41ec13d`.

Pending stream list, paging, route, and detail reads now reuse PlanetLoadingState
instead of gray masonry blocks and a separate post-layout skeleton. The shared
SVG planet animation is used for direct post links and their Suspense fallback. Loading states do not
display unverified post content. The overlay retains its close and contextual
return controls, and reduced-motion preferences disable the shared breathing/orbit animations.
Existing unavailable, error, and retry states remain distinct from loading.

## Audited workflow completion

The shared creation modal used by stream and my-planet now has truthful indeterminate
publishing feedback rather than invented percentages. An immediate request guard and
disabled controls prevent duplicate clicks, editing, drops, or local closing while a
publish is pending. No delayed-close/reset timers remain. Failed requests retain
content, category, tags, context, and selected files. Confirmed, shape-validated success
closes immediately, resets all fields including category/file-input state, and leaves
success feedback in the parent page. Preview object URLs are effect-owned and revoked
on replacement, removal, successful reset, or unmount. Known validation, context,
permission, session, rate-limit, and media errors have en/fr/zh messages.

The editor validates both the returned post shape and its identity before accepting
PATCH success. Failures retain edits; pending controls and the detail close/context
navigation are locked. Detail-owned saved feedback survives the editor's updatedAt
remount. The returned post updates the detail and its originating list immediately,
without waiting for a revision fetch; PATCH omission of comments preserves the loaded
comment tree. Stream and my-planet reconcile updates/deletes through the grid; the home
dashboard updates/removes its carousel entries directly and has explicit post-read
loading/error/retry states.

PostGrid uses a callback ref, abort controllers, and request generations for first-page,
filter, refresh, and paging requests. Pages are validated and deduplicated; failures
retain loaded cards and offer retry rather than becoming successful empty results.
Local mutations respect the API's category/tag/search/author matching semantics, and
deleted IDs remain tombstoned in the mounted grid. Refresh retains existing cards and
the paging boundary after paging, repairs a locally deleted boundary, and keeps newly
created cards prepended instead of moving them behind older cards after refresh.

Origin hints only accept exact `/stream`, `/my-planet`, or `/` paths. Existing bounded
post IDs and galaxy/activity return helpers remain in the chain; arbitrary URLs, query
redirects, encoded paths, and other destinations are rejected. Both the original-post
return link and related-signal links carry that origin through contextual pages.
Closing a local detail only updates local selection state. Context navigation captures a session-local
filter/scroll snapshot; a direct detail close returns to the originating page, and
restoration waits for the list's ready signal rather than scrolling against a loading
skeleton. Storage failure is logged. Snapshots are consumed once and restoration is
bounded to ten seconds; content removed during a round trip may make the old absolute
scroll offset unreachable. Ordinary publishing/prepending can change masonry geometry
through normal browser scroll anchoring; a subsequent refresh does not reorder that
local prepend or clear the existing list.

## Changed surfaces

The typography/context visual follow-up keeps the existing data and navigation
contracts. Creation and editing use softer, focus-visible writing areas and a
lightweight galaxy/activity selector with search, pagination, clear, and audience
disclosure preserved. Published context is a compact orbit-labelled galaxy chip
and secondary activity line, not a separate boxed panel. Text-only cards retain
line breaks and use natural content height; text-only details use a single reading
column instead of repeating the same content in a decorative left panel.

| Files | Responsibility |
| --- | --- |
| [CreatePostModal](../components/stream/CreatePostModal.tsx) | Truthful publishing, guards, failure retention, full reset, preview cleanup |
| [PostEditor](../components/stream/PostEditor.tsx), [PostDetail](../components/stream/PostDetail.tsx) | Validated edits/reads, pending locks, immediate propagation, preserved comments, saved status |
| [PostGrid](../components/stream/PostGrid.tsx), [PostCard](../components/stream/PostCard.tsx) | Safe requests, filter-aware reconciliation, retry/deduplication, card origin wiring |
| [Stream](../app/stream/page.tsx), [My Planet](../app/my-planet/page.tsx), [HomeDashboard](../app/HomeDashboard.tsx) | Parent feedback/list updates and session-local return state |
| [Stream route loading](../app/stream/loading.tsx), [PlanetLoadingState](../components/planet/PlanetLoadingState.tsx), [Post detail loading](../components/stream/PostDetailSkeleton.tsx) | Shared SVG planet animation for route, list, paging, and detail; optional localized accessible label |
| [Direct detail](../app/stream/[id]/page.tsx), [PostContextCard](../components/stream/PostContextCard.tsx), [PostReturnLink](../components/stream/PostReturnLink.tsx), [RelatedSignals](../components/stream/RelatedSignals.tsx), [post-return](../lib/post-return.ts) | Bounded origin/context navigation and safe direct exits |
| [stream-workflow](../lib/stream-workflow.ts), [useStreamReturn](../lib/hooks/useStreamReturn.ts) | Shared response validation, error/filter semantics, bounded session restoration |
| [English](../messages/en.json), [French](../messages/fr.json), [Chinese](../messages/zh.json) | All new status/error/return copy |
| [Browser tests](../e2e/demo/post-context-return.spec.ts), [Unit tests](../tests/stream-workflow.test.mjs) | Targeted no-DB workflow coverage and helper contracts |
| [Beta execution](./beta-execution.md), this review | Implementation log, verification, and unchanged release boundaries |

The pre-existing [PostDetailSkeleton](../components/stream/PostDetailSkeleton.tsx) and
its pending page/detail/test/documentation changes are retained, not replaced.

## Verification

- Typography/context follow-up: production build, typecheck, targeted lint,
  `git diff --check`, and 59 localized UI/helper tests passed.
- Typography/context browser run: **52 passed**, no retries, desktop/mobile
  Chromium in en/fr/zh on port 3113. Coverage includes long unbroken content and
  galaxy names without horizontal overflow, a single text-only detail reading
  column, creation/context selection, edit/publish retention and feedback, filter
  reconciliation, and galaxy/activity return links. French and Chinese desktop
  and mobile screenshots were inspected. Session-local configuration was removed;
  screenshot artifacts remain outside the repository. Safari remains unverified.

- Shared-loader visual follow-up: production build, typecheck, targeted lint, and
  `git diff --check` passed. Typecheck was rerun after build regenerated `.next/types`;
  the initial concurrent check raced with build's type generation.
- Shared-loader delayed-response tests: **20 passed** across desktop/mobile Chromium
  and en/fr/zh on isolated port 3113. They verify the actual shared SVG, localized
  busy status, reduced-motion-disabled SVG animations, responsive size, replacement
  with verified content, and closing a pending overlay. An initial test-only nesting
  error was corrected before the passing run. Temporary configuration was removed.
  Earlier workflow results below predate this visual-only follow-up.

- Final release checks run for this review:
  - `npm run lint`: passed with 0 errors and 17 warnings (12 internal-navigation
    warnings, 3 hook-dependency warnings, and 2 unused-variable warnings).
  - `npm test`: passed, 31 tests.
  - `npx prisma validate`: passed; no Prisma schema changes were made and no
    database was accessed.
- Other same-session verification recorded from the implementation work, not rerun
  during this final check:
  - `npm run build` and `npm run typecheck`: passed.
  - Targeted lint over the touched frontend/helper/test surfaces: 0 errors or warnings.
  - `node --import ./tests/register.mjs --test tests/stream-workflow.test.mjs
    tests/galaxy-workflow-ui.test.mjs`: 63 passed. Includes payload validation, exact
    filter semantics, known API-error mappings, and allowlisted return chains.
  - Main-session `npm run typecheck` and four focused stream-workflow helper tests:
    passed.
- Focused Playwright suite in `e2e/demo/post-context-return.spec.ts` covers the existing
  36 desktop/mobile loading checks plus delayed publication, failure draft/media
  retention, duplicate/pending-close guards, immediate close and persistent success,
  category reset, invalid PATCH success, comment preservation, edit propagation on all
  three parent surfaces, filter reconciliation, stale pages, paging retry/deduplication,
  refresh scroll stability, preview URL cleanup, and safe originating-page returns.
  Final combined desktop/mobile Chromium run: **90 passed**, no retries (4.9 minutes).
  Command: `npx playwright test --config=<session-local-config>
  post-context-return.spec.ts --project=desktop --project=mobile`.
- Browser checks use a production server on port 3112 and a temporary session-local
  configuration because port 3100 is occupied. All API responses are intercepted
  fixtures, not production fallback data. The isolated server uses a non-serving
  loopback test database URL; no database fixtures are needed.
- iPhone Safari/WebKit: not verified locally. In the earlier skeleton-only run, the first test failed during
  navigation with `WebKit encountered an internal error`; execution stopped
  after that failure. It was not rerun in this increment. Chromium success does not
  establish Safari compatibility.
- No database fixtures, migrations, seeds, or database-dependent tests were run.
- The production build, typecheck, targeted tests, and Chromium suite were not rerun
  during this final verification pass. CI status was not checked.

## Release boundaries

This change completes the global stream `Post` frontend workflow, not request latency,
measured upload/download progress, or messaging delivery. It does not change backend
routes, authorization, database records/schema, deployment settings, the CommunityPost
model/editor, or the media storage/deletion lifecycle. Drafts remain in component memory,
not durable database drafts. A local pending-click guard is not server idempotency:
an accepted request whose response is lost can still be duplicated on manual retry.
PATCH retains the existing content/context-only contract; category, tags, and media
editing are not expanded here. No schema, migration, deployment, commit, or push was
performed; the pending skeleton work and untracked upload were preserved. Physical
iPhone Safari verification and CI status remain unverified in this final review.

The remaining beta launch gates in `beta-execution.md` are not closed by this
change: root-cause the WebKit post-sign-in redirect timing race; provide the legal
entity name/address, support and privacy contacts, jurisdiction, retention periods,
and processor list; finalize review of the Terms of Service, Privacy Policy, and
Community Guidelines; staff moderation; complete recovery email, content CRUD and
media lifecycle, reliable message delivery, and progressive onboarding; perform a
staging restore drill; confirm exposed credentials have been rotated in the secret
manager; and obtain production release sign-off. These remain open regardless of
the passing checks above.
