// PostgreSQL-in-WASM adapter for isolated tests. Nothing can contact a deployed DB.
import { Pool } from 'pg'
import { PGlite } from '@electric-sql/pglite'
import { EventEmitter } from 'node:events'
class EmbeddedPool extends Pool {
  constructor() {
    super()
    this.db = new PGlite()
    this.tail = Promise.resolve()
  }
  async acquire() {
    let release
    const previous = this.tail
    this.tail = new Promise((r) => {
      release = r
    })
    await previous
    return release
  }
  async io(config) {
    const text = typeof config === 'string' ? config : config.text
    const values = typeof config === 'string' ? [] : (config.values ?? [])
    const parsers = {}
    // These are kept as PostgreSQL text for Prisma's own parsers, just as pg does.
    for (const oid of [20, 114, 3802, 1082, 1083, 1114, 1184, 1186, 1700])
      parsers[oid] = (v) => v
    const result = await this.db.query(text, values, {
      rowMode: typeof config === 'string' ? 'object' : config.rowMode,
      parsers,
    })
    return {
      ...result,
      rowCount: result.rowCount ?? result.affectedRows ?? result.rows.length,
    }
  }
  async query(config) {
    const release = await this.acquire()
    try {
      return await this.io(config)
    } finally {
      release()
    }
  }
  async connect() {
    const release = await this.acquire()
    const connection = new EventEmitter()
    connection.query = (config) => this.io(config)
    connection.release = release
    return connection
  }
  async end() {
    await this.db.close()
  }
}
export { EmbeddedPool }
