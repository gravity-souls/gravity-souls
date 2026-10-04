# Real-data star map: first production implementation

Date: 2026-10-04. Route: `/star-map?mode=discover|galaxies|resonance`.
The old `/demo/star-map` URL redirects to the authenticated real-data map.
No migration, account mutation or production deployment is required by this change.

## Meaning and exploration

- Discover: clusters are self-described planet climates, not inferred psychological labels.
  Counts use the same server-side discovery predicate as object queries. Own, blocked,
  inactive and private planets are excluded from discovery. Private-detail permissions
  remain governed by existing profile visibility rules.
- Galaxies: each cluster is one Community, with its real membership count. A constellation
  does not imply that its members are publicly listed. The map returns no member roster.
- Resonance: six groups and their colours reuse the existing orbit reasons. Scores reuse
  `buildOrbitMatches`; the source and candidates use actual stored mood/style/themes,
  lifestyle and cognitive axes. Scores rank the loaded batch, not the entire population.
- Ambient particles are decorative, not one particle per user. Selectable nodes are real
  entities. Lines guide discovery; they never imply a sent beam or established connection.
- Enter a cluster, choose a node, read its actual name/avatar/description, then open the
  planet or galaxy detail. Existing detail flows own beams, orbit saves, follows, membership
  and events; their previously recorded acceptance backlog still applies.

## Interaction and scale

- No pause, refresh/reset or +/- buttons. Wheel/trackpad and two-finger pinch zoom;
  drag rotates. Zooming in enters the nearest cluster; zooming out returns to overview.
  A semantic Back to overview action and keyboard/list alternatives remain available.
- The interactive canvas owns touch gestures. Surrounding page areas remain scrollable.
  Canvas +/− keyboard controls provide zoom; Escape returns to overview.
- System reduced motion is respected, with no playback override. Focused views keep selectable objects stable while decorative particles rotate locally.
  Selected built-in planet textures drift slowly; custom uploaded images retain their framing.
- At most 36 planets or 24 galaxies per batch; no growing in-memory universe. Search
  and discovery climate selection narrow queries. Climate counts aggregate in the DB;
  resonance counts describe the current batch. Cursor pagination uses the final returned
  ID, not the excluded lookahead row. No per-node telemetry queries.
- Decorative particles are capped at 2,000. Labels show only for small groups or a selected
  node, with a full selectable HTML list. Pixel ratio caps at 1/mobile and 1.5/desktop;
  hidden/offscreen rendering stops and observers/listeners clean up.
- Per-tab session storage retains mode-specific search, batch, group, node and camera for
  return navigation. Freshly fetched data remains authoritative; unavailable nodes disappear.
- Future work at much larger scale: indexed search/counted query profiling, spatial tiles
  and GPU instancing if measured performance requires it; no claim of million-node readiness.

## Reuse and possible play

Desktop navigation exposes the map. Discover, Galaxies and Resonance have contextual links
into the corresponding mode. They share one renderer/API contract and preserve existing
list/detail pages; the mobile bottom bar remains five items.

The current loop is exploration → common traits → real detail → existing social action.
Possible later extensions are a personal route through saved planets, temporary constellations
for approved events and resurfacing followed planets. These are ideas, not shipped mechanics;
no new rewards, user tracking or automatic relationship claims have been added.

## Verification and remaining acceptance

Actual isolated PostgreSQL/Prisma route tests cover authentication, query validation,
counts/nodes privacy and block consistency, custom texture, missing own planet, search,
36+4 cursor pages without gaps/duplicates and real galaxy identity/member counts.
React/NextIntl server-rendering tests cover all three modes in en/zh/fr and absent playback
and zoom button labels; CSS modules alone are stubbed in this rendering test.

Browser specifications now cover the production route, node selection/avatars, wheel entry,
reduced motion, translations, failure cleanup and overflow using clearly isolated API fixtures.
Browser execution, visual acceptance and physical iPhone gesture/performance checks are still
pending: the current environment lacks browser engines and their download failed. Fixture
browser tests are not a substitute for deployed multi-account acceptance with real data.

## Layout and motion refinement — 2026-10-04

- Desktop cluster and loaded planet selectors now occupy a right sidebar, including the selected object detail. Mobile uses a collapsible right drawer, with an explicit close action.
- Map/list presentation choices sit above the search and canvas, separately from Discover/Galaxies/Resonance content modes. The list action opens the existing corresponding list page.
- Decorative cluster particles rotate around their local centers, alongside the existing slow overview rotation. Hit targets remain stable in focused views. Reduced motion disables autonomous motion; hidden/offscreen canvas stops rendering. No pause/reset controls added.
- The global texture footer is removed. Asset attribution, the CC BY 4.0 license link and adaptation disclosure live at `/legal/credits`, linked from settings.
- Type/route/locale regression checks and production build are required; browser drawer/overflow/view-switch specifications updated. Local browser/device execution remains separately reported.

Validation for this refinement: 53 database/locale workflow tests passed; TypeScript, production webpack build and lint for changed TS/TSX files passed. The added drawer/layout browser specifications were not executed because the local browser engines remain unavailable.

## Mobile navigation and home reuse — 2026-10-04

The language picker and account menu now remain visible on mobile. The menu provides a bounded-height, scrollable collection of discovery, map, resonance, galaxies, events, saved orbit, search, customization and report routes while keeping five bottom tabs. Search has a real input in that menu.

The authenticated home dashboard replaces its positioned planet field with the real-data map in compact mode, with a side drawer at all widths and a separate per-tab view-state key. The full map and own-planet links remain explicit. Signed-out onboarding showcase remains unchanged.

Decorative local rotation increases to 0.00032 rad/ms (~20 seconds/revolution); overview yaw increases to 0.00007 rad/ms. Selected built-in surface drift uses 24 seconds. Focused node targets stay stationary; reduced-motion and hidden/offscreen guards remain. This is Canvas 2D, with no new WebGL resources. DPR caps and pointer cleanup remain; the canvas captures map gestures, surrounding areas scroll normally. Physical-device performance and visual acceptance remain pending.

Resonance map guidance explains grouping vs up-to-five recommendations. Both use buildOrbitMatches but different loaded candidates; the standalone page's date label does not prove a persisted daily snapshot.

本轮验证：24 项基础测试、56 项数据库/语言流程测试、TypeScript、生产 webpack 构建及变更文件 lint 通过。手机完整菜单与顶部语言入口的浏览器用例已新增；本地没有浏览器引擎，未执行这些用例，部署后及物理 iPhone 验收待完成。
