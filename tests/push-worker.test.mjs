import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
const source = readFileSync('public/sw.js', 'utf8')
function worker(status = 200, data = { body: 'Allowed sender', url: '/messages/thread', tag: 'chat-thread' }) {
  const handlers = {}, notices = [], navigated = [], clicked = [], requests = []
  const self = { location: { origin: 'https://gravity.test' }, addEventListener: (type, handler) => { handlers[type] = handler }, registration: { showNotification: async (title, options) => { notices.push({ title, options }) } }, clients: { claim: async () => {}, matchAll: async () => [{ url: 'https://gravity.test/messages', navigate: async url => navigated.push(url), focus: async () => clicked.push(true) }], openWindow: async url => navigated.push(url) }, skipWaiting: async () => {} }
  vm.runInNewContext(source, { self, URL, encodeURIComponent, fetch: async (url, options) => { requests.push({ url, options }); if (status === 0) throw Error('offline'); return { ok: status === 200, json: async () => data } } })
  const dispatch = async (name, props) => { let task; handlers[name]({ ...props, waitUntil: promise => { task = promise } }); await task }
  return { handlers, notices, navigated, clicked, requests, dispatch }
}
test('worker revalidates with cookies and no cache before showing a preview; it never caches private pages', async () => {
  const w = worker(); await w.dispatch('push', { data: { json: () => ({ deliveryId: 'job', locale: 'zh' }) } })
  assert.equal(w.requests[0].url, '/api/push/display?id=job'); assert.equal(w.requests[0].options.credentials, 'same-origin'); assert.equal(w.requests[0].options.cache, 'no-store')
  assert.equal(w.notices[0].options.body, 'Allowed sender'); assert.equal(w.notices[0].options.renotify, false); assert.equal(w.handlers.fetch, undefined)
})
test('read, revoked, signed-out and offline delivery fall back to a generic visible notice without identity or message text', async () => {
  for (const status of [401, 403, 404, 0]) {
    const w = worker(status); await w.dispatch('push', { data: { json: () => ({ deliveryId: 'job', locale: 'zh', body: 'UNTRUSTED PRIVATE', sender: 'PRIVATE PERSON' }) } })
    assert.equal(w.notices.length, 1); assert.equal(w.notices[0].options.body, '你有一条新通知。'); assert.equal(w.notices[0].options.data.url, '/messages')
    assert.ok(!JSON.stringify(w.notices).includes('PRIVATE'))
  }
})
test('notification click stays on origin, focuses an existing window and never marks a message read', async () => {
  for (const value of ['/messages/thread', 'https://evil.test/', '//evil.test/', '/messages/../admin']) {
    const w = worker(); await w.dispatch('notificationclick', { notification: { close() {}, data: { url: value } } })
    assert.equal(w.navigated[0], value === '/messages/thread' ? 'https://gravity.test/messages/thread' : 'https://gravity.test/messages')
    assert.equal(w.clicked.length, 1); assert.equal(w.requests.length, 0)
  }
})
