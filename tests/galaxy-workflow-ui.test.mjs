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
    for (const mode of ['discover', 'galaxies', 'resonance']) {
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
      '/galaxies/events',
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
