# Personal star map: own center planet

The personal map now places the viewer's current active planet at its center in
overview, or once above the list toolbar. It is a separate `selfPlanet`, never a
collection node: it does not increment planet, galaxy, activity or group counts.
Search and collection filters apply to collections, not to the owner center.
Focusing a group hides the center; returning to overview restores it.

## Data and permissions

The existing authenticated, live-viewer star-map route reads only that viewer's
latest active planet, with a stable ID tie-break. Owners can see their own private
planet. Caller-selected owners remain rejected, and public/global modes omit the
center entirely. Responses remain private/no-store. No new schema or write path.

The shared canonical appearance resolver supplies current custom texture and
configuration; rings remain disabled. Foreground refresh rereads the owner name
and avatar. Inactive/deleted planets disappear; a replacement active planet becomes
the center. A missing active planet provides the existing onboarding link without
blocking collections. Failed reads clear old center data rather than implying the
viewer has no planet. No owner metadata is persisted in session storage.

The native center link uses existing fixed personal return origins, preserving
planet collection or galaxy/activity layer and map/list view after planet details.
Navigation hints grant no access and create no saves, follows, beams or notices.

## Rendering and motion

The existing lightweight PlanetAvatar renders the original custom portrait
statically. Built-in textures rotate through existing CSS at 24 seconds per cycle
only in overview, when visible and the document is active, unless reduced motion
is requested. SSR and list summaries are static. Observer and visibility listeners
clean up on unmount/change; no WebGL renderer is added. All copy is en/fr/zh.

Personal cluster centers reserve model-space origin even with a single group.
Global layout remains unchanged. This is not a guarantee that every projected
particle avoids the center at every camera angle; overlap and physical touch need
visual acceptance. Empty-map prompts sit below the center rather than covering it.

## Validation and release

- 143 real SQL/component/navigation checks and 24 baseline tests pass (167 total).
  New cases cover all personal layers, counter exclusion, private owner access,
  outsider isolation, forged owner rejection, global omission, updated original
  avatar/name, inactivity, replacement, deleted viewer and mutation absence.
- Component checks render en/fr/zh center links, static original images, count
  explanation and onboarding fallback; layout checks reserve model-space origin.
- TypeScript, changed-file ESLint (zero warnings/errors), 1,730 locale-key parity
  and production webpack build pass.
- Browser scenarios cover list/map return, singleton center, original image,
  foreground updates, inactive fallback and failed-read clearing in en/fr/zh across
  desktop, mobile and iPhone WebKit (nine discovered project cases). An actual
  desktop run stopped before any scenario: Chromium headless shell 1228 is absent.
  All nine browser cases and physical-device acceptance remain unverified.
- Embedded PostgreSQL serializes connections. Real multi-connection races,
  production multi-account acceptance and physical devices remain unverified.

Stacked on MR42, following MR41 and MR40. Merge prerequisites first, then retarget
or rebase onto main. No new service/configuration, migration, production write or
deployment. Rollback is a code revert. Future slices: explicit mixed relationship
overlays and temporary activity constellations with lifetime and visibility rules.
Chat follow-up remains deferred until configuration.
