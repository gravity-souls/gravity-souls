'use client'
import { useTranslations } from 'next-intl'
import { LAYER_RELATIONS, personalNodeRelations, RELATION_STYLES, type PersonalMapRelation } from '@/lib/personal-map-relations'
import type { PersonalMapLayer, StarMapNode } from '@/types/star-map'
import styles from './star-map.module.css'

function Relation({ relation }: { relation: PersonalMapRelation }) {
  const t = useTranslations('starMap')
  const style = RELATION_STYLES[relation]
  return <span className={styles.relationItem}>
    <svg width="38" height="14" viewBox="0 0 38 14" aria-hidden="true">
      <path d="M4 7H34" stroke={style.color} strokeWidth="1.5" strokeDasharray={style.dash.join(' ')} />
      {style.arrow !== 'none' && <path d="M29 3L34 7L29 11" stroke={style.color} strokeWidth="1.5" fill="none" />}
      {style.arrow === 'both' && <path d="M9 3L4 7L9 11" stroke={style.color} strokeWidth="1.5" fill="none" />}
    </svg>
    <span>{t(`relation_${relation}`)}</span>
  </span>
}
export function PersonalRelationLegend({ layer }: { layer: PersonalMapLayer }) {
  const t = useTranslations('starMap')
  return <div className={styles.relationLegend} role="group" aria-label={t('relationLegend')}>
    <strong>{t('relationLegend')}</strong>
    <div className={styles.relationItems}>{LAYER_RELATIONS[layer].map(relation => <Relation key={relation} relation={relation} />)}</div>
    <p>{t('relationScope')}</p>
  </div>
}
export function PersonalNodeRelations({ node }: { node: StarMapNode }) {
  return <span className={styles.relationItems}>{personalNodeRelations(node).map(relation => <Relation key={relation} relation={relation} />)}</span>
}
