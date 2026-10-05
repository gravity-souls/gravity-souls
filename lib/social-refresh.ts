'use client'
import { PLANET_ACTION_CHANGED } from '@/lib/planet-actions'
import { INBOX_CHANGED } from '@/lib/inbox-client'

const SOCIAL_REFRESH_REQUESTED = 'social-state:refresh'
export function requestSocialRefresh() { window.dispatchEvent(new Event(SOCIAL_REFRESH_REQUESTED)) }

export function subscribeSocialRefresh(refresh: () => void) {
  const visible = () => { if (!document.hidden) refresh() }
  window.addEventListener('focus', refresh)
  window.addEventListener(PLANET_ACTION_CHANGED, refresh)
  window.addEventListener(INBOX_CHANGED, refresh)
  window.addEventListener(SOCIAL_REFRESH_REQUESTED, refresh)
  document.addEventListener('visibilitychange', visible)
  return () => {
    window.removeEventListener('focus', refresh)
    window.removeEventListener(PLANET_ACTION_CHANGED, refresh)
    window.removeEventListener(INBOX_CHANGED, refresh)
    window.removeEventListener(SOCIAL_REFRESH_REQUESTED, refresh)
    document.removeEventListener('visibilitychange', visible)
  }
}
