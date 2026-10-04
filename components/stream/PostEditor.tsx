'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import PostContextPicker from '@/components/stream/PostContextPicker'
import type { StreamPost } from '@/types/stream'
export default function PostEditor({ post, onUpdated }: { post: StreamPost; onUpdated: (post: StreamPost) => void }) {
  const t = useTranslations('postContext')
  const [open, setOpen] = useState(false), [content, setContent] = useState(post.content), [context, setContext] = useState(post.editableContext ?? { galaxyId: post.context?.galaxy.id ?? null, eventId: post.context?.event?.id ?? null }), [busy, setBusy] = useState(false), [error, setError] = useState(false)
  async function save() {
    if (post.contextRestricted && !context.galaxyId && !context.eventId && !window.confirm(t('clearConfirm'))) return
    setBusy(true); setError(false)
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, ...context }) })
      if (!response.ok) throw new Error('failed')
      const data = await response.json(); onUpdated(data.post); setOpen(false)
    } catch { setError(true) }
    finally { setBusy(false) }
  }
  return <div className="my-3">
    <button type="button" className="text-xs text-violet-200 underline" onClick={() => setOpen(v => !v)}>{t(open ? 'close' : 'edit')}</button>
    {open && <div className="mt-3"><textarea aria-label={t('content')} value={content} onChange={e => setContent(e.target.value)} maxLength={2000} rows={4} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm" /><PostContextPicker value={context} onChange={setContext} />{error && <p role="alert" className="text-xs text-red-300">{t('failed')}</p>}<button type="button" disabled={busy || !content.trim()} onClick={save} className="rounded-xl bg-violet-500/20 px-4 py-2 text-sm text-violet-200 disabled:opacity-50">{t(busy ? 'saving' : 'save')}</button></div>}
  </div>
}
