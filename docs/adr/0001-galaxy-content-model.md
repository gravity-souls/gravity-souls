# ADR 0001: Galaxy content model

- Status: Accepted
- Date: 2026-09-06

## Context

The product uses "galaxy" as user-facing vocabulary for a topic-based space people join.
`docs/beta-execution.md` already records a founder-approved decision from an earlier
implementation session:

> A galaxy is the presentation of a community for beta, not a separate entity.

That decision was made and has been implemented, but never existed as a standalone,
citable decision record — only as one line in a longer execution log. This ADR formalizes
it retroactively so the "decide the galaxy content model through an ADR before
implementing" rule has an actual artifact to point to, and so any future proposal to
change this mapping has a clear prior decision to reference or explicitly supersede.

## Decision

`galaxy` is a naming/presentation layer over the existing `Community` Prisma model. There
is no separate `Galaxy` table. Concretely:

- `app/galaxy/[slug]/page.tsx` resolves a `Community` by its unique `slug`.
- Membership is `CommunityMembership`, not a separate galaxy-membership concept.
- `Event`/`EventRSVP` keep their existing `Community` foreign key (surfaced in code as
  `galaxyId` in places, e.g. notification types `GALAXY_NEW_POST`/`GALAXY_NEW_EVENT`).
- Global feed posts (`Post`) and community-scoped posts (`CommunityPost`) remain distinct
  models; a galaxy's content is its `CommunityPost`/`CommunityDiscussion` rows, not a
  merge of the two feeds.
- Stable `Community.id` survives any future authorized slug rename — the slug is a lookup
  key, not the identity.

## Consequences

- Any change to this mapping (e.g., introducing a real standalone `Galaxy` entity,
  allowing a post to belong to more than one community, splitting "galaxy" from
  "community" as distinct concepts) is a schema-shaping change and requires a new ADR in
  this directory before implementation, per `CLAUDE.md`'s non-negotiable rules.
- `.claude/skills/gravitysouls-product/SKILL.md` and `.claude/skills/prisma-safe-migration/SKILL.md`
  should treat this ADR as the canonical reference for "what is a galaxy," rather than
  re-deriving it from `docs/beta-execution.md` each time.
- This ADR does not change any code or schema; it documents a decision already
  implemented in the migrations landed under `prisma/migrations/`.

## References

- `docs/beta-execution.md` — original approval, "Reviewed next designs" section.
- `prisma/schema.prisma` — `Community`, `CommunityMembership`, `Event`, `CommunityPost`,
  `CommunityDiscussion` models.
