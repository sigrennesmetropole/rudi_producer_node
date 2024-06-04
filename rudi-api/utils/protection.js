const mod = 'protect'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
const ACTIVATE_LOG = false

import { HD_METHOD, HD_URL } from '../config/constHeaders.js'
const REQ_AUTH_MAX_LENGTH = 1000
const REQ_URL_MAX_LENGTH = 200

export const getUrlMaxLength = () => REQ_URL_MAX_LENGTH

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { HTTP_METHODS } from '../config/constApi.js'
import {
  REGEX_BASIC_AUTH,
  REGEX_JWT_AUTH,
  REGEX_URL_WRONG_CHAR,
  validateSchema,
} from '../definitions/schemaValidators.js'
import { BadRequestError, RudiError } from './errors.js'
import { accessProperty } from './jsonAccess.js'
import { logT } from './logging.js'
// -------------------------------------------------------------------------------------------------
// Functions
// -------------------------------------------------------------------------------------------------
/**
 * Offers a protection on 'Authorization' property of the request headers
 * @param {*} req
 * @returns
 */
export const protectHeaderAuth = (req) => {
  const fun = 'protectHeaderAuth'
  try {
    if (ACTIVATE_LOG) logT(mod, fun)
    const auth = req?.headers?.Authorization || req?.headers?.authorization
    if (!auth) return
    if (auth.length > REQ_AUTH_MAX_LENGTH)
      throw new BadRequestError(
        `The length of the token in request headers exceeds ${REQ_AUTH_MAX_LENGTH} characters (found ${auth.length})`
      )
    if (!validateSchema(auth, REGEX_JWT_AUTH) && !validateSchema(auth, REGEX_BASIC_AUTH))
      throw new BadRequestError(
        `The token in headers does not respect JWT schema nor usr/pwd authentification`
      )
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const protectHeaderUrl = (req) => {
  const fun = 'protectHeaderUrl'
  try {
    if (ACTIVATE_LOG) logT(mod, fun)
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
export const protectHeaderMethod = (req) => {
  const fun = 'protectHeaderMethod'
  try {
    if (ACTIVATE_LOG) logT(mod, fun)
    const method = accessProperty(req, HD_METHOD)
    if (httpMethods.indexOf(method) < 0) throw new BadRequestError(`Incorrect request method`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
