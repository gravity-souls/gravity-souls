/**
 * The actual level-gating decision, kept in its own dependency-free module
 * (no local imports, so no `@/` alias resolution needed) so it can be
 * unit-tested directly via a bare ts-node run — see
 * tests/require-level.test.cts — without pulling in lib/auth.ts's or
 * lib/prisma.ts's module-level side effects. This is the logic that must be
 * verified correct before NEXT_PUBLIC_EARLY_ACCESS is ever set to 'false'
 * for real users.
 */
export function isLevelAuthorized(userLevel: number, minLevel: number, earlyAccess: boolean): boolean {
  return earlyAccess || userLevel >= minLevel
}
