 'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { MAX_CHAT_IMAGE_BYTES, CHAT_IMAGE_MIMES } from '@/lib/chat-image-types'
export default function ImageComposer({ conversationId, disabled, onSend }: { conversationId: string; disabled?: boolean; onSend: (imageId: string) => Promise<boolean | string> }) {
  const t = useTranslations('chatImages')
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null), upload = useRef<{ attempt: string; imageId?: string } | null>(null), lock = useRef(false)
  const uploaded = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => () => { if (uploaded.current) void fetch(`/api/conversations/${conversationId}/images/${uploaded.current}`, { method: 'DELETE', keepalive: true }).catch(() => {}) }, [conversationId])
  function clear() {
    if (lock.current) return
    if (uploaded.current) void fetch(`/api/conversations/${conversationId}/images/${uploaded.current}`, { method: 'DELETE' }).catch(() => {})
    uploaded.current = undefined; upload.current = null; setFile(null); setPreview(''); setError(''); if (input.current) input.current.value = ''
  }
  async function send() {
    if (!file || disabled || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (!upload.current) upload.current = { attempt: crypto.randomUUID() }
      if (!upload.current.imageId) {
        const response = await fetch(`/api/conversations/${conversationId}/image-uploads`, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Upload-Id': upload.current.attempt }, body: file })
        const result = await response.json()
        if (!response.ok) {
          if (['uploadExpired', 'storageFailed'].includes(result.error)) upload.current = null
          throw new Error(result.error)
        }
        upload.current.imageId = result.id; uploaded.current = result.id
      }
      const result = await onSend(upload.current.imageId!)
      if (result !== true) {
        if (result === 'uploadExpired') { upload.current = null; uploaded.current = undefined }
        throw new Error(typeof result === 'string' ? result : 'sendFailed')
      }
      uploaded.current = undefined; upload.current = null; setFile(null); setPreview(''); if (input.current) input.current.value = ''
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setError(['invalidImage', 'tooLarge', 'storageUnavailable', 'uploadBusy', 'uploadExpired', 'rateLimited'].includes(code) ? code : 'sendFailed')
    } finally { lock.current = false; setBusy(false) }
  }
  return <div className="px-4 pt-2 text-sm">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t('choose')} disabled={disabled || busy} onChange={event => {
      const chosen = event.target.files?.[0]; if (!chosen) return
      if (!CHAT_IMAGE_MIMES.some(mime => mime === chosen.type) || chosen.size > MAX_CHAT_IMAGE_BYTES) { clear(); setError(chosen.size > MAX_CHAT_IMAGE_BYTES ? 'tooLarge' : 'invalidImage'); event.target.value = ''; return }
      clear(); setFile(chosen)
    }} />
    {!file ? <button disabled={disabled || busy} onClick={() => input.current?.click()} className="rounded-lg px-3 py-2 text-violet-200 disabled:opacity-40">{t('choose')}</button> : <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt={t('preview')} className="h-20 w-20 rounded-lg object-contain" />}
      <span className="text-xs text-slate-400">{t('privateHint')}</span>
      <button disabled={busy} onClick={clear} className="px-2 py-2">{t('remove')}</button>
      <button disabled={disabled || busy} onClick={() => void send()} className="rounded-lg bg-violet-500/20 px-3 py-2 disabled:opacity-40">{busy ? t('sending') : error ? t('retry') : t('send')}</button>
    </div>}
    {error && <p role="alert" className="py-2 text-rose-200">{t(error)}</p>}
  </div>
}
