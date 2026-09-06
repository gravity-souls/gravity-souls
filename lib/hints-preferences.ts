const PREFIX = 'gs_hint_dismissed_'
const dismissedInMemory = new Set<string>()

export function getHintDismissed(key: string): boolean {
  try {
    return dismissedInMemory.has(key) || localStorage.getItem(PREFIX + key) === '1'
  } catch {
    return dismissedInMemory.has(key)
  }
}

export function dismissHint(key: string): void {
  dismissedInMemory.add(key)
  try {
    localStorage.setItem(PREFIX + key, '1')
  } catch {
    // The in-memory value keeps this session usable when storage is unavailable.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('gs-hint-change'))
}
