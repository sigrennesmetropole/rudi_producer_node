'use strict'

const mod = 'keywThes'

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const Thesaurus = require('./Thesaurus')

// ------------------------------------------------------------------------------------------------
// Dynamic enum init
// ------------------------------------------------------------------------------------------------

const CODE = 'keywords'
const INIT_VALUES = [
  'agriculture',
  'bike',
  'car',
  'biogaz',
  'building',
  'bus',
  'city',
  'electricity',
  'energy_consommation',
  'gaz',
  'grid',
  'industry',
  'iris',
  'metro',
  'municipality',
  'plu',
  'population',
  'production',
  'research',
  'school',
  'sensor',
  'stop',
  'telecom',
  'transport',
  'waste',
  'wind',
]

const keywords = new Thesaurus(CODE, INIT_VALUES)

const fun = `init ${CODE}`
// keywords
//   .init()
//   .then(() => {
//     // log.d(mod, fun, `Keywords: ${keywords.get()}`)
//   })
//   .catch((err) => {
//     log.w(mod, fun, `Init failed: ${err}`)
//   })

;(async () => {
  try {
    await keywords.init()
    // log.d(mod, fun, `ok`)
  } catch (err) {
    log.w(mod, fun, `Init failed: ${err}`)
  }
})()

module.exports = keywords
