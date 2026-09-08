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

// Same viewport threshold CosmicGlobe.tsx uses to cap devicePixelRatio (1 on
// narrow/mobile screens, higher on desktop) — shared here so other canvas/WebGL
// components can apply the same split without duplicating the media query.
function subscribeNarrowViewport(callback: () => void) {
  const media = window.matchMedia('(max-width: 767px)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function useNarrowViewportPreference() {
  return useSyncExternalStore(subscribeNarrowViewport, () => window.matchMedia('(max-width: 767px)').matches, () => false)
}
