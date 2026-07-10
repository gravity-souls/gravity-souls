const PREFIX = 'gs_hint_dismissed_'

export function getHintDismissed(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) === '1'
  } catch {
    return false
  }
}

export function dismissHint(key: string): void {
  try {
    localStorage.setItem(PREFIX + key, '1')
  } catch {
    // Storage unavailable — hint will reappear but that is acceptable
  }
}
