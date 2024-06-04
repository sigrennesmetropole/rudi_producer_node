// ----- External dependencies
const jwt = require('jsonwebtoken')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const jwtLib = require(`@aqmo.org/jwt-lib`)

// ----- Internal dependencies
const { getConf } = require('../config/config')
const { timeEpochS, toInt, cleanErrMsg } = require('./utils')
const log = require('./logger')
const { ForbiddenError, RudiError } = require('./errors')
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
function isJwtValid(jwt) {
  if (!jwt) return false
  const jwtParts = jwtLib.tokenStringToJwtObject(jwt)
  return jwtParts?.payload?.exp > timeEpochS()
}

exports.extractCookieFromReq = (req, cookieName = this.CONSOLE_TOKEN_NAME) =>
  req?.cookies ? req.cookies[cookieName] : null

exports.readJwtBody = (jwt) => {
  if (!jwt) throw new ForbiddenError(`No JWT provided`, mod, 'readJwtBody')
  if (!RegExp(REGEX_JWT).exec(`${jwt}`)) throw new ForbiddenError(`Wrong format for token ${jwt}`)
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

  const delegationBody = {
    user_id: user.id,
    user_name: user.username || 'rudi_console',
    group_name: getConf('rudi_console', 'default_client_group'),
  }
  // Let's offset the user id to not mess with Media ids
  if (delegationBody.user_id < OFFSET_USR_ID) delegationBody.user_id += OFFSET_USR_ID
  // console.log(`T (${fun})`, 'delegationBody', delegationBody)

  const mediaForgeJwtUrl = `${MEDIA_AUTH.rudi_media_url}/jwt/forge`
  // log.d(mod, fun, `mediaForgeJwtUrl: ${mediaForgeJwtUrl}`)
  // log.d(mod, fun, `delegationBody: ${beautify(delegationBody)}`)
  // log.d(mod, fun, `pmHeaders: ${cleanErrMsg(pmHeaders)}`)
  try {
    const mediaRes = await axios.post(mediaForgeJwtUrl, delegationBody, pmHeaders)
    if (!mediaRes) throw Error(`No answer received from Media module`)
    if (!mediaRes?.data?.token)
      throw new Error(`Unexpected response from Media while forging a token: ${mediaRes.data}`)
    else return mediaRes.data.token
  } catch (err) {
    if (err.code == 'ECONNREFUSED')
      throw RudiError.createRudiHttpError(
        500,
        'Connection from “RUDI Prod Manager” to “RUDI Media” module failed: ' +
          '“RUDI Media” module is apparently down, contact the RUDI node admin'
      )
    const rudiError = RudiError.createRudiHttpError(
      err.response?.data?.statusCode || err.response?.status,
      `Could not forge a token for user '${user.username}' on Media: ${cleanErrMsg(
        err.response?.data?.message || err.response?.data?.msg || err.message || err.response?.data
      )}`,
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

let cachedApiJwt
exports.getRudiApiToken = () => {
  if (isJwtValid(cachedApiJwt)) return cachedApiJwt
  cachedApiJwt = jwtLib.forgeToken(
    getPrvKey('api'),
    {},
    {
      exp: timeEpochS(60), // 1 minute to reach the API should be plenty enough
      sub: getConf('rudi_api', 'pm_api_id'),
      req_mtd: 'all',
      req_url: 'all',
    }
  )
  return cachedApiJwt
}

let cachedUrlJwt = {}
exports.getRudiApiTokenPrecise = (url, req) => {
  if (isJwtValid(cachedUrlJwt?.[url])) return cachedUrlJwt[url]
  cachedUrlJwt[url] = jwtLib.forgeToken(
    getPrvKey('api'),
    {},
    {
      exp: timeEpochS(60), // 1 minute to reach the API should be plenty enough
      sub: getConf('rudi_api', 'pm_api_id'),
      req_mtd: req.method,
      req_url: axios.getUri({ url, params: req.query }),
    }
  )
  return cachedUrlJwt[url]
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
