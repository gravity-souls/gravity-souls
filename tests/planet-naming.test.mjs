import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const { NextIntlClientProvider } = require('next-intl')
const { planetDisplayName, hasDistinctPlanetName } = require('../lib/planet-display-name.ts')
const { planetProfileFromApi } = require('../lib/planet-profile-from-api.ts')
const PlanetCard = require('../components/planet/PlanetCard.tsx').default
const PlanetHero = require('../components/planet/PlanetHero.tsx').default
const PersonalMapAnchor = require('../components/star-map/PersonalMapAnchor.tsx').default
const { planetUpdateSchema } = require('../lib/input-schemas.ts')

const planet = {
  id: 'planet-1',
  userId: 'user-1',
  name: 'Morrow-7',
  displayName: '  AstralPseudonym  ',
  avatarSymbol: '✦',
  tagline: 'A quiet signal',
  role: 'resonator',
  mood: 'calm',
  style: 'minimal',
  lifestyle: 'solitary',
  coreThemes: [],
  contentFragments: [],
  visual: {
    coreColor: '#a78bfa',
    accentColor: '#6366f1',
    ringStyle: 'none',
    surfaceStyle: 'smooth',
    satelliteCount: 0,
    size: 'md',
  },
  cognitiveAxes: { abstract: 50, introspective: 50 },
  emotionalBars: [],
  createdAt: '',
}

function render(locale, child) {
  return renderToStaticMarkup(React.createElement(
    NextIntlClientProvider,
    { locale, messages: require(`../messages/${locale}.json`), timeZone: 'Europe/Paris' },
    child,
  ))
}

test('public pseudonym is trimmed and falls back only to the distinct planet name', () => {
  assert.equal(planetDisplayName(planet), 'AstralPseudonym')
  assert.equal(planetDisplayName({ displayName: '  ', name: '  Morrow-7  ' }), 'Morrow-7')
  assert.equal(planetDisplayName({ displayName: '', name: '' }), '')
  assert.equal(hasDistinctPlanetName(planet), true)
  assert.equal(hasDistinctPlanetName({ displayName: 'Morrow-7', name: ' Morrow-7 ' }), false)

  const adapted = planetProfileFromApi({ id: planet.id, name: planet.name, displayName: planet.displayName })
  assert.equal(adapted.name, 'Morrow-7')
  assert.equal(adapted.displayName, '  AstralPseudonym  ')
  assert.equal(planetDisplayName(adapted), 'AstralPseudonym')
  assert.equal(planetDisplayName(planetProfileFromApi({ id: 'legacy', name: 'Legacy-Orbit' })), 'Legacy-Orbit')
})

test('message inbox and conversation labels prioritize the public pseudonym', () => {
  const contact = { displayName: 'AstralPseudonym', name: 'Morrow-7' }
  assert.equal(planetDisplayName(contact), 'AstralPseudonym')
  const inbox = readFileSync(new URL('../app/messages/page.tsx', import.meta.url), 'utf8')
  const thread = readFileSync(new URL('../app/messages/[id]/page.tsx', import.meta.url), 'utf8')
  const preview = readFileSync(new URL('../components/messages/InboxPreview.tsx', import.meta.url), 'utf8')
  assert.match(inbox, /displayName:\s*conv\.otherUser\.name/)
  assert.match(thread, /displayName:\s*fallbackName/)
  assert.match(thread, /displayName:\s*otherUserName/)
  assert.match(preview, /displayName:\s*conversation\.otherUser\.name/)
})

for (const locale of ['en', 'fr', 'zh']) {
  test(`profile cards and personal-map anchor expose the public name accessibly in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`)
    const cardHtml = render(locale, React.createElement(PlanetCard, { planet, size: 40 }))
    assert.match(cardHtml, /aria-label="AstralPseudonym  -  A quiet signal"/)
    assert.ok(cardHtml.includes('AstralPseudonym'))
    assert.ok(cardHtml.includes(`${messages.myPlanet.planetName}: Morrow-7`))

    const sameName = render(locale, React.createElement(PlanetCard, {
      planet: { ...planet, displayName: 'Morrow-7' },
      size: 40,
    }))
    assert.ok(!sameName.includes(`${messages.myPlanet.planetName}: Morrow-7`))

    const anchorHtml = render(locale, React.createElement(PersonalMapAnchor, {
      planet: { id: planet.id, name: planet.name, displayName: planet.displayName, href: '/my-planet', level: 1 },
      origin: 'star-map',
    }))
    assert.ok(anchorHtml.includes(messages.starMap.openSelf.replace('{name}', 'AstralPseudonym')))
    assert.ok(anchorHtml.includes('aria-label='))
  })
}

test('planet API serializers carry User.name separately without replacing Planet.name', () => {
  const contracts = [
    ['app/api/my-planet/route.ts', /displayName:\s*user\.name/],
    ['app/api/planets/route.ts', /displayName:\s*p\.user\.name/],
    ['app/api/planets/[id]/route.ts', /displayName:\s*planet\.user\.name/],
    ['app/api/saved-planets/route.ts', /displayName:\s*user\.name/],
    ['app/api/follows/route.ts', /displayName:\s*r\.user\.name/],
    ['app/api/star-map/route.ts', /displayName:\s*p\.user\.name/],
    ['app/api/universe/planets/route.ts', /name:\s*planet\.name,\s*displayName:\s*user\.name/],
    ['app/api/beam-invitations/route.ts', /displayName:\s*other\.name/],
    ['lib/galaxy-workflow.ts', /displayName:\s*m\.user\.name/],
    ['app/api/search/route.ts', /displayName:\s*p\.user\.name/],
    ['app/api/conversations/[id]/share-options/route.ts', /user:\s*\{\s*name:\s*\{\s*contains:\s*search/],
  ]
  for (const [path, contract] of contracts)
    assert.match(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), contract, path)
})

test('planet-name PATCH requests remain independent from User.name', () => {
  const request = planetUpdateSchema.safeParse({ name: 'New Orbit Name' })
  assert.equal(request.success, true)
  if (request.success) assert.deepEqual(request.data, { name: 'New Orbit Name' })
  assert.equal(planetUpdateSchema.safeParse({ name: 'New Orbit Name', displayName: 'Public Alias' }).success, false)
  const route = readFileSync(new URL('../app/api/my-planet/route.ts', import.meta.url), 'utf8')
  assert.match(route, /planetData\.name\s*=\s*body\.name\.trim\(\)/)
  assert.match(route, /if \(planetData\.name\) profileData\.name = planetData\.name/)
  assert.doesNotMatch(route, /profileData\.name\s*=\s*body\.displayName/)
})

for (const locale of ['en', 'fr', 'zh']) {
  test(`planet profile heading keeps the pseudonym primary and labels the planet name in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`)
    const html = render(locale, React.createElement(PlanetHero, { planet, viewerRole: 'self' }))
    assert.match(html, /<h1[^>]*>AstralPseudonym<\/h1>/)
    assert.ok(html.includes(`${messages.myPlanet.planetName}: Morrow-7`))
    const equalNames = render(locale, React.createElement(PlanetHero, {
      planet: { ...planet, displayName: 'Morrow-7' },
      viewerRole: 'self',
    }))
    assert.ok(!equalNames.includes(`${messages.myPlanet.planetName}: Morrow-7`))
  })
}

test('the existing Planet name label and message keys are in parity across all shipped locales', () => {
  function keys(value, prefix = '') {
    return Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key
      return child && typeof child === 'object' ? keys(child, path) : [path]
    }).sort()
  }
  const locales = ['en', 'fr', 'zh'].map(locale => require(`../messages/${locale}.json`))
  assert.ok(locales.every(messages => typeof messages.myPlanet.planetName === 'string' && messages.myPlanet.planetName.length > 0))
  assert.deepEqual(keys(locales[1]), keys(locales[0]))
  assert.deepEqual(keys(locales[2]), keys(locales[0]))
})
