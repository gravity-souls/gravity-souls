import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const original = Module._load
const root = path.resolve(import.meta.dirname, '..')
Module._load = function(id, parent, main) {
  return original.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, main)
}

const Header = require('../components/resonance/ResonanceHeader.tsx').default
const Avatar = require('../components/planet/PlanetAvatar.tsx').default
const { ScoreRing } = require('../components/resonance/ResonanceDrawer.tsx')

test('resonance title remains opaque and has no gradient rectangle in formed and empty views', () => {
  for (const accentColor of [undefined, '#60a5fa']) {
    const html = renderToStaticMarkup(React.createElement(Header, { title: 'Resonance', eyebrow: 'Daily', subtitle: 'Your orbit', accentColor }))
    assert.match(html, /<h1[^>]*color:var\(--foreground\)[^>]*>Resonance<\/h1>/)
    assert.ok(!html.includes('linear-gradient'))
    assert.ok(!html.includes('text-fill-color'))
    assert.ok(!html.includes('color:transparent'))
  }
})

test('score ring keeps its 72px flex box so long identities cannot displace its center', () => {
  const html = renderToStaticMarkup(React.createElement(ScoreRing, { score: 88, color: '#ff8899' }))
  assert.match(html, /class="[^"]*shrink-0[^"]*"/)
  assert.match(html, /width:72px;height:72px/)
  assert.match(html, /<svg width="72" height="72"/)
  assert.match(html, />88<\/span>/)
})

test('small customized avatars retain the uploaded texture without the decorative ellipse', () => {
  const html = renderToStaticMarkup(React.createElement(Avatar, { size: 56, planetConfig: {
    baseTexture: 'mars.jpg', tintColor: '#123456', atmosphereColor: '#abcdef', atmosphereDensity: 0.2,
    hasRing: true, ringColor: '#ff00ff', rotationSpeed: 0.01, cloudOpacity: 0.2,
    customTextureUrl: 'https://example.com/custom.png',
  } }))
  assert.ok(html.includes('https://example.com/custom.png'))
  assert.ok(!html.includes('rotate(-22deg)'))
  assert.ok(!html.includes('#ff00ff'))
})
