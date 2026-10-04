# Star map reference preview (superseded)

The illustrative preview has been replaced by `/star-map`; see `star-map-production.md`. The old demo URL redirects to the real-data map. The notes below describe the earlier prototype.

Date: 2026-10-04. Route: `/demo/star-map` (public, illustrative data only).

The supplied 10.78-second video shows coloured particle clusters, fine connections,
a central light, continuous perspective changes and contextual cards. This preview
adapts those visual principles to Gravity Souls with five decorative constellations,
rotation, drag selection, zoom buttons, pause/reset and translated cards. It does not
copy the video's agent-management dashboard or imply real social relationships.

This is a Canvas 2D projection of 3D particles, not a WebGL scene. Decorative particles
are deterministic. There are no account reads/writes or API calls. It does not replace
production resonance, discovery or universe pages. Connecting real visible entities,
custom avatars and existing interaction paths remains a separate implementation.

## Verification

- TypeScript, changed-file ESLint and Next.js production webpack build passed.
- New Playwright cases cover selection/reset/zoom, reduced motion, en/fr/zh and
  desktop/mobile layout. They have NOT run: the environment lacks browser engines,
  and the browser download returned invalid/truncated archives.
- Visual fidelity, hit testing, frame performance and physical iPhone touch behavior
  remain unverified; do not mark the preview as browser accepted.
- Pixel ratio is capped at 1 on mobile and 1.5 on desktop; animation pauses when hidden
  or offscreen, honours reduced motion and disposes observers/listeners on unmount.
- No WebGL contexts/resources are used. Touch permits page scroll and browser pinch
  zoom, with explicit map zoom controls. Cluster buttons are the keyboard/list alternative.

After deployment, open `/demo/star-map`, review the motion and layout, and run
`npm run test:e2e -- star-map.spec.ts` with the supported browser engines installed.
