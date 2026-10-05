 'use client'
import { useTranslations } from 'next-intl'
import type { MessageQuote as Quote } from '@/lib/chat-interaction-types'
export default function MessageQuote({ quote, viewerId, partnerName, onOpen }: { quote: Quote; viewerId: string; partnerName: string; onOpen?: (id: string) => void }) {
  const t = useTranslations('chatInteractions')
  if (!quote.available) return <p role="status" className="mb-2 rounded-lg border-l-2 border-white/20 bg-white/5 p-2 text-xs text-slate-400">{t('quoteUnavailable')}</p>
  const contents = <><span className="block text-xs text-violet-200">{quote.fromId===viewerId ? t('you') : partnerName}</span><span className="block line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-300">{quote.type==='text' ? quote.excerpt : quote.type==='image' ? t('quotedImage') : t('quotedShare')}</span></>
  const style='mb-2 block w-full rounded-lg border-l-2 border-violet-300/50 bg-white/5 p-2 text-left'
  return onOpen ? <button onClick={()=>onOpen(quote.id)} aria-label={t('viewOriginal')} className={style}>{contents}</button> : <div className={style}>{contents}</div>
}
