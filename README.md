<div align="center">

<img src="./logo.png" width="120" height="120" alt="grapes">

# pino-gris

A verbose [ndjson](http://ndjson.org) log formatter for [pino](https://github.com/pinojs/pino).

[![npm][npm-image]][npm-url]
[![build][build-image]][build-url]
[![downloads][downloads-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/pino-gris.svg
[npm-url]: https://www.npmjs.com/package/pino-gris
[build-image]: https://github.com/ungoldman/pino-gris/actions/workflows/tests.yml/badge.svg
[build-url]: https://github.com/ungoldman/pino-gris/actions/workflows/tests.yml
[downloads-image]: https://img.shields.io/npm/dm/pino-gris.svg

</div>

> **Note**: this is a maintained fork of [`pino-colada`][pino-colada], with more verbose logging of objects and zero dependencies.

## Install

```
npm install pino-gris
```

## Usage

Pipe any `pino` output into `pino-gris` for logging.

```bash
node server.js | pino-gris
```

After parsing input from `server.js`, `pino-gris` returns a stream and pipes it
over to `process.stdout`. It will output a timestamp, a log level in the form of
an emoji, a message, and any extra data supplied in the first argument.

```
> log.fatal(new Error('Aaaaaauugh'), 'Someone is dead!')

13:14:32 💀 test Someone is dead!

  err: {
    "type": "Error",
    "message": "Aaaaaauugh",
    "stack": "Error: Aaaaaauugh\n    at ..."
  }
```

The main difference between this and [`pino-colada`][pino-colada] is that it will output _any_ key attached to the `pino` log object that isn't included in the following list:

```js
const pinoKeys = [
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
]
```

These are all the keys that were already being processed by `pino-colada`. So anything that falls out of this list will also get printed.

This means error stack traces, objects, arrays, or anything else will get logged.

### Example Output

For live sample output, try running `npm start` in this repo.

```
00:53:18 💀  test Someone is dead!

  err: {
    "type": "Error",
    "message": "Aaaaaauugh",
    "stack": "Error: Aaaaaauugh\n    at file:///path/to/pino-gris/example.js:8:11\n    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)\n    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:665:26)\n    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)"
  }

00:53:18 🔍  test Endless screaming detected

  stack: 😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  😱
  (truncated at 100 lines)

00:53:18 🚨  test What really happened?

  err: {
    "type": "Error",
    "message": "Perhaps we'll never know",
    "stack": "Error: Perhaps we'll never know\n    at file:///path/to/pino-gris/example.js:18:11\n    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)\n    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:665:26)\n    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)"
  }

00:53:18 🔍  test Interrogating suspects

  0: Colonel Mustard
  1: Miss Scarlet
  2: Mr. Green
  3: Mrs. Peacock
  4: Mrs. White
  5: Professor Plum

00:53:18 ⚠️   test Gathering evidence

  evidence: {
    "weapon": "Candlestick",
    "location": "Library",
    "suspect": "Colonel Mustard"
  }

00:53:18 ✨  test Justice is served

  justice: true

```

### Verbose Mode

For _extremely verbose_ formatted output, you can use the `-v` flag. This will print _all_ properties of the log object.

A line like this...

```js
log.info({ justice: true }, 'Justice is served')
```

Whose raw output looks like this...

```
{"level":30,"time":1563400958346,"pid":3902,"hostname":"example.local","name":"test","justice":true,"msg":"Justice is served"}
```

When fed to `pino-gris` like this...

```sh
output | pino-gris -v
```

Will be formatted like this:

```
14:59:23 ✨ test Justice is served

  level: info
  time: 1563400958346
  pid: 3902
  hostname: example.local
  name: test
  justice: true
  msg: Justice is served
```

### Line Limit

Long string values are truncated at 100 lines by default. Use `--line-limit` to
change the cap.

```sh
output | pino-gris --line-limit 500
```

The limit is ignored in verbose mode, which always prints everything.

### Nota Bene

Be careful how you use `pino`! It will do very different things depending on the order of arguments.

Example:

```
> log.error(new Error('error text'), 'message text')

{"level":50,"time":1523650090921,"pid":63152,"hostname":"example.local","name":"test","err":{"type":"Error","message":"error text","stack":"Error: error text\n    at ..."},"msg":"message text"}

> log.error('message text', new Error('error text'))

{"level":50,"time":1523650105577,"pid":63152,"hostname":"example.local","name":"test","msg":"message text"}
```

In the first case above, the error is serialized under `err` (its type, message, and stack), and your message is kept in `msg`.

In the second case above, the error's stack and message properties are completely lost!

So if you want to preserve any important information from an object, always pass it first.

Also note `pino` will do weird things with key collisions, like so:

```
> log.info({ msg: 'inner' }, 'outer')
{"level":30,"time":1523650319601,"pid":63152,"hostname":"example.local","name":"test","msg":"inner","msg":"outer"}
```

Notice there are two `msg` keys above now! 🤔

## License
[MIT](https://tldrlegal.com/license/mit-license)

[pino-colada]: https://github.com/lrlna/pino-colada
