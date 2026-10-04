import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const { planetConfigFromUser, normalizePlanetVisual, planetConfigFromVisual } = require('../lib/user-planet-config.ts')
const { PRESET_PLANETS } = require('../types/planet.ts')
const PlanetVisual = require('../components/planet/PlanetVisual.tsx').default
const PlanetScene = require('../components/planet/PlanetScene.tsx').default
const legacy = { ...PRESET_PLANETS[0], hasRing: true, ringColor: '#ff00ff' }

test('legacy ring settings are disabled without losing custom textures or atmosphere', () => {
  const config = planetConfigFromUser({ planetHasRing: true, planetRingColor: '#ff00ff', planetCustomTexture: '/uploads/planet-textures/custom.png', planetAtmoDensity: 0.2 })
  assert.equal(config.hasRing, false)
  assert.equal(config.ringColor, '')
  assert.equal(config.customTextureUrl, '/uploads/planet-textures/custom.png')
  assert.equal(config.atmosphereDensity, 0.2)
  assert.ok(PRESET_PLANETS.every(p => !p.hasRing && p.ringColor === ''))
  for (const ringStyle of ['single', 'double', 'broken', 'none']) {
    assert.equal(normalizePlanetVisual({ ringStyle }).ringStyle, 'none')
    assert.equal(planetConfigFromVisual({ mood: 'calm', lifestyle: 'solitary', coreThemes: [], visual: { ringStyle } }).hasRing, false)
  }
})

test('legacy ring styles render no ellipses in either CSS planet renderer', () => {
  for (const ringStyle of ['single', 'double', 'broken']) {
    const visual = { coreColor: '#abcdef', accentColor: '#123456', surfaceStyle: 'smooth', satelliteCount: 0, size: 'lg', ringStyle }
    for (const element of [React.createElement(PlanetVisual, { visual }), React.createElement(PlanetScene, { planet: { visual, coreThemes: [] } })]) {
      const html = renderToStaticMarkup(element)
      assert.ok(!html.includes('<ellipse'))
      assert.ok(!html.includes('ring-glow'))
      assert.ok(html.includes('rounded-full'))
    }
  }
})

const saved = []
const levelChecks = []
const priorLoad = Module._load
Module._load = function(id, parent, main) {
  if (id === 'next-intl') return { useTranslations: () => key => key }
  if (id === '@/components/planet/PlanetGlobe') return { __esModule: true, default: () => null }
  if (id === '@/lib/session') return { requireUser: async () => ({ user: { id: 'ring-regression' } }) }
  if (id === '@/lib/prisma') return { prisma: {
    user: {
      findUnique: async () => ({ planetTint: legacy.tintColor, planetAtmoColor: legacy.atmosphereColor, planetAtmoDensity: legacy.atmosphereDensity, planetHasRing: true, planetRingColor: '#ff00ff', planetRotationSpeed: legacy.rotationSpeed, planetCloudOpacity: legacy.cloudOpacity, planetCustomTexture: null }),
      update: async ({ data }) => { saved.push(data); return data },
    },
    xPEvent: { findFirst: async () => ({ id: 'existing-xp' }) },
  } }
  if (id === '@/lib/grantXP') return { grantXP: async () => { throw new Error('XP must not be granted twice') } }
  if (id === '@/lib/requireLevel') return { requireLevel: async (_request, level) => { levelChecks.push(level); return { authorized: false } } }
  return priorLoad.call(this, id, parent, main)
}
const Customizer = require('../components/planet/PlanetCustomizer.tsx').default
const { PATCH } = require('../app/api/user/planet-config/route.ts')
Module._load = priorLoad

test('customizer removes ring switch and color controls even for a legacy ringed account', () => {
  const html = renderToStaticMarkup(React.createElement(Customizer, { initialConfig: legacy, planetName: 'Legacy', userLevel: 5 }))
  assert.ok(!html.includes('role="switch"'))
  assert.ok(!html.includes('ringColor'))
  assert.ok(!html.includes('atmosphereRing'))
  assert.ok(html.includes('atmosphereDensity'))
  assert.ok(html.includes('planetTint'))
})

test('save API accepts omitted or obsolete ring fields, clears persisted rings, and needs no ring unlock', async () => {
  const body = { ...legacy }
  delete body.hasRing
  delete body.ringColor
  for (const payload of [body, { ...body, hasRing: true, ringColor: '#ff00ff' }]) {
    const response = await PATCH(new Request('http://localhost/api/user/planet-config', { method: 'PATCH', body: JSON.stringify(payload) }))
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(result.planetHasRing, false)
    assert.equal(result.planetRingColor, '')
    assert.equal(result.planetTint, legacy.tintColor)
  }
  assert.equal(saved.length, 2)
  assert.deepEqual(levelChecks, [])
})
