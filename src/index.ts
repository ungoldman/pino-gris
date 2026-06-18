import { Transform } from 'node:stream'
import { styleText } from 'node:util'

export interface PinoGrisOptions {
  /** Show every field, skip the line-truncation limit on long string values. */
  verbose?: boolean
  /** Cap long string values at this many lines (default 100); ignored when verbose. */
  lineLimit?: number
}

const NL = '\n'
const DEFAULT_LINE_LIMIT = 100

const emojiLog: Record<string, string> = {
  warn: '⚠️',
  info: '✨',
  error: '🚨',
  debug: '🐛',
  fatal: '💀',
  trace: '🔍'
}

const pinoKeys = new Set([
  'level',
  'time',
  'msg',
  'message',
  'pid',
  'hostname',
  'name',
  'ns',
  'req',
  'res',
  'statusCode',
  'responseTime',
  'elapsed',
  'method',
  'contentLength',
  'url'
])

type LogObject = Record<string, unknown>

/** Pipe pino ndjson output through this stream to get colorized human-readable lines. */
export function pinoGris(options: PinoGrisOptions = {}): Transform {
  let buffer = ''
  return new Transform({
    transform(chunk, _encoding, callback) {
      buffer += chunk.toString()
      const lines = buffer.split(NL)
      // split always yields >=1 element; the last is the partial line, held until flush
      buffer = lines.pop() as string
      for (const line of lines) this.push(parseLine(line, options))
      callback()
    },
    flush(callback) {
      if (buffer) this.push(parseLine(buffer, options))
      callback()
    }
  })
}

export default pinoGris

function parseLine(line: string, options: PinoGrisOptions): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return line + NL
  }
  if (parsed === null || typeof parsed !== 'object') return line + NL

  const obj = parsed as LogObject
  if (!obj.level) return line + NL
  if (typeof obj.level === 'number') convertLogNumber(obj)

  return format(obj, options) + NL
}

function convertLogNumber(obj: LogObject): void {
  const levels: Record<number, string> = {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
  }
  const named: string | undefined = levels[obj.level as number]
  if (named) obj.level = named
}

function format(obj: LogObject, options: PinoGrisOptions): string {
  // parseLine guarantees a truthy level before calling format
  const message = (obj.message ?? obj.msg) as unknown
  const level = obj.level as string | number
  const name = (obj.name ?? '') as string
  const ns = (obj.ns ?? '') as string

  const parts: string[] = [
    formatDate(),
    formatLevel(level),
    styleText('cyan', ns),
    styleText('blue', name),
    formatMessage(level, message)
  ]

  const req = obj.req as LogObject | undefined
  const res = obj.res as LogObject | undefined
  const statusCode = res ? res.statusCode : obj.statusCode
  const responseTime = obj.responseTime ?? obj.elapsed
  const method = req ? req.method : obj.method
  const contentLength = obj.contentLength
  const url = req ? req.url : obj.url

  if (method != null) {
    parts.push(styleText('white', String(method)))
    parts.push(styleText('white', String(statusCode ?? 'xxx')))
  }
  if (url != null) parts.push(styleText('white', String(url)))
  if (contentLength != null)
    parts.push(styleText('gray', formatBytes(parseInt(String(contentLength), 10))))
  if (responseTime != null)
    parts.push(styleText('gray', formatMs(parseInt(String(responseTime), 10))))
  parts.push(formatExtra(obj, options))

  return parts.filter(Boolean).join(' ')
}

function formatDate(): string {
  const date = new Date()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return styleText('gray', `${hours}:${minutes}:${seconds}`)
}

function formatLevel(level: string | number): string {
  const emoji: string | undefined = emojiLog[level]
  // the warning sign renders narrow, so it needs the trailing space others don't
  const padding = emoji === '⚠️' ? ' ' : ''
  return (emoji ?? '') + padding
}

function formatMessage(level: string | number, message: unknown): string {
  const msg = formatMessageName(message)
  switch (level) {
    case 'error':
      return styleText('red', msg)
    case 'trace':
      return styleText('white', msg)
    case 'warn':
      return styleText('magenta', msg)
    case 'debug':
      return styleText('yellow', msg)
    case 'info':
      return styleText('green', msg)
    case 'fatal':
      return styleText(['white', 'bgRed'], msg)
    default:
      return ''
  }
}

function formatMessageName(message: unknown): string {
  if (message === 'request') return '<--'
  if (message === 'response') return '-->'
  return String(message ?? '')
}

function formatExtra(obj: LogObject, options: PinoGrisOptions): string {
  const keys = Object.keys(obj).filter((key) => options.verbose || !pinoKeys.has(key))
  if (keys.length === 0) return ''

  const limit = Number.isFinite(options.lineLimit)
    ? (options.lineLimit as number)
    : DEFAULT_LINE_LIMIT

  const lines = keys.map((key) => {
    const val = obj[key]
    let str = isPlainObject(val) ? JSON.stringify(val, null, 2) : String(val)

    if (!options.verbose && str.split(NL).length > limit) {
      const head = str.split(NL).slice(0, limit)
      head.push(`(truncated at ${limit} lines)`)
      str = head.join(NL)
    }
    return styleText('gray', `${key}: ${str}`)
  })

  return indent(NL + NL + lines.join(NL) + NL, 2)
}

function isPlainObject(val: unknown): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text.replace(/^(?!$)/gm, pad)
}

const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

/** Compact base-1000 byte size, no space (e.g. 1500 -> "1.5kB"). */
function formatBytes(num: number): string {
  if (!Number.isFinite(num)) return `${num}B`
  const neg = num < 0 ? '-' : ''
  const abs = Math.abs(num)
  if (abs < 1) return `${neg}${abs}B`
  const exponent = Math.min(Math.floor(Math.log(abs) / Math.log(1000)), BYTE_UNITS.length - 1)
  const value = Number((abs / 1000 ** exponent).toFixed(2))
  return `${neg}${value}${BYTE_UNITS[exponent]}`
}

/** Compact human duration from milliseconds (e.g. 1500 -> "1.5s", 90000 -> "1m 30s"). */
function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return `${ms}ms`
  if (ms < 1000) return `${Math.round(ms)}ms`

  const totalSeconds = ms / 1000
  if (totalSeconds < 60) return `${Number(totalSeconds.toFixed(1))}s`

  const whole = Math.floor(totalSeconds)
  const parts = [
    [Math.floor(whole / 86400), 'd'],
    [Math.floor(whole / 3600) % 24, 'h'],
    [Math.floor(whole / 60) % 60, 'm'],
    [whole % 60, 's']
  ] as const

  return parts
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${value}${unit}`)
    .join(' ')
}
