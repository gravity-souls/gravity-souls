---
name: prisma-safe-migration
description: Migration discipline for prisma/schema.prisma changes and db:push/db:migrate/db:deploy/db:seed commands - additive-first, loopback-only dev databases, reviewed SQL for production, never edit an applied migration. Use for any schema.prisma edit or a request to run a db:* script. Do not use for read-only Prisma queries in route handlers, or for prisma generate/validate (safe to run freely, non-mutating).
---

# Safe Prisma migrations

`docs/beta-execution.md` already recorded this discipline; this skill exists so it's
applied automatically rather than re-derived per change.

## Rules

- `db:push` (`node scripts/prisma-dev.mjs db push`) and `db:migrate`
  (`node scripts/prisma-dev.mjs migrate dev`) are only ever run against a loopback
  `DEV_DATABASE_URL` ending in `_dev`. Never against anything that looks like a shared or
  production URL.
- Production schema changes go through reviewed SQL + `db:deploy` (`prisma migrate
  deploy`) only — never `db push`, never `migrate reset`, in production.
- Never edit an already-applied migration file under `prisma/migrations/`. If a mistake
  shipped, write a new corrective migration.
- Prefer additive changes (new nullable column, new table) over destructive ones (drop
  column, narrow a type, add a NOT NULL without a default). Anything that isn't purely
  additive needs an explicit expand → backfill → switch → contract plan, not a single
  migration.
- Name new migrations descriptively, matching the existing
  `YYYYMMDDHHMMSS_description` convention (see `prisma/migrations/`, e.g.
  `20260905210000_add_relationships_and_safety`).
- `prisma generate` and `prisma validate` are non-mutating — run these freely, no approval
  needed. `db:push`, `db:migrate`, `db:deploy`, `db:seed`, and `test:e2e:db` all touch a
  real database and should always prompt for approval (see `.claude/settings.local.json`).

## Before proposing a schema change

1. Read `docs/beta-execution.md`'s "Reviewed next designs" section and, if the change
   touches galaxy/community/follow/block modeling, `docs/adr/0001-galaxy-content-model.md`.
2. Read the newest migration folder under `prisma/migrations/` as the current naming/shape
   precedent.
3. If the change redefines what an existing product concept *is* (not just adds a field),
   treat it as schema-shaping and route through the `product-architect` agent for an ADR
   first — don't implement a shape-changing migration directly.

## Output

A migration plan: the additive SQL to generate and inspect, a backfill/rollback note if
the change isn't purely additive, and an explicit statement of what database it targets.
Never run `db:deploy` as part of producing this plan — surface it for approval instead.
