'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { disableBrowserPush, pushKeyBytes } from '@/lib/push-client'
export default function PushSettings() {
  const t = useTranslations('pushSettings')
  const [supported, setSupported] = useState(true), [loading, setLoading] = useState(true), [configured, setConfigured] = useState(false)
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState<'generic' | 'sender'>('generic')
  const registration = useRef<ServiceWorkerRegistration | null>(null), subscription = useRef<PushSubscription | null>(null), publicKey = useRef(''), locked = useRef(false)
  useEffect(() => {
    let disposed = false
    async function load() {
      try {
        if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { if (!disposed) setSupported(false); return }
        const response = await fetch('/api/push/subscriptions', { cache: 'no-store' })
        if (!response.ok) throw new Error('failed')
        const config = await response.json()
        if (disposed) return
        setConfigured(config.configured); publicKey.current = config.publicKey ?? ''
        if (!config.configured) return
        registration.current = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        await navigator.serviceWorker.ready
        subscription.current = await registration.current.pushManager.getSubscription()
        if (subscription.current) {
          const response = await fetch('/api/push/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'status', endpoint: subscription.current.endpoint }) })
          if (!response.ok) throw new Error('failed')
          const result = await response.json()
          if (!disposed) { setEnabled(result.enabled); setPreview(result.preview) }
        }
      } catch { if (!disposed) setError('failed') }
      finally { if (!disposed) setLoading(false) }
    }
    void load()
    return () => { disposed = true }
  }, [])
  async function enable() {
    if (locked.current || !registration.current || !publicKey.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      // subscribe is called directly from this click, before network awaits.
      const value = subscription.current ?? await registration.current.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKeyBytes(publicKey.current) })
      subscription.current = value
      const serialized = value.toJSON()
      const response = await fetch('/api/push/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'subscribe', endpoint: value.endpoint, keys: serialized.keys, preview }) })
      if (!response.ok) { const body = await response.json(); throw new Error(body.error === 'bound' ? 'bound' : body.error === 'deviceLimit' ? 'deviceLimit' : 'failed') }
      setEnabled(true)
    } catch (error) { setError(Notification.permission === 'denied' ? 'denied' : error instanceof Error && ['bound','deviceLimit'].includes(error.message) ? error.message : 'failed') }
    finally { locked.current = false; setBusy(false) }
  }
  async function disable() {
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try { await disableBrowserPush(); subscription.current = null; setEnabled(false) }
    catch { setError('failed') }
    finally { locked.current = false; setBusy(false) }
  }
  async function preference(value: 'generic' | 'sender') {
    if (!enabled) { setPreview(value); return }
    if (locked.current || !subscription.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      const response = await fetch('/api/push/subscriptions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.current.endpoint, preview: value }) })
      if (!response.ok) throw new Error('failed')
      const result = await response.json()
      if (!result.enabled) { setEnabled(false); throw new Error('failed') }
      setPreview(value)
    } catch { setError('failed') }
    finally { locked.current = false; setBusy(false) }
  }
  return <section aria-label={t('title')} className="rounded-2xl border border-white/10 p-6">
    <h2 className="text-base font-semibold">{t('title')}</h2><p className="mt-2 text-sm text-slate-400">{t('description')}</p>
    <p className="mt-2 text-xs text-slate-400">{t('iphone')}</p>
    <p role="status" className="mt-3 text-sm">{loading ? t('loading') : !supported ? t('unsupported') : !configured ? t('unconfigured') : enabled ? t('enabled') : t('disabled')}</p>
    {supported && configured && !loading && <><label className="mt-3 flex flex-col gap-2 text-sm">{t('preview')}<select value={preview} disabled={busy} onChange={event => void preference(event.target.value as 'generic' | 'sender')} className="min-h-11 rounded-lg bg-slate-900 p-2"><option value="generic">{t('generic')}</option><option value="sender">{t('sender')}</option></select></label><button disabled={busy || !!error && !registration.current} onClick={() => void (enabled ? disable() : enable())} className="mt-3 min-h-11 rounded-lg border border-violet-300/30 px-4 text-sm text-violet-200">{busy ? t('working') : enabled ? t('disable') : t('enable')}</button></>}
    {error && <p role="alert" className="mt-2 text-xs text-rose-200">{t(error)}</p>}
    {error === 'bound' && <button disabled={busy} onClick={() => void disable()} className="mt-2 min-h-11 px-3 text-sm text-violet-200">{t('disable')}</button>}
  </section>
}
