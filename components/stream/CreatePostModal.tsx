'use client'

/* eslint-disable @next/next/no-img-element */

import PostContextPicker from '@/components/stream/PostContextPicker'
import { useEffect, useMemo, useRef, useState } from 'react'
import { postErrorKey, streamPostSchema } from '@/lib/stream-workflow'
import { ImagePlus, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { StreamPost, StreamPostCategory } from '@/types/stream'

const CATEGORIES: StreamPostCategory[] = ['GENERAL', 'COSMIC', 'NATURE', 'NIGHT', 'THOUGHTS', 'TRAVEL', 'MUSIC', 'ART']
const MAX_MEDIA = 9

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
  onCreated: (post: StreamPost) => void
}

function extractTags(content: string) {
  return Array.from(new Set(Array.from(content.matchAll(/#([\p{L}\p{N}_-]{1,32})/gu)).map((match) => match[1])))
}

export default function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const t = useTranslations('stream'), tc = useTranslations('postContext')
  const [context, setContext] = useState<{ galaxyId: string | null; eventId: string | null }>({ galaxyId: null, eventId: null })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<StreamPostCategory>('GENERAL')
  const [manualTag, setManualTag] = useState('')
  const [manualTags, setManualTags] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const pendingRef = useRef(false)
  const [error, setError] = useState('')

  const contentTags = useMemo(() => extractTags(content), [content])
  const tags = useMemo(() => Array.from(new Set([...contentTags, ...manualTags])), [contentTags, manualTags])
  const [previews, setPreviews] = useState<{ file: File; url: string; type: string }[]>([])
  useEffect(() => {
    const next = files.map(file => ({ file, url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' }))
    setPreviews(next)
    return () => next.forEach(preview => URL.revokeObjectURL(preview.url))
  }, [files])

  if (!open) return null

  function addFiles(nextFiles: FileList | File[]) {
    if (pendingRef.current) return
    setError('')
    setFiles((prev) => [...prev, ...Array.from(nextFiles)].slice(0, MAX_MEDIA))
  }

  function addManualTag() {
    const normalized = manualTag.replace(/^#/, '').replace(/[^\p{L}\p{N}_-]/gu, '').trim()
    if (!normalized) return
    setManualTags((prev) => Array.from(new Set([...prev, normalized])))
    setManualTag('')
  }

  async function submit() {
    if (pendingRef.current) return
    if (!content.trim()) {
      setError(t('validationRequired'))
      return
    }
    if (content.length > 2000) {
      setError(t('validationMax'))
      return
    }

    pendingRef.current = true
    setSubmitting(true)
    setError('')

    const formData = new FormData()
    formData.append('content', content.trim())
    formData.append('category', category)
    formData.append('tags', tags.join(','))
    if (context.galaxyId) formData.append('galaxyId', context.galaxyId)
    if (context.eventId) formData.append('eventId', context.eventId)
    files.forEach((file) => formData.append('media', file))

    try {
      const res = await fetch('/api/posts', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(t(postErrorKey(res.status, data.error))); return }
      const post = streamPostSchema.parse(data.post)
      onCreated(post)
      setContext({ galaxyId: null, eventId: null })
      setContent('')
      setCategory('GENERAL')
      setManualTags([])
      setManualTag('')
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
    } catch {
      setError(t('sendError'))
    } finally {
      setSubmitting(false)
      pendingRef.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/70 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label={t('createPost')}>
      <button type="button" disabled={submitting} className="absolute inset-0 cursor-default" onClick={() => { if (!pendingRef.current) onClose() }} aria-label={t('closeCreatePost')} />
      <article className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-2xl p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6" style={{ background: 'rgba(8,10,28,0.98)', border: '1px solid var(--border-soft)', boxShadow: '0 28px 80px rgba(0,0,0,0.45)' }}>
        <button type="button" disabled={submitting} onClick={() => { if (!pendingRef.current) onClose() }} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ghost)', border: '1px solid rgba(255,255,255,0.08)' }} aria-label={t('close')}>
          <X size={16} />
        </button>
        <div className="mb-5 pr-10">
          <p className="text-eyebrow mb-2">{t('streamTitle')}</p>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{t('createPost')}</h2>
        </div>

        <fieldset disabled={submitting} className="min-w-0">
        <div
          onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}
          onDragOver={(event) => event.preventDefault()}
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px dashed rgba(167,139,250,0.22)' }}
        >
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.16)' }}>
            <ImagePlus size={17} /> {t('addMedia', { current: files.length, max: MAX_MEDIA })}
          </button>
          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {previews.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {preview.type === 'image' ? <img src={preview.url} alt="" className="h-full w-full object-cover" /> : <video src={preview.url} muted className="h-full w-full object-cover" />}
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full" style={{ background: 'rgba(0,0,0,0.58)', color: '#fff' }} aria-label={t('removeMedia')}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="mt-5 block">
          <textarea aria-label={tc('content')} value={content} onChange={(event) => setContent(event.target.value.slice(0, 2000))} rows={5} placeholder={t('postPlaceholder')} className="w-full resize-y rounded-2xl border border-white/8 bg-white/[0.025] px-5 py-4 text-base leading-7 text-white/90 outline-none transition-colors placeholder:text-white/30 focus:border-violet-300/35 focus:bg-violet-300/[0.035] focus:ring-1 focus:ring-violet-300/10" />
        </label>
        <div className="mt-1 flex justify-end text-[10px] tabular-nums text-white/30">
          <span>{content.length}/2000</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: category === item ? '#fff' : 'var(--ghost)', background: category === item ? 'rgba(124,58,237,0.42)' : 'rgba(255,255,255,0.035)', border: category === item ? '1px solid rgba(167,139,250,0.42)' : '1px solid rgba(255,255,255,0.07)' }}>
              {t(`categories.${item === 'GENERAL' ? 'all' : item.toLowerCase()}`)}
            </button>
          ))}
        </div>

        <PostContextPicker value={context} onChange={setContext} />
        {context.galaxyId && files.length > 0 && <p className="text-xs text-white/50">{tc('mediaVisibility')}</p>}
        <div className="mt-4 flex gap-2">
          <input value={manualTag} onChange={(event) => setManualTag(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addManualTag() } }} placeholder={t('addTagPlaceholder')} className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          <button type="button" onClick={addManualTag} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.24)', color: 'var(--star)' }} aria-label={t('addTag')}>
            <Plus size={16} />
          </button>
        </div>
        {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.20)', color: 'var(--star)' }}>#{tag}</span>)}</div>}

        </fieldset>
        {submitting && <p role="status" aria-busy="true" className="mt-4 text-xs text-violet-200">{t('publishing')}</p>}
        {error && <p role="alert" className="mt-3 text-xs" style={{ color: '#fca5a5' }}>{error}</p>}

        <button type="button" onClick={submit} disabled={submitting} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ color: '#fff', background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(99,102,241,0.92))', border: '1px solid rgba(167,139,250,0.50)', opacity: submitting ? 0.65 : 1 }}>
          {submitting && <LoaderCircle size={16} className="animate-spin" />}
          {t(submitting ? 'publishingShort' : 'sendSignal')}
        </button>
      </article>
    </div>
  )
}