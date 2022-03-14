'use strict'

const mod = 'protect'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const { HEADERS, HD_AUTH, HD_URL, HD_AUTH_LOWER, HD_METHOD } = require('../config/headers')
const REQ_AUTH_MAX_LENGTH = 1000
const REQ_URL_MAX_LENGTH = 200

exports.getUrlMaxLength = () => REQ_URL_MAX_LENGTH
// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('./logging')
const { accessProperty } = require('./jsonAccess')
const {
  validateSchema,
  REGEX_JWT_AUTH,
  REGEX_URL_WRONG_CHAR,
} = require('../definitions/schemaValidators')

const { RudiError, BadRequestError } = require('./errors')
const { HTTP_METHODS } = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Functiôons
// ------------------------------------------------------------------------------------------------
/**
 * Offers a protection on 'Authorization' property of the request headers
 * @param {*} req
 * @returns
 */
exports.protectHeaderAuth = (req) => {
  const fun = 'protectHeaderAuth'
  try {
    log.t(mod, fun, ``)
    const header = accessProperty(req, HEADERS)
    const auth = header[HD_AUTH] || header[HD_AUTH_LOWER]
    if (!auth) return
    if (auth.length > REQ_AUTH_MAX_LENGTH)
      throw new BadRequestError(
        `The length of the token in request headers exceeds ${REQ_AUTH_MAX_LENGTH} characters (found ${auth.length})`
      )
    if (!validateSchema(auth, REGEX_JWT_AUTH))
      throw new BadRequestError(`The token in headers does not respect JWT schema`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.protectHeaderUrl = (req) => {
  const fun = 'protectHeaderUrl'
  try {
    log.t(mod, fun, ``)
    const url = accessProperty(req, HD_URL)
    if (url.length > REQ_URL_MAX_LENGTH)
      throw new BadRequestError(`Request URL is too long (${url.length} characters)`)
    if (validateSchema(url, REGEX_URL_WRONG_CHAR))
      throw new BadRequestError(`Invalid characters detected in the URL`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
const httpMethods = Object.values(HTTP_METHODS)
exports.protectHeaderMethod = (req) => {
  const fun = 'protectHeaderMethod'
  try {
    log.t(mod, fun, ``)
    const method = accessProperty(req, HD_METHOD)
    if (httpMethods.indexOf(method) < 0) throw new BadRequestError(`Incorrect request method`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
