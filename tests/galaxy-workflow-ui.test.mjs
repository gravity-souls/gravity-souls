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
