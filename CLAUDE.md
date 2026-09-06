@AGENTS.md

# GravitySouls

A premium, semi-anonymous social universe (Next.js/React/TypeScript, Tailwind,
Prisma/PostgreSQL, Better Auth, Three.js/React Three Fiber), France/EU-facing, moving
toward a real-user production beta. Vocabulary: profiles are planets, communities are
presented as galaxies, posts are signals/shared moments. See
`.claude/skills/gravitysouls-product/SKILL.md` for the full model and founder-approved
product decisions.

## Non-negotiable rules

- Preserve the cosmic visual identity. `app/page.tsx` and `components/fx/CosmicGlobe.tsx`
  are intentional showcase work, not generic cleanup targets.
- Never add a mock fallback to an authenticated production path. Precedent: `lib/mock-posts.ts`
  and `lib/mock-relationships.ts` were deleted, not patched around, when `/stream` and
  `/relationships` moved to real data.
- The galaxy content model is `Community` (see `docs/adr/0001-galaxy-content-model.md`).
  Any change to what a galaxy *is* — not just what it contains — requires a new ADR under
  `docs/adr/` before implementation.
- No irreversible database, deployment, policy, or third-party-service change without
  explicit founder approval. DB-writing/migration commands are intentionally left
  un-allowlisted in `.claude/settings.local.json` so they always prompt.
- Work in small, PR-sized, testable increments.
- Production readiness matters as much as feature development — see
  `docs/beta-execution.md`'s "Remaining launch gates" for what's still open.

## Where things live

| Topic | Location |
|---|---|
| Approved product decisions / implementation log | `docs/beta-execution.md` |
| Architecture decisions | `docs/adr/` |
| Release-review format example | `docs/cosmic-globe-review.md` |
| Visibility/block/contact enforcement | `lib/visibility.ts` (never reimplement client-side) |
| Auth | `lib/session.ts`, `lib/requireLevel.ts` (note: `requireLevel`'s `EARLY_ACCESS` bypass is temporary — must be resolved before real users) |
| Rate limiting | `lib/rate-limit.ts` |
| Notifications | `lib/createNotification.ts` |

## Scripts

`npm run dev` · `npm run build` (`prisma generate && next build`) · `npm run lint` ·
`npm run typecheck` · `npm run db:generate` · `npm run db:push` / `db:migrate` (loopback
`_dev` DB only) · `npm run db:deploy` (`prisma migrate deploy`, production) ·
`npm run db:seed` · `npm run db:studio` · `npm test` · `npm run test:models` ·
`npm run test:e2e` (no DB) · `npm run test:e2e:db` (real DB, loopback `_test`/`_e2e` only).

## Routing

| Task | Skill | Agent |
|---|---|---|
| New authenticated API route/feature | `production-feature`, `authorization-and-privacy` | `backend-data-engineer` |
| Prisma schema change | `prisma-safe-migration` | `backend-data-engineer`; `product-architect` first if schema-shaping |
| Product/galaxy/community modeling question | `gravitysouls-product` | `product-architect` |
| Audit visibility/block/contact correctness | `authorization-and-privacy` | `security-privacy-reviewer` |
| Report queue / admin moderation | `trust-safety-moderation` | `backend-data-engineer` (build), `security-privacy-reviewer` (audit) |
| Onboarding / calibration / activation hints | `onboarding-ux` | `backend-data-engineer` (build), `ux-activation-reviewer` (audit) |
| `components/fx/**` / `PlanetGlobe.tsx` changes | `mobile-webgl-qa` | `visual-mobile-qa` |
| Pre-release verification | `release-readiness` | `release-manager` |

## Permissions

DB-writing and migration commands (`db:push`, `db:migrate`, `db:deploy`, `db:seed`,
`test:e2e:db`) always prompt for approval — see `.claude/settings.local.json`. This
applies to every agent above as well as the main session; no agent may deploy, push
commits, modify production environment variables, contact external services, run
production migrations, or delete user data.
