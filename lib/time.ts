// --- Shared time formatting utilities ----------------------------------------

/**
 * Returns a human-readable relative time string.
 * e.g. "today", "3d ago", "2w ago", "4mo ago"
 */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffD  = Math.floor(diffMs / 86400000)
  if (diffD < 1)  return 'today'
  if (diffD < 7)  return `${diffD}d ago`
  if (diffD < 30) return `${Math.floor(diffD / 7)}w ago`
  return `${Math.floor(diffD / 30)}mo ago`
}

/**
 * Formats an ISO timestamp as HH:MM (24-hour).
 * Used inside message bubbles.
 */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/**
 * Returns a compact age string for conversation previews.
 * e.g. "now", "5m", "3h", "2d", "Mar 28"
 */
export function formatConversationTime(iso: string): string {
  const d       = new Date(iso)
  const diffMs  = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMin / 60)
  const diffD   = Math.floor(diffH / 24)

  if (diffMin < 1)  return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffH   < 24) return `${diffH}h`
  if (diffD   < 7)  return `${diffD}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
