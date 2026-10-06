import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { NextIntlClientProvider } = require('next-intl')
const { buildPlanetFromDraft, planetProfileToDraft } = require('../lib/planet-builder.ts')
const { INITIAL_DRAFT } = require('../types/creation.ts')
const { localizedPlanetTagline, planetClimateKey } = require('../lib/planet-meaning.ts')
const { planetAvatarSource } = require('../lib/planet-avatar-source.ts')
const { XP_EVENTS, calculateLevel, xpToNextLevel } = require('../lib/xp.ts')
const Meaning = require('../components/planet/PlanetMeaning.tsx').default
const Preview = require('../components/creation/LivePlanetPreview.tsx').default
const Person = require('../components/planet/PersonAvatar.tsx').default
const render = (locale, child) => renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,messages:require(`../messages/${locale}.json`),timeZone:'Europe/Paris'},child))

test('formation starts level 1; participation still reaches existing milestones',()=>{
  assert.equal(XP_EVENTS.PROFILE_COMPLETED,0)
  assert.equal(calculateLevel(XP_EVENTS.PROFILE_COMPLETED + XP_EVENTS.DAILY_LOGIN),1)
  assert.equal(calculateLevel(99),1); assert.equal(calculateLevel(100),2)
  assert.deepEqual(xpToNextLevel(0),{current:0,required:100,percentage:0})
  assert.equal(calculateLevel(300),3); assert.equal(calculateLevel(700),4); assert.equal(calculateLevel(1500),5)
})

test('shared moods preserve the actual selected climate through save and edit',()=>{
  for(const climateKey of ['melancholic','introspective','electric','turbulent']) {
    const planet=buildPlanetFromDraft({...INITIAL_DRAFT,climateKey},'formation-owner')
    assert.equal(planetClimateKey(planet),climateKey)
    assert.equal(planetProfileToDraft(planet).climateKey,climateKey)
    const legacy={...planet,visual:{...planet.visual,climateKey:undefined}}
    assert.equal(planetClimateKey(legacy),climateKey)
  }
})

test('generated meaning and tagline are localized, personal writing is preserved, preview names are visible text',()=>{
  const planet=buildPlanetFromDraft({...INITIAL_DRAFT,climateKey:'introspective',lifestyle:'nomadic',communicationStyle:'poetic',selectedThemes:['night & silence']},'formation-owner')
  for(const locale of ['en','fr','zh']) {
    const messages=require(`../messages/${locale}.json`)
    const translator=key=>key.split('.').reduce((value,part)=>value?.[part],messages.creationSteps)
    translator.has=key=>typeof translator(key)==='string'
    assert.equal(localizedPlanetTagline(planet,translator),messages.creationSteps.climateOptions.introspective.description)
    assert.equal(localizedPlanetTagline({...planet,tagline:'My own words'},translator),'My own words')
    const html=render(locale,React.createElement(Meaning,{planet,expanded:true}))
    const escape=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)
    assert.ok(html.includes(escape(messages.planetMeaning.nameExplanation)))
    assert.ok(html.includes(escape(messages.creationSteps.climateOptions.introspective.description)))
    assert.ok(html.includes(escape(messages.creationSteps.lifestyleOptions.nomadic.description)))
    assert.ok(html.includes(escape(messages.creationSteps.commStyleOptions.poetic.description)))
    const preview=render(locale,React.createElement(Preview,{planet}))
    assert.ok(preview.includes(planet.name)); assert.ok(!preview.includes('background-clip:text'))
  }
})

test('email and Google accounts use planet identity before provider portraits in maps',()=>{
  const config={baseTexture:'mars.jpg',tintColor:'#a78bfa'}
  assert.equal(planetAvatarSource(config,null),'/textures/mars.jpg')
  assert.equal(planetAvatarSource(config,'https://example.test/google.png'),'/textures/mars.jpg')
  assert.equal(planetAvatarSource({...config,customTextureUrl:'/uploads/photo.png'},null),'/uploads/photo.png')
  for(const src of [null,'https://example.test/google.png']) {
    const html=render('en',React.createElement(Person,{name:'Email User',src,planetConfig:config}))
    assert.ok(html.includes('src="/textures/mars.jpg"')); assert.ok(!html.includes('google.png')); assert.ok(!html.includes('>E<'))
  }
})
