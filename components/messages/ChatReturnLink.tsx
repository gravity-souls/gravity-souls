'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { chatReturnHref } from '@/lib/chat-return'
import { explorationOrigin, withExplorationOrigin } from '@/lib/exploration-return'
function ReturnLink() {
  const params = useSearchParams(), t = useTranslations('chatShares')
  const href = chatReturnHref(params.get('chat'))
  return href ? <div className="mx-auto max-w-5xl px-6 py-3"><Link href={withExplorationOrigin(href, explorationOrigin(params.get('from')))} className="text-sm text-violet-200 underline">← {t('backChat')}</Link></div> : null
}
export default function ChatReturnLink() { return <Suspense><ReturnLink /></Suspense> }
