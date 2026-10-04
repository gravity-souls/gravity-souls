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
      assert.ok(html.includes(messages.browseObjects.replaceAll('&', '&amp;')))
      assert.ok(html.includes(messages.decoration.replaceAll('&', '&amp;')))
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
    const post = { contextRestricted: true, context: { galaxy: { id: 'g', name: 'Galaxy', slug: 'galaxy', href: '/galaxy/galaxy' }, event: { id: 'e', title: 'Activity', date: '2030-01-01T12:00:00Z', status: 'CANCELLED', href: '/galaxy/galaxy?event=e#events' } } }
    const card = render(locale, React.createElement(Card, { post }))
    assert.ok(card.includes(escaped(messages.cancelled)))
    assert.ok(card.includes('href="/galaxy/galaxy?event=e#events"'))
    const unavailable = render(locale, React.createElement(Card, { post: { contextRestricted: true, context: null } }))
    assert.ok(unavailable.includes(escaped(messages.unavailable)))
    assert.ok(!unavailable.includes('href='))
  })
}
