import { register } from 'ts-node'
import Module from 'node:module'
import path from 'node:path'
register({ compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const resolve = Module._resolveFilename
Module._resolveFilename = function (id, parent, ...rest) {
  return resolve.call(
    this,
    id.startsWith('@/') ? path.resolve(process.cwd(), id.slice(2)) : id,
    parent,
    ...rest,
  )
}
