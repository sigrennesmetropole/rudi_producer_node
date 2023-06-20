const mod = 'hashThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { BadRequestError, RudiError } from '../../utils/errors.js'
import { parameterExpected } from '../../utils/msg.js'
import { logW } from '../../utils/logging.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------

// Method for computing the integrity hash of the data
const HashAlgorithms = ['MD5', 'SHA-256', 'SHA-512']

// -------------------------------------------------------------------------------------------------
// Getter / setter
// -------------------------------------------------------------------------------------------------
let Thesaurus = HashAlgorithms

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
