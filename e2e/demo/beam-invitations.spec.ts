import { test, expect } from '@playwright/test'

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'invite-ui-fixture', url: baseURL! },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
})

test('sending needs an explicit invitation action and a failed cancellation keeps the pending request', async ({ page }) => {
  let state = 'PENDING', creates = 0, failCancel = true
  const planet = { id: 'invite-planet', userId: 'target', name: 'Invitation UI planet', mood: 'calm', lifestyle: 'solitary', coreThemes: [], visual: {} }
  await page.route('**/api/my-planet', route => route.fulfill({ json: { id: 'mine' } }))
  await page.route('**/api/saved-planets', route => route.fulfill({ json: { savedPlanets: [{ id: 'save', planetId: planet.id, savedAt: '2026-10-05T10:00:00Z', planet }] } }))
  await page.route('**/api/saved-planets/invite-planet', route => route.fulfill({ json: { saved: true } }))
  await page.route('**/api/follows/target', route => route.fulfill({ json: { following: false, followedBy: false, available: true } }))
  await page.route('**/api/conversations', route => route.fulfill(route.request().method() === 'POST' ? { status: 403, json: { code: 'mutualFollowRequired' } } : { json: [] }))
  await page.route('**/api/beam-invitations**', route => {
    if (route.request().method() === 'POST') { creates++; return route.fulfill({ json: { invitationId: 'invite', status: state } }) }
    if (route.request().method() === 'PATCH') {
      if (failCancel) return route.fulfill({ status: 500, json: {} })
      state = 'CANCELLED'; return route.fulfill({ json: { status: state, conversationId: null } })
    }
    return route.fulfill({ json: { invitations: [{ id: 'invite', status: state, createdAt: '2026-10-05T10:00:00Z', otherUser: { id: 'target', name: 'Target' }, planet, conversationId: null }], nextCursor: null } })
  })
  await page.goto('/saved')
  await page.getByRole('button', { name: 'Send beam · Open chat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Send a beam invitation', exact: true })).toBeVisible()
  expect(creates).toBe(0)
  await page.getByRole('button', { name: 'Send a beam invitation', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Awaiting a decision')
  expect(creates).toBe(1)
  await page.getByRole('link', { name: 'Sent invitations', exact: true }).click()
  const section = page.getByRole('region', { name: 'Beam invitations', exact: true })
  await expect(section.getByRole('button', { name: 'Accept and open chat', exact: true })).toHaveCount(0)
  await section.getByRole('button', { name: 'Cancel invitation', exact: true }).click()
  await expect(section.getByRole('alert')).toContainText('Unable to complete the request')
  await expect(section.getByText('Awaiting a decision', { exact: false })).toBeVisible()
  failCancel = false
  await section.getByRole('button', { name: 'Cancel invitation', exact: true }).click()
  await expect(section.getByText('Cancelled · cannot resend', { exact: false })).toBeVisible()
})

test('accepting an incoming invitation opens an empty conversation without sending a message', async ({ page }) => {
  let sends = 0
  const row = { id: 'invite', status: 'PENDING', createdAt: '2026-10-05T10:00:00Z', otherUser: { id: 'sender', name: 'Sender' }, planet: null, conversationId: null }
  await page.route('**/api/conversations', route => route.fulfill({ json: [] }))
  await page.route('**/api/beam-invitations?**', route => route.fulfill({ json: { invitations: [row], nextCursor: null } }))
  await page.route('**/api/beam-invitations/invite', route => route.fulfill({ json: { status: 'ACCEPTED', conversationId: 'invite-thread' } }))
  await page.route('**/api/conversations/invite-thread', route => {
    if (route.request().method() === 'POST') sends++
    return route.fulfill({ json: { conversation: { id: 'invite-thread' }, viewerId: 'recipient', otherUser: { id: 'sender', name: 'Sender' }, otherPlanet: null, messages: [], olderCursor: null, canSend: true } })
  })
  await page.goto('/messages?invitations=received&invite=invite')
  const section = page.getByRole('region', { name: 'Beam invitations', exact: true })
  await expect(section.getByRole('button', { name: 'Cancel invitation', exact: true })).toHaveCount(0)
  await section.getByRole('button', { name: 'Accept and open chat', exact: true }).click()
  await expect(page).toHaveURL(/\/messages\/invite-thread$/)
  await expect(page.getByText('Your first beam is sent', { exact: true })).toHaveCount(0)
  expect(sends).toBe(0)
})
