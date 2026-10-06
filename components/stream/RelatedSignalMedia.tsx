'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ImageOff, Play } from 'lucide-react'
import type { StreamMediaType } from '@/types/stream'

export default function RelatedSignalMedia({ url, type, count }: { url: string; type: StreamMediaType; count: number }) {
  const t = useTranslations('postContext')
  const [failed, setFailed] = useState(false)

  return <span className="relative mx-3 block aspect-[16/10] shrink-0 overflow-hidden rounded-xl bg-violet-300/5">
    {failed ? <span role="status" className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-[10px] text-white/50">
      <ImageOff size={16} aria-hidden="true" />{t('mediaPreviewFailed')}
    </span> : type === 'video' ? <>
      <video src={url} aria-label={t('videoPreview')} muted playsInline preload="metadata" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center bg-black/15">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/55 text-white"><Play size={14} fill="currentColor" /></span>
      </span>
    </> : <img src={url} alt={t('imagePreview')} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailed(true)} />}
    {count > 1 && <span aria-label={t('mediaItems', { count })} className="absolute bottom-1 right-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] tabular-nums text-white">+{count - 1}</span>}
  </span>
}
