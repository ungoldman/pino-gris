# Changelog

## [2.1.0](https://github.com/ungoldman/pino-gris/compare/v2.0.0...v2.1.0) (2026-06-18)


### Features

* add --line-limit option ([#6](https://github.com/ungoldman/pino-gris/issues/6)) ([eb9ea79](https://github.com/ungoldman/pino-gris/commit/eb9ea79b861f2af8a658e1ad412e25a00b43c0a4))

## [2.0.0](https://github.com/ungoldman/pino-gris/compare/v1.3.1...v2.0.0) (2026-06-18)


### ⚠ BREAKING CHANGES

* pino-gris is now ESM-only and requires Node >= 22.12.
    - prefer the named export `import { pinoGris } from 'pino-gris'`; the default `import pinoGris from 'pino-gris'` still works
    - CommonJS can still `require('pino-gris')` on Node >= 22.12, but it now returns the namespace, so use `const { pinoGris } = require('pino-gris')` (or `.default`), not `const pinoGris = require('pino-gris')`

### Build System

* convert to TypeScript and ESM ([#4](https://github.com/ungoldman/pino-gris/issues/4)) ([9859aa4](https://github.com/ungoldman/pino-gris/commit/9859aa43a788af6ec858384a209c03811d881725))
