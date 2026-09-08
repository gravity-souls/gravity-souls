// Early stage: grant all users full access to level-gated features regardless
// of actual XP/level. Set NEXT_PUBLIC_EARLY_ACCESS=false to enforce real
// level gating (see lib/requireLevel.ts).
//
// Deliberately NEXT_PUBLIC_, not a server-only var: this flag is also read
// directly by a client component (components/planet/PlanetCustomizer.tsx) to
// decide what the UI shows as locked/unlocked. A non-NEXT_PUBLIC_ variable is
// never inlined into the client bundle and would silently evaluate to
// `undefined` there — decoupling what the UI displays from what the server
// actually enforces. This is not a secret; it only describes gating
// behavior, never user data.
//
// Defaults to true (bypass) so omitting the var anywhere is a no-op — flip
// it only as a deliberate decision, not as a side effect of adding an env
// file. See docs/beta-execution.md and CLAUDE.md's note on this flag.
export const EARLY_ACCESS = process.env.NEXT_PUBLIC_EARLY_ACCESS !== 'false'
