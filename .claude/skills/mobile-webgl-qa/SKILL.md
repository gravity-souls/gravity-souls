---
name: mobile-webgl-qa
description: Read-only checklist for the WebGL/canvas fx layer and iPhone Safari behavior - pixel-ratio capping, webglcontextlost recovery, passive touch listeners, prefers-reduced-motion handling, safe-area-inset usage, and the known gap that PlanetGlobe.tsx's R3F useFrame callbacks have no memo anywhere. Use for any change to components/fx/**, components/planet/PlanetGlobe.tsx, or a request to QA visual/mobile behavior. Do not use for non-visual backend work or UI components with no canvas/WebGL surface.
---

# Mobile / WebGL QA

`components/fx/CosmicGlobe.tsx` is the reference implementation for everything in this
checklist — it's the one component that already handles all of these correctly.
`docs/cosmic-globe-review.md` is the reference format for reporting findings.

## Checklist

- **Context loss**: a `webglcontextlost` listener exists and cleans up/recovers (iOS
  Safari drops WebGL contexts under memory pressure routinely — this is not a hypothetical
  edge case here).
- **Pixel ratio**: capped per viewport (`CosmicGlobe.tsx` caps at `1` on narrow screens,
  `1.5` on desktop) rather than using raw `devicePixelRatio`.
- **Reduced motion**: respects `prefers-reduced-motion` (see
  `lib/hooks/useBrowserPreferences.ts`'s `useReducedMotionPreference`) — animation-heavy
  components should render a static state initially and require an explicit opt-in to
  animate, not assume motion is fine.
- **Pause on hidden/offscreen**: rendering stops when the tab is hidden or the canvas is
  offscreen, not just when explicitly paused.
- **Touch handling**: pointer/touch listeners are `{ passive: true }` and `touchAction` is
  scoped (e.g. `pan-y pinch-zoom`) so the component doesn't block page scroll.
- **Dispose registry**: any three.js resource created has a matching disposal path (see
  `CosmicGlobe.tsx`'s `disposables.push({dispose(){...}})` pattern) — a new canvas
  component that leaks GPU resources on unmount is a real regression, not a style nit.
- **Safe area**: bottom-fixed mobile UI (nav, controls) accounts for
  `env(safe-area-inset-bottom)` — currently only `components/nav/SideNav.tsx` does this;
  new fixed-position mobile UI should follow the same pattern.
- **`memo` usage**: `components/planet/PlanetGlobe.tsx` (the actual React Three Fiber
  consumer — `Canvas`/`useFrame` ×3) currently has **no `memo` anywhere**. This is a known,
  flagged gap, not yet fixed — treat any further `useFrame` addition there as a chance to
  assess whether it's now a real frame-budget problem, without assuming it already is.

## Reads first

`components/fx/CosmicGlobe.tsx`, `docs/cosmic-globe-review.md`.

## Output

A findings list (pass/fail per checklist item), consumed by the `visual-mobile-qa` agent's
report — this skill does not fix anything itself.
