const mod = 'encodThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logW } from '../../utils/logging.js'
import { parameterExpected } from '../../utils/msg.js'
import { BadRequestError, RudiError } from '../../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const Encodings = [
  'Unicode',
  'ISO/IEC 10646',
  'UTF-8',
  'UTF-16',
  'ISO/CEI 8859-1',
  'MacRoman',
  'Windows-1252',
  'US-ASCII',
  'ASCII',
  'ANSI',
]

// -------------------------------------------------------------------------------------------------
// Getter / setter
// -------------------------------------------------------------------------------------------------
let Thesaurus = Encodings

export const initialize = (arg) => {
  if (arg) Thesaurus = []
}

export const get = (prop) => {
  return prop ? Thesaurus[prop] : Thesaurus
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
