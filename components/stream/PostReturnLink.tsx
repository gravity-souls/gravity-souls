'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { postContextReturnHref, postReturnHref, withPostOrigin } from '@/lib/post-return'

function ReturnLink({ eventId }: { eventId?: string }) {
  const params = useSearchParams(), pathname = usePathname(), t = useTranslations('postContext')
  const id = params.get('returnPost')
  const event = eventId ?? params.get('event')
  const origin = postContextReturnHref(`${pathname}${event ? `?${new URLSearchParams({ event })}#events` : ''}`)
  return id && origin && postReturnHref(id) ? <div className="px-6 py-3"><Link href={withPostOrigin(id, origin)} className="text-sm text-violet-200 underline">← {t('backPost')}</Link></div> : null
}

export default function PostReturnLink({ eventId }: { eventId?: string }) { return <Suspense><ReturnLink eventId={eventId} /></Suspense> }
