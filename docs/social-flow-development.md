# Social flow development plan and stage-one implementation

Updated: 2026-10-04 (Europe/Paris). Canonical backlog:
`product-flow-verification-backlog.md`. Star-map implementation: MR #23 merged,
`star-map-production.md`; deployment and browser/device acceptance unconfirmed.

## Staged work

| Stage | Scope | Implementation status | Acceptance status |
| --- | --- | --- | --- |
| 1 | Conversations, notifications and unread synchronization | Implemented in this change | Real Prisma/PostgreSQL fixture workflow checks; browser/multi-account checks pending |
| 2 | Discovery → planet → message/beam, orbit save, follow | Contact, follow and save server boundaries improved; current beam meaning clarified | Route lifecycle exercised; discovery UI/real multi-account/device acceptance pending |
| 3 | Star-map exploration and return navigation | First real-data version merged in MR #23 | Browser gestures, visual clarity and physical iPhone performance pending |
| 4 | Activity entry, interested collection and feed associations | Entry, private interests and optional Post associations implemented | 74 database/locale tests; context migration and browser/multi-account acceptance pending |

### Stage 1: concrete behavior

- Conversation list: bounded pages (30 default, limit ≤50), last-message preview, one
  filtered unread count per thread in the query, cursor header for existing array clients.
- Message history: latest 40, earlier-history pagination with no omitted lookahead row.
  GET has no read side effects. PATCH acknowledges ≤50 displayed IDs for that recipient
  and conversation; a concurrent new arrival remains unread. Sends and read confirmations
  lock the same parent thread row to prevent a new notice being swept into a completed read. Message notifications become
  read only after the thread has no unread received messages.
- Message sends retain clientMessageId deduplication and rate limits. Opening a thread
  never sends. A new thread requires mutual follows; an established thread can continue
  after a follow lapses, unless blocked or the recipient is deleted.
- Inbox and conversation reads obey bidirectional blocks. Private planet images are
  withheld when profile visibility no longer permits them. Deleted users' historic text
  remains readable; their accounts cannot receive new contact.
- Visible conversations poll for new messages/read receipts; pending drafts persist on
  send failure. Own/received message identity comes from viewerId rather than a second me
  fetch. Earlier history uses an explicit load action.
- Notifications have owner-bound pagination and strict read-body validation. Relative
  times and controls are localized; mutation failures retain old state. Stored targets
  are sanitized to internal application paths. Opening a notice does not authorize its
  target: the destination still checks permissions.
- Bell/space/list refresh after local read/send actions and window focus. Notifications
  and direct-message unread counts remain separate. Marking all notifications read does
  not mark conversation messages read.
- Future notification templates resolve recipient language (en/zh/fr), including follow,
  comments/replies, galaxy posts and level progression. Existing stored English notices
  keep their original text; no speculative rewriting of old data.

### Stage 2: current server-path verification

Following creates the relation and recipient-localized notice atomically, with duplicate
requests creating neither duplicate edge nor notice. Blocks win in status/list queries.
Orbit saving validates JSON/fields, is idempotent, rejects own/inactive/unavailable planets,
and never lets another user delete the owner's save. Hidden/inactive planets disappear
from orbit responses. Detail/list avatar configuration uses the existing shared resolver.

A "beam" currently opens the existing text-message workflow. UI copy clarifies that opening
is not delivery and mutual following is required to start. A separate unsolicited beam
invitation and accept/reject flow would require an explicit product/model decision; it is
not silently invented here. Existing independent routes for discovery, orbit and follows
still need desktop/mobile end-to-end acceptance.

### Next priority: star-map planet actions (recorded 2026-10-04)

Scheduled before Post→Community/Event associations. Shared save/follow/beam controls,
My Planet and mobile relationship entries, failure handling and focus/action refresh are
implemented in the current slice; see `planet-action-flow-review.md`. Server/locale/transport
checks are separate from pending deployed browser acceptance. Independent invitations and
social relationship graphics on the map remain proposals.

1. Unify actions across star-map detail handoff, planet detail, discovery/resonance
   previews and saved cards. Fix the detail link `/saved?add=...`: the saved page
   currently does not consume `add`, so navigation alone does not persist a save.
   Prefer a shared save/remove action with explicit success, failure and retry states.
2. Give My Planet clear entry points to private saved orbit and relationships, reusing
   `/saved` and `/relationships`. Distinguish saved, following, followers and mutual
   follows; preserve five mobile bottom tabs and avoid duplicate destination pages.
3. Complete follow/unfollow failure handling, persistence and cross-entry refresh.
   Follow creates one recipient-localized notice; saving remains private and sends no
   notice. An unsuccessful removal must retain the prior state.
4. Explain current beam behavior at every entry: opening a conversation is not sending
   a message; a new conversation requires mutual follows. Guide non-mutual users to
   follow/relationship status, then support composer→send→recipient notice→read→reply.
   Existing threads remain usable after unfollow unless blocked or otherwise unavailable.
5. Decide separately whether beam becomes an invitation with send/receive/accept/reject
   states. This mechanism is not implemented or authorized by recording the plan;
   define permissions, rate limits, notifications and schema before developing it.
6. Reflect saved/following/mutual/chat status in permitted planet previews and lists,
   and restore selection/filter/view on return to the map. Never infer real social edges
   from decorative clusters or recommendation scores; avoid rings and conspicuous
   border lines. Exact map presentation remains a design decision.
7. Verify two accounts on desktop/mobile in en/zh/fr: save→refresh→orbit→remove;
   follow→notice→follow-back→chat→send→read→reply; failed writes, duplicate clicks,
   own planets, unauthenticated access, private/blocked/deleted/inactive targets,
   membership/visibility changes, custom avatars and return-state synchronization.
   Record server tests and real browser acceptance separately.

### Stage 4: current delivery

Steps 1–2 are implemented in `activity-interest-review.md`: canonical `/activities`, private
interest saves independent of attendance, lifecycle retention and personal history. The
user reports the previous unified resonance release deployed; this does not establish
browser acceptance for the new activity slice. The user reports MR #28 deployed. Optional Post associations, contextual cards and separate
related-signal sections are now implemented; see `post-context-review.md`. This report does
not establish deployed multi-account acceptance for either slice.

### Stage 4: implementation sequence

1. Add event-interest storage independent of RSVP and capacity, with unique user/event
   identity, owner-only removal and permitted event visibility. Prefer an additive migration;
   retention/cancellation rules must be documented and tested before deployment.
2. Expose Activities prominently, reuse the event page and split discovery, interested and
   personal participation. Preserve the five-item mobile navigation and avoid duplicate pages.
3. Add optional Post→Community/Event associations with write/read permission checks and
   automatic galaxy consistency when choosing an event. Preserve Post vs CommunityPost per
   ADR 0001; record a new ADR before any model-merging proposal.
4. Show contextual activity/galaxy cards and approved related signals on detail pages.
   Expired/deleted/private targets must not expose hidden metadata.
5. Verify author/member/outsider/organizer/admin cases and all locales, then deployed
   multi-account discovery→interest→join→RSVP→review→cancel/history flows.

## Verification limits

### Current next-development queue — 2026-10-05

The earlier "pending" entries describe their delivery dates, not the current state.
Core message/notification, planet actions, activity interest and linked Post flows
are implemented. MR30 deployed desktop recheck closes duplicated event sections,
stale attendee/management lists and unavailable-Post copy in en/fr/zh; see the
2026-10-05 section proposed in MR31. Full acceptance remains incomplete.

Development still remains beyond acceptance:

1. Recommended next slice: permitted saved/following/mutual/existing-conversation
   status in star-map previews and lists, with state synchronization when returning
   from detail or chat. This is proposed work, not claimed implemented or started.
2. Independent beam invitations (send, receive, accept/reject, then chat) remain a
   product decision. Current beams open chat; new chats require mutual follows.
   Define privacy, notification, anti-spam and lifecycle rules before introducing
   invitation storage. Recording this queue does not authorize a new invitation model.
3. Personal exploration routes and temporary activity clusters remain gameplay
   proposals. Define the actual objects, permissions and destinations first; decorative
   links must never be presented as real social relationships.

Current maintenance slice replaces hardcoded galaxy post/reply loading and empty
copy in all three locales, and translates the stats maturity value. The isolated
database/locale suite now passes 77 checks, including added three-language request,
full-capacity, pending withdrawal and approved withdrawal button cases. This does
not close live attendance-approval/capacity, fresh incoming-only chat, Miro's access
after approval, physical mobile/Safari, or complete avatar/language acceptance.

The embedded PostgreSQL test harness uses real migrations, Prisma, permissions, transaction
logic, notifications and rate-limit buckets; authentication alone uses fixture identities.
It covers messaging retries, concurrent-arrival read preservation, outsiders/blocks, private
avatars, deleted users, message and notification pages, owner-only mutation, internal target
sanitization, localized follow notices and save idempotence/privacy/ownership.

No production DB writes, migration, deployment or actual user messages are performed.
The embedded engine serializes connections: multi-connection races and physical-device
behavior remain separate acceptance tasks. Browser engines are absent and their earlier
download failed; included browser specifications are not claimed as executed.

Validation: 24 baseline tests and 53 tests reported by the database/locale suite passed; TypeScript and production webpack build passed. ESLint: zero errors, 18 existing warnings. Browser specifications were added but not executed.

## Current slice — personal star map (2026-10-05)

Per the user's instruction, further chat development follows storage configuration.
MR38 is merged. This slice implements an owner-only personal view inside `/star-map`,
using existing saves and outgoing follows rather than introducing another interest table.
See `personal-star-map-review.md` for collection rules, permissions and acceptance limits.

The previous proposed queue above is historical: relationship markers and invitations
are already implemented (MR33/MR34). The next non-chat work is to recheck activity discovery,
interest → membership approval → attendance approval → cancellation/history and organizer
management, then permission-aware return paths between dynamic posts, galaxies and events.
Personal galaxy/event overlays and temporary activity clusters follow separately; they must
use genuine memberships/interests and current visibility, never decorative edges as proof.

## 活动待处理与展示含义（2026-10-05，本轮开发）

- MR39 已合并；聊天后续继续延后至配置之后。
- 活动增加“待我处理”：星系管理员／创建者审批活动提案，组织者／管理员审批报名，
  与自己待审核的报名分开。补审批、人数、列表、取消／历史同步及权限复查。
- 共鸣推荐星球随场景转动，内置纹理自转；定制上传头像保留原图。悬停或键盘聚焦时
  稳定目标，减少动态效果／隐藏／离屏停转；分数和推荐身份不变。
- 星图星系代表真实 Community，成员数不等于可见星球数；粒子不代表成员名单。
  星系数量和成员单位、节点入口、三语说明区分清楚，并排除注销账号的成员数。
- 本轮实现与验收边界见 `activity-review-motion-review.md`；浏览器／真机仍待验收。
- 后续仍需完善动态与星系／活动的返回链路，以及个人星图的真实成员／活动叠层。

## 动态与星系／活动返回（2026-10-05，本轮开发）

- 接续仍开放的 MR40：动态关联卡片 → 星系／活动 → 返回原动态；
  关联动态 → 详情 → 关闭／删除／失效后返回来源。导航提示不授予权限。
- 同星系切换活动 URL 会更新详情；动态、关联列表、活动详情在回到前台时复查，
  读取失败清除旧内容。旧分页、详情与互动请求不能复活已失效或关闭的视图。
- 英／法／中返回、读取失败文案齐全。146 项自动检查通过；浏览器 33 个项目用例
  已发现，实际运行因缺 Chromium 引擎在启动时阻塞，浏览器／真机验收仍未完成。
- 详见 `post-context-return-review.md`。无迁移／新配置／生产写入，未部署。
- 下一轮：个人星图的真实星系成员、感兴趣／参加活动叠层；聊天继续等配置后开发。

## 个人星图星系／活动图层（2026-10-05）

- 接续 MR41：个人星图增加星球、已创建／已加入星系、个人活动三个独立图层。
- 活动按真实兴趣／报名去重，区分感兴趣、报名已通过、待审核、结束／取消／退出；
  待审核的星系申请不算加入，兴趣不等于报名。未通过报名但仍有兴趣会明确显示拒绝状态。
- 每层沿用地图／列表、搜索、分组、分页及位置恢复；星系／活动详情返回原图层与视图。
- 实时成员／组织者可见性、屏蔽／注销、退出星系生效；24 条有界分页并校验游标权限。
- 158 项自动测试通过；浏览器规范已发现 9 个项目用例，实际浏览器／真机验收另行确认。
- 实现与验收限制见 personal-map-context-review.md。无迁移、新配置、生产写入或部署。
- 后续再考虑自身星球中心、混合关系叠层和有期限的活动星群；聊天仍等配置后继续。

## 个人星图自身中心（2026-10-05）

- 接续 MR42：当前活跃的自身星球单独作为地图中心／列表摘要，不计入任何收藏或图层数量。
- 真实账户读取、原始定制头像同步、停用／替换和前台更新；缺少星球时仍可查看收藏并进入创建。
- 中心详情返回原图层／地图或列表；聚焦分组隐藏中心，回到概览恢复。
- 内置纹理沿用轻量 CSS 转动，定制图静态，尊重减少动态／后台／可见性并清理监听。
- 167 项自动测试通过；en／fr／zh 文案与浏览器规范齐全，浏览器／真机结果单独记录。
- 实现、计数含义与验收限制见 personal-map-center-review.md。无迁移、生产写入或部署。
- 下一步：清晰区分单位的混合关系叠层，以及有期限和权限规则的活动星群；聊天继续等配置。

## 个人星图真实关系展示（2026-10-05，MR43 合并后）

- MR43 已于 16:58 UTC 合并到 main，Vercel 合并提交状态为 success；MR40–42 无需另行合并。
- 个人总览改为自身中心连接当前批次的真实对象，移除个人视图中指向装饰粒子／分组中心的线。
- 收藏点线、主动关注单向箭头、互关双向箭头可组合；创建星系和实际成员关系分别读取。
- 活动兴趣、报名待审核、报名已通过分别展示；历史／退出只显示历史线，不暗示正在参加。
- 各层有三语图例，列表／详情显示同一关系说明；保留独立计数、分页、权限与前台刷新。
- 175 项自动检查、类型检查、改动文件 ESLint、1742 个三语文案键及生产 webpack 构建通过。
- 线上 MR43 的法语桌面已有会话只读验收包含中心详情返回、分层地图／列表、星系与成员单位、
  活动结束／退出历史以及活动关联动态返回。完整审批操作、多账号权限变化、头像修改同步、
  手机交互和新关系绘制的视觉验收仍未完成；不将自动测试当作生产验收。
- 新关系浏览器规范含 9 个项目用例；实际英文桌面尝试在缺 Chromium 引擎时启动失败。
  引擎下载为空／损坏，未执行场景。无迁移、新配置或生产写入；合并与部署由维护者处理。
- 详见 personal-map-relations-review.md。下一轮活动星群仍待开发，聊天仍等配置完成。
