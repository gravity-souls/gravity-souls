import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { NextIntlClientProvider } = require('next-intl')
const Report = require('../components/resonance/MatchReportContent.tsx').default
const Avatar = require('../components/planet/PlanetAvatar.tsx').default
const Globe = require('../components/planet/PlanetGlobe.tsx').default
const { planetProfileFromApi } = require('../lib/planet-profile-from-api.ts')
const { buildResonanceSession } = require('../lib/match.ts')
const config = { baseTexture: 'mars.jpg', customTextureUrl: '/textures/earth_day.jpg', tintColor: '#123456', atmosphereColor: '#abcdef', atmosphereDensity: .1, hasRing: false, ringColor: '', rotationSpeed: .03, cloudOpacity: .5 }
const source = planetProfileFromApi({ id: 'self', name: 'My planet', mood: 'calm', lifestyle: 'solitary', coreThemes: ['art'], planetConfig: config })
const candidates = [planetProfileFromApi({ id: 'candidate', name: 'Other planet', mood: 'calm', lifestyle: 'solitary', coreThemes: ['art'], planetConfig: config })]
const data = { source, candidates, updatedAt: '2026-10-05T21:00:00Z' }
function render(locale, value) { return renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale, messages: require(`../messages/${locale}.json`), timeZone: 'Europe/Paris' }, value)) }

test('uploaded photos stay still and flat even if a caller requests rotation and legacy clouds', () => {
  const html = renderToStaticMarkup(React.createElement(Avatar, { planetConfig: config, rotating: true }))
  assert.match(html, /<img[^>]+src="\/textures\/earth_day.jpg"/)
  assert.ok(!html.includes('planet-avatar-rotating'))
  assert.ok(!html.includes('repeating-linear-gradient'))
  assert.ok(!html.includes('radial-gradient'))
  const globe = renderToStaticMarkup(React.createElement(Globe, { planetConfig: config, size: 100 }))
  assert.match(globe, /data-planet-display="flat"/)
  assert.ok(!globe.includes('<canvas'))
  assert.ok(!globe.includes('planet-avatar-rotating'))
})
for (const locale of ['en', 'fr', 'zh']) {
  test(`report uses real match scores, localized traits and explicit batch scope in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`)
    const html = render(locale, React.createElement(Report, { data }))
    const score = buildResonanceSession(source, candidates).matches[0].score
    assert.match(html, new RegExp(`>${score}</span>`))
    assert.ok(html.includes(messages.matchReport.title) === false) // page owns its unique title
    assert.ok(html.includes(messages.matchReport.dimensions))
    assert.ok(html.includes(messages.matchReport.scope.replace('{count}', '1')))
    assert.ok(!html.includes('matchReport.'))
    assert.ok(!/>resonance\.[a-z]/.test(html))
    assert.ok(html.includes('/planet/candidate'))
    assert.ok(html.includes('/messages?to=candidate'))
    assert.ok(html.includes('Other planet'))
    const empty = render(locale, React.createElement(Report, { data: { ...data, candidates: [] } }))
    assert.ok(empty.includes(messages.matchReport.empty))
    assert.ok(!empty.includes('Other planet'))
    assert.ok(!empty.includes('NaN'))
  })
}
