'use client'

import { useSyncExternalStore } from 'react'
import { getHintDismissed } from '@/lib/hints-preferences'

function subscribe(callback: () => void) {
  window.addEventListener('gs-hint-change', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('gs-hint-change', callback)
    window.removeEventListener('storage', callback)
  }
}

export function useHintDismissed(key: string) {
  return useSyncExternalStore(subscribe, () => getHintDismissed(key), () => true)
}
