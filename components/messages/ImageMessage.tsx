 'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ChatImageCard } from '@/lib/chat-image-types'
function LoadedImage({ image }: { image?: ChatImageCard | null }) {
  const t = useTranslations('chatImages'), [url, setUrl] = useState(''), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const imageUrl = image?.url
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = '', loading = false
    setUrl(''); setFailed(false)
    async function load() {
      if (loading || document.hidden || !imageUrl) return
      loading = true
      try {
        const response = await fetch(imageUrl!, { method: objectUrl ? 'HEAD' : 'GET', cache: 'no-store', signal: controller.signal })
        if (!response.ok || response.headers.get('content-type') !== 'image/webp') throw new Error('unavailable')
        if (objectUrl) { setFailed(false); return }
        const blob = await response.blob()
        if (controller.signal.aborted) return
        const next = URL.createObjectURL(blob); if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = next; setUrl(next); setFailed(false)
      } catch {
        if (!controller.signal.aborted) { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = ''; setUrl(''); setFailed(true); dialog.current?.close() }
      } finally { loading = false }
    }
    const sync = () => void load(); sync()
    const interval = window.setInterval(sync, 10000); window.addEventListener('focus', sync); document.addEventListener('visibilitychange', sync)
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [imageUrl, retry])
  if (!image || failed) return <div role="status" className="py-2 text-xs text-slate-400">{t('unavailable')}{image && <button onClick={() => setRetry(value => value + 1)} className="ml-3 text-violet-200">{t('retry')}</button>}</div>
  if (!url) return <p role="status" className="py-2 text-xs">{t('loading')}</p>
  return <>
    <button onClick={() => dialog.current?.showModal()} aria-label={t('open')} className="block max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={t('photo')} width={image.width} height={image.height} className="max-h-72 max-w-full rounded-xl object-contain" />
    </button>
    <dialog ref={dialog} aria-label={t('photo')} className="max-h-[90dvh] max-w-[95vw] rounded-xl bg-slate-950 p-3 text-white backdrop:bg-black/80">
      <button autoFocus onClick={() => dialog.current?.close()} className="mb-2 px-3 py-2">{t('close')}</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={t('photo')} className="max-h-[75dvh] max-w-full object-contain" />
    </dialog>
  </>
}

// Decode only nearby messages; leaving the viewport releases private image bytes.
export default function ImageMessage({ image }: { image?: ChatImageCard | null }) {
  const t = useTranslations('chatImages'), container = useRef<HTMLDivElement>(null), [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!container.current) return
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { rootMargin: '300px' })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const width = Math.min(image?.width ?? 200, 280)
  const height = image ? Math.min(288, width * image.height / image.width) : undefined
  return <div ref={container} className="max-w-full" style={{ width: image ? width : undefined, minHeight: height }}>
    {!image || visible ? <LoadedImage image={image} /> : <p role="status" className="py-2 text-xs">{t('loading')}</p>}
  </div>
}
