'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { SharedCard } from '@/lib/chat-share-types'
import { withChatReturn } from '@/lib/chat-return'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
export default function SharedMessageCard({ card, conversationId, origin }: { card: SharedCard; conversationId: string; origin?: ExplorationOrigin | null }) {
  const t = useTranslations('chatShares'), locale = useLocale()
  if (!card.available) return <div className="rounded-xl border border-white/10 p-3 text-sm text-white/60"><p>{t('unavailable')}</p><p className="mt-1 text-xs">{t('unavailableHint')}</p></div>
  return <Link href={withChatReturn(withExplorationOrigin(card.href, origin), conversationId)} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/15 bg-violet-300/5 p-3 focus-visible:outline focus-visible:outline-2" aria-label={`${t('open')} · ${card.title}`}>
    {card.kind === 'planet' ? <PlanetAvatar planetConfig={card.planetConfig ?? undefined} size={40} /> : <span aria-hidden="true" className="text-2xl">{card.kind === 'galaxy' ? '🌌' : '📅'}</span>}
    <span className="min-w-0"><span className="block text-xs text-violet-200">{t(card.kind)}</span><span className="block break-words text-sm text-white [overflow-wrap:anywhere]">{card.title}</span>{card.date && <span className="block text-xs text-white/60">{new Date(card.date).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</span>}</span>
  </Link>
}
