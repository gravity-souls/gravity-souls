import { register } from 'ts-node'
import Module from 'node:module'
import path from 'node:path'
register({
  files: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
})
const resolve = Module._resolveFilename
Module._resolveFilename = function (id, parent, ...rest) {
  return resolve.call(
    this,
    id.startsWith('@/') ? path.resolve(process.cwd(), id.slice(2)) : id,
    parent,
    ...rest,
  )
}

// CSS modules affect styling only; server rendering checks exercise real text/components.
Module._extensions['.css'] = (module) => {
  module.exports = new Proxy({}, { get: (_, name) => String(name) })
}
