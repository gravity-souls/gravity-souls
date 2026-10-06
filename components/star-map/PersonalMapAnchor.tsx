'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import PersonAvatar from '@/components/planet/PersonAvatar'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
import type { StarMapSelfPlanet } from '@/types/star-map'
import styles from './star-map.module.css'

export default function PersonalMapAnchor({ planet, origin }: { planet: StarMapSelfPlanet | null; origin: ExplorationOrigin }) {
  const t = useTranslations('starMap')
  if (!planet) return <div className={styles.selfCenter}><Link href="/onboarding">{t('createSelf')}</Link></div>
  const name = planet.displayName || planet.name
  return <div className={styles.selfCenter}><Link href={withExplorationOrigin(planet.href, origin)} className={styles.selfLink} aria-label={t('openSelf', { name: planet.name })}><PersonAvatar key={planet.avatarUrl} src={planet.avatarUrl} planetConfig={planet.planetConfig} name={name} size={36} /><strong className={styles.selfName}>{name}</strong></Link></div>
}
