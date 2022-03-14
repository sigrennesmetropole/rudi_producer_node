'use strict'

const mod = 'hashThes'

const { BadRequestError, RudiError } = require('../../utils/errors')
// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const { parameterExpected } = require('../../utils/msg')

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------

// Method for computing the integrity hash of the data
const HashAlgorithms = ['MD5', 'SHA-256', 'SHA-512']

// ------------------------------------------------------------------------------------------------
// Getter / setter
// ------------------------------------------------------------------------------------------------
let Thesaurus = HashAlgorithms

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
