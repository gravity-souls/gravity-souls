'use client'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import PostContextPicker from '@/components/stream/PostContextPicker'
import { postErrorKey, streamPostSchema } from '@/lib/stream-workflow'
import type { StreamPost } from '@/types/stream'

export default function PostEditor({ post, onUpdated, onPendingChange }: { post: StreamPost; onUpdated: (post: StreamPost) => void; onPendingChange: (pending: boolean) => void }) {
  const t = useTranslations('postContext'), ts = useTranslations('stream')
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(post.content)
  const [context, setContext] = useState(post.editableContext ?? { galaxyId: post.context?.galaxy.id ?? null, eventId: post.context?.event?.id ?? null })
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef(false)
  async function save() {
    if (pending.current) return
    if (post.contextRestricted && !context.galaxyId && !context.eventId && !window.confirm(t('clearConfirm'))) return
    pending.current = true; setBusy(true); onPendingChange(true); setError('')
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, ...context }) })
      const data = await response.json()
      if (!response.ok) { setError(ts(postErrorKey(response.status, data.error))); return }
      const updated = streamPostSchema.parse(data.post)
      if (updated.id !== post.id || updated.authorId !== post.authorId) throw new Error('Invalid post response')
      setOpen(false)
      onUpdated(updated)
    } catch { setError(t('failed')) }
    finally { pending.current = false; setBusy(false); onPendingChange(false) }
  }
  return <div className="my-3">
    <button type="button" disabled={busy} className="text-xs text-violet-200 underline" onClick={() => setOpen(v => !v)}>{t(open ? 'close' : 'edit')}</button>
    {open && <div className="mt-3">
      <fieldset disabled={busy}>
        <textarea aria-label={t('content')} value={content} onChange={e => setContent(e.target.value)} maxLength={2000} rows={5} className="w-full resize-y rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm leading-7 text-white/90 outline-none transition-colors focus:border-violet-300/35 focus:ring-1 focus:ring-violet-300/10" />
        <PostContextPicker value={context} onChange={setContext} />
      </fieldset>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      {busy && <p role="status" aria-busy="true" className="text-xs text-violet-200">{ts('savingLocked')}</p>}
      <button type="button" disabled={busy || !content.trim()} onClick={save} className="rounded-xl bg-violet-500/20 px-4 py-2 text-sm text-violet-200 disabled:opacity-50">{t(busy ? 'saving' : 'save')}</button>
    </div>}
  </div>
}
