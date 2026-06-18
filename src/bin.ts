#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { pinoGris } from './index.js'

const { values } = parseArgs({
  strict: false,
  allowPositionals: true,
  options: {
    verbose: { type: 'boolean', short: 'v', default: false },
    'line-limit': { type: 'string' }
  }
})

const verbose = Boolean(values.verbose)

const raw = values['line-limit']
let lineLimit: number | undefined
if (raw !== undefined) {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    process.stderr.write(`pino-gris: --line-limit must be a non-negative integer (got "${raw}")\n`)
    process.exit(1)
  }
  lineLimit = n
}

process.stdin.pipe(pinoGris({ verbose, lineLimit })).pipe(process.stdout)
