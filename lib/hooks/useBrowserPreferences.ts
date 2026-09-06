'use client'

import { useSyncExternalStore } from 'react'

const subscribeHydration = () => () => {}
export function useClientReady() {
  return useSyncExternalStore(subscribeHydration, () => true, () => false)
}

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function useReducedMotionPreference() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => true)
}
