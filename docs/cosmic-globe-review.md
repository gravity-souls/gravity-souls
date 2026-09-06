# Cosmic Globe release review

Reviewed on September 5, 2026. Baseline: commit `4f1ed6b`, before the guided demo changes.

The public `/demo/cosmic-globe` route now presents three steps with translated
copy, explicit navigation, pause/reset controls, and onboarding/sign-in links.
The mobile primary action fits within a 390 × 844 viewport. The desktop layout
places the story beside the globe; mobile places the globe above the story.

## Verification

- `npm run build`: passed (Next.js 16.2.1 production build).
- `npm run typecheck`: passed.
- `npm run lint`: zero errors, four existing warnings (ParticleBeam effect
  dependencies and three unused variables in the carousel/legacy tests).
- `npm run test:e2e`: 16 production-browser checks passed across desktop and mobile.
- Browser checks cover all steps, keyboard controls, pause/reset, reduced motion,
  language changes without account writes, missing WebGL, context recovery,
  hidden/offscreen rendering, resize, navigation cleanup, onboarding destination,
  readable HTML/CSS fallback with JavaScript disabled, visible ambient movement,
  and explicit Play after the device initially requests reduced motion.
- No database fixtures, migration, seed, or database-dependent tests were run.

## Initial guided-release before/after measurement

These measurements precede the ambient-motion follow-up described below.
Both measurements used production builds, fresh browser contexts, headless
Chromium 149.0.7827.55 on the same machine, device pixel ratio 1, and no explicit
CPU/network throttling. The desktop viewport was 1440 × 900; mobile was 390 × 844.
After network idle and a two-second warmup, requestAnimationFrame intervals were
sampled for three seconds. JavaScript transfer totals come from Resource Timing
entries for script requests, including dynamically loaded JavaScript.

| Metric | Before | After |
| --- | ---: | ---: |
| JavaScript transfer, either viewport | 416,063 B | 364,483 B |
| Encoded JavaScript bodies, either viewport | 412,163 B | 360,583 B |
| Canvas elements | 2 | 1 |
| Desktop frame interval, median | 50.0 ms | 16.7 ms |
| Desktop frame interval, p95 | 50.1 ms | 16.8 ms |
| Mobile frame interval, median | 16.7 ms | 16.7 ms |
| Mobile frame interval, p95 | 16.8 ms | 16.7 ms |

JavaScript transfer fell by 51,580 bytes (12.4%). These are single local samples,
not field performance guarantees or measurements on physical mobile hardware.
The new canvas is also smaller because the page now contains the product story;
the desktop frame improvement reflects the complete layout/rendering change,
not an isolated algorithm benchmark. Frame intervals measure browser scheduling,
not GPU render duration. Mobile timing showed no meaningful change in this sample.

The desktop globe starts with 11,000 particles; narrow-screen initialization uses
5,500. Pixel ratio is capped at 1.5 on desktop and 1 on narrow screens. Rendering
stops when paused, hidden, or offscreen, and reduced motion initially renders static states. An explicit Play action enables
animation for that visit.

## Release boundaries

The demo contains illustrative visuals rather than invented profiles or scores.
Its locale selector writes only the browser locale cookie. The standard app shell
remains on other routes; `/universe/demo` still redirects to Resonance. Backend
pagination, matching, XP concurrency, and replacing mock-data screens are separate
work. The existing database-dependent suite is available through
`npm run test:e2e:db` and requires a dedicated test database.

## Motion follow-up

The initial guided release replaced continuous globe/torus morphing with subtle
rotation. Ambient morphing and stronger breathing/rotation are restored without
automatically advancing the story. Pause freezes the scene. The control now
reflects the effective device preference: visitors requesting reduced motion see
Play, and can explicitly enable animation. That choice stays local to the page.

The development-browser check reproduced WebGL driver ReadPixels performance
warnings, but no application exceptions or Chrome Issues entries. The user's
specific console message is still needed to identify their reported issue.
No public deployment or homepage replacement has been performed.
