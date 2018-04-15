#! /usr/bin/env node
var pinoGris = require('./')()
var input = process.stdin
var output = process.stdout

input
  .pipe(pinoGris)
  .pipe(output)
