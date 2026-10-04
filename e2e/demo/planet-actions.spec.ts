import { test, expect } from '@playwright/test'

test('legacy save link requires a real save, retains failed removal and refreshes the orbit', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! },
    { name: 'locale', value: 'zh', url: baseURL! },
  ])
  let saved = false, failRemoval = true, saveWrites = 0
  const planet = { id: 'planet-fixture', userId: 'target', name: '轨道测试星球', mood: 'calm', lifestyle: 'solitary', coreThemes: [], visual: {}, planetConfig: { baseTexture: 'earth.jpg', tintColor: '#a78bfa' } }
  await page.route('**/api/my-planet', route => route.fulfill({ json: { id: 'mine' } }))
  await page.route('**/api/saved-planets', route => {
    if (route.request().method() === 'POST') { saved = true; saveWrites++; return route.fulfill({ json: { planetId: planet.id } }) }
    return route.fulfill({ json: { savedPlanets: saved ? [{ id: 'saved-fixture', planetId: planet.id, savedAt: '2026-10-04T10:00:00Z', planet }] : [] } })
  })
  await page.route('**/api/saved-planets/planet-fixture', route => {
    if (route.request().method() === 'DELETE') {
      if (failRemoval) return route.fulfill({ status: 500, json: {} })
      saved = false; return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: { saved } })
  })
  await page.goto('/saved?add=planet-fixture')
  await expect(page.getByText('确认将这颗星球保存到你的私人轨道。')).toBeVisible()
  expect(saveWrites).toBe(0)
  await page.getByRole('button', { name: '保存到轨道', exact: true }).click()
  await expect(page.getByText('轨道测试星球', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('轨道测试星球', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '已保存 · 移出轨道', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('已保留原状态')
  await expect(page.getByText('轨道测试星球', { exact: true })).toBeVisible()
  failRemoval = false
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.getByText('轨道测试星球', { exact: true })).toHaveCount(0)
})

test('failed unfollow preserves the relationship and shows localized retry', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! },
    { name: 'locale', value: 'zh', url: baseURL! },
  ])
  await page.route('**/api/my-planet', route => route.fulfill({ json: { id: 'mine' } }))
  await page.route('**/api/follows', route => route.fulfill({ json: { following: [{ userId: 'target', since: '2026-10-04T10:00:00Z', planet: { id: 'planet-fixture', name: '关注测试星球', visual: {}, mood: 'calm' } }], followers: [] } }))
  await page.route('**/api/follows/target', route => route.fulfill({ status: 500, json: {} }))
  await page.goto('/relationships')
  await page.getByRole('button', { name: '取消关注', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('已保留原状态')
  await expect(page.getByText('关注测试星球', { exact: true })).toBeVisible()
})

test('beam explains mutual follow and opens a thread without sending a message', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! },
    { name: 'locale', value: 'zh', url: baseURL! },
  ])
  let mutual = false, sentMessages = 0
  await page.route('**/api/my-planet', route => route.fulfill({ json: { id: 'mine' } }))
  await page.route('**/api/saved-planets', route => route.fulfill({ json: { savedPlanets: [{ id: 'save', planetId: 'planet-fixture', savedAt: '2026-10-04T10:00:00Z', planet: { id: 'planet-fixture', userId: 'target', name: '聊天测试星球', mood: 'calm', lifestyle: 'solitary', coreThemes: [], visual: {} } }] } }))
  await page.route('**/api/saved-planets/planet-fixture', route => route.fulfill({ json: { saved: true } }))
  await page.route('**/api/follows/target', route => route.fulfill({ json: { following: true, followedBy: mutual, available: true } }))
  await page.route('**/api/conversations', route => route.request().method() === 'POST'
    ? route.fulfill(mutual ? { json: { conversationId: 'thread-fixture' } } : { status: 403, json: { code: 'mutualFollowRequired' } })
    : route.fulfill({ json: [] }))
  await page.route('**/api/conversations/thread-fixture', route => {
    if (route.request().method() === 'POST') sentMessages++
    return route.fulfill({ json: { conversation: { id: 'thread-fixture' }, viewerId: 'viewer', otherUser: { id: 'target', name: 'Target' }, otherPlanet: null, messages: [], olderCursor: null, canSend: true } })
  })
  await page.goto('/saved')
  await page.getByRole('button', { name: '发送光束 · 打开聊天', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('新聊天需要双方互关')
  await expect(page.getByRole('link', { name: '查看关注与粉丝', exact: true })).toBeVisible()
  expect(sentMessages).toBe(0)
  mutual = true
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page).toHaveURL(/\/messages\/thread-fixture$/)
  expect(sentMessages).toBe(0)
})
