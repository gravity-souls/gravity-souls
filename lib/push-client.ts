'use client'
export function pushKeyBytes(value: string): ArrayBuffer {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, letter => letter.charCodeAt(0)).buffer
}
export async function disableBrowserPush() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration?.active?.scriptURL.endsWith('/sw.js')) return
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  let serverDisabled = false
  try {
    const response = await fetch('/api/push/subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }), signal: AbortSignal.timeout(3000) })
    serverDisabled = response.ok
  } catch { /* Browser unsubscribe is still attempted if the server is unavailable. */ }
  const removed = await subscription.unsubscribe()
  for (const notification of await registration.getNotifications()) notification.close()
  if (!removed && !serverDisabled) throw new Error('unsubscribe failed')
}
export async function stopPushBeforeSignOut() {
  try { await disableBrowserPush() } catch { /* Server sign-out revokes the session-bound subscription too. */ }
}
