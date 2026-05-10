# Gravity Souls — 产品模块架构梳理 v2

> 基于现有架构图 + gravitysouls.com 实际内容 + 对话补充整理
> 版本：2026-05 v2

---

## 一、用户旅程总览

```
新用户                                    老用户
  │                                         │
  ▼                                         ▼
账号创建（Onboarding）              首页 Page
  ├── 基础信息填写                           │
  └── 选择自己的星球（PlanetPicker）         │
                │                           │
                └──────────┬────────────────┘
                           ▼
                      首页 Page（主入口）
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
        Stream         Resonance        Galaxies
        内容流          每日共鸣匹配      星系社区
                                       My Planet
                                        个人主页
```

---

## 二、新用户注册流程（Onboarding）

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1 | 账号创建 | 邮箱或手机号注册，验证码校验 |
| 2 | 绑定账号 | 绑定手机号（验证码） |
| 3 | 平台使用规范 | 隐私政策、法律条款确认 |
| 4 | 基础信息填写 | 姓名、头像、年龄等基本信息 |
| 5 | **选择你的星球** | PlanetPicker — 从 8 颗预设星球中选一颗，决定全站视觉身份 |

> ⏸️ **Questionnaire 暂搁置**：后续高等级用户解锁时可作为深度性格探索功能重新引入

---

## 三、首页 Page（主界面）

### 布局结构

```
顶部导航栏
├── 语言切换（Language）
└── 用户入口

左侧边栏（桌面端）
├── Galaxies
├── Stream
├── Resonance
└── My Planet

主内容区
├── 实时宇宙状态栏（在线星球数 / 活跃星系 / 开放信号）
├── Nearby Planets（附近星球列表）
├── Galaxies 推荐
└── Your Daily Resonance 入口
```

### 实时宇宙状态栏（已上线）

- 12 planets nearby / 4 galaxies awake / 24h open signals
- 用户标签云：搭子 / 孤独 / 深夜 / 文艺表达 / 旅行 / 思考

---

## 四、四大核心模块

### 4.1 Stream（内容流）

| 项目 | 说明 |
|------|------|
| 页面参考 | 类小红书布局 |
| 左侧 | 发现、发布功能入口 |
| 顶部 | 内容搜索栏 |
| 核心功能 | 发帖、互动、点赞、转发 |
| 特性 | 内容实时显示在自己的 Planet 主页上；单点 post 后可查看发布者更多 Planet 信息 |

### 4.2 Resonance（共鸣匹配）

**连接机制（已确认）**：

```
打开 Resonance
      │
      ▼
查看今日 5 个匹配 Planet
      │
      ▼
发送一条破冰信息
      │
      ├── 对方回复 ──→ 建立轨道，可继续聊天 ✅
      │
      └── 对方未回复 ──→ 信号消失，无法继续 ❌
```

| 项目 | 说明 |
|------|------|
| 每日推送 | 5 个匹配 Planet + 6 个推荐 Community |
| 连接门槛 | 发送信息后需对方主动回复才能建立连接 |
| 设计意图 | 防骚扰，保证连接质量，双向意愿才能建立轨道 |

### 4.3 Galaxies（星系社区）

| 项目 | 说明 |
|------|------|
| 现有星系 | Slow Thinkers / Warm Frequency / Signal Noise |
| 右侧 | NASA 风格宇宙背景图 |
| 左侧信息 | Description / X planets 成员数 / Recent discussions / Events |
| Events 三类 | Upcoming event / Create event / Passed events |
| 搜索维度 | 关键词、地点搜索、Category 分类 |
| 参考产品 | meetup.com/find/fr--paris/ |

### 4.4 My Planet（我的星球）

| 模块 | 内容 |
|------|------|
| Hero | 3D 旋转星球（Three.js PlanetGlobe） |
| 基础信息 | 昵称、简介、等级徽章 |
| Planet 自定义 | 按等级解锁的星球参数调整面板 |
| 已匹配星球 | 建立轨道的连接列表 |
| 加入的 Galaxies | 已加入的社区 |
| My Posts | 自己发布的内容流 |
| Match Report | 匹配数据分析报告 |

---

## 五、星球（Planet）视觉系统

### 三层选择体系

```
Layer 1 — 注册时选择（所有用户）
  从 8 颗预设星球选一颗作为起点
        │
        ▼
Layer 2 — 参数自定义（Lv.2 解锁起）
  色盘 + 滑块实时调整，Three.js 预览
        │
        ▼
Layer 3 — 自定义贴图上传（Lv.5 专属）
  上传自己的贴图，完全个性化
```

### 8 颗预设星球

| 星球名 | 贴图文件 | 描述 | 默认光环 |
|--------|---------|------|---------|
| Elaris | jupiter.jpg | The wandering deep thinker | ✅ |
| Astraea | earth_day.jpg | The warm connector | ❌ |
| Orionis | mars.jpg | The restless explorer | ❌ |
| Veylora | neptune.jpg | The silent observer | ❌ |
| Caelion | venus_surface.jpg | The burning creator | ❌ |
| Thalor | mercury.jpg | The hidden sage | ❌ |
| Lunaris | moon.jpg | Lonely but free | ❌ |
| Solenne | saturn.jpg | The one with gravity | ✅ |

### 可自定义参数（按等级逐步解锁）

| 参数 | 控件 | 解锁等级 |
|------|------|---------|
| 底层贴图切换 | 8选1选择器 | Lv.1 |
| 星球基色 tint | 色盘 | Lv.2 |
| 大气层颜色 | 色盘 | Lv.3 |
| 大气层浓度 | 滑块 | Lv.3 |
| 光环开关 + 颜色 | 开关 + 色盘 | Lv.3 |
| 自转速度 | 滑块 | Lv.4 |
| 云层透明度 | 滑块 | Lv.4 |
| 自定义贴图上传 | 文件上传 | Lv.5 |

### 三档渲染方案

| 使用场景 | 尺寸 | 技术 |
|---------|------|------|
| My Planet Hero | 240–320px | Three.js WebGL（自转 + 大气 + 光环） |
| Resonance 匹配卡片 | 80–100px | CSS img + box-shadow glow |
| Galaxies 成员 / Stream 头像 | 40–60px | 纯 `<img>` 圆形裁切 |

### 贴图来源

- **Solar System Scope**：solarsystemscope.com/textures（CC BY 4.0，可商用）
- 规格：2K 版本（2048×1024px）
- 路径：`/public/textures/`
- 页脚注明：*"Planet textures based on NASA data via Solar System Scope (CC BY 4.0)"*

---

## 六、用户等级体系

### 等级划分

| 等级 | 称号 | 解锁条件 | 星球专属权益 | 其他权益 |
|------|------|---------|------------|---------|
| Lv.1 | **Drifting Rock** | 注册即得 | 8 颗预设星球选择 | 基础功能全开放 |
| Lv.2 | **Young Planet** | 发 5 条 Post 或加入 1 个 Galaxy | 星球颜色 tint 自定义 | 可创建 Galaxy |
| Lv.3 | **Orbiting Star** | 完成 3 次 Resonance 成功连接 | 大气层 + 光环完整自定义 | Resonance 每日 +2 个推荐 |
| Lv.4 | **Gravity Field** | 活跃 30 天 + 10 次连接 | 自转速度 + 云层参数 | Match Report 高级版 |
| Lv.5 | **Singularity** | 付费订阅 或 特殊里程碑 | 自定义贴图上传 | 全功能解锁 + 专属徽章 |

### 等级设计意图

- **Lv.1–2**：降低新用户门槛，快速上手
- **Lv.3**：以"成功连接"作为条件，激励用户真正使用 Resonance 核心功能
- **Lv.4**：奖励长期活跃用户，提升留存
- **Lv.5**：付费变现入口，自定义贴图作为高价值功能

> 等级进度可在 My Planet 页面显示，下一等级解锁条件清晰可见，形成持续激励。

---

## 七、数据模型（关键字段）

```javascript
// User
{
  id: String,
  name: String,
  level: Number,           // 1–5
  xp: Number,              // 经验值
  planetConfig: {
    baseTexture: String,   // "jupiter.jpg"
    tintColor: String,     // "#7c4dbf"
    atmosphereColor: String,
    atmosphereDensity: Number,
    hasRing: Boolean,
    ringColor: String,
    rotationSpeed: Number,
    cloudOpacity: Number,
    customTextureUrl: String  // Lv.5 专属
  },
  connections: [UserId],   // 已建立轨道的用户
  galaxies: [GalaxyId],
  posts: [PostId]
}
```

---

## 八、开发阶段规划

| 阶段 | 内容 | 优先级 | 预估工期 |
|------|------|--------|---------|
| **Phase 1** | PlanetPicker 选星球 + PlanetAvatar 全站头像 | 🔴 最高 | 1–2 天 |
| **Phase 2** | Three.js PlanetGlobe（My Planet Hero） | 🔴 最高 | 2–3 天 |
| **Phase 3** | 参数自定义面板（按等级解锁） | 🟡 中 | 3–5 天 |
| **Phase 4** | 用户等级体系（XP 计算 + 解锁逻辑） | 🟡 中 | 3–4 天 |
| **Phase 5** | Galaxies Events 完整实现 | 🟡 中 | 3–4 天 |
| **Phase 6** | Stream 内容流完整化 | 🟡 中 | 3–5 天 |
| **Phase 7** | Match Report 高级版 | 🟢 低 | 2–3 天 |
| **Phase 8** | 自定义贴图上传（Lv.5） | 🟢 低 | 2–3 天 |
| ⏸️ 搁置 | Questionnaire | — | 后续再议 |

---

## 九、核心术语表

| 英文 | 中文 | 说明 |
|------|------|------|
| Planet | 星球 | 每个用户即一颗星球 |
| Galaxy | 星系 | 主题社区 |
| Resonance | 共鸣 | 每日匹配系统 |
| Orbit | 轨道 | 用户之间已建立的连接 |
| Stream | 内容流 | 用户发布的帖子 |
| My Planet | 我的星球 | 个人主页 |
| PlanetConfig | 星球配置 | 存储用户星球视觉参数的数据对象 |
| Drifting Rock → Singularity | 漂石 → 奇点 | 用户等级称号 |

