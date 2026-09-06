import { createRequire } from 'node:module'
import './register.mjs'
const loadModule = createRequire(import.meta.url)
loadModule('./database-safety.test.cts')
loadModule('./api-input.test.cts')
loadModule('./safety-schemas.test.cts')
