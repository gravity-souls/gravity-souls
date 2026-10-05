import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { NextIntlClientProvider } = require('next-intl')
const {
  AppRouterContext,
} = require('next/dist/shared/lib/app-router-context.shared-runtime')
const Form = require('../components/galaxy/GalaxyForm.tsx').default
const Composer = require('../components/galaxy/DiscussionComposer.tsx').default
const RSVP = require('../components/events/RSVPButton.tsx').default
const EventCard = require('../components/events/EventCard.tsx').default
const StarMap = require('../components/star-map/StarMap.tsx').default
const RelationshipStatus = require('../components/social/PlanetRelationshipStatus.tsx').default
const ReturnLink = require('../components/social/ExplorationReturnLink.tsx').default
const Beam = require('../components/social/BeamButton.tsx').default
const { BeamInvitationCard } = require('../components/social/BeamInvitations.tsx')
const SendInvitation = require('../components/social/SendBeamInvitationButton.tsx').default
const { explorationOrigin, explorationReturnHref, withExplorationOrigin } = require('../lib/exploration-return.ts')
const event = {
  id: 'evt',
  galaxyId: 'g',
  title: 'Sample',
  description: 'Sample',
  date: '2030-01-01T12:00:00Z',
  category: 'ONLINE',
  status: 'APPROVED',
  rsvpCount: 1,
  maxAttendees: 2,
  proposer: { id: 'owner', name: 'Owner' },
  userHasRSVPed: false,
  requiresApproval: true,
  userAttendance: 'PENDING',
}
function render(locale, child) {
  return renderToStaticMarkup(
    React.createElement(
      NextIntlClientProvider,
      {
        locale,
        messages: require(`../messages/${locale}.json`),
        timeZone: 'Europe/Paris',
      },
      React.createElement(
        AppRouterContext.Provider,
        { value: { push: () => {} } },
        child,
      ),
    ),
  )
}
for (const locale of ['en', 'zh', 'fr']) {
  test(`beam invitation decisions and existing chat distinguish sender and recipient in ${locale}`, () => {
    const m = require(`../messages/${locale}.json`).beamInvitations
    const escaped = text => renderToStaticMarkup(React.createElement('span', null, text)).slice(6, -7)
    const row = { id: 'invite', status: 'PENDING', createdAt: '2030-01-01T12:00:00Z', otherUser: { id: 'other', name: 'Other' }, planet: null, conversationId: null }
    const card = (direction, data = row) => render(locale, React.createElement(BeamInvitationCard, { direction, row: data, onAction: () => {} }))
    const incoming = card('received'), outgoing = card('sent')
    for (const key of ['accept', 'reject']) assert.ok(incoming.includes(escaped(m[key])))
    assert.ok(!incoming.includes(`>${escaped(m.cancel)}<`))
    assert.ok(outgoing.includes(escaped(m.cancel)))
    for (const key of ['accept', 'reject']) assert.ok(!outgoing.includes(`>${escaped(m[key])}<`))
    const accepted = card('received', { ...row, status: 'ACCEPTED', conversationId: 'thread' })
    assert.ok(accepted.includes('href="/messages/thread"'))
    assert.ok(!accepted.includes('<button'))
    const send = render(locale, React.createElement(SendInvitation, { userId: 'other' }))
    assert.ok(send.includes(escaped(m.sendExplanation)))
    assert.ok(send.includes(escaped(m.send)))
  })
  test(`star-map relationship labels and chat return links translate in ${locale}`, () => {
    const m = require(`../messages/${locale}.json`).starMap
    const text = key => renderToStaticMarkup(React.createElement('span', null, m[key])).slice(6, -7)
    const badge = state => render(locale, React.createElement(RelationshipStatus, { relationship: state }))
    const mutual = badge({ saved: true, following: true, followedBy: true, conversationId: 'thread' })
    for (const key of ['savedStatus', 'mutualStatus', 'conversationStatus']) assert.ok(mutual.includes(text(key)))
    assert.ok(!mutual.includes(`<span>${text('followingStatus')}</span>`))
    const incoming = badge({ saved: false, following: false, followedBy: true, conversationId: null })
    assert.ok(incoming.includes(text('followsYouStatus')))
    assert.ok(!incoming.includes(text('savedStatus')))
    assert.equal(badge({ saved: false, following: false, followedBy: false, conversationId: null }), '')
    const back = render(locale, React.createElement(ReturnLink, { origin: 'star-map' }))
    assert.ok(back.includes(text('returnMap')))
    assert.ok(back.includes('href="/star-map?mode=discover"'))
    const beam = render(locale, React.createElement(Beam, { userId: 'target', planetId: 'planet', conversationId: 'thread', origin: 'star-map' }))
    assert.ok(beam.includes(text('continueChat')))
  })
  test(`attendance request, capacity and withdrawal controls remain usable in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`)
    const attendance = (state, count = 2) => render(locale, React.createElement(RSVP, {
      eventId: 'evt', galaxyId: 'g', initialRSVPed: state === 'APPROVED',
      initialAttendance: state, initialCount: count, maxAttendees: 2,
      requiresApproval: true,
    }))
    const escaped = text => renderToStaticMarkup(React.createElement('span', null, text)).slice(6, -7)
    const full = attendance(null)
    assert.ok(full.includes(escaped(messages.galaxies.eventFull)))
    assert.match(full, /<button[^>]*disabled=""/)
    const available = attendance(null, 1)
    assert.ok(available.includes(escaped(messages.galaxyWorkflow.requestAttendance)))
    assert.doesNotMatch(available, /<button[^>]*disabled=""/)
    const pending = attendance('PENDING')
    assert.ok(pending.includes(escaped(messages.galaxyWorkflow.cancelAttendanceRequest)))
    assert.doesNotMatch(pending, /<button[^>]*disabled=""/)
    const approved = attendance('APPROVED')
    assert.ok(approved.includes(escaped(messages.galaxyWorkflow.cancelAttendance)))
    assert.doesNotMatch(approved, /<button[^>]*disabled=""/)
  })
  test(`galaxy creation, discussion and attendance UI translate in ${locale}`, () => {
    const m = require(`../messages/${locale}.json`).galaxyWorkflow
    const form = render(locale, React.createElement(Form))
    for (const key of [
      'name',
      'joinPolicy',
      'openJoin',
      'approvalJoin',
      'createGalaxy',
    ])
      assert.ok(form.includes(m[key].replaceAll('&', '&amp;')))
    assert.ok(
      render(
        locale,
        React.createElement(Composer, { galaxyId: 'g', onCreated: () => {} }),
      ).includes(m.startDiscussion),
    )
    const card = render(locale, React.createElement(EventCard, { event }))
    assert.ok(card.includes(m.cancelAttendanceRequest))
    assert.ok(card.includes(m.attendancePending))
    assert.ok(!card.includes('1 going'))
    const closed = render(
      locale,
      React.createElement(RSVP, {
        eventId: 'evt',
        galaxyId: 'g',
        initialRSVPed: false,
        initialCount: 0,
        status: 'CANCELLED',
      }),
    )
    assert.ok(closed.includes(m.cancelled))
    assert.ok(!closed.includes('<button'))
  })
}
test('exploration origins accept only fixed map destinations', () => {
  for (const value of ['https://evil.test', '//evil.test', 'javascript:alert(1)', '/settings', '../', '', null]) assert.equal(explorationOrigin(value), null)
  assert.equal(explorationReturnHref(explorationOrigin('star-map')), '/star-map?mode=discover')
  assert.equal(explorationReturnHref(explorationOrigin('home-star-map')), '/')
  assert.equal(withExplorationOrigin('/messages/thread', 'star-map'), '/messages/thread?from=star-map')
  assert.equal(withExplorationOrigin('/messages/thread', null), '/messages/thread')
})
test('all workflow and notification keys exist in three languages', () => {
  const locales = ['en', 'zh', 'fr'].map((l) =>
    require(`../messages/${l}.json`),
  )
  for (const m of locales) {
    assert.deepEqual(
      Object.keys(m.galaxyWorkflow).sort(),
      Object.keys(locales[0].galaxyWorkflow).sort(),
    )
    for (const key of [
      'galaxyJoinRequested',
      'galaxyJoined',
      'galaxyEventProposed',
      'galaxyEventApproved',
      'galaxyEventCancelled',
      'galaxyAttendanceRequested',
      'galaxyAttendanceApproved',
      'galaxyOwnership',
    ])
      for (const suffix of ['Title', 'Body'])
        assert.ok(m.notifications[key + suffix])
  }
})

for (const locale of ['en', 'zh', 'fr']) {
  test(`production star map explains real data and gestures in ${locale} without playback controls`, () => {
    const messages = require(`../messages/${locale}.json`).starMap
    assert.deepEqual(
      Object.keys(messages).sort(),
      Object.keys(require('../messages/en.json').starMap).sort(),
    )
    for (const mode of ['discover', 'galaxies']) {
      const html = render(locale, React.createElement(StarMap, { mode }))
      assert.ok(html.includes(messages['meaning_' + mode]))
      assert.ok(html.includes(messages.gestures))
      assert.ok(html.includes('aria-controls="star-map-sidebar"'))
      assert.ok(html.includes('id="star-map-sidebar"'))
      assert.ok(html.includes((mode === 'galaxies' ? messages.browseGalaxies : messages.browseObjects).replaceAll('&', '&amp;')))
      assert.ok(html.includes((mode === 'galaxies' ? messages.galaxyDecoration : messages.decoration).replaceAll('&', '&amp;')))
      assert.ok(!html.includes('starMap.'))
      assert.ok(!html.includes('Reset view'))
      assert.ok(!html.includes('Zoom in'))
      assert.ok(!html.includes('Pause'))
    }
  })
}

for (const locale of ['en', 'zh', 'fr']) {
  test(`mobile full navigation and compact map translate in ${locale}`, () => {
    const Menu = require('../components/layout/MobileExploreMenu.tsx').default
    const html = render(
      locale,
      React.createElement(Menu, { onNavigate: () => {} }),
    )
    for (const href of [
      '/star-map',
      '/star-map?mode=personal',
      '/discover',
      '/resonance',
      '/activities',
      '/saved',
      '/my-planet/customize',
      '/my-planet/report',
    ])
      assert.ok(html.includes(`href="${href}"`))
    assert.ok(html.includes('type="submit"'))
    assert.ok(!html.includes('nav.'))
    const map = render(locale, React.createElement(StarMap, { compact: true }))
    assert.ok(map.includes('star-map-sidebar'))
    assert.ok(map.includes('aria-controls'))
    assert.ok(!map.includes('starMap.'))
  })
}

for (const locale of ['en', 'zh', 'fr']) {
  test(`canonical resonance views and pinned details render in ${locale}`, () => {
    const Experience =
      require('../components/resonance/ResonanceExperience.tsx').default
    const localize =
      require('../lib/resonance-presentation.ts').localizeResonanceMatch
    const source = {
      id: 'source',
      name: 'Source',
      mood: 'calm',
      lifestyle: 'solitary',
      coreThemes: ['connection'],
      cognitiveAxes: { abstract: 50, introspective: 50 },
      visual: { coreColor: '#a78bfa' },
    }
    const target = {
      ...source,
      id: 'target',
      name: 'Target',
      lifestyle: 'communal',
    }
    const match = {
      planetId: 'target',
      score: 82,
      primaryReason: 'emotional-theme',
      orbitColor: 'red',
      dimensions: { emotion: 80 },
      similarities: [],
      differences: [],
      suggestedTypes: ['chat'],
      resonanceNote: 'Old English copy',
    }
    const { createTranslator } = require('next-intl')
    const messages = require(`../messages/${locale}.json`)
    const display = localize(
      match,
      source,
      target,
      createTranslator({ locale, messages, namespace: 'resonance' }),
      createTranslator({ locale, messages, namespace: 'creationSteps' }),
    )
    assert.equal(display.score, match.score)
    assert.equal(display.planetId, match.planetId)
    assert.deepEqual(display.dimensions, match.dimensions)
    const html = render(
      locale,
      React.createElement(Experience, {
        source,
        session: {
          sourcePlanetId: 'source',
          matches: [display],
          date: '2026-10-04',
        },
        planets: { target },
        activeId: 'target',
        onSelect: () => {},
        onClose: () => {},
      }),
    )
    assert.ok(html.includes(messages.resonance.mapView))
    assert.ok(html.includes(messages.resonance.listView))
    assert.ok(html.includes('82'))
    assert.ok(html.includes('href="/planet/target"'))
    assert.ok(!html.includes('Old English copy'))
    assert.ok(!html.includes('resonance.'))
  })
}

const InterestButton = require('../components/events/InterestButton.tsx').default
for (const locale of ['en', 'zh', 'fr']) {
  test(`interest saves, removal and closed states translate in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`).eventInterest
    const active = render(locale, React.createElement(InterestButton, { event: { ...event, userInterested: false } }))
    assert.ok(active.includes(messages.save))
    assert.ok(active.includes('aria-pressed="false"'))
    assert.ok(!active.includes('disabled=""'))
    const closed = { ...event, status: 'CANCELLED', userInterested: false }
    assert.ok(render(locale, React.createElement(InterestButton, { event: closed })).includes('disabled=""'))
    const saved = render(locale, React.createElement(InterestButton, { event: { ...closed, userInterested: true } }))
    assert.ok(saved.includes(messages.saved))
    assert.ok(saved.includes('aria-pressed="true"'))
    assert.ok(!saved.includes('disabled=""'))
  })
}

for (const locale of ['en', 'zh', 'fr']) {
  test(`planet saves, beam guidance and relationship badges translate in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`).planetActions
    const Save = require('../components/social/SavePlanetButton.tsx').default
    const Beam = require('../components/social/BeamButton.tsx').default
    const Badge = require('../components/social/RelationshipStateBadge.tsx').default
    const escaped = value => value.replaceAll('&', '&amp;')
    const unsaved = render(locale, React.createElement(Save, { planetId: 'target', initialSaved: false }))
    assert.ok(unsaved.includes(escaped(messages.save)))
    assert.ok(unsaved.includes('aria-pressed="false"'))
    const saved = render(locale, React.createElement(Save, { planetId: 'target', initialSaved: true }))
    assert.ok(saved.includes(escaped(messages.removeSave)))
    assert.ok(saved.includes('href="/saved"'))
    const beam = render(locale, React.createElement(Beam, { planetId: 'target', userId: 'target-user' }))
    assert.ok(beam.includes(escaped(messages.beam)))
    assert.ok(beam.includes(escaped(messages.openOnly)))
    assert.ok(render(locale, React.createElement(Badge, { status: 'mutual' })).includes(escaped(messages.mutualLabel)))
    const menu = render(locale, React.createElement(require('../components/layout/MobileExploreMenu.tsx').default, { onNavigate: () => {} }))
    assert.ok(menu.includes('href="/relationships"'))
  })
}

test('planet action transport announces only successful writes and exposes retryable failures', async () => {
  const { setPlanetSaved, setUserFollowing, PLANET_ACTION_CHANGED } = require('../lib/planet-actions.ts')
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch
  const changes = [], requests = []
  globalThis.window = new EventTarget()
  globalThis.window.addEventListener(PLANET_ACTION_CHANGED, event => changes.push(event.detail))
  let responseStatus = 500
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return new Response(null, { status: responseStatus })
  }
  try {
    await assert.rejects(setPlanetSaved('target', true), /failed/)
    await assert.rejects(setUserFollowing('target-user', false), /failed/)
    assert.equal(changes.length, 0)
    responseStatus = 401
    await assert.rejects(setPlanetSaved('target', false), /auth/)
    assert.equal(changes.length, 0)
    responseStatus = 200
    await setPlanetSaved('target', true)
    assert.equal(requests.at(-1).url, '/api/saved-planets')
    assert.deepEqual(JSON.parse(requests.at(-1).options.body), { planetId: 'target' })
    await setUserFollowing('target-user', true)
    assert.deepEqual(JSON.parse(requests.at(-1).options.body), { userId: 'target-user' })
    responseStatus = 204
    await setPlanetSaved('target', false)
    await setUserFollowing('target-user', false)
    assert.deepEqual(changes, [
      { kind: 'saved', planetId: 'target', saved: true },
      { kind: 'follow', userId: 'target-user', following: true },
      { kind: 'saved', planetId: 'target', saved: false },
      { kind: 'follow', userId: 'target-user', following: false },
    ])
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch }
})

for (const locale of ['en', 'zh', 'fr']) {
  test(`post context picker and lifecycle cards translate in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`).postContext
    const Picker = require('../components/stream/PostContextPicker.tsx').default
    const Card = require('../components/stream/PostContextCard.tsx').default
    const escaped = value => value.replaceAll('&', '&amp;')
    const picker = render(locale, React.createElement(Picker, { value: { galaxyId: 'g', eventId: null }, onChange: () => {} }))
    assert.ok(picker.includes(escaped(messages.memberAudience)))
    assert.ok(picker.includes(escaped(messages.clear)))
    assert.ok(picker.includes('fieldset'))
    const post = { id: 'original-post', contextRestricted: true, context: { galaxy: { id: 'g', name: 'Galaxy', slug: 'galaxy', href: '/galaxy/galaxy' }, event: { id: 'e', title: 'Activity', date: '2030-01-01T12:00:00Z', status: 'CANCELLED', href: '/galaxy/galaxy?event=e#events' } } }
    const card = render(locale, React.createElement(Card, { post }))
    assert.ok(card.includes(escaped(messages.cancelled)))
    assert.ok(card.includes('href="/galaxy/galaxy?event=e&amp;returnPost=original-post#events"'))
    const unavailable = render(locale, React.createElement(Card, { post: { contextRestricted: true, context: null } }))
    assert.ok(unavailable.includes(escaped(messages.unavailable)))
    assert.ok(!unavailable.includes('href='))
  })
}

for (const locale of ['en','fr','zh']) {
  test(`personal star map list and meaning are localized in ${locale}`, () => {
    const m = require(`../messages/${locale}.json`).starMap
    const html = render(locale, React.createElement(StarMap, { mode:'personal', collection:'saved', listOnly:true }))
    const escaped = text => renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)
    assert.ok(html.includes(escaped(m.meaning_personal)))
    assert.ok(!html.includes('<canvas'))
    assert.ok(!html.includes('starMap.'))
    const back = render(locale, React.createElement(ReturnLink, {origin:'personal-star-map-saved-list'}))
    assert.ok(back.includes(escaped(m.returnPersonalMap)))
    assert.ok(back.includes('href="/star-map?mode=personal&amp;collection=saved&amp;view=list"'))
    for (const key of ['mode_personal','personalSubtitle','personalFilters','collection_all','collection_saved','collection_following','collection_mutual','personalScope','personalEmpty','exploreGlobal']) assert.ok(m[key])
  })
}
test('personal map origins preserve collection and view and reject arbitrary origins', () => {
  const { personalMapOrigin } = require('../lib/exploration-return.ts')
  for (const collection of ['all','saved','following','mutual']) for (const list of [true,false]) {
    const origin = personalMapOrigin(collection,list)
    assert.equal(explorationOrigin(origin), origin)
    assert.equal(explorationReturnHref(origin), `/star-map?mode=personal&collection=${collection}${list ? '&view=list' : ''}`)
    assert.ok(withExplorationOrigin('/planet/p',origin).endsWith(`from=${origin}`))
  }
  assert.equal(explorationOrigin('personal-star-map-unknown'),null)
  assert.equal(explorationOrigin('https://example.test'),null)
})

test('resonance positions revolve predictably without changing recommendation identity', () => {
  const { resonancePosition } = require('../lib/resonance-motion.ts')
  for (const count of [1,3,5]) for (let i=0;i<count;i++) {
    const a = resonancePosition(i,count), b = resonancePosition(i,count,Math.PI/2)
    assert.notDeepEqual(a,b)
    assert.ok(a.x >= 16 && a.x <= 84 && a.y >= 17 && a.y <= 79)
    assert.ok(Math.abs(resonancePosition(i,count,Math.PI*2).x-a.x)<1e-8)
    assert.ok(Math.abs(resonancePosition(i,count,Math.PI*2).y-a.y)<1e-8)
  }
})
for (const locale of ['en','fr','zh']) {
  test(`review cards distinguish pending attendees and proposals in ${locale}`, () => {
    const m = require(`../messages/${locale}.json`)
    const html = render(locale,React.createElement(EventCard,{event:{...event,status:'PENDING',canReviewEvent:true,pendingAttendanceCount:2}}))
    const escaped = value => renderToStaticMarkup(React.createElement('span',null,value)).slice(6,-7)
    assert.ok(html.includes(escaped(m.galaxyWorkflow.pending)))
    assert.ok(html.includes(escaped(m.eventForms.pendingAttendanceCount.replace('{count}','2'))))
    assert.ok(m.eventsPage.tabs.review && m.eventsPage.reviewHelp && m.eventsPage.emptyReview)
    const map = render(locale,React.createElement(StarMap,{mode:'galaxies'}))
    assert.ok(map.includes(escaped(m.starMap.meaning_galaxies)))
    assert.ok(map.includes(escaped(m.starMap.galaxyDecoration)))
    assert.ok(map.includes(escaped(m.starMap.galaxyScope)))
    assert.ok(!map.includes(escaped(m.starMap.decoration)))
  })
}


test('post return navigation bounds IDs and retains only internal galaxy/activity origins', () => {
  const { postReturnHref, postContextReturnHref, withPostOrigin, withPostReturn } = require('../lib/post-return.ts')
  assert.equal(postReturnHref('post-123'), '/stream/post-123')
  for (const invalid of [null, '', '../private', 'x?event=secret', 'x'.repeat(129), 'https://example.test']) assert.equal(postReturnHref(invalid), null)
  const event = '/galaxy/night-sky?event=evt_123#events'
  assert.equal(withPostReturn(event, 'post-123'), '/galaxy/night-sky?event=evt_123&returnPost=post-123#events')
  const postLink = new URL(withPostOrigin('post-123', event), 'https://local.invalid')
  assert.equal(postLink.pathname, '/stream/post-123')
  assert.equal(postContextReturnHref(postLink.searchParams.get('fromContext')), event)
  assert.equal(postContextReturnHref('/galaxy/%E6%98%9F%E7%A9%BA'), '/galaxy/%E6%98%9F%E7%A9%BA')
  for (const invalid of ['https://evil.test/galaxy/g', '//evil.test/galaxy/g', '/galaxy/g/../../messages/p', '/galaxy/%2e%2e', '/galaxy/g\\evil', '/galaxy/g%2Fprivate', '/galaxy/%ZZ', '/galaxy/g?event=../../secret', '/galaxy/g?event=e&event=f', '/galaxy/g?chat=secret', '/galaxy/g#other', '/messages/p', '/galaxy/' + 'x'.repeat(129)]) {
    assert.equal(postContextReturnHref(invalid), null, invalid)
    assert.equal(withPostOrigin('post-123', invalid), '/stream/post-123')
    assert.equal(withPostReturn(invalid, 'post-123'), '/stream')
  }
})
for (const locale of ['en', 'fr', 'zh']) test(`post return and read failures have real localized copy in ${locale}`, () => {
  const m = require(`../messages/${locale}.json`).postContext
  for (const key of ['backPost', 'backGalaxy', 'backEvent', 'readFailed']) assert.ok(m[key] && !m[key].includes('postContext.'))
})


test('personal context return restores layers and views while preserving activity fragments',()=>{
  const {personalMapOrigin}=require('../lib/exploration-return.ts')
  for (const layer of ['galaxies','activities']) for (const list of [false,true]) {
    const origin=personalMapOrigin('all',list,layer)
    assert.equal(explorationOrigin(origin),origin)
    assert.equal(explorationReturnHref(origin),`/star-map?mode=personal&layer=${layer}${list?'&view=list':''}`)
    const url=new URL(withExplorationOrigin('/galaxy/sky?event=e#events',origin),'https://example.test')
    assert.equal(url.searchParams.get('from'),origin);assert.equal(url.searchParams.get('event'),'e');assert.equal(url.hash,'#events')
  }
  assert.equal(explorationOrigin('personal-star-map-other-layer'),null)
})
for (const locale of ['en','fr','zh']) test(`personal context layers localize explanation, units and return links in ${locale}`,()=>{
  const m=require(`../messages/${locale}.json`).starMap
  const escape=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)
  for (const layer of ['galaxies','activities','constellations']) {
    const html=render(locale,React.createElement(StarMap,{mode:'personal',layer,listOnly:true}))
    assert.ok(html.includes(escape(m[`meaning_personal_${layer}`])))
    assert.ok(html.includes(escape(m[`scope_${layer}`])))
    assert.ok(!html.includes('<canvas'));assert.ok(!html.includes('starMap.'))
    const back=render(locale,React.createElement(ReturnLink,{origin:`personal-star-map-${layer}-list`}))
    assert.ok(back.includes(`href="/star-map?mode=personal&amp;layer=${layer}&amp;view=list"`))
  }
})


test('personal overview reserves its origin while global layout retains its existing center',()=>{
  const {mapCenter}=require('../lib/star-map.ts')
  assert.deepEqual(mapCenter(0,1),[0,0,0])
  for (let count=1;count<=6;count++) for (let index=0;index<count;index++) {
    const center=mapCenter(index,count,true)
    assert.ok(center.every(Number.isFinite))
    assert.ok(Math.hypot(center[0],center[1]/0.72)>=180)
    assert.deepEqual(center,mapCenter(index,count,true))
  }
})
for (const locale of ['en','fr','zh']) test(`personal center is translated, preserves portraits and has a safe return link in ${locale}`,()=>{
  const Anchor=require('../components/star-map/PersonalMapAnchor.tsx').default
  const m=require(`../messages/${locale}.json`).starMap
  const escape=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)
  const planet={id:'own',name:'My own planet',href:'/planet/own',level:2,planetConfig:{baseTexture:'mars.jpg',customTextureUrl:'https://example.test/center-portrait.png',tintColor:'#a78bfa'}}
  const html=render(locale,React.createElement(Anchor,{planet,origin:'personal-star-map-activities-list',summary:true}))
  assert.ok(html.includes(escape(m.selfCenter)));assert.ok(html.includes(escape(m.selfExcluded)))
  assert.ok(html.includes('src="https://example.test/center-portrait.png"'))
  assert.ok(html.includes('href="/planet/own?from=personal-star-map-activities-list"'))
  assert.ok(!html.includes('planet-surface-drift'));assert.ok(!html.includes('<canvas'))
  const missing=render(locale,React.createElement(Anchor,{planet:null,origin:'personal-star-map-saved'}))
  assert.ok(missing.includes(escape(m.selfMissing)));assert.ok(missing.includes(escape(m.createSelf)))
  assert.ok(missing.includes('href="/onboarding"'));assert.ok(!missing.includes('<img'))
})
