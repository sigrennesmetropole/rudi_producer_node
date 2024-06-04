const mod = 'lccThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { BadRequestError, RudiError } from '../../utils/errors.js'
import { isArray } from '../../utils/jsUtils.js'
import { logT, logW } from '../../utils/logging.js'
import { parameterExpected } from '../../utils/msg.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------

// Method for computing the integrity hash of the data
let LicenceCodes = []

// -------------------------------------------------------------------------------------------------
// Getter / setter
// -------------------------------------------------------------------------------------------------
let Thesaurus = LicenceCodes

export const initialize = (arg) => {
  if (arg) Thesaurus = []
}

export const get = () => Thesaurus

export const set = (newValue) => {
  const fun = 'set'
  try {
    // logT(mod, fun)
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

export const setAll = (newValuesArray) => {
  const fun = 'setAll'
  try {
    logT(mod, fun)
    if (!newValuesArray || !isArray(newValuesArray)) {
      const errMsg = parameterExpected(fun, 'newValuesArray')
      logW(mod, fun, errMsg)
      throw new BadRequestError(errMsg)
    }
    newValuesArray.map((val) => set(val))
    return true
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
