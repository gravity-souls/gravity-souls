'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
export default function DiscussionComposer({
  galaxyId,
  onCreated,
}: {
  galaxyId: string
  onCreated: () => void
}) {
  const t = useTranslations('galaxyWorkflow'),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  return (
    <section className="rounded-xl border border-white/10 p-4">
      <button
        type="button"
        className="text-sm text-violet-200"
        onClick={() => setOpen((v) => !v)}
      >
        {t(open ? 'close' : 'startDiscussion')}
      </button>
      {open && (
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              await galaxyRequest(
                `/api/communities/${galaxyId}/discussions`,
                'POST',
                { title, content },
              )
              setTitle('')
              setContent('')
              setOpen(false)
              onCreated()
            } catch (err) {
              const key = err instanceof Error ? err.message : 'failed'
              setError(t.has(key) ? t(key) : t('failed'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <label className="grid gap-2 text-sm">
            {t('discussionTitle')}
            <input
              className="rounded-lg border border-white/15 bg-white/5 p-2"
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
              className="rounded-lg border border-white/15 bg-white/5 p-2"
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
            disabled={busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm disabled:opacity-40"
          >
            {t(busy ? 'saving' : 'post')}
          </button>
        </form>
      )}
    </section>
  )
}
