#!/usr/bin/env node
import { pinoGris } from './index.js'

const verbose = process.argv.includes('-v') || process.argv.includes('--verbose')

process.stdin.pipe(pinoGris({ verbose })).pipe(process.stdout)
