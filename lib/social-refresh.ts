'use client'
import { PLANET_ACTION_CHANGED } from '@/lib/planet-actions'
import { INBOX_CHANGED } from '@/lib/inbox-client'

export function subscribeSocialRefresh(refresh: () => void) {
  const visible = () => { if (!document.hidden) refresh() }
  window.addEventListener('focus', refresh)
  window.addEventListener(PLANET_ACTION_CHANGED, refresh)
  window.addEventListener(INBOX_CHANGED, refresh)
  document.addEventListener('visibilitychange', visible)
  return () => {
    window.removeEventListener('focus', refresh)
    window.removeEventListener(PLANET_ACTION_CHANGED, refresh)
    window.removeEventListener(INBOX_CHANGED, refresh)
    document.removeEventListener('visibilitychange', visible)
  }
}
