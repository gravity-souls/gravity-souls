import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const previous = Module._load
Module._load = function(id, parent, main) {
  if (id === 'next-intl') return { useTranslations: () => key => key }
  return previous.call(this, id, parent, main)
}
const Carousel = require('../components/ui/HorizontalCarousel.tsx').default
const Node = require('../components/resonance/ResonancePlanetNode.tsx').default
const Inbox = require('../components/messages/InboxPreview.tsx').default
Module._load = previous

test('community carousel exposes accessible desktop controls and a keyboard-focusable scrolling region', () => {
  const html = renderToStaticMarkup(React.createElement(Carousel, { label: 'Communities' }, React.createElement('a', { href: '/galaxy/a' }, 'Community A')))
  assert.match(html, /aria-label="previousCommunities"/)
  assert.match(html, /aria-label="nextCommunities"/)
  assert.match(html, /role="region" aria-label="Communities" tabindex="0"/)
  assert.ok(html.includes('overflow-x-auto'))
  assert.ok(html.includes('scrollbar-width:thin'))
  assert.ok(html.includes('Community A'))
})

test('resonance reason colors stay in the score label without drawing colored planet borders', () => {
  for (const orbitColor of ['orange', 'blue']) for (const isActive of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(Node, {
      planet: { id: 'planet-a', name: 'Aster', mood: 'calm', lifestyle: 'solitary', coreThemes: [], visual: { coreColor: '#abcdef', accentColor: '#abcdef', textureFile: 'mars.jpg' } },
      match: { score: 86, orbitColor }, isActive, onClick: () => {}, style: { left: 100, top: 100 },
    }))
    assert.ok(!html.includes('2px solid'))
    assert.ok(!html.includes('0 0 0 4px'))
    assert.ok(html.includes(`aria-pressed="${isActive}"`))
    assert.match(html, />86<\/span>/)
    assert.ok(html.includes('focus-visible:outline-2'))
  }
})

test('My Planet inbox provides a direct message route while conversations load', () => {
  const html = renderToStaticMarkup(React.createElement(Inbox))
  assert.ok(html.includes('data-testid="my-planet-messages"'))
  assert.match(html, /href="\/messages"/)
  assert.ok(html.includes('aria-busy="true"'))
})
