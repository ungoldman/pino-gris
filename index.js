var prettyBytes = require('prettier-bytes')
var jsonParse = require('fast-json-parse')
var prettyMs = require('pretty-ms')
var padLeft = require('pad-left')
var indent = require('indent')
var split = require('split2')
var chalk = require('chalk')

var nl = '\n'
var emojiLog = {
  warn: '⚠️',
  info: '✨',
  error: '🚨',
  debug: '🐛',
  fatal: '💀',
  trace: '🔍'
}
var lineLimit = 100
var pinoKeys = [
  'level',
  'time',
  'msg',
  'message',
  'pid',
  'hostname',
  'name',
  'ns',
  'v',
  'req',
  'res',
  'statusCode',
  'responseTime',
  'elapsed',
  'method',
  'contentLength',
  'url'
]
var verbose = process.argv.includes('-v')

module.exports = PinoGris

function PinoGris () {
  return split(parse)
}

function parse (line) {
  var obj = jsonParse(line)
  if (!obj.value || obj.err) return line + nl
  obj = obj.value

  if (!obj.level) return line + nl
  if (typeof obj.level === 'number') convertLogNumber(obj)

  return output(obj) + nl
}

function convertLogNumber (obj) {
  if (obj.level === 10) obj.level = 'trace'
  if (obj.level === 20) obj.level = 'debug'
  if (obj.level === 30) obj.level = 'info'
  if (obj.level === 40) obj.level = 'warn'
  if (obj.level === 50) obj.level = 'error'
  if (obj.level === 60) obj.level = 'fatal'
}

function output (obj) {
  var output = []

  if (!obj.message) obj.message = obj.msg
  if (!obj.level) obj.level = 'userlvl'
  if (!obj.name) obj.name = ''
  if (!obj.ns) obj.ns = ''

  output.push(formatDate())
  output.push(formatLevel(obj.level))
  output.push(formatNs(obj.ns))
  output.push(formatName(obj.name))
  output.push(formatMessage(obj))

  var req = obj.req
  var res = obj.res
  var statusCode = (res) ? res.statusCode : obj.statusCode
  var responseTime = obj.responseTime || obj.elapsed
  var method = (req) ? req.method : obj.method
  var contentLength = obj.contentLength
  var url = (req) ? req.url : obj.url

  if (method != null) {
    output.push(formatMethod(method))
    output.push(formatStatusCode(statusCode))
  }
  if (url != null) output.push(formatUrl(url))
  if (contentLength != null) output.push(formatBundleSize(contentLength))
  if (responseTime != null) output.push(formatLoadTime(responseTime))
  output.push(formatExtra(obj))

  return output.filter(noEmpty).join(' ')
}

function formatDate () {
  var date = new Date()
  var hours = padLeft(date.getHours().toString(), 2, '0')
  var minutes = padLeft(date.getMinutes().toString(), 2, '0')
  var seconds = padLeft(date.getSeconds().toString(), 2, '0')
  var prettyDate = hours + ':' + minutes + ':' + seconds
  return chalk.gray(prettyDate)
}

function formatLevel (level) {
  const emoji = emojiLog[level]
  const padding = isWideEmoji(emoji) ? '' : ' '
  return emoji + padding
}

function formatNs (name) {
  return chalk.cyan(name)
}

function formatName (name) {
  return chalk.blue(name)
}

function formatMessage (obj) {
  var msg = formatMessageName(obj.message)
  if (obj.level === 'error') return chalk.red(msg)
  if (obj.level === 'trace') return chalk.white(msg)
  if (obj.level === 'warn') return chalk.magenta(msg)
  if (obj.level === 'debug') return chalk.yellow(msg)
  if (obj.level === 'info' || obj.level === 'userlvl') return chalk.green(msg)
  if (obj.level === 'fatal') return chalk.white.bgRed(msg)
}

function formatUrl (url) {
  return chalk.white(url)
}

function formatMethod (method) {
  return chalk.white(method)
}

function formatStatusCode (statusCode) {
  statusCode = statusCode || 'xxx'
  return chalk.white(statusCode)
}

function formatLoadTime (elapsedTime) {
  var elapsed = parseInt(elapsedTime, 10)
  var time = prettyMs(elapsed)
  return chalk.gray(time)
}

function formatBundleSize (bundle) {
  var bytes = parseInt(bundle, 10)
  var size = prettyBytes(bytes).replace(/ /, '')
  return chalk.gray(size)
}

function formatMessageName (message) {
  if (message === 'request') return '<--'
  if (message === 'response') return '-->'
  return message
}

function formatExtra (obj) {
  const extra = Object.keys(obj)
    .filter(key => {
      if (verbose) return true
      return !pinoKeys.includes(key)
    })
    .reduce((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})

  const extraKeys = Object.keys(extra)

  if (extraKeys.length === 0) return ''

  const content = nl + nl + extraKeys.map(key => {
    let val = extra[key]
    if (isObject(val)) val = JSON.stringify(val, null, 2)

    // limit very long string values
    if (!verbose && typeof val === 'string' && val.split('\n').length > lineLimit) {
      let arr = val.split('\n').slice(0, lineLimit)
      arr.push(`(truncated at ${lineLimit} lines)`)
      val = arr.join('\n')
    }
    return chalk.gray(`${key}: ${val}`)
  }).join(nl) + nl

  return indent(content, 2)
}

function isObject (val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false
}

function isWideEmoji (character) {
  return character !== '⚠️'
}

function noEmpty (val) {
  return !!val
}
