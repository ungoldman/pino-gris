import assert from 'node:assert/strict'
import test from 'node:test'
import fc from 'fast-check'
import { type PinoGrisOptions, pinoGris } from '../src/index.ts'

// styleText skips color on a non-TTY stream, but strip defensively so assertions
// hold regardless of where the tests run.
const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
const stripAnsi = (s: string): string => s.replace(ansi, '')

function run(input: string | string[], options: PinoGrisOptions = {}): Promise<string> {
  const stream = pinoGris(options)
  let out = ''
  stream.on('data', (chunk) => {
    out += chunk.toString()
  })
  return new Promise((resolve) => {
    stream.on('end', () => resolve(stripAnsi(out)))
    const chunks = Array.isArray(input) ? input : [input]
    for (const chunk of chunks) stream.write(chunk)
    stream.end()
  })
}

const line = (obj: unknown): string => `${JSON.stringify(obj)}\n`

test('formats a basic info log', async () => {
  const out = await run(line({ level: 'info', msg: 'hello' }))
  assert.match(out, /^\d\d:\d\d:\d\d ✨ hello\n$/)
})

test('reads message from msg or message', async () => {
  assert.match(await run(line({ level: 'info', message: 'via message' })), /via message/)
  assert.match(await run(line({ level: 'info', msg: 'via msg' })), /via msg/)
})

test('converts numeric levels to names', async () => {
  assert.match(await run(line({ level: 10, msg: 'a' })), /🔍/)
  assert.match(await run(line({ level: 20, msg: 'a' })), /🐛/)
  assert.match(await run(line({ level: 30, msg: 'a' })), /✨/)
  assert.match(await run(line({ level: 40, msg: 'a' })), /⚠️/)
  assert.match(await run(line({ level: 50, msg: 'a' })), /🚨/)
  assert.match(await run(line({ level: 60, msg: 'a' })), /💀/)
})

test('leaves an unknown numeric level unconverted (no emoji, empty message)', async () => {
  const out = await run(line({ level: 99, msg: 'mystery' }))
  // no emoji and an unknown level produces an empty message segment
  assert.match(out, /^\d\d:\d\d:\d\d\n$/)
})

test('colors message per string level without crashing', async () => {
  for (const level of ['error', 'trace', 'warn', 'debug', 'info', 'fatal']) {
    assert.match(
      await run(line({ level, msg: `${level} message` })),
      new RegExp(`${level} message`)
    )
  }
})

test('an unknown string level yields an empty message segment', async () => {
  assert.match(await run(line({ level: 'silent', msg: 'hush' })), /^\d\d:\d\d:\d\d\n$/)
})

test('renders ns and name', async () => {
  const out = await run(line({ level: 'info', msg: 'm', ns: 'myns', name: 'myname' }))
  assert.match(out, /myns/)
  assert.match(out, /myname/)
})

test('shortens request and response messages to arrows', async () => {
  assert.match(await run(line({ level: 'info', msg: 'request' })), /<--/)
  assert.match(await run(line({ level: 'info', msg: 'response' })), /-->/)
})

test('formats method, status, and url from req/res objects', async () => {
  const out = await run(
    line({
      level: 'info',
      msg: 'response',
      req: { method: 'GET', url: '/x' },
      res: { statusCode: 200 }
    })
  )
  assert.match(out, /GET/)
  assert.match(out, /200/)
  assert.match(out, /\/x/)
})

test('formats method, status, and url from top-level fields', async () => {
  const out = await run(
    line({ level: 'info', msg: 'm', method: 'POST', statusCode: 201, url: '/y' })
  )
  assert.match(out, /POST 201/)
  assert.match(out, /\/y/)
})

test('falls back to xxx when a method is present without a status', async () => {
  const out = await run(line({ level: 'info', msg: 'm', method: 'GET' }))
  assert.match(out, /GET xxx/)
})

test('formats content length as compact bytes', async () => {
  assert.match(await run(line({ level: 'info', msg: 'm', contentLength: 1500 })), /1\.5kB/)
  assert.match(await run(line({ level: 'info', msg: 'm', contentLength: 0 })), /\b0B\b/)
  assert.match(await run(line({ level: 'info', msg: 'm', contentLength: -1500 })), /-1\.5kB/)
  assert.match(await run(line({ level: 'info', msg: 'm', contentLength: 1e15 })), /PB$/m)
  // a non-numeric content length parses to NaN
  assert.match(await run(line({ level: 'info', msg: 'm', contentLength: 'huge' })), /NaNB/)
})

test('formats response time as a compact duration', async () => {
  assert.match(await run(line({ level: 'info', msg: 'm', responseTime: 500 })), /500ms/)
  assert.match(await run(line({ level: 'info', msg: 'm', responseTime: 1500 })), /1\.5s/)
  assert.match(await run(line({ level: 'info', msg: 'm', responseTime: 90000 })), /1m 30s/)
  assert.match(await run(line({ level: 'info', msg: 'm', responseTime: 90061000 })), /1d 1h 1m 1s/)
  assert.match(await run(line({ level: 'info', msg: 'm', responseTime: 'slow' })), /NaNms/)
})

test('uses elapsed when responseTime is absent', async () => {
  assert.match(await run(line({ level: 'info', msg: 'm', elapsed: 250 })), /250ms/)
})

test('appends extra fields not in the pino key set', async () => {
  const out = await run(line({ level: 'info', msg: 'm', userId: 42 }))
  assert.match(out, /userId: 42/)
})

test('pretty-prints object extras and stringifies arrays', async () => {
  const out = await run(
    line({ level: 'info', msg: 'm', evidence: { weapon: 'candlestick' }, who: ['a', 'b'] })
  )
  assert.match(out, /weapon/)
  assert.match(out, /who: a,b/)
})

test('truncates long string extras unless verbose', async () => {
  const big = Array.from({ length: 150 }, (_, i) => `line${i}`).join('\n')
  const out = await run(line({ level: 'info', msg: 'm', dump: big }))
  assert.match(out, /truncated at 100 lines/)
  assert.doesNotMatch(out, /line149/)
})

test('verbose shows all keys and skips truncation', async () => {
  const big = Array.from({ length: 150 }, (_, i) => `line${i}`).join('\n')
  const out = await run(line({ level: 'info', msg: 'm', pid: 123, dump: big }), { verbose: true })
  assert.match(out, /pid: 123/)
  assert.match(out, /line149/)
  assert.doesNotMatch(out, /truncated/)
})

test('passes through invalid JSON unchanged', async () => {
  assert.equal(await run('not json\n'), 'not json\n')
})

test('passes through non-object and level-less JSON', async () => {
  assert.equal(await run('5\n'), '5\n')
  assert.equal(await run('null\n'), 'null\n')
  assert.equal(await run('"a string"\n'), '"a string"\n')
  assert.equal(
    await run(`${JSON.stringify({ no: 'level' })}\n`),
    `${JSON.stringify({ no: 'level' })}\n`
  )
})

test('handles a final line with no trailing newline (flush path)', async () => {
  const out = await run(JSON.stringify({ level: 'info', msg: 'tail' }))
  assert.match(out, /tail/)
})

test('handles input split across chunk boundaries', async () => {
  const out = await run(['{"level":"info","msg":"sp', 'lit"}\n'])
  assert.match(out, /split/)
})

test('handles a log with no message', async () => {
  assert.match(await run(line({ level: 'info' })), /^\d\d:\d\d:\d\d ✨\n$/)
})

test('stringifies a null extra value', async () => {
  assert.match(await run(line({ level: 'info', msg: 'm', meta: null })), /meta: null/)
})

test('property: arbitrary input never throws and yields newline-terminated lines', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (s) => {
      const input = `${s.replaceAll('\n', ' ')}\n`
      const out = await run(input)
      return typeof out === 'string' && out.endsWith('\n')
    })
  )
})
