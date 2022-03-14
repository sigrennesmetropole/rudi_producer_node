'use strict'

const mod = 'jwtCtrl'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const { readFileSync } = require('fs')
const { parseKey } = require('sshpk')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------

const { decodeBase64url, nowEpochS, nowISO, dateEpochSToIso } = require('../utils/jsUtils')

const log = require('../utils/logging')
const { ROUTE_NAME } = require('../config/confApi')
const { getProfile } = require('../config/confSystem')
const { ForbiddenError, UnauthorizedError, RudiError } = require('../utils/errors')
const { accessProperty } = require('../utils/jsonAccess')
const {
  extractJwt,
  JWT_ALG,
  JWT_EXP,
  JWT_SUB,
  JWT_CLIENT,
  REQ_MTD,
  REQ_URL,
} = require('../utils/crypto')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

const PUB_KEY = 'pub_key'
const SUB_ACL = 'routes'
const REQ_ROUTE_ALL = 'all'

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------

/**
 * Retrieve the string that states which algorithm was used for the
 * private/public key pair.
 * see https://datatracker.ietf.org/doc/html/rfc7518#section-3.1
 *
 * Note: 'ed25519' (EdDSA) is STRONGLY recommended
 * https://crypto.stackexchange.com/a/60390/94576
 *
 * @param {String} algo
 * @returns
 */
exports.getJwtAlgo = (algo) => {
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
        throw new Error(`Algo not recognized: '${algo}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Hash algo to be used to sign the JWT
 * @param {String} algo
 * @returns
 */
exports.getHashAlgo = (algo) => {
  const fun = 'getHashAlgo'
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
        throw new Error(`Algo not recognized: '${algo}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.checkRudiProdPermission = async (req, reply) => {
  const fun = 'checkRudiProdPermission'
  log.t(mod, fun, ``)
  try {
    let token
    try {
      token = extractJwt(req)
    } catch (err) {
      const error = new UnauthorizedError(err)
      throw RudiError.treatError(mod, fun, error)
    }

    // log.d(mod, fun, `token: ${token}`)
    const { subject, clientId } = await this.verifyRudiProdToken(token, req.method, req.url)
    // log.d(mod, fun, `subject: ${subject}, clientId: ${clientId}`)

    // Check the ACL (= does the subject have permission to enter this route?)
    // log.d(mod, fun, `req: ${beautify(req.context.config[ROUTE_NAME])}`)
    const reqRouteName = accessProperty(req.context.config, ROUTE_NAME)
    checkSubjPermission(subject, reqRouteName)
    return { subject, clientId }
    // return 'ok'
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function checkSubjPermission(subject, reqRouteName) {
  const fun = 'checkSubjPermission'
  log.t(mod, fun, ``)

  const subjProfile = getProfile(subject)
  const subjAcl = accessProperty(subjProfile, SUB_ACL)
  if (!subjAcl.includes(reqRouteName) && !subjAcl.includes(REQ_ROUTE_ALL))
    throw new ForbiddenError(
      `Current subject '${subject}' cannot access this route (${reqRouteName})`
    )
  return true
}

exports.verifyRudiProdToken = async (token, reqMethod, reqUrl) => {
  const fun = 'verifyRudiProdToken'
  // log.d(mod, fun, `token: ${token}`)

  try {
    const [jwtHeaderBase64url, jwtPayloadBase64url, jwtSignatureBase64url] = token.split('.')
    // log.d(mod, fun, `JWT header b64: ${jwtHeaderBase64url}`)

    // Identify the signature hash algorithm from the JWT header alg property
    const jwtHeader = JSON.parse(decodeBase64url(jwtHeaderBase64url))
    // log.d(mod, fun, `JWT algo: ${jwtHeader.alg}`)
    const hashAlgo = this.getHashAlgo(jwtHeader[JWT_ALG])
    // log.d(mod, fun, `hash algo: ${hashAlgo}`)

    // Check if the token is still valid

    const jwtPayload = JSON.parse(decodeBase64url(jwtPayloadBase64url))
    const jwtExp = accessProperty(jwtPayload, JWT_EXP)
    // log.d(mod, fun, `jwtPayload: ${beautify(jwtPayload)}`)

    if (nowEpochS() > jwtExp)
      throw new ForbiddenError(
        `JWT expired: JWT expires after ${dateEpochSToIso(jwtExp)} (now is ${nowISO()})`
      )

    // Check the current route
    const jwtMtd = accessProperty(jwtPayload, REQ_MTD)
    if (jwtMtd !== reqMethod && jwtMtd !== REQ_ROUTE_ALL)
      throw new ForbiddenError(
        `The http request method '${reqMethod}' doesn't match what has been declared in the JWT: '${jwtMtd}'`
      )
    const jwtUrl = accessProperty(jwtPayload, REQ_URL)
    if (jwtUrl !== reqUrl && jwtUrl !== REQ_ROUTE_ALL)
      throw new ForbiddenError(
        `The request URL '${reqUrl}' doesn't match what has been declared in the JWT: '${jwtUrl}'`
      )

    // Identify the subject (= caller/requester)
    const subject = accessProperty(jwtPayload, JWT_SUB)
    const clientId = jwtPayload[JWT_CLIENT]

    // Retrieve the public key
    // log.d(mod, fun, `Retrieve the public key for '${subject}'`)

    const subjProfile = getProfile(subject)
    if (!subjProfile)
      throw new ForbiddenError(`No profile was found for this subject: '${subject}'`)

    let keyFile
    try {
      keyFile = accessProperty(subjProfile, PUB_KEY)
    } catch (err) {
      throw new Error(`Wrong configuration, public key path not found for '${subject}': ${err}`)
    }
    let pubKeyPem
    try {
      pubKeyPem = readFileSync(keyFile, 'ascii')
    } catch (err) {
      throw new Error(`Wrong configuration, public key cannot be read at '${keyFile}': ${err}`)
    }
    let sslKey
    try {
      sslKey = parseKey(pubKeyPem)
    } catch (err) {
      throw new Error(`Wrong configuration, public key cannot be parsed from '${keyFile}': ${err}`)
    }
    // log.d(mod, fun, `sslKey: ${beautify(sslKey)}`)

    // Check the signature
    // log.d(mod, fun, `Check the signature: ${beautify(sslKey)}`)

    const verifier = sslKey.createVerify(hashAlgo)
    verifier.update(`${jwtHeaderBase64url}.${jwtPayloadBase64url}`)
    const signatureIsValid = verifier.verify(jwtSignatureBase64url, 'base64url')
    if (!signatureIsValid) throw new ForbiddenError('Signature is not valid')
    // Check the ACL (= does the subject have permission to enter this route?)
    // const subjAcl = accessProperty(subjProfile, SUB_ACL)

    // log.d(mod, fun, `subject: ${subject}, clientId: ${clientId}`)
    return { subject, clientId }
  } catch (err) {
    // log.w(mod, fun, err)
    const error = new ForbiddenError(`JWT is not a valid RUDI Producer JWT: ${err.message}`)
    throw RudiError.treatError(mod, fun, error)
  }
}

exports.isRudiProducerToken = (token) => {
  const fun = 'isRudiProducerToken'
  try {
    const jwtPayloadBase64url = token.split('.')[1]
    const jwtPayload = JSON.parse(decodeBase64url(jwtPayloadBase64url))
    return !!jwtPayload[REQ_MTD]
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
