'use client'
import { useId } from 'react'
import { useTranslations } from 'next-intl'
import styles from './planet-loading.module.css'
export default function PlanetLoadingState({ compact = false, label }: { compact?: boolean; label?: string }) {
  const t = useTranslations('starMap'), id = useId()
  const loadingLabel = label ?? t('loading')
  return <div role="status" aria-busy="true" aria-label={loadingLabel} className={`${styles.state} ${compact ? styles.compact : ''}`}>
    <svg viewBox="0 0 240 240" width="200" height="200" aria-hidden="true" className={styles.globe}>
      <defs><radialGradient id={id}><stop stopColor="#453477" /><stop offset="1" stopColor="#100c2b" /></radialGradient></defs>
      <g className={styles.breath}><circle cx="120" cy="120" r="72" fill={`url(#${id})`} stroke="#c4b5fd" strokeWidth="1.5" /><ellipse cx="120" cy="120" rx="32" ry="72" fill="none" stroke="#a78bfa" strokeOpacity=".5" /><ellipse cx="120" cy="120" rx="72" ry="25" fill="none" stroke="#a78bfa" strokeOpacity=".5" /><path d="M50 105q70-35 140 0M50 135q70 35 140 0" fill="none" stroke="#c4b5fd" strokeOpacity=".25" /><circle cx="106" cy="113" r="2.5" fill="#ede9fe" /><circle cx="134" cy="113" r="2.5" fill="#ede9fe" /><path d="M111 128q9 8 18 0" fill="none" stroke="#ede9fe" strokeWidth="2" strokeLinecap="round" /></g>
      <g className={styles.orbit}><ellipse cx="120" cy="120" rx="106" ry="40" transform="rotate(-25 120 120)" fill="none" stroke="#c4b5fd" strokeOpacity=".35" /><circle cx="26" cy="162" r="4" fill="#ddd6fe" /><path d="m207 40 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#a5f3fc" /></g>
    </svg>
    <p className={compact ? 'sr-only' : 'text-sm tracking-wide text-violet-200'}>{loadingLabel}</p>
  </div>
}
