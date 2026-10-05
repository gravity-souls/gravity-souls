import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

test.use({ storageState: AUTH_WP })

test('resonance title is readable and selected score stays centered below the navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resonance')
  const heading = page.getByRole('heading', { name: 'Resonance', exact: true, level: 1 })
  await expect(heading).toBeVisible()
  const titleStyle = await heading.evaluate(e => {
    const style = getComputedStyle(e)
    return { background: style.backgroundImage, color: style.color, fill: style.webkitTextFillColor }
  })
  expect(titleStyle.background).toBe('none')
  expect(titleStyle.color).not.toBe('rgba(0, 0, 0, 0)')
  expect(titleStyle.fill).not.toBe('transparent')
  const node = page.getByRole('button', { name: /signal score/i }).first()
  const label = await node.getAttribute('aria-label')
  const selectedScore = label?.match(/signal score (\d+)/i)?.[1]
  expect(selectedScore).toBeTruthy()
  await node.click()
  const score = page.getByRole('dialog').getByTestId('resonance-score')
  await expect(score).toHaveText(selectedScore!)
  await expect(score).toBeVisible()
  await expect.poll(async () => {
    const rect = await score.boundingBox()
    return rect?.width
  }).toBe(72)
  const bounds = await score.evaluate(e => {
    const box = e.getBoundingClientRect()
    const svg = e.querySelector('svg')!.getBoundingClientRect()
    const text = e.querySelector('span')!.getBoundingClientRect()
    return { dx: Math.abs(text.x + text.width / 2 - (svg.x + svg.width / 2)), dy: Math.abs(text.y + text.height / 2 - (svg.y + svg.height / 2)), boxWidth: box.width }
  })
  expect(bounds.dx).toBeLessThanOrEqual(1)
  expect(bounds.dy).toBeLessThanOrEqual(1)
  const dialog = await page.getByRole('dialog').boundingBox()
  const nav = await page.locator('header').first().boundingBox()
  expect(dialog!.y).toBeGreaterThanOrEqual(nav!.y + nav!.height)
  await expect(page.locator('[style*="rotate(-22deg)"]')).toHaveCount(0)
})
