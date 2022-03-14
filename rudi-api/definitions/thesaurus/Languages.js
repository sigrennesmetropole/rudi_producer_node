'use strict'

const mod = 'langThes'

const { BadRequestError, RudiError } = require('../../utils/errors')
// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const { parameterExpected } = require('../../utils/msg')

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------

// documentation: https://www.rfc-editor.org/rfc/bcp/bcp47.txt
const Languages = [
  'fr',
  'fr-FR',
  'fr-BE',
  'en',
  'en-GB',
  'en-US',
  'cs',
  'cs-CZ',
  'da',
  'da-DK',
  'de',
  'de-DE',
  'de-CH',
  'el',
  'el-GR',
  'es',
  'es-ES',
  'hu',
  'hu-HU',
  'it',
  'it-IT',
  'no',
  'no-NO',
  'pl',
  'pl-PL',
  'pt',
  'pt-PT',
  'ro',
  'ro-RO',
  'ru',
  'ru-RU',
  'sk',
  'sk-SK',
]

// ------------------------------------------------------------------------------------------------
// Getter / setter
// ------------------------------------------------------------------------------------------------
let Thesaurus = Languages

exports.initialize = (arg) => {
  if (arg) Thesaurus = []
}

exports.get = () => {
  return Thesaurus
}

exports.set = (newValue) => {
  const fun = 'set'
  try {
    if (!newValue) {
      const errMsg = parameterExpected(fun, 'newValue')
      log.w(mod, fun, errMsg)
      throw new BadRequestError(errMsg)
    }
    newValue = `${newValue}`.trim()
    if (Thesaurus.indexOf(newValue) === -1) Thesaurus.push(newValue)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.isValid = (value, shouldInit) => {
  const fun = 'isValid'
  if (!value) {
    log.w(mod, fun, parameterExpected(fun, 'value'))
    return false
  }
  const isIn = Thesaurus.indexOf(value) > -1
  if (!isIn && shouldInit) {
    this.set(value)
    return true
  }
  return isIn
}
