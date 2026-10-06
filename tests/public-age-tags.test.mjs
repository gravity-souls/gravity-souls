import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { ageFromBirthDate, parseBirthDate, isAdultBirthDate, registrationSchema, EMPTY_BASICS, serializeRegistrationBasics } = require('../lib/registration-basics.ts')
const { availablePublicTags, publicPlanetTags, normalizedPublicTags } = require('../lib/public-planet-tags.ts')
const { NextIntlClientProvider } = require('next-intl')
const Tags = require('../components/planet/PublicPlanetTags.tsx').default
const Picker = require('../components/registration/PublicTagPicker.tsx').default
const Editor = require('../components/registration/BasicPreferencesEditor.tsx').default
const now = new Date('2026-10-06T23:59:59Z')

test('UTC calendar age covers birthdays, year boundaries and leap years without date normalization', () => {
  assert.equal(ageFromBirthDate('2000-10-06', now), 26)
  assert.equal(ageFromBirthDate('2000-10-07', now), 25)
  assert.equal(ageFromBirthDate('2000-10-05', now), 26)
  assert.equal(ageFromBirthDate('2000-12-31', new Date('2026-01-01T00:00:00Z')), 25)
  assert.equal(ageFromBirthDate('2000-01-01', new Date('2026-01-01T00:00:00Z')), 26)
  assert.equal(ageFromBirthDate('2008-02-29', new Date('2026-02-28T23:59:59Z')), 17)
  assert.equal(ageFromBirthDate('2008-02-29', new Date('2026-03-01T00:00:00Z')), 18)
  assert.equal(ageFromBirthDate('2000-02-29', new Date('2024-02-29T00:00:00Z')), 24)
  assert.equal(isAdultBirthDate('2008-10-06', now), true)
  assert.equal(isAdultBirthDate('2008-10-07', now), false)
  for (const date of ['1900-02-29', '2007-02-29', '2000-02-30', '2000-00-01', '2000-13-01', '2000-01-00', '2000-1-01', '1899-12-31', '2027-01-01', '2000-01-01T00:00:00Z', '', null, undefined, new Date(NaN), new Date('2000-01-01T01:00:00Z')]) {
    assert.equal(ageFromBirthDate(date, now), null, String(date))
    assert.equal(isAdultBirthDate(date, now), false, String(date))
  }
  assert.equal(parseBirthDate('2000-01-01').toISOString(), '2000-01-01T00:00:00.000Z')
  assert.equal(parseBirthDate('2000-02-30'), null)
  assert.equal(ageFromBirthDate(parseBirthDate('2000-10-06'), now), 26)
})

test('age and gender require independent consent and cannot expose birth dates', () => {
  const source = { ...EMPTY_BASICS, birthDate: '2000-10-06', gender: 'woman' }
  assert.deepEqual(publicPlanetTags(source, now), [])
  assert.deepEqual(publicPlanetTags({ ...source, publicTags: ['age'] }, now), [{ key: 'age', value: 26 }])
  assert.deepEqual(publicPlanetTags({ ...source, publicTags: ['gender:woman'] }, now), [{ key: 'gender', value: 'woman' }])
  const both = publicPlanetTags({ ...source, publicTags: ['age', 'gender:woman', 'birthDate', 'age:26'] }, now)
  assert.deepEqual(both, [{ key: 'age', value: 26 }, { key: 'gender', value: 'woman' }])
  assert.ok(!JSON.stringify(both).includes('2000-10-06'))
  assert.deepEqual(publicPlanetTags({ ...source, publicTags: ['age'] }, new Date('2027-10-06')), [{ key: 'age', value: 27 }])
  for (const birthDate of [null, undefined, '', '2020-01-01', '2000-02-30']) {
    assert.deepEqual(publicPlanetTags({ ...source, birthDate, publicTags: ['age'] }, now), [])
    assert.ok(!availablePublicTags({ ...source, birthDate }, now).some(tag => tag.token === 'age'))
    assert.deepEqual(normalizedPublicTags({ ...source, birthDate, publicTags: ['age', 'gender:woman'] }), ['gender:woman'])
  }
  for (const gender of ['undisclosed', 'unknown', 'male', '', undefined]) {
    assert.deepEqual(publicPlanetTags({ ...source, gender, publicTags: [`gender:${gender}`] }, now), [])
  }
  assert.deepEqual(publicPlanetTags(null), [])
  assert.deepEqual(publicPlanetTags(undefined), [])
})

test('backward compatible input distinguishes omission from explicit clearing and self serialization is date-only', () => {
  assert.equal(registrationSchema.parse({}).birthDate, undefined)
  assert.equal(registrationSchema.parse({ birthDate: null }).birthDate, null)
  assert.equal(registrationSchema.parse({ birthDate: '2000-01-01' }).birthDate, '2000-01-01')
  assert.equal(registrationSchema.safeParse({ birthDate: 26 }).success, false)
  assert.deepEqual(serializeRegistrationBasics({ birthDate: parseBirthDate('2000-01-01'), gender: 'man' }), { birthDate: '2000-01-01', gender: 'man' })
  assert.deepEqual(serializeRegistrationBasics({ birthDate: null }), { birthDate: null })
  assert.deepEqual(EMPTY_BASICS.publicTags, [])
  assert.equal(EMPTY_BASICS.birthDate, null)
})

const escape = value => renderToStaticMarkup(React.createElement('span', null, value)).slice(6, -7)
for (const locale of ['en', 'fr', 'zh']) {
  test(`age labels, private DOB editing and default-hidden tags render in ${locale}`, () => {
    const messages = require(`../messages/${locale}.json`), copy = messages.registrationBasics
    const render = child => renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale, messages, timeZone: 'UTC' }, child))
    const label = copy.exactAge.replace('{age}', '26')
    const tags = render(React.createElement(Tags, { tags: [{ key: 'age', value: 26 }, { key: 'gender', value: 'nonbinary' }] }))
    assert.ok(tags.includes(escape(label)))
    assert.ok(tags.includes(escape(copy.options.nonbinary)))
    assert.ok(tags.includes(`aria-label="${escape(copy.options.nonbinary)}, ${escape(label)}"`))
    assert.ok(tags.includes('lucide-non-binary'))
    assert.ok(tags.includes('aria-hidden="true" class="tabular-nums">26</span>'))
    for (const [gender, icon] of [['woman', 'venus'], ['man', 'mars'], ['other', 'non-binary']]) {
      const combined = render(React.createElement(Tags, { tags: [{ key: 'gender', value: gender }, { key: 'age', value: 26 }, { key: 'region', value: 'Paris' }] }))
      assert.ok(combined.includes(`lucide-${icon}`))
      assert.ok(combined.includes(`aria-label="${escape(copy.options[gender])}, ${escape(label)}"`))
      assert.ok(combined.includes('>Paris</span>'))
      assert.equal((combined.match(/role="img"/g) ?? []).length, 1)
      const genderOnly = render(React.createElement(Tags, { tags: [{ key: 'gender', value: gender }] }))
      assert.ok(genderOnly.includes(`aria-label="${escape(copy.options[gender])}"`))
      assert.ok(!genderOnly.includes('26'))
      assert.ok(!genderOnly.includes('tabular-nums'))
    }
    const ageOnly = render(React.createElement(Tags, { tags: [{ key: 'age', value: 26 }] }))
    assert.ok(ageOnly.includes(`>${escape(label)}</span>`))
    assert.ok(!ageOnly.includes('role="img"'))
    assert.equal(render(React.createElement(Tags, { tags: [] })), '')
    assert.ok(!tags.includes('options.26'))
    const picker = render(React.createElement(Picker, { value: { ...EMPTY_BASICS, birthDate: '2000-01-01', gender: 'woman' }, onChange: () => {} }))
    assert.ok(picker.includes(escape(copy.options.woman)))
    assert.ok(picker.includes('type="checkbox"'))
    assert.ok(!picker.includes('checked=""'))
    assert.ok(picker.includes(escape(messages.onboardingRefinements.noPublicTags)))
    assert.ok(!picker.includes('2000-01-01'))
    const preview = render(React.createElement(Picker, { value: { ...EMPTY_BASICS, birthDate: '2000-01-01', gender: 'woman', publicTags: ['age', 'gender:woman'] }, onChange: () => {} }))
    assert.ok(preview.includes('lucide-venus'))
    const editor = render(React.createElement(Editor, { initial: EMPTY_BASICS, confirmed: true, onSaved: () => {} }))
    assert.ok(editor.includes(escape(copy.titles.birthDate)))
    assert.ok(!editor.includes('registrationBasics.'))
  })
}

test('locale message keys remain in parity', () => {
  const keys = (data, prefix = '') => Object.entries(data).flatMap(([key, value]) => typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`]).sort()
  const en = keys(require('../messages/en.json'))
  assert.deepEqual(keys(require('../messages/fr.json')), en)
  assert.deepEqual(keys(require('../messages/zh.json')), en)
})
