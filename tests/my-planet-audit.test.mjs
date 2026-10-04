import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { NextIntlClientProvider } = require('next-intl')
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime')
const { planetProfileFromApi } = require('../lib/planet-profile-from-api.ts')
// Load these components with the real locale provider, rather than the small
// translation stubs used by independent structural tests.
for (const file of ['../components/ui/HorizontalCarousel.tsx', ...['ResonantMatchesCarousel','RecommendedCommunities','LevelBadge','XPProgressBar','ResonanceRadar','UpcomingActivityCard'].map(n => `../components/planet/${n}.tsx`)]) delete require.cache[require.resolve(file)]
const Matches = require('../components/planet/ResonantMatchesCarousel.tsx').default
const Communities = require('../components/planet/RecommendedCommunities.tsx').default
const XP = require('../components/planet/XPProgressBar.tsx').default
const Radar = require('../components/planet/ResonanceRadar.tsx').default
const Activity = require('../components/planet/UpcomingActivityCard.tsx').default
delete require.cache[require.resolve('../components/planet/PlanetCustomizer.tsx')]
const loadBefore = Module._load
Module._load = function(id, parent, main) {
  if (id === '@/components/planet/PlanetGlobe') return { __esModule: true, default: () => null }
  return loadBefore.call(this, id, parent, main)
}
const Customizer = require('../components/planet/PlanetCustomizer.tsx').default
Module._load = loadBefore
const config = { baseTexture:'mars.jpg',customTextureUrl:'https://example.com/diy.png',tintColor:'#123456',atmosphereColor:'#abcdef',atmosphereDensity:0.1,hasRing:false,ringColor:'',rotationSpeed:0.01,cloudOpacity:0 }
const planet = planetProfileFromApi({id:'diy',name:'Custom Planet',userId:'owner',planetConfig:config,visual:{coreColor:'#ffffff',accentColor:'#eeeeee'}})
function render(locale, child) {
  return renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,messages:require(`../messages/${locale}.json`),timeZone:'Europe/Paris'},React.createElement(AppRouterContext.Provider,{value:{push:()=>{}}},child)))
}

test('My Planet API adapter preserves the exact customized appearance for matching cards',()=>{
  assert.deepEqual(planet.planetConfig,config)
  for (const locale of ['en','zh','fr']) {
    const html=render(locale,React.createElement(Matches,{matches:[{planet,score:86,traits:[]}]}))
    assert.ok(html.includes(config.customTextureUrl))
    assert.ok(html.includes('scrollbar-width:none'))
    assert.ok(html.includes('[&amp;::-webkit-scrollbar]:hidden'))
    assert.ok(html.includes(require(`../messages/${locale}.json`).myPlanet.resonantMatches))
    assert.ok(html.includes(require(`../messages/${locale}.json`).myPlanet.compatible))
  }
})

test('radar, XP levels, communities and event controls use the selected locale',()=>{
  for (const locale of ['en','zh','fr']) {
    const messages=require(`../messages/${locale}.json`)
    assert.ok(render(locale,React.createElement(XP,{xp:110,userLevel:2})).includes(messages.common.levelNames['2']))
    assert.ok(render(locale,React.createElement(Radar,{dimensions:[{label:messages.myPlanet.radar.introvert,value:55}],balance:55})).includes(messages.myPlanet.resonanceBalance))
    const community=render(locale,React.createElement(Communities,{galaxies:[{id:'g',name:'Community',slug:'g',symbol:'◌',memberCount:3,accentColor:'#123456'}]}))
    assert.ok(community.includes(messages.galaxies.join))
    const joined = render(locale,React.createElement(Communities,{galaxies:[{id:'g',name:'Community',slug:'g',symbol:'◌',memberCount:3,accentColor:'#123456',joined:true}]}))
    assert.ok(joined.includes(messages.galaxies.joined))
    assert.ok(joined.includes('disabled=""'))
    assert.ok(!community.includes('3 communities'))
    const event=render(locale,React.createElement(Activity,{event:{id:'e',title:'Event',date:'2026-10-04T12:00:00Z'},onOpen:()=>{},compact:true}))
    assert.ok(event.includes(messages.myPlanet.eventDetails.replace('&','&amp;')))
  }
})

test('all audited My Planet UI keys and footer roles exist in English, Chinese and French',()=>{
  const required=['resonantMatches','matchCount','compatible','communityCount','resonanceBalance','eventDetails','eventDetailsSoon','emptyName','nameTooLong','taglineTooLong','renameFailed','planetName','planetTagline','renamePlanet','taglinePlaceholder','roles.explorer','roles.resonator',...['introvert','empathy','curious','emotional','openminded','adventurous'].map(k=>`radar.${k}`)]
  for(const locale of ['en','zh','fr']) {
    const m=require(`../messages/${locale}.json`)
    for(const key of required) assert.equal(typeof key.split('.').reduce((v,k)=>v?.[k],m.myPlanet),'string',`${locale}:${key}`)
    assert.ok(m.common.exploreStream)
    assert.ok(m.home.openResonance)
  }
})

test('customization palette labels are localized and removed ring controls stay absent',()=>{
  for (const locale of ['en','zh','fr']) {
    const html = render(locale, React.createElement(Customizer,{initialConfig:config,planetName:'Custom Planet',userLevel:3}))
    const messages = require(`../messages/${locale}.json`)
    assert.ok(html.includes(messages.planetCustomizer.swatches.Nebula.name))
    assert.ok(html.includes(messages.planetCustomizer.swatches.Custom.tone))
    assert.ok(!html.includes('role="switch"'))
  }
})
