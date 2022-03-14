/* eslint-disable no-console */
'use strict'

const mod = 'crypto'

const { HEADERS, HD_AUTH, HD_AUTH_LOWER } = require('../config/headers')
// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const { accessProperty } = require('./jsonAccess')
const { consoleErr } = require('./jsUtils')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

// norm : https://www.iana.org/assignments/jwt/jwt.xhtml

// Required fields for RUDI JWT:
exports.JWT_TYP = 'typ'
exports.JWT_ALG = 'alg' // JWT signature algorithm

exports.JWT_EXP = 'exp' // Expiration Time https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4
exports.JWT_SUB = 'sub' // Subject https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.2

exports.REQ_MTD = 'req_mtd'
exports.REQ_URL = 'req_url'

// Optional fields for RUDI JWT:
// const JWT_ID = 'jti' // https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.7
// const JWT_IAT = 'iat' // Issued At https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.6
exports.JWT_CLIENT = 'client_id' // https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2

// ------------------------------------------------------------------------------------------------
// Crypto
// ------------------------------------------------------------------------------------------------

exports.extractJwt = (req) => {
  const fun = 'extractJwt'
  try {
    const header = accessProperty(req, HEADERS)
    const auth = header[HD_AUTH] || header[HD_AUTH_LOWER]
    if (!auth)
      throw new Error(`Headers should include a JWT in the form '${HD_AUTH}': Bearer <JWT>"`)

    const token = auth.substring(7)
    return token
  } catch (err) {
    const errMsg = `No token was found in the header (${err})`
    consoleErr(mod, fun, errMsg)
    throw new Error(errMsg)
  }
}
