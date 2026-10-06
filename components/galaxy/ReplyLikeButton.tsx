'use client'

import { useRef, useState } from 'react'
import { Heart, LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'

export default function ReplyLikeButton({ url, likes, likedByMe, disabled, onPending, onChange }: {
  url: string
  likes: number
  likedByMe: boolean
  disabled: boolean
  onPending: (busy: boolean) => void
  onChange: (result: { likes: number; liked: boolean }) => void
}) {
  const t = useTranslations('galaxyPage')
  const tw = useTranslations('galaxyWorkflow')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label={t(likedByMe ? 'unlikeReply' : 'likeReply', { count: likes })}
        aria-pressed={likedByMe}
        aria-busy={busy}
        disabled={disabled || busy}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-xs text-violet-200 disabled:opacity-40"
        onClick={async () => {
          if (pending.current || disabled) return
          pending.current = true
          setBusy(true)
          setError('')
          onPending(true)
          const liked = !likedByMe
          try {
            const result = await galaxyRequest<{ liked: boolean; likes: number }>(url, 'POST', { liked })
            if (result.liked !== liked || !Number.isInteger(result.likes) || result.likes < 0) throw new Error('failed')
            onChange(result)
          } catch (error) {
            const key = error instanceof Error ? error.message : 'failed'
            setError(tw.has(key) && key !== 'failed' ? tw(key) : t('likeFailed'))
          } finally {
            pending.current = false
            setBusy(false)
            onPending(false)
          }
        }}
      >
        {busy ? <LoaderCircle aria-hidden="true" size={14} className="animate-spin motion-reduce:animate-none" /> : <Heart aria-hidden="true" size={14} fill={likedByMe ? 'currentColor' : 'none'} />}
        <span>{likes}</span>
      </button>
      {error && <span role="alert" className="text-xs text-red-200">{error}</span>}
    </span>
  )
}
