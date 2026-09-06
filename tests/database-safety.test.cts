import { test } from 'node:test'
import assert from 'node:assert/strict'
import { testDatabaseUrl, seedDatabaseUrl, developmentDatabaseUrl } from '../lib/database-safety'

test('test utilities fail closed without a dedicated test URL', () => {
  assert.throws(() => testDatabaseUrl({ DIRECT_URL: 'postgresql://localhost/gravity' }), /TEST_DATABASE_URL/)
  for (const url of [
    'postgresql://database.example/gravity_test', 'postgresql://localhost/gravity',
    'https://localhost/gravity_test', 'postgresql://localhost/gravity_test?host=production',
    'postgresql://localhost/gravity_test?options=-csearch_path=production',
  ]) assert.throws(() => testDatabaseUrl({ TEST_DATABASE_URL: url }), /local database/)
})

test('development and seed tools cannot fall back to application credentials', () => {
  assert.throws(() => developmentDatabaseUrl({ DIRECT_URL: 'postgresql://localhost/gravity' }))
  assert.throws(() => seedDatabaseUrl({ SEED_DATABASE_URL: 'postgresql://localhost/gravity_dev' }), /ALLOW_SAMPLE_DATA/)
  assert.throws(() => seedDatabaseUrl({ ALLOW_SAMPLE_DATA: '1', SEED_DATABASE_URL: 'postgresql://localhost/gravity' }))
  assert.throws(() => testDatabaseUrl({ TEST_DATABASE_URL: 'postgresql://localhost/gravity_test', VERCEL: '1' }))
  assert.equal(testDatabaseUrl({ TEST_DATABASE_URL: 'postgresql://localhost/gravity_test' }), 'postgresql://localhost/gravity_test')
})
