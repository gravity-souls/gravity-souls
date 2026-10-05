'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import type { StarMapSelfPlanet } from '@/types/star-map'
import styles from './star-map.module.css'

export default function PersonalMapAnchor({ planet, origin, summary = false }: { planet: StarMapSelfPlanet | null; origin: ExplorationOrigin; summary?: boolean }) {
  const t = useTranslations('starMap'), reduced = useReducedMotionPreference()
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const id = planet?.id
  const texture = planet?.planetConfig?.customTextureUrl
  useEffect(() => {
    const element = root.current
    if (!element || summary || !id || texture) return
    let visible = false
    const update = () => setActive(visible && !document.hidden)
    const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); update() })
    observer.observe(element)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [summary, id, texture])
  return <div ref={root} className={summary ? styles.selfSummary : styles.selfCenter}>
    {planet ? <Link href={withExplorationOrigin(planet.href, origin)} className={styles.selfLink} aria-label={t('openSelf', { name: planet.name })}>
      <PlanetAvatar planetConfig={planet.planetConfig} size={summary ? 40 : 64} rotating={!summary && active && !reduced && !texture} rotationDuration={24} />
      <span><span className={styles.selfCaption}>{t('selfCenter')}</span><strong className={styles.selfName}>{planet.name}</strong></span>
    </Link> : <div className={styles.selfMissing}><p>{t('selfMissing')}</p><Link href="/onboarding">{t('createSelf')}</Link></div>}
    <p className={styles.selfNote}>{t('selfExcluded')}</p>
  </div>
}
