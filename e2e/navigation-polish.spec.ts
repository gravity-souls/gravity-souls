import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'

test.use({ storageState: AUTH_WP })

test('home orbit summary stays below the universe and community controls actually scroll', async ({ page }) => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
  const ids = Array.from({ length: 7 }, () => crypto.randomUUID())
  try {
    await db.community.createMany({ data: ids.map((id, index) => ({ id, slug: `navigation-scroll-${id}`, name: `Scroll fixture ${index}`, symbol: '◎', keywords: [], mood: 'calm', accentColor: '#a78bfa' })) })
    await page.goto('/')
    const field = page.getByTestId('universe-field')
    const closest = page.getByTestId('closest-orbit')
    await expect(closest).toBeVisible()
    const fieldBox = await field.boundingBox()
    const closestBox = await closest.boundingBox()
    expect(closestBox!.y).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height + 20)
    const carousel = page.getByTestId('community-carousel')
    const row = carousel.getByRole('region')
    const next = carousel.getByRole('button', { name: 'Next communities' })
    await expect(next).toBeEnabled()
    await next.click()
    await expect.poll(() => row.evaluate(e => e.scrollLeft)).toBeGreaterThan(0)
    await row.focus()
    const before = await row.evaluate(e => e.scrollLeft)
    await row.press('ArrowLeft')
    await expect.poll(() => row.evaluate(e => e.scrollLeft)).toBeLessThan(before)
  } finally {
    await db.community.deleteMany({ where: { id: { in: ids } } })
    await db.$disconnect()
  }
})

test('messages appear in desktop navigation, the avatar menu, and My Planet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/my-planet')
  await expect(page.locator('header a[href="/messages"]').first()).toBeHidden()
  await expect(page.locator('aside').getByRole('link', { name: /Messages/ })).toBeVisible()
  await page.getByRole('button', { name: 'Open user menu' }).click()
  await expect(page.locator('header').getByRole('link', { name: 'Messages', exact: true }).last()).toBeVisible()
  const inbox = page.getByTestId('my-planet-messages')
  await expect(inbox.getByRole('heading', { name: 'Messages' })).toBeVisible()
  await inbox.getByRole('link', { name: /View all/ }).click()
  await expect(page).toHaveURL(/\/messages$/)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('header a[href="/messages"]').first()).toBeVisible()
})
