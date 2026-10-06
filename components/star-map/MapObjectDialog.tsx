'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import styles from './star-map.module.css'

export default function MapObjectDialog({ label, kind = 'planet', children, onClose }: { label: string; kind?: 'planet' | 'galaxy' | 'activity'; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), close = useRef(onClose)
  const t = useTranslations('planetPage')
  const map = useTranslations('starMap')
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow
    dialog.showModal(); document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<dialog ref={ref} aria-label={label} className={styles.objectDialog} onCancel={e => { e.preventDefault(); close.current() }} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) close.current() } }}>
    <div className={styles.dialogHeader}><span>{kind === 'planet' ? t('planetPreview') : map(`kind_${kind}`)}</span><button type="button" aria-label={t('closePreview')} onClick={onClose}>×</button></div>
    <div className={styles.dialogBody}>{children}</div>
  </dialog>, document.body)
}
