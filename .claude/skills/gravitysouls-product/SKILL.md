---
name: gravitysouls-product
description: Canonical GravitySouls product vocabulary and founder-approved decisions (planet=profile, galaxy=Community presentation, one-way follows, mutual-follow-gated DMs, 18+ minimum age). Use whenever a task names product concepts, proposes new user-facing behavior, or touches onboarding/discovery/messaging copy or flow. Do not use for pure styling/CSS tweaks, dependency bumps, or CI-only changes.
---

# GravitySouls product model

GravitySouls is a premium, semi-anonymous social universe. Read `docs/beta-execution.md`
in full before proposing any product-facing behavior — it is short and load-bearing, and
contains the founder's actual approved decisions, not just aspirations.

## Vocabulary → implementation

| Product term | Implementation |
|---|---|
| Planet | A user's active customizable persona (`Planet` model, one active per user; `app/api/onboarding/complete/route.ts` deactivates prior planets on recalibration) |
| Galaxy | Presentation of a `Community` (see `docs/adr/0001-galaxy-content-model.md` — no separate `Galaxy` model exists) |
| Signal / shared moment | A `Post` (global feed) or `CommunityPost`/`CommunityDiscussion` (galaxy-scoped) |
| Resonance | A `Match` between two users, or the messaging entry point (`/resonance`) |
| Relationship | A `Follow` edge (one-way) or the DM thread state built on it |

## Founder-approved decisions (do not re-litigate)

- Beta minimum age: 18+.
- Follows are one-way and belong to the user, not a replaceable planet record.
- A new DM thread requires mutual follow; an existing thread survives a lapsed follow.
- Profiles/posts are member-visible by default; community content follows community
  access; `Profile.visibility` can be `PRIVATE` (gated on a real follow edge either way).
- Matching/calibration is optional, not mandatory.
- A galaxy is the presentation of a `Community`, not a separate entity — see ADR 0001.

These approvals are product/UX defaults, not legal/compliance sign-off. Retention rules,
moderation staffing, legal entity/contact details, and processor details remain open —
see `docs/beta-execution.md`'s "Remaining launch gates" and defer to
`.claude/skills/trust-safety-moderation/SKILL.md` for anything touching those.

## When proposing new product behavior

1. Check whether it fits an existing vocabulary term above before inventing a new one.
2. If it changes what a galaxy *is* (not just what it contains), that's a schema-shaping
   decision — it needs a new ADR in `docs/adr/`, not a quiet implementation. Route to the
   `product-architect` agent rather than implementing directly.
3. Never contradict an approved decision above without the founder explicitly revising it
   (and that revision should itself land as an ADR or an update to `docs/beta-execution.md`,
   not just a code change).
