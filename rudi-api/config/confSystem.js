'use strict'

const mod = 'sysConf'

// ------------------------------------------------------------------------------------------------
// External dependecies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Internal dependecies
// ------------------------------------------------------------------------------------------------
const fa = require('../utils/fileActions')
const utils = require('../utils/jsUtils')
const { TRACE, TRACE_MOD, TRACE_FUN, TRACE_ERR } = require('./confApi')

utils.separateLogs()

// ------------------------------------------------------------------------------------------------
// Constants: local ini file configuration settings
// ------------------------------------------------------------------------------------------------
let CURRENT_APP_HASH

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

// Conf files name
// - directory
const INI_DIR = './0-ini'
// - user conf path
const RUDI_API_USER_ENV = process.env.RUDI_API_USER_CONF
const USER_CONF_FILE = RUDI_API_USER_ENV || `${INI_DIR}/conf_custom.ini`
// utils.consoleLog(mod, 'init', USER_CONF_FILE)
// - default conf path
const DEFT_CONF_FILE = `${INI_DIR}/conf_default.ini`

// ------------------------------------------------------------------------------------------------
// Constants: user and local configuration
// ------------------------------------------------------------------------------------------------
// Getting user conf file value
// if null, local conf file value
// if null , default value
const getUserConf = () => {
  const fun = 'getUserConf'
  try {
    utils.consoleLog(mod, fun, `Conf file: ${RUDI_API_USER_ENV ? 'env' : 'ini'}`)
    return fa.readIniFile(USER_CONF_FILE)
  } catch (err) {
    utils.consoleErr(mod, fun, err)
    throw err
  }
}
const getLocalConf = () => {
  try {
    return fa.readIniFile(DEFT_CONF_FILE)
  } catch (err) {
    utils.consoleErr(mod, 'getLocalConf', err)
    throw err
  }
}

const USER_CONF = getUserConf()
const LOCAL_CONF = getLocalConf()

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------

// Get values from global constants
// -> gets user conf file value
//    if null get local conf file value
//    if null get default value
exports.getIniValue = (section, field, defaultVal, customConf, defaultConf) => {
  try {
    const userConf = customConf ? customConf : USER_CONF
    const localConf = defaultConf ? defaultConf : LOCAL_CONF

    const userValue = utils.quietAccess(userConf[section], field)
    const localValue = utils.quietAccess(localConf[section], field)

    if (userValue != utils.NOT_FOUND) return userValue
    if (localValue != utils.NOT_FOUND) return localValue
    return typeof defaultVal === 'undefined' ? utils.NOT_FOUND : defaultVal
  } catch (err) {
    utils.consoleErr(mod, 'getIniValue', err)
    throw err
  }
}

// ------------------------------------------------------------------------------------------------
// Extracting and exporting sys configuration
// ------------------------------------------------------------------------------------------------

// ----- Flags section
const FLAGS_SECTION = 'flags'

const SHOULD_CONTROL_PRIVATE_REQUESTS = this.getIniValue(
  FLAGS_SECTION,
  'should_control_private_requests'
)
const SHOULD_CONTROL_PUBLIC_REQUESTS = this.getIniValue(
  FLAGS_SECTION,
  'should_control_public_requests'
)

exports.shouldControlPrivateRequests = () => SHOULD_CONTROL_PRIVATE_REQUESTS
exports.shouldControlPublicRequests = () => SHOULD_CONTROL_PUBLIC_REQUESTS

// ----- Node Server section
const SERVER_SECTION = 'server'

const APP_NAME = this.getIniValue(SERVER_SECTION, 'app_name', 'rudiprod.api')
const LISTENING_ADDR = this.getIniValue(SERVER_SECTION, 'listening_address')
const LISTENING_PORT = this.getIniValue(SERVER_SECTION, 'listening_port')

exports.getAppName = () => APP_NAME
exports.getServerAddress = () => LISTENING_ADDR
exports.getServerPort = () => LISTENING_PORT
exports.getHost = () => `http://${LISTENING_ADDR}:${LISTENING_PORT}`

// ----- DB section
const DB_SECTION = 'database'

const DB_NAME = this.getIniValue(DB_SECTION, 'db_name')
const DB_URL_PREFIX = this.getIniValue(DB_SECTION, 'db_url')
const DB_URL = `${DB_URL_PREFIX}${DB_NAME}`

exports.getDbName = () => DB_NAME
exports.getDbUrl = () => DB_URL

// ----- Security section
const SECURITY_SECTION = 'security'

const profilesConfFile = this.getIniValue(SECURITY_SECTION, 'profiles')
const PROFILES = fa.readIniFile(profilesConfFile)

exports.getProfile = (subject) => PROFILES[subject]

// const now = utils.nowLocaleFormatted()
const appMsg = `App '${APP_NAME}' listening on: ${this.getHost()}`
utils.consoleLog(mod, 'init', appMsg)
utils.consoleLog(mod, 'init', `DB: ${DB_URL}`)

// ------------------------------------------------------------------------------------------------
// App ID
// ------------------------------------------------------------------------------------------------

exports.getGitHash = () => {
  const fun = 'getGitHash'
  // log.t(mod, fun, ``)
  // log.d(mod, fun, ` GET ${URL_PV_GIT_HASH_ACCESS}`)
  try {
    let hashId = process.env.RUDI_API_GIT_REV

    if (!hashId) {
      hashId = require('child_process').execSync('git rev-parse --short HEAD')
      // log.d(mod, fun, utils.beautify(process.env))
    }
    return `${hashId}`.trim()
  } catch (err) {
    const error = new Error(`No git hash: ${err}`)
    error[TRACE] = [{ [TRACE_MOD]: mod, [TRACE_FUN]: fun, [TRACE_ERR]: err }]
    throw error
  }
}

/** @returns the git hash of the last time the app was launched */
exports.getAppHash = () => {
  const fun = 'getCurrentAppId'
  try {
    if (!CURRENT_APP_HASH) CURRENT_APP_HASH = this.getGitHash()
    return CURRENT_APP_HASH
  } catch (err) {
    const error = new Error(`No git hash: ${err}`)
    error[TRACE] = [{ [TRACE_MOD]: mod, [TRACE_FUN]: fun, [TRACE_ERR]: err }]
    throw error
  }
}
