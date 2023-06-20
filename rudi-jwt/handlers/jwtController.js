'use strict'

const mod = 'jwtCtrl'

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------
const { readFileSync } = require('fs')
const { v4: uuidv4 } = require('uuid')

var crypto = require('crypto')

const { parseKey, parsePrivateKey } = require('sshpk')

// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
const log = require('../utils/logging')

const { PRV_KEY, PUB_KEY, PROFILES, DEFAULT_EXP } = require('../config/confSystem')
const {
  beautify,
  isEmptyObject,
  toBase64url,
  decodeBase64url,
  convertEncoding,
  nowEpochS,
  dateEpochSToIso,
  nowISO,
  accessProperty,
} = require('../utils/jsUtils')
const { NotFoundError, UnauthorizedError, BadRequestError } = require('../utils/errors')
const { AUTH, HEADERS, AUTH_LOW } = require('../config/headers')

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// norm : https://www.iana.org/assignments/jwt/jwt.xhtml
exports.JWT_ID = 'jti' // https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.7
exports.JWT_EXP = 'exp' // Expiration Time https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4
exports.JWT_SUB = 'sub' // Subject https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.2
exports.JWT_IAT = 'iat' // Issued At https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.6
exports.JWT_CLIENT = 'client_id' // https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2

exports.REQ_MTD = 'req_mtd'
exports.REQ_URL = 'req_url'

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
        throw new BadRequestError(`Algo not recognized: '${algo}'`)
    }
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}

/**
 * Hash algo to be used to sign the JWT
 * @param {String} algo
 * @returns
 */
exports.getHashAlgo = (algo) => {
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
        throw BadRequestError(`Algo not recognized: '${algo}'`)
    }
  } catch (err) {
    log.w(mod, fun, err)
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
exports.forgeToken = async (req, reply) => {
  const fun = 'forgeToken'
  log.d(mod, fun, ``)
  try {
    const jwtPayload = req.body
    const jwt = this.createRudiApiToken(jwtPayload)
    return jwt
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}

exports.createRudiApiToken = (jwtPayload) => {
  const fun = 'createRudiApiToken'
  log.d(mod, fun, ``)
  try {
    if (!jwtPayload || isEmptyObject(jwtPayload))
      throw new BadRequestError(`Incoming JSON should not be null`)

    // Identifying the requester asking for a token
    const subject = jwtPayload[this.JWT_SUB]
    if (!subject) throw new BadRequestError(`No ID was found for the requester (property '${this.JWT_SUB}')`)

    const keyInfo = getKeyInfo(subject)
    const keyType = keyInfo[KTYP]
    const prvKey = keyInfo[PRVK]
    log.d(mod, fun, `prv: ${prvKey.comment}`)

    // Building the JWT header
    const jwtAlgo = this.getJwtAlgo(keyType)
    const jwtHeader = {
      typ: 'JWT', // (optional)
      alg: jwtAlgo,
    }

    // Adjusting the JWT payload
    if (!jwtPayload[this.JWT_IAT]) jwtPayload[this.JWT_IAT] = nowEpochS()
    if (!jwtPayload[this.JWT_EXP]) jwtPayload[this.JWT_EXP] = DEFAULT_EXP

    // Setting an ID to the JWT, if needed
    if (!jwtPayload[this.JWT_ID]) jwtPayload[this.JWT_ID] = uuidv4()

    // Building the data to sign
    const headerBase64url = toBase64url(JSON.stringify(jwtHeader))
    const payloadBase64url = toBase64url(JSON.stringify(jwtPayload))
    const data = headerBase64url + '.' + payloadBase64url

    // Building the JWT signature
    const hashAlgo = this.getHashAlgo(keyType)
    log.d(mod, fun, `hash algo: ${hashAlgo}`)

    // ==> Replacing with Crypto lib!
    const cryptoSignVerifier = crypto.createSign(hashAlgo)
    if (!cryptoSignVerifier) throw UnauthorizedError('Failed to create crypto verifier')

    // prvKey

    // <== Replacing with Crypto lib!

    const signBuffer = prvKey.createSign(hashAlgo)
    signBuffer.update(data)
    const signatureBase64 = signBuffer.sign()
    const signatureBase64url = convertEncoding(signatureBase64.toString(), 'base64', 'base64url')
    // log.d(mod, fun, `base64url signature: ${signatureBase64url}`)

    // Building the final JWT
    const jwt = data + '.' + signatureBase64url
    return jwt
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}

const KEYS = {}
const KTYP = 'ktyp'
const PRVK = 'prvk'
const PUBK = 'pubk'

/**
 * Returns both the private key and the algo
 * @param {string} subject
 */
function getKeyInfo(subject) {
  const fun = 'getKeyInfo'
  try {
    // Retrieving stored info
    if (!!KEYS[subject]) return KEYS[subject]

    // Extracting info
    const subjectInfo = PROFILES[subject]
    if (!subjectInfo)
      throw new NotFoundError(
        `Subject '${subject}' not found in profiles: ${Object.keys(PROFILES)}`
      )
    const pubKeyPath = subjectInfo[PUB_KEY]
    if (!pubKeyPath)
      throw new NotFoundError(`Property ${PUB_KEY} not found in profiles for subject: '${subject}'`)
    const prvKeyPath = subjectInfo[PRV_KEY]
    if (!prvKeyPath)
      throw new NotFoundError(`Property ${PRV_KEY} not found in profiles for subject: '${subject}'`)

    // Identifying the (public) key type
    const pubKeyPem = readFileSync(pubKeyPath, 'ascii')
    const pubKey = parseKey(pubKeyPem)
    const keyType = pubKey.type
    log.d(mod, fun, `pub: ${keyType}`)

    // Extracting the private key
    const prvKeyPem = readFileSync(prvKeyPath, 'ascii')
    const prvKey = parsePrivateKey(prvKeyPem)

    // Storing key info
    const keyInfos = {
      [KTYP]: keyType,
      [PUBK]: pubKey,
      [PRVK]: prvKey,
    }
    KEYS[subject] = keyInfos
    return keyInfos
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}

exports.checkToken = async (req, reply) => {
  const fun = 'checkToken'
  log.d(mod, fun, ``)
  try {
    const method = req.routeConfig.method
    log.d(mod, fun, method)
    let token
    if (method.toUpperCase() == 'POST') token = req.body
    else {
      const header = accessProperty(req, HEADERS)
      let auth = header[AUTH] || header[AUTH_LOW]
      if (!auth)
        throw new UnauthorizedError(
          `Headers should include a JWT in the form '${AUTH}': Bearer <JWT>"`
        )

      token = auth.substring(7)
    }
    // log.d(mod, fun, token)
    const signIsValid = await this.verifyToken(token)
    const returnMsg = `JWT is ${signIsValid ? '' : 'in'}valid`
    log.d(mod, fun, returnMsg)
    return returnMsg
    // return 'ok'
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}

exports.verifyToken = async (token) => {
  const fun = 'verifyToken'
  log.d(mod, fun, `${token}`)

  try {
    const [jwtHeaderBase64url, jwtPayloadBase64url, jwtSignatureBase64url] = token.split('.')

    // Identify the signature hash algorithm from the JWT header alg property
    const jwtHeader = JSON.parse(decodeBase64url(jwtHeaderBase64url))
    log.d(mod, fun, `JWT algo: ${jwtHeader.alg}`)
    const hashAlgo = this.getHashAlgo(jwtHeader.alg)
    log.d(mod, fun, `hash algo: ${hashAlgo}`)

    // Check if the token is still valid
    const jwtPayload = JSON.parse(decodeBase64url(jwtPayloadBase64url))
    log.d(mod, fun , beautify(jwtPayload))
    const jwtExp = jwtPayload[this.JWT_EXP]
    if (!jwtExp) throw new BadRequestError(`JWT payload requires the property '${this.JWT_EXP}'`)
    if (nowEpochS() > jwtExp)
      throw new UnauthorizedError(
        `JWT expired: JWT expires after ${dateEpochSToIso(jwtExp)},now is ${nowISO()}`
      )

    // Identify the subject
    const subject = jwtPayload[this.JWT_SUB]
    if (!subject) throw new UnauthorizedError(`No ID was found for the requester (property '${this.JWT_SUB}')`)

    // Retrieve the public key
    const keyInfo = getKeyInfo(subject)
    const pubKey = keyInfo[PUBK]

    // Check the signature
    const verifier = pubKey.createVerify(hashAlgo)
    verifier.update(`${jwtHeaderBase64url}.${jwtPayloadBase64url}`)
    const signatureIsValid = verifier.verify(jwtSignatureBase64url, 'base64url')
    return signatureIsValid
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}
