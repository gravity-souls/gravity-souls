'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { LEVEL_NAMES, clampLevel } from '@/lib/xp'

interface LevelToastState {
  level: number
  levelName: string
}

function isLevelUpPayload(value: unknown): value is { leveledUp: true; xpEvent?: { newLevel?: number } } {
  return typeof value === 'object' && value !== null && (value as { leveledUp?: unknown }).leveledUp === true
}

export default function LevelUpToast() {
  const [toast, setToast] = useState<LevelToastState | null>(null)

  const dismiss = useCallback(() => {
    setToast(null)
    fetch('/api/user/xp')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) window.dispatchEvent(new CustomEvent('xp:updated', { detail: data }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(dismiss, 2500)
    return () => window.clearTimeout(timeout)
  }, [dismiss, toast])

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      response.clone().json()
        .then((data) => {
          if (!isLevelUpPayload(data)) return
          const level = clampLevel(data.xpEvent?.newLevel ?? 1)
          setToast({ level, levelName: LEVEL_NAMES[level] })
        })
        .catch(() => {})

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return (
    <AnimatePresence>
      {toast && (
        <motion.button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
          onClick={dismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-label="Dismiss level up"
        >
          <motion.div
            className="flex max-w-sm flex-col items-center rounded-lg border border-white/10 p-8 text-center"
            style={{ background: 'rgba(8,6,28,0.94)', boxShadow: '0 32px 90px rgba(0,0,0,0.65)' }}
            initial={{ opacity: 0, scale: 0.78, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <motion.div
              className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border text-5xl font-bold"
              style={{ borderColor: '#f59e0b88', color: '#f59e0b', boxShadow: '0 0 42px rgba(245,158,11,0.35)' }}
              initial={{ scale: 0.4, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 14 }}
            >
              {toast.level}
            </motion.div>
            <p className="text-[11px] uppercase tracking-[0.26em]" style={{ color: 'var(--ghost)' }}>Level up</p>
            <h2 className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{toast.levelName}</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--ink)' }}>
              {toast.level === 5 ? '✦ You have reached Singularity' : '✦ New planet customizations unlocked!'}
            </p>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
