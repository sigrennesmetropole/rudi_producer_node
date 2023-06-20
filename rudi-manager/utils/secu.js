// ----- External dependencies
const jwt = require('jsonwebtoken')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const { randomBytes, scryptSync } = require('crypto')
const jwtLib = require(`@aqmo.org/jwt_lib`)

// ----- Internal dependencies
const { getConf } = require('../config/config')
const { timeEpochS, toInt } = require('./utils')
const log = require('./logger')
const { ForbiddenError, RudiError } = require('./errors')
// const { compareSync } = require('bcrypt')
const { isDevEnv } = require('../config/backOptions')

// ----- Constants
const mod = 'jwt'

const REGEX_JWT = /^[\w-]+\.[\w-]+\.([\w-]+={0,3})$/

const OFFSET_USR_ID = 5000
const SECRET_KEY_JWT = getConf('auth', 'secret_key_jwt')
const DEFAULT_EXP = getConf('auth', 'exp_time_s') || 600
const MEDIA_AUTH = getConf('rudi_media')

exports.CONSOLE_TOKEN_NAME = 'consoleToken'
exports.PM_FRONT_TOKEN_NAME = 'pmFrontToken'

// ----- Functions
exports.extractCookieFromReq = (req, cookieName = this.CONSOLE_TOKEN_NAME) =>
  req?.cookies ? req.cookies[cookieName] : null

exports.extractJwtFromReq = (req) => {
  const fun = 'extractJwtFromReq'
  const headers = req?.headers || req?.Headers
  const auth = headers?.Authorization || headers?.authorization
  if (!auth) {
    log.d(mod, fun, `headers: ${headers}`)
    throw new ForbiddenError('No Authorization found in request headers')
  }
  if (!auth.startsWith('Bearer ')) return new ForbiddenError('Request should use a JWT')

  const token = auth.substring(7)
  if (token.length === 0) return new ForbiddenError('Request provided an empty JWT')
  return token
}

exports.readJwtBody = (jwt) => {
  if (!jwt) throw new ForbiddenError(`No JWT provided`, mod, 'readJwtBody')
  if (!`${jwt}`.match(REGEX_JWT)) throw new ForbiddenError(`Wrong format for token ${jwt}`)
  return jwtLib.tokenStringToJwtObject(jwt)?.payload
}

// Constants
const SHOULD_SECURE = !isDevEnv()

// Helper functions
exports.consoleCookieOpts = (exp) => {
  return {
    secure: SHOULD_SECURE,
    httpOnly: SHOULD_SECURE,
    sameSite: 'Strict',
    expires: new Date(exp * 1000),
  }
}

exports.pmFrontCookieOpts = (exp) => {
  return {
    secure: SHOULD_SECURE,
    httpOnly: false,
    sameSite: 'Strict',
    expires: new Date(exp * 1000),
  }
}

exports.createFrontUserTokens = (userInfo) => {
  const exp = timeEpochS(toInt(DEFAULT_EXP))
  // console.log('T (createFrontUserTokens) exp:', new Date(exp * 1000));
  // console.log('T (createFrontUserTokens) userInfo:', userInfo);
  delete userInfo?.password
  return {
    [this.CONSOLE_TOKEN_NAME]: jwt.sign({ user: userInfo, exp }, SECRET_KEY_JWT),
    [this.PM_FRONT_TOKEN_NAME]: jwt.sign({ roles: userInfo.roles, exp }, SECRET_KEY_JWT),
    exp,
  }
}

exports.refreshTokens = (req) => {
  const fun = 'renewTokens'
  const user = req.user
  if (!user) {
    log.sysWarn(mod, fun, 'No user found in req')
    return
  }
  // log.sysInfo(mod, fun, `Refreshing tokens for user '${user.username}'`)

  const { consoleToken, pmFrontToken, exp } = this.createFrontUserTokens(user)
  const consoleCookieOpts = Object.assign(this.consoleCookieOpts(exp), { overwrite: true })
  const pmFrontCookieOpts = Object.assign(this.pmFrontCookieOpts(exp), { overwrite: true })
  return {
    [this.CONSOLE_TOKEN_NAME]: { jwt: consoleToken, opts: consoleCookieOpts },
    [this.PM_FRONT_TOKEN_NAME]: { jwt: pmFrontToken, opts: pmFrontCookieOpts },
  }
}
exports.getTokenFromMediaForUser = async (user, exp) => {
  const fun = 'getTokenFromMediaForUser'
  const pmHeaders = this.createPmHeadersForMedia(exp ? { exp } : null)
  // console.log('T (getTokenFromMediaForUser) pmHeadersJwt', pmHeadersJwt);

  const delegationBody = {
    user_id: user.id,
    user_name: user.username || 'rudiconsole',
    group_name: getConf('rudi_console', 'default_client_group'),
  }
  // Let's offset the user id to not mess with Media ids
  if (delegationBody.user_id < OFFSET_USR_ID) delegationBody.user_id += OFFSET_USR_ID
  console.log('T (getTokenFromMediaForUser) delegationBody', delegationBody)

  const mediaForgeJwtUrl = `${MEDIA_AUTH.rudi_media_url}/jwt/forge`
  // console.log('T (getTokenFromMediaForUser) mediaForgeJwtUrl', mediaForgeJwtUrl);
  // console.log('T (getTokenFromMediaForUser) opts', opts);
  try {
    const mediaRes = await axios.post(mediaForgeJwtUrl, delegationBody, pmHeaders)
    if (!mediaRes) throw Error(`No answer received from Media module`)
    if (!mediaRes?.data?.token)
      throw new Error(`Unexpected response from Media while forging a token: ${mediaRes.data}`)
    else return mediaRes.data.token
  } catch (err) {
    console.error(
      'T (getTokenFromMediaForUser) mediaError.msg/data',
      err.message,
      err.response?.data
    )
    const rudiError = RudiError.createRudiHttpError(
      err.response?.data?.statusCode || err.response?.status,
      `Could not forge a token for user '${user.username}' on Media: ${
        err.response?.data?.message ||
        err.response?.data?.msg ||
        JSON.stringify(err.response?.data) ||
        err.message
      }`,
      mod,
      fun
    )

    log.e(mod, fun, `Could not forge a token on Media: ${rudiError}`)
    throw rudiError
  }
}

exports.createPmHeadersForMedia = (body) => {
  const pmHeadersJwt = this.createPmJwtForMedia(body)
  return {
    headers: {
      Authorization: `Bearer ${pmHeadersJwt}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }
}

exports.createPmJwtForMedia = (body) =>
  jwtLib.forgeToken(
    getPrvKey('media'),
    {},
    {
      jti: body?.jti || uuidv4(),
      iat: timeEpochS(),
      exp: body?.exp || timeEpochS(body?.exp_time || DEFAULT_EXP),
      sub: body?.sub || 'auth',
      client_id: body?.client_id || getConf('rudi_media', 'pm_media_id'),
    }
  )

/**
 *
 * @param {Object} jwtPayload optional options to create the JWT payload
 *  - exp: Epoch date in seconds until which the JWt is valid
 *  - exp_time: time in seconds during which the JWT is valid
 *              (not taken into account if 'exp' is given)
 *  - user_name: name of the user
 *  - user_id: id of the user
 *    (shifted here with an offset of 5000 to ensure compatibility with media)
 * @return {String} a JWT
 */
exports.createRudiMediaToken = (jwtPayload) =>
  jwtLib.forgeToken(
    getPrvKey('media'),
    {},
    {
      jti: uuidv4(),
      iat: timeEpochS(),
      exp:
        jwtPayload?.exp || timeEpochS(jwtPayload?.exp_time || MEDIA_AUTH.exp_time_s || DEFAULT_EXP),
      sub: jwtPayload?.sub || 'auth',
      client_id: jwtPayload.client_id || MEDIA_AUTH.pm_media_id,
    }
  )

exports.createRudiApiToken = (url, req) => {
  // console.log('T (createRudiApiToken) url JWT', axios.getUri({ url, params: req.query }))
  const jwt = jwtLib.forgeToken(
    getPrvKey('api'),
    {},
    {
      exp: timeEpochS(60), // 1 minute to reach the API should be plenty enough
      sub: getConf('rudi_api', 'pm_api_id'),
      req_mtd: req.method,
      req_url: axios.getUri({ url, params: req.query }),
    }
  )
  // console.log('T (createRudiApiToken) JWT', jwt)
  return jwt
}

/**
 * Shortcut to call a key by name
 * @param {*} name
 * @return {string} path to the key
 */
const getKeyPath = (name) => {
  switch (name) {
    case 'api':
      return getConf('rudi_api', 'pm_api_key') || getConf('auth', 'pm_prv_key')
    case 'media':
      return getConf('rudi_media', 'pm_media_key') || getConf('auth', 'pm_prv_key')
    default:
      return getConf('auth', 'pm_prv_key')
  }
}

const prvKeyCache = {}

/**
 * Access to local private keys
 * @param {string} name
 * @return {object} the private key
 */
const getPrvKey = (name) => {
  // Shortcuts
  switch (name) {
    case 'api':
    case 'api_key':
    case 'pm_api_key':
      name = 'api'
      break
    case 'media':
    case 'media_key':
    case 'pm_media_key':
      name = 'media'
      break
    default:
      name = 'auth'
  }
  // If PEM is cached, let's return it
  if (prvKeyCache[name]) return prvKeyCache[name]
  const keyPath = getKeyPath(name)
  prvKeyCache[name] = jwtLib.readPrivateKeyFile(keyPath)
  return prvKeyCache[name]
}
/*
const SALT_ROUNDS = 10
/**
 * Hash and salt a password before storing it into a DB
 * @param {String} password A password
 * @param {Boolean} isNotBase64 True of the password is not base64 encoded
 * @return {String} The salted passwrod
 *\/
exports.hashPasswordBcrypt = (password) => {
  const fun = 'hashPassword'
  try {
    const pwdStr = `${password}`
    if (pwdStr.startsWith('$')) {
      // console.debug('T (saltPassword) Already hashed pwd:', pwdStr);
      return pwdStr
    }
    const salt = genSaltSync(SALT_ROUNDS)
    const hashedPwd = hashSync(pwdStr, salt)
    // console.debug('T (saltPassword) hashed pwd:', hashedPwd);
    return hashedPwd
  } catch (e) {
    log.e(mod, fun, e)
    throw e
  }
}
*/

/**
 * Solution using crypto native library
 * Reworked from Malik-Bagwala & Shivam @ https://stackoverflow.com/a/70631147/1563072
 * @param {String} password
 * @param {String} salt
 * @returns {String} A base64 encoded salted & hashed password
 */
exports.encryptPassword = (password, salt) => scryptSync(password, salt, 64).toString('base64url')

/**
 * Hash the password with randomly generated salt
 * @param {String} password
 * @returns {String} A base64 encoded hash of the salt+password
 */
exports.hashPassword = (password) => {
  // Any random string here (ideally should be atleast 16 bytes)
  const salt = randomBytes(30).toString('base64url')
  return `${salt}${this.encryptPassword(password, salt)}`
}

/**
 * Compares a clear password to a hashed one.
 * @param {String} password
 * @param {String} hash
 * @returns {Boolean} True if the password matches the hash
 */
exports.matchPassword = (password, hash) =>
  hash.slice(40) === this.encryptPassword(password, hash.slice(0, 40))
// hash.startsWith('$2b$10$')
//   ? compareSync(password, hash)
//   :
