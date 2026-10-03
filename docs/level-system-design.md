# Planet levels: play loop and player explanation

## Purpose

Levels should make a planet's growth visible and give players a gentle reason to explore different parts of Gravity Souls. They should reward participation, not rank people's value, compatibility, or trustworthiness. Core social actions stay available regardless of level. The player-facing explanation lives at `/guide#levels`, with a link from the XP progress bar.

## The play loop

1. **Form a planet.** Complete a profile and choose an identity. The first completion awards 100 XP, which reaches level 2 immediately.
2. **Explore a galaxy.** Join a community that fits an interest and find its conversations and events.
3. **Share a signal.** Post a genuine thought, or participate in an event. These actions move the progress bar.
4. **Build a connection.** Follow someone you resonate with. Once the follow is mutual and contact is allowed, start a conversation; sending its first message awards XP. Following alone does not earn XP.
5. **Return when you want.** A new day's visit awards a small amount of XP. There is no required streak or penalty for time away.

The loop offers choices rather than a mandatory quest order. Players can ignore calibration, posts, events, or messages and still use the social universe.

## Current shipped rules

The values below come from `lib/xp.ts`. They describe the app as it works now, not a proposed rebalance.

| Action | XP | Current condition |
| --- | ---: | --- |
| Complete profile | 100 | Once per account |
| Visit on a new UTC day | 5 | Awarded when `/api/me` is requested |
| Create a post or galaxy post | 20 | Each successful post |
| Join a galaxy | 30 | When a new membership is created |
| Send a first message | 10 | First message in a conversation thread |
| RSVP to an event | 25 | When an RSVP row is created |
| Propose an event | 15 | When a proposal is created |
| Have an event approved | 30 | When its status changes to approved |

`RESONANCE_ACCEPTED` is defined as 50 XP but has no current awarding path, so the player guide does not advertise it.

| Level | Total XP | Customization milestone |
| ---: | ---: | --- |
| 1 | 0 | Planet presets |
| 2 | 100 | Color |
| 3 | 300 | Atmosphere and rings |
| 4 | 700 | Rotation and clouds |
| 5 | 1500 | Custom texture |

During early access, `NEXT_PUBLIC_EARLY_ACCESS` defaults to allowing all customization controls. The milestones are visible progress goals; they are not enforced unlocks until that flag is deliberately changed. The guide says this plainly.

## Recommended next design work

1. **Make every XP award traceable to one source action.** Add a source ID and a unique key for each XP event so retries, concurrent requests, or rejoining an event cannot award XP twice. Keep the content write and its reward reliable as one operation or through a durable follow-up job.
2. **Balance for varied play.** Today, repeated posting can dominate the path to level 5. Review real beta activity before setting action caps or changing weights. Reward distinct, meaningful participation; avoid a daily posting quota.
3. **Keep progression calm.** Show current XP, the next milestone, and one suggested action on My Planet. Use a small dismissible level-up message that names the new customization option. Avoid interrupting a message or post with a full-screen overlay.
4. **Localize the whole experience.** The guide is translated, but level names and level-up notifications still come from English constants. Move player-facing names and reward copy into the three locale files before the level system is promoted.
5. **Decide enforcement separately.** If real level locks are enabled, verify the server and UI agree, and keep messaging, discovery, and safety features accessible at every level.

No XP weights or access rules are changed by this document or the guide update.
