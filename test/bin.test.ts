import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('../dist/bin.js', import.meta.url))

function pipe(input: string, args: string[] = []): string {
  return spawnSync('node', [bin, ...args], { input, encoding: 'utf8' }).stdout
}

test('bin formats piped ndjson', () => {
  const out = pipe(`${JSON.stringify({ level: 'info', msg: 'from bin' })}\n`)
  assert.match(out, /from bin/)
})

test('bin --verbose includes pino-internal keys', () => {
  const out = pipe(`${JSON.stringify({ level: 'info', msg: 'm', pid: 7 })}\n`, ['--verbose'])
  assert.match(out, /pid: 7/)
})
