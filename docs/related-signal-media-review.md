# Related signal media preview review

Related galaxy/activity signals now use a manually scrollable horizontal card
strip rather than an expanding grid or boxed thumbnail rows. Each card places its
author above a wide 16:10 media preview and its text below. Native touch scrolling,
keyboard arrows and localized previous/next controls reuse HorizontalCarousel.
Scrolling near the end requests the next three signals, with a manual more-button
fallback. No automatic movement or autoplay is added. The section header
uses a subtle orbit/divider treatment without another surrounding panel.
Images load lazily; videos request metadata only and remain muted,
inline, paused, and without native controls. Multi-item posts show a count badge,
and media load failures display an explicit localized message in en/fr/zh.

## Verification

- Manual-carousel follow-up: production build, typecheck, targeted lint, and 66
  shared UI/workflow/media tests passed. Related preview/navigation/video/refresh
  browser checks passed (16 cases); end-scroll paging checks passed on desktop
  and mobile (2 cases). An initial mobile test incorrectly assumed one arrow
  click reached the end; it was corrected to scroll to the actual end.
  Tests verify no automatic initial paging, deduplicated pending requests,
  unchanged strip height after append, exhausted pagination, and keyboard
  scrolling with reduced motion. Paging failures retain loaded cards and show
  retry; foreground access rechecks still clear stale content.
  Earlier single-column/grid layout evidence below predates this carousel.

- Card-arrangement follow-up: production build, typecheck, targeted lint, seven
  workflow/media contract tests, and `git diff --check` passed.
- Updated card-layout browser run: 16 desktop/mobile Chromium tests passed in
  en/fr/zh, including both galaxy and activity views, wide previews with text
  below, mobile single-column placement, attachment counts, explicit media
  failures, real paused video metadata, and contextual return/late-page behavior.
  Desktop Chinese and mobile French screenshot artifacts were inspected.
  Temporary isolated-server configuration was removed. Earlier checks below
  cover the initial media implementation; Safari remains unverified.

- `npm run build`: passed earlier this turn.
- `npm run typecheck`: passed after the generated-video test type-guard fix.
- `npm run lint`: zero errors, 17 warnings in unrelated existing files.
- `npm test`: 31 tests passed.
- `node --import ./tests/register.mjs --test tests/stream-workflow.test.mjs`:
  7 tests passed, including localized image/video markup checks.
- `npx prisma validate`: passed.
- `git diff --check`: passed.
- en/fr/zh translation-key parity: exact (verified earlier this turn).
- Focused browser coverage: 14 desktop/mobile Chromium cases passed earlier
  this turn across galaxy/activity contexts and all locales, including image,
  multi-item badge, text-only, failed video, return navigation, and late-page
  regression behavior.
- Generated real WebM metadata preview: passed in desktop and mobile Chromium
  (2 checks, rerun after the test type fix). The browser confirmed metadata
  loaded and the video remained paused, muted, inline, without autoplay or
  native controls.

## Release boundaries

No database calls, real database fixtures, or real storage fixtures were used.
The browser tests use intercepted API/media responses; the generated WebM is a
browser test fixture, not a production upload. Physical iPhone Safari was not
tested. No thumbnail or poster generation is added: a video preview depends on
the media's encoding/browser metadata behavior and displays the browser's
available video frame behind a play overlay.

This UI does not change the existing media access model: uploaded media URLs
remain public/shareable and cannot be revoked by hiding a preview. Content
CRUD/media lifecycle remains a separate launch gate. The related-signal preview
does not close any other open beta launch gates:

- The Terms of Service, Privacy Policy, and Community Guidelines remain drafts
  until the founder supplies the legal entity name/address, support/privacy
  contact, jurisdiction, retention periods, and processor list. They must not
  be treated as binding before that review.
- Recovery email, complete content CRUD/media lifecycle, reliable message
  delivery, and progressive onboarding remain separate work.
- The staging restore drill is still required.
- Confirm exposed credentials have been rotated in the secret manager; never
  include replacement credentials in this review.
- The WebKit post-sign-in redirect timing race remains mitigated by a CI-only
  retry but has not been root-caused. This increment did not verify physical
  Safari behavior.

Follow/block enforcement, visibility, moderation/reporting, data-rights
workflows, and policy-acceptance logging are recorded as shipped launch gates;
this review did not re-audit them.
