const mod = 'langThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logW } from '../../utils/logging.js'
import { BadRequestError, RudiError } from '../../utils/errors.js'
import { parameterExpected } from '../../utils/msg.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------

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

// -------------------------------------------------------------------------------------------------
// Getter / setter
// -------------------------------------------------------------------------------------------------
let Thesaurus = Languages

export const initialize = (arg) => {
  if (arg) Thesaurus = []
}

export const get = (lang) => {
  return lang ? Thesaurus[lang] : Thesaurus
}

export const set = (newValue) => {
  const fun = 'set'
  try {
    if (!newValue) {
      const errMsg = parameterExpected(fun, 'newValue')
      logW(mod, fun, errMsg)
      throw new BadRequestError(errMsg)
    }
    newValue = `${newValue}`.trim()
    if (Thesaurus.indexOf(newValue) === -1) Thesaurus.push(newValue)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const isValid = (value, shouldInit) => {
  const fun = 'isValid'
  if (!value) {
    logW(mod, fun, parameterExpected(fun, 'value'))
    return false
  }
  const isIn = get().indexOf(value) > -1
  if (!isIn && shouldInit) {
    this.set(value)
    return true
  }
  return isIn
}
