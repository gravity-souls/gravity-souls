/**
 * Minimal operator gate for the report queue. No per-user admin flag exists
 * yet, so this reads a comma-separated allow-list from the environment.
 * Replace with a real role/permission system before scaling past a
 * founder-run moderation queue.
 */
export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowList = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return allowList.includes(email.toLowerCase())
}
