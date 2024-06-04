'use strict'

const mod = 'jwtCtrl'

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'

import {
  extractJwt,
  forgeToken,
  readPrivateKeyFile,
  readPublicKeyFile,
  tokenStringToJwtObject,
  verifyToken,
} from '@aqmo.org/jwt-lib'
// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
import { logD, logW } from '../utils/logging.js'

import { DEFAULT_EXP, PROFILES, PRV_KEY, PUB_KEY } from '../config/confSystem.js'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js'
import { isEmptyObject, nowEpochS } from '../utils/jsUtils.js'

export const JWT_ID = 'jti' // https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.7
export const JWT_EXP = 'exp' // Expiration Time https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4
export const JWT_SUB = 'sub' // Subject https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.2
export const JWT_IAT = 'iat' // Issued At https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.6
export const JWT_CLIENT = 'client_id' // https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2

export const REQ_MTD = 'req_mtd'
export const REQ_URL = 'req_url'

export const JWT_KEY = 'key' // Used when 'sub' is needed in the JWT and does not correspond to the key in profiles

// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------

/**
 * Retrieve the string that states which algorithm was used for the
 * private/public key pair.
 * see https://datatracker.ietf.org/doc/html/rfc7518#section-3.1
 * @param {String} algo
 * @returns
 */
export function getJwtAlgo(algo) {
  const fun = 'getJwtAlgo'
  try {
    switch (algo) {
      case 'ed25519':
      case 'EdDSA':
        return 'EdDSA'
      case 'HS256':
      case 'ES256':
      case 'RS256':
      case 'PS256':
      case 'HS512':
      case 'ES512':
      case 'RS512':
      case 'PS512':
        return algo
      default:
        throw new BadRequestError(`Algo not recognized: '${algo}'`)
    }
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}

/**
 * Hash algo to be used to sign the JWT
 * @param {String} algo
 * @returns
 */
export function getHashAlgo(algo) {
  const fun = 'getHashAlgo'
  // Complete list of hash algos :
  // require('crypto').getHashes()
  try {
    switch (algo) {
      case 'HS256':
      case 'RS256':
      case 'ES256':
      case 'PS256':
        return 'sha256'
      case 'ES512':
      case 'HS512':
      case 'RS512':
      case 'PS512':
      case 'ed25519':
      case 'EdDSA':
        return 'sha512'
      default:
        throw new BadRequestError(`Algo not recognized: '${algo}'`)
    }
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}

/**
 * Creates a JWT with incoming JSON as a payload
 * If 'iat' (issued at) property is not found, it is automatically added to the payload
 * with current Epoch time in seconds
 * If 'exp' (expiration time) property is not found, it is automatically added to the
 * payload with default value 600
 * @param {*} req
 * @param {*} reply
 * @returns
 */
export const forgeJwt = (req, reply) => createRudiApiToken(req.body)

export function createRudiApiToken(jwtPayload) {
  const fun = 'createRudiApiToken'
  logD(mod, fun, ``)
  try {
    if (!jwtPayload || isEmptyObject(jwtPayload))
      throw new BadRequestError(`Incoming JSON should not be null`)

    // Identifying the requester asking for a token
    const subject = jwtPayload[JWT_KEY] || jwtPayload[JWT_SUB]
    if (!subject)
      throw new BadRequestError(
        `No ID was found for the requester (property '${JWT_KEY} or ${JWT_SUB}')`
      )

    const prvKey = getKeyInfo(subject, PRVK)

    // Adjusting the JWT payload
    if (!jwtPayload[JWT_IAT]) jwtPayload[JWT_IAT] = nowEpochS()
    if (!jwtPayload[JWT_EXP]) jwtPayload[JWT_EXP] = DEFAULT_EXP

    // Setting an ID to the JWT, if needed
    if (!jwtPayload[JWT_ID]) jwtPayload[JWT_ID] = uuidv4()

    return forgeToken(prvKey, {}, jwtPayload)
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}

const KEYS = {}
const PRVK = 'prvk'
const PUBK = 'pubk'

/**
 * Returns both the private key and the algo
 * @param {string} subject
 */
function getKeyInfo(subject, keyType = PUBK) {
  const fun = 'getKeyInfo'
  try {
    // Retrieving stored info
    if (KEYS[subject]?.[keyType]) return KEYS[subject][keyType]

    // Extracting info
    const subjectInfo = PROFILES[subject]
    if (!subjectInfo) throw new NotFoundError(`Subject '${subject}' not found in profiles`)
    if (!KEYS[subject]) KEYS[subject] = {}
    if (keyType == PRVK) {
      const prvKeyPath = subjectInfo[PRV_KEY]
      if (!prvKeyPath)
        throw new NotFoundError(
          `Property ${PRV_KEY} not found in profiles for subject: '${subject}'`
        )
      const prvKeyPem = readPrivateKeyFile(prvKeyPath)
      KEYS[subject][PRVK] = prvKeyPem
      return prvKeyPem
    } else {
      const pubKeyPath = subjectInfo[PUB_KEY]
      if (!pubKeyPath)
        throw new NotFoundError(
          `Property ${PUB_KEY} not found in profiles for subject: '${subject}'`
        )
      const pubKeyPem = readPublicKeyFile(pubKeyPath)
      KEYS[subject][PUBK] = pubKeyPem
      return pubKeyPem
    }
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}

export function checkJwt(req, reply) {
  const fun = 'checkToken'
  logD(mod, fun, ``)
  try {
    const method = req.routeOptions?.config?.method
    logD(mod, fun, method)
    const token = method.toUpperCase() == 'POST' ? req.body : extractJwt(req)

    // Identify the subject
    const jwtPayload = tokenStringToJwtObject(token)?.payload
    const subject = jwtPayload[JWT_KEY] || jwtPayload[JWT_SUB]
    if (!subject)
      throw new UnauthorizedError(`No ID was found for the requester (property '${JWT_SUB}')`)

    // Retrieve the public key
    const pubKey = getKeyInfo(subject, PUBK)
    const signIsValid = verifyToken(pubKey, token)
    const returnMsg = {
      status: signIsValid ? 'OK' : 'KO',
      message: `JWT is ${signIsValid ? '' : 'in'}valid`,
    }
    reply.status(signIsValid ? 200 : 400).send(returnMsg)
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}
