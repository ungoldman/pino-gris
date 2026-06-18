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

test('bin --line-limit overrides the default truncation point', () => {
  const dump = Array.from({ length: 150 }, (_, i) => `line${i}`).join('\n')
  const out = pipe(`${JSON.stringify({ level: 'info', msg: 'm', dump })}\n`, ['--line-limit', '10'])
  assert.match(out, /truncated at 10 lines/)
})

test('bin --line-limit rejects a non-numeric value', () => {
  const res = spawnSync('node', [bin, '--line-limit', 'abc'], { input: '', encoding: 'utf8' })
  assert.equal(res.status, 1)
  assert.match(res.stderr, /non-negative integer/)
})
