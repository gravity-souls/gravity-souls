'use client'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
import type { ApiCommunityDiscussion } from '@/types/community-discussion'
export default function DiscussionComposer({
  galaxyId,
  onCreated,
  disabled = false,
}: {
  galaxyId: string
  onCreated: (discussion: ApiCommunityDiscussion) => void
  disabled?: boolean
}) {
  const t = useTranslations('galaxyWorkflow'),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const pending = useRef(false)
  return (
    <section className="rounded-2xl border border-violet-300/15 bg-violet-400/5 p-4" aria-busy={busy}>
      <button
        type="button"
        className="text-sm text-violet-200"
        disabled={busy || disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t(open ? 'close' : 'startDiscussion')}
      </button>
      {open && (
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (pending.current || disabled) return
            pending.current = true
            setBusy(true)
            setError('')
            try {
              const result = await galaxyRequest<{ discussion: ApiCommunityDiscussion }>(
                `/api/communities/${galaxyId}/discussions`,
                'POST',
                { title, content },
              )
              if (typeof result.discussion?.id !== 'string' || !result.discussion.id) throw new Error('failed')
              onCreated(result.discussion)
              setTitle('')
              setContent('')
              setOpen(false)
            } catch (err) {
              const key = err instanceof Error ? err.message : 'failed'
              setError(t.has(key) ? t(key) : t('failed'))
            } finally {
              setBusy(false)
              pending.current = false
            }
          }}
        >
          <label className="grid gap-2 text-sm">
            {t('discussionTitle')}
            <input
              className="rounded-lg border border-white/15 bg-white/5 p-2 text-base sm:text-sm"
              disabled={busy}
              required
              minLength={2}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            {t('discussionContent')}
            <textarea
              className="rounded-lg border border-white/15 bg-white/5 p-2 text-base sm:text-sm"
              disabled={busy}
              required
              minLength={2}
              maxLength={1000}
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={busy || disabled || title.trim().length < 2 || content.trim().length < 2}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm disabled:opacity-40"
          >
            {t(busy ? 'saving' : 'post')}
          </button>
          {busy && <p role="status" className="text-xs text-violet-200">{t('saving')}</p>}
        </form>
      )}
    </section>
  )
}
