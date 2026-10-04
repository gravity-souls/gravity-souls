import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { NextIntlClientProvider } = require('next-intl')
const { messageParts, insertMessageEmoji, CHAT_EMOJI, MAX_MESSAGE_LENGTH } = require('../lib/chat-content.ts')
const { messageLength, truncateMessage } = require('../lib/message-limits.ts')
const { messageSchema } = require('../lib/input-schemas.ts')
const MessageContent = require('../components/messages/MessageContent.tsx').default
const SignalComposer = require('../components/social/SignalComposer.tsx').default
const render = (locale, child) => renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale, timeZone: 'Europe/Paris', messages: require(`../messages/${locale}.json`) }, child))

test('link detection preserves multilingual text, newlines, punctuation and balanced URL parentheses', () => {
  const content = '你好😊\n看这里https://example.test/路径?q=1。\nVoir (https://example.test/a_(b)). HTTP://EXAMPLE.TEST:8080?q=2!'
  const parts = messageParts(content)
  assert.equal(parts.map(p => p.text).join(''), content)
  assert.deepEqual(parts.filter(p => p.href).map(p => p.text), ['https://example.test/路径?q=1', 'https://example.test/a_(b)', 'HTTP://EXAMPLE.TEST:8080?q=2'])
  assert.equal(parts.filter(p => p.href)[0].href, 'https://example.test/%E8%B7%AF%E5%BE%84?q=1')
  assert.equal(parts.filter(p => p.href)[2].href, 'http://example.test:8080/?q=2')
})

test('unsafe schemes, credentials, controls, spoofing marks, backslashes and malformed URLs remain text', () => {
  for (const content of ['javascript:alert(1)', 'javascript:https://example.test', 'data:text/html,https://example.test', '//example.test', 'www.example.test', 'https://user:pass@example.test', 'https://user@example.test', 'https://', 'https://[invalid]', 'https://example.test/\u202Eevil', 'https://example.test/\u0000evil', 'https://example.test/%0aevil', 'https://example.test/%5cevil', 'https://example.test\\@evil.test']) {
    const parts = messageParts(content)
    assert.equal(parts.map(p => p.text).join(''), content)
    assert.ok(parts.every(p => !p.href), content)
  }
})

test('no rich HTML interpretation and safe links carry new-tab and privacy attributes in all locales', () => {
  for (const locale of ['en', 'fr', 'zh']) {
    const html = render(locale, React.createElement(MessageContent, { content: '<img src=x onerror=alert(1)>\n😊 https://example.test/?x=1&y=2 javascript:alert(1)' }))
    assert.ok(!html.includes('<img'))
    assert.ok(html.includes('&lt;img'))
    assert.ok(html.includes('whitespace-pre-wrap'))
    assert.ok(html.includes('[overflow-wrap:anywhere]'))
    assert.ok(html.includes('target="_blank"'))
    assert.ok(html.includes('rel="noopener noreferrer"'))
    assert.ok(!html.includes('href="javascript:'))
    assert.ok(html.includes('href="https://example.test/?x=1&amp;y=2"'))
    const label = require(`../messages/${locale}.json`).chatContent.opensNewTab
    const escaped = renderToStaticMarkup(React.createElement('span', null, label)).slice(6, -7)
    assert.ok(html.includes(escaped))
  }
})

test('emoji insertion replaces a selection and respects the same Unicode code-point message limit as server validation', () => {
  assert.deepEqual(insertMessageEmoji('hello world', 6, 11, '🪐'), { value: 'hello 🪐', caret: 8 })
  assert.deepEqual(insertMessageEmoji('a😊b', 3, 3, '❤️'), { value: 'a😊❤️b', caret: 5 })
  assert.equal(insertMessageEmoji('x'.repeat(MAX_MESSAGE_LENGTH), MAX_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH, '🪐'), null)
  assert.equal(messageLength(insertMessageEmoji('x'.repeat(MAX_MESSAGE_LENGTH - 1), MAX_MESSAGE_LENGTH - 1, MAX_MESSAGE_LENGTH - 1, '🪐').value), MAX_MESSAGE_LENGTH)
  assert.equal(insertMessageEmoji('x'.repeat(MAX_MESSAGE_LENGTH), 0, 2, '🪐').value.length, MAX_MESSAGE_LENGTH)
  assert.equal(insertMessageEmoji('', 0, 0, '❤️').value, '❤️')
  assert.equal(new Set(CHAT_EMOJI.map(([key]) => key)).size, CHAT_EMOJI.length)
})

for (const locale of ['en', 'fr', 'zh']) test(`composer offers localized default input, emoji control, mobile and desktop hints in ${locale}`, () => {
  const html = render(locale, React.createElement(SignalComposer, { onSend: async () => true }))
  const translations = require(`../messages/${locale}.json`).chatContent
  const escaped = text => renderToStaticMarkup(React.createElement('span', null, text)).slice(6, -7)
  for (const key of ['placeholder', 'addEmoji', 'desktopHint', 'mobileHint']) assert.ok(html.includes(escaped(translations[key])))
  assert.ok(html.includes('maxLength="4000"'))
  assert.ok(html.includes('aria-expanded="false"'))
  const disabled = render(locale, React.createElement(SignalComposer, { onSend: async () => true, disabled: true }))
  assert.equal((disabled.match(/disabled=""/g) ?? []).length, 3)
  for (const [key] of CHAT_EMOJI) assert.ok(translations.emoji[key])
})

test('typing and paste truncation match server Unicode validation without cutting a surrogate pair', () => {
  for (const content of ['x'.repeat(2001), '🪐'.repeat(2001), '你好'.repeat(1001), 'a🪐'.repeat(1001)]) {
    assert.equal(messageSchema.safeParse({ content }).success, false)
    const bounded = truncateMessage(content)
    assert.equal(messageLength(bounded), MAX_MESSAGE_LENGTH)
    assert.equal(messageSchema.safeParse({ content: bounded }).success, true)
    assert.ok(!/[\uD800-\uDBFF]$/.test(bounded))
  }
  assert.equal(messageLength('🪐'.repeat(2000)), 2000)
  assert.equal(messageSchema.safeParse({ content: '🪐'.repeat(2000) }).success, true)
})
