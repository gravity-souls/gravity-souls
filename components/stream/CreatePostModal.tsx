'use client'

/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<StreamPostCategory>('GENERAL')
  const [manualTag, setManualTag] = useState('')
  const [manualTags, setManualTags] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const contentTags = useMemo(() => extractTags(content), [content])
  const tags = useMemo(() => Array.from(new Set([...contentTags, ...manualTags])), [contentTags, manualTags])
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' })), [files])
  const highlightedContent = content.split(/(#[\p{L}\p{N}_-]{1,32})/gu)

  if (!open) return null

  function addFiles(nextFiles: FileList | File[]) {
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
    if (!content.trim()) {
      setError('Write something before sending your signal.')
      return
    }
    if (content.length > 2000) {
      setError('Signals can be 2000 characters max.')
      return
    }

    setSubmitting(true)
    setProgress(files.length > 0 ? 18 : 60)
    setError('')

    const formData = new FormData()
    formData.append('content', content.trim())
    formData.append('category', category)
    formData.append('tags', tags.join(','))
    files.forEach((file) => formData.append('media', file))

    try {
      setProgress(72)
      const res = await fetch('/api/posts', { method: 'POST', body: formData })
      const data = await res.json() as { post?: StreamPost; error?: string }
      if (!res.ok || !data.post) throw new Error(data.error ?? 'Could not send signal')
      setProgress(100)
      onCreated(data.post)
      setToast('✦ Signal sent')
      setContent('')
      setManualTags([])
      setManualTag('')
      setFiles([])
      setTimeout(() => {
        setToast('')
        onClose()
      }, 700)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not send signal')
    } finally {
      setSubmitting(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/70 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label="Create post">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close create post" />
      <article className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-2xl p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6" style={{ background: 'rgba(8,10,28,0.98)', border: '1px solid var(--border-soft)', boxShadow: '0 28px 80px rgba(0,0,0,0.45)' }}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ghost)', border: '1px solid rgba(255,255,255,0.08)' }} aria-label="Close">
          <X size={16} />
        </button>
        <div className="mb-5 pr-10">
          <p className="text-eyebrow mb-2">Stream</p>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Send a signal</h2>
        </div>

        <div
          onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}
          onDragOver={(event) => event.preventDefault()}
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px dashed rgba(167,139,250,0.22)' }}
        >
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.16)' }}>
            <ImagePlus size={17} /> Add media ({files.length}/{MAX_MEDIA})
          </button>
          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {previews.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {preview.type === 'image' ? <img src={preview.url} alt="" className="h-full w-full object-cover" /> : <video src={preview.url} muted className="h-full w-full object-cover" />}
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full" style={{ background: 'rgba(0,0,0,0.58)', color: '#fff' }} aria-label="Remove media">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="mt-5 block">
          <textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 2000))} rows={7} placeholder="Share your signal with the cosmos..." className="w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6 outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--ghost)' }}>
          <div className="line-clamp-1">
            {highlightedContent.map((part, index) => part.startsWith('#') ? <span key={index} style={{ color: 'var(--star)' }}>{part}</span> : <span key={index}>{part}</span>)}
          </div>
          <span>{content.length}/2000</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: category === item ? '#fff' : 'var(--ghost)', background: category === item ? 'rgba(124,58,237,0.42)' : 'rgba(255,255,255,0.035)', border: category === item ? '1px solid rgba(167,139,250,0.42)' : '1px solid rgba(255,255,255,0.07)' }}>
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input value={manualTag} onChange={(event) => setManualTag(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addManualTag() } }} placeholder="Add tag" className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          <button type="button" onClick={addManualTag} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.24)', color: 'var(--star)' }} aria-label="Add tag">
            <Plus size={16} />
          </button>
        </div>
        {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.20)', color: 'var(--star)' }}>#{tag}</span>)}</div>}

        {progress > 0 && <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--star)' }} /></div>}
        {error && <p className="mt-3 text-xs" style={{ color: '#fca5a5' }}>{error}</p>}
        {toast && <p className="mt-3 text-xs" style={{ color: '#c4b5fd' }}>{toast}</p>}

        <button type="button" onClick={submit} disabled={submitting} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ color: '#fff', background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(99,102,241,0.92))', border: '1px solid rgba(167,139,250,0.50)', opacity: submitting ? 0.65 : 1 }}>
          {submitting && <LoaderCircle size={16} className="animate-spin" />}
          Send Signal
        </button>
      </article>
    </div>
  )
}