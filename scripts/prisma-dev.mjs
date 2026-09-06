import 'dotenv/config'
import { register } from 'ts-node'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
register({ compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const loadModule = createRequire(import.meta.url)
const { developmentDatabaseUrl } = loadModule('../lib/database-safety.ts')
try {
  const result = spawnSync(process.execPath, [loadModule.resolve('prisma/build/index.js'), ...process.argv.slice(2)], {
    stdio: 'inherit', env: { ...process.env, DIRECT_URL: developmentDatabaseUrl() },
  })
  process.exit(result.status ?? 1)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
