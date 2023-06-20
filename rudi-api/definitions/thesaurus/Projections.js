const mod = 'projThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logW } from '../../utils/logging.js'
import { parameterExpected } from '../../utils/msg.js'
import { BadRequestError, RudiError } from '../../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const Projections = [
  'RGF93/Lambert-93 (EPSG:2154)', // https://www.spatialreference.org/ref/epsg/2154/
  'RGF93/CC48 (EPSG:3948)', // https://www.spatialreference.org/ref/epsg/3948/
  'WGS 84 (EPSG:4326)', // https://www.spatialreference.org/ref/epsg/4326/ urn:ogc:def:crs:OGC::CRS84
]

// -------------------------------------------------------------------------------------------------
// Getter / setter
// -------------------------------------------------------------------------------------------------
let Thesaurus = Projections

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
