'use strict'

const mod = 'valid'

// ------------------------------------------------------------------------------------------------
// Internal dependecies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')

// \d : digit character == [0-9]
// \w : word character == [0-9a-zA-Z_]
// /i (at the end) : expression is case insensitive

// ------------------------------------------------------------------------------------------------
// Generic functions
// ------------------------------------------------------------------------------------------------
exports.validateSchema = (schemaStr, regExPattern) => {
  return schemaStr.match(new RegExp(regExPattern))
}

// ------------------------------------------------------------------------------------------------
// Epoch time
// ------------------------------------------------------------------------------------------------
exports.EPOCH_MS = /^[0-9]{13}$/
exports.VALID_EPOCH_MS = [this.EPOCH_MS, `'{VALUE}' is not a valid Epoch time in milliseconds`]

exports.EPOCH_S = /^[0-9]{10}$/
exports.VALID_EPOCH_S = [this.EPOCH_S, `'{VALUE}' is not a valid Epoch time in seconds`]

// ------------------------------------------------------------------------------------------------
// UUID
// ------------------------------------------------------------------------------------------------

exports.REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
exports.VALID_UUID = [this.REGEX_UUID, `'{VALUE}' is not a valid UUID v4`]

exports.isUUID = (id) => {
  const fun = 'isUUID'
  try {
    return this.validateSchema(id, this.REGEX_UUID)
  } catch (err) {
    log.w(mod, fun, err)
    return false
  }
}
// ------------------------------------------------------------------------------------------------
// DOI
// ------------------------------------------------------------------------------------------------

// source: https://www.crossref.org/blog/dois-and-matching-regular-expressions/
// alternative: https://github.com/regexhq/doi-regex/blob/master/index.js
exports.REGEX_DOI = /^10.\d{4,9}\/[-.;()/:\w]+$/i
exports.VALID_DOI = [this.REGEX_DOI, `'{VALUE}' is not a valid DOI`]

// ------------------------------------------------------------------------------------------------
// URI
// ------------------------------------------------------------------------------------------------

exports.REGEX_URI =
  /^(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?$/
exports.VALID_URI = [this.REGEX_URI, `'{VALUE}' is not a valid URI`]

// ------------------------------------------------------------------------------------------------
// E-mail
// ------------------------------------------------------------------------------------------------

exports.REGEX_EMAIL =
  /^([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
exports.VALID_EMAIL = [this.REGEX_EMAIL, `'{VALUE}' is not a valid e-mail`]

// ------------------------------------------------------------------------------------------------
// API version
// ------------------------------------------------------------------------------------------------
exports.REGEX_API_VERSION = /^[0-9]+\.[0-9]+(\.[0-9]+)?[a-z]*$/
exports.VALID_API_VERSION = [
  this.REGEX_API_VERSION,
  `'{VALUE}' does not appear to be a valid RUDI API version number! Expected format: '0.0.0abc' `,
]

// ------------------------------------------------------------------------------------------------
// JSON Web Token
// ------------------------------------------------------------------------------------------------
exports.REGEX_JWT_ENCODED = /^[\w-]+\.[\w-]+\.[=\w-]+$/
exports.REGEX_JWT_AUTH = /^Bearer [\w-]+\.[\w-]+\.[=\w-]+$/

// ------------------------------------------------------------------------------------------------
// Request protection
// ------------------------------------------------------------------------------------------------
exports.REGEX_URL_WRONG_CHAR = /[\$;\{\}\[\]\(\)]/
