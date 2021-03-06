var pino = require('pino')

var log = pino({
  name: 'test',
  level: 'trace'
})

log.fatal(new Error('Aaaaaauugh'), 'Someone is dead!')
log.trace({
  stack: (() => {
    let arr = []
    while (arr.length < 250) {
      arr.push('😱')
    }
    return arr.join('\n')
  })()
}, 'Endless screaming detected')
log.error(new Error('Perhaps we\'ll never know'), 'What really happened?')
log.trace([
  'Colonel Mustard',
  'Miss Scarlet',
  'Mr. Green',
  'Mrs. Peacock',
  'Mrs. White',
  'Professor Plum'
], 'Interrogating suspects')
log.warn({
  evidence: {
    weapon: 'Candlestick',
    location: 'Library',
    suspect: 'Colonel Mustard'
  }
}, 'Gathering evidence')
log.info({ justice: true }, 'Justice is served')
