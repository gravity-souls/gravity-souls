import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { notificationCopy } = require('../lib/notification-copy.ts')
const catalogs = Object.fromEntries(['en','fr','zh'].map(locale => [locale, require(`../messages/${locale}.json`).notifications]))
const values = { name: 'Étoile 星球 .* [A] {x}', galaxy: '共鸣 • Orbit', title: '活动 “Moon”', reason: '作者自己的拒绝理由', event: '活动 “Moon”', level: '2' }
const fill = text => text.replace(/\{(\w+)\}/g, (_,key) => values[key])
test('every stored system template follows the current locale, including old messages and galaxy workflow updates', () => {
  for(const source of Object.values(catalogs)) for(const [key,title] of Object.entries(source)) {
    if(!key.endsWith('Title')) continue
    const bodyKey = key.slice(0,-5)+'Body'
    if(!source[bodyKey]) continue
    const notice = {title:fill(title),body:fill(source[bodyKey])}
    for(const [locale,target] of Object.entries(catalogs)) {
      assert.deepEqual(notificationCopy(notice,locale),{title:fill(target[key]),body:fill(target[bodyKey])},`${key} → ${locale}`)
    }
  }
})
test('event names and unrecognized personal writing are preserved exactly', () => {
  const notice={title:fill(catalogs.en.eventNewTitle),body:'未经翻译的活动名 <.*> {title}'}
  assert.deepEqual(notificationCopy(notice,'fr'),{title:fill(catalogs.fr.eventNewTitle),body:notice.body})
  const custom={title:'A note from a person',body:'Their own words'}
  assert.deepEqual(notificationCopy(custom,'zh'),custom)
  // A known title with a body that does not match its template is not guessed.
  const incomplete={title:catalogs.en.newMatchTitle,body:'Someone wrote this themselves'}
  assert.deepEqual(notificationCopy(incomplete,'zh'),incomplete)
})
