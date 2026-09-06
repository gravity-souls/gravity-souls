import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readJson } from '../lib/api-input'
import { messageSchema, onboardingSchema, planetUpdateSchema, eventSchema } from '../lib/input-schemas'

const request = (body: string) => new Request('http://localhost/test', { method: 'POST', body })

test('malformed, null, oversized and forged message bodies fail safely', async () => {
  for (const body of ['{', 'null', '[]', '{"content":0}', '{"content":"   "}', '{"content":"ok","senderId":"someone-else"}', JSON.stringify({ content: 'x'.repeat(2001) })]) {
    const result = await readJson(request(body), messageSchema)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.response.status, 400)
  }
  const result = await readJson(request('x'.repeat(65537)), messageSchema)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.response.status, 413)
  const valid = await readJson(request('{"content":"  hello  "}'), messageSchema)
  assert.deepEqual(valid, { ok: true, data: { content: 'hello' } })
})

test('planet and calibration fields reject invalid values and ownership overrides', () => {
  for (const value of [{ userId: 'other' }, { abstractAxis: 101 }, { languages: [42] }, { visual: { coreColor: 'url(https://example.com)' } }, { tagline: {} }]) {
    assert.equal(planetUpdateSchema.safeParse(value).success, false)
  }
  assert.equal(onboardingSchema.safeParse({ draft: { selectedThemes: [], abstractAxis: 50, introspectiveAxis: 50, resonanceAnswers: { lifeChapter: 'unknown' } } }).success, false)
  assert.equal(planetUpdateSchema.safeParse({ name: 'Quiet Planet', languages: ['Français', '中文'] }).success, true)
})

test('event links reject executable URLs and nonnumeric capacity', () => {
  const event = { title: 'Walk', description: 'Meet outside', category: 'MEETUP', date: '2030-01-01T12:00:00Z' }
  assert.equal(eventSchema.safeParse({ ...event, onlineUrl: 'javascript:alert(1)' }).success, false)
  assert.equal(eventSchema.safeParse({ ...event, maxAttendees: 'many' }).success, false)
  assert.equal(eventSchema.safeParse({ ...event, onlineUrl: 'https://example.com/meet', maxAttendees: 10 }).success, true)
})
