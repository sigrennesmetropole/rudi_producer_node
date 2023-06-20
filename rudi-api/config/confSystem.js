const mod = 'sysConf'
// -------------------------------------------------------------------------------------------------
// External dependecies
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  getAppOptions,
  getGitHash,
  OPT_USER_CONF,
  ENV_USER_CONF,
  OPT_API_URL,
} from './appOptions.js'
import { TRACE, TRACE_MOD, TRACE_FUN, TRACE_ERR } from './confApi.js'

// -------------------------------------------------------------------------------------------------
// Internal dependecies
// -------------------------------------------------------------------------------------------------
import { consoleLog, consoleErr, quietAccess, NOT_FOUND, separateLogs } from '../utils/jsUtils.js'
import { readIniFile } from '../utils/fileActions.js'

separateLogs('Loading sys conf', true) ///////////////////////////////////////////////////////////

// -------------------------------------------------------------------------------------------------
// Constants: local ini file configuration settings
// -------------------------------------------------------------------------------------------------
let CURRENT_APP_HASH

// -------------------------------------------------------------------------------------------------
// Display app options
// -------------------------------------------------------------------------------------------------
// if (utils.isNotEmptyObject(appOptions))
//   consoleLog(mod, 'commandLineOptions', utils.beautify(appOptions))

// -------------------------------------------------------------------------------------------------
// Extract environment variables
// -------------------------------------------------------------------------------------------------
const RUDI_API_USER_ENV = process.env[ENV_USER_CONF]

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------

// Conf files name
// - directory
const INI_DIR = './0-ini'
// - user conf path
const USER_CONF_FILE = getAppOptions(OPT_USER_CONF) || `${INI_DIR}/conf_custom.ini`
// consoleLog(mod, 'init', USER_CONF_FILE)
// - default conf path
const DEFT_CONF_FILE = `${INI_DIR}/conf_default.ini`

// -------------------------------------------------------------------------------------------------
// Constants: user and local configuration
// -------------------------------------------------------------------------------------------------
// Getting user conf file value
// if null, local conf file value
// if null , default value
const getUserConf = () => {
  const fun = 'getUserConf'
  try {
    consoleLog(
      mod,
      fun,
      getAppOptions(OPT_USER_CONF) ? 'cli' : `Conf file: ${RUDI_API_USER_ENV ? 'env' : 'ini'}`
    )
    return readIniFile(USER_CONF_FILE)
  } catch (err) {
    consoleErr(mod, fun, err)
    throw err
  }
}
const getLocalConf = () => {
  try {
    return readIniFile(DEFT_CONF_FILE)
  } catch (err) {
    consoleErr(mod, 'getLocalConf', err)
    throw err
  }
}

const USER_CONF = getUserConf()
const LOCAL_CONF = getLocalConf()

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------

// Get values from global constants
// -> gets user conf file value
//    if null get local conf file value
//    if null get default value
export const getIniValue = (section, field, defaultVal, customConf, defaultConf) => {
  try {
    const userConf = customConf ? customConf : USER_CONF
    const localConf = defaultConf ? defaultConf : LOCAL_CONF

    const userValue = quietAccess(userConf[section], field)
    const localValue = quietAccess(localConf[section], field)

    if (userValue != NOT_FOUND) return userValue
    if (localValue != NOT_FOUND) return localValue
    return typeof defaultVal === 'undefined' ? NOT_FOUND : defaultVal
  } catch (err) {
    consoleErr(mod, 'getIniValue', err)
    throw err
  }
}

// -------------------------------------------------------------------------------------------------
// Extracting and exporting sys configuration
// -------------------------------------------------------------------------------------------------

// ----- Flags section
const FLAGS_SECTION = 'flags'

const SHOULD_CONTROL_PRIVATE_REQUESTS = getIniValue(
  FLAGS_SECTION,
  'should_control_private_requests'
)
const SHOULD_CONTROL_PUBLIC_REQUESTS = getIniValue(FLAGS_SECTION, 'should_control_public_requests')

export const shouldControlPrivateRequests = () => SHOULD_CONTROL_PRIVATE_REQUESTS
export const shouldControlPublicRequests = () => SHOULD_CONTROL_PUBLIC_REQUESTS

// ----- Node Server section
const SERVER_SECTION = 'server'

const APP_NAME = getIniValue(SERVER_SECTION, 'app_name', 'rudiprod.api')
const LISTENING_ADDR = getIniValue(SERVER_SECTION, 'listening_address')
const LISTENING_PORT = getIniValue(SERVER_SECTION, 'listening_port')

const apiUrl = `${getAppOptions(OPT_API_URL) || getIniValue(SERVER_SECTION, 'server_url')}`
const API_URL = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl

export const getAppName = () => APP_NAME
export const getServerAddress = () => LISTENING_ADDR
export const getServerPort = () => LISTENING_PORT
export const getHost = (suffix) =>
  `http://${LISTENING_ADDR}:${LISTENING_PORT}${suffix ? suffix : ''}`

export const getApiUrl = (suffix) => `${API_URL}${suffix ? suffix : ''}`

// ----- DB section
const DB_SECTION = 'database'

const DB_NAME = getIniValue(DB_SECTION, 'db_name')
const DB_URL_PREFIX = getIniValue(DB_SECTION, 'db_url')
const DB_URL = `${DB_URL_PREFIX}${DB_NAME}`

export const getDbName = () => DB_NAME
export const getDbUrl = () => DB_URL

// ----- Security section
const SECURITY_SECTION = 'security'

const profilesConfFile = getIniValue(SECURITY_SECTION, 'profiles')
const PROFILES = readIniFile(profilesConfFile)

export const getProfile = (subject) => {
  if (!subject)
    throw { code: 403, name: 'Forbidden', message: `No subject provided for profile access` }
  if (!PROFILES[subject])
    throw { code: 403, name: 'Forbidden', message: `Profile not found for subject: ${subject}` }
  return PROFILES[subject]
}

// const now = utils.nowLocaleFormatted()
const appMsg = `App '${APP_NAME}' listening on: ${getHost()}`
consoleLog(mod, 'init', appMsg)
consoleLog(mod, 'init', `DB: ${DB_URL}`)

// ----- SKOSMOS section
const SKOSMOS_SECTION = 'skosmos'
const skosmosConfFile = getIniValue(SKOSMOS_SECTION, 'skosmos_conf')
let SKOSMOS_CONF
try {
  if (skosmosConfFile) SKOSMOS_CONF = readIniFile(skosmosConfFile)
} catch (e) {
  consoleErr(mod, 'skosmosConfFile', e)
}
export const getSkosmosConf = (prop) =>
  !SKOSMOS_CONF ? null : prop ? SKOSMOS_CONF[prop] : SKOSMOS_CONF

// -------------------------------------------------------------------------------------------------
// App ID
// -------------------------------------------------------------------------------------------------

/** @returns the git hash of the last time the app was launched */
export const getAppHash = () => {
  const fun = 'getCurrentAppId'
  try {
    if (!CURRENT_APP_HASH) CURRENT_APP_HASH = getGitHash()
    return CURRENT_APP_HASH
  } catch (err) {
    const error = new Error(`No git hash: ${err}`)
    error[TRACE] = [{ [TRACE_MOD]: mod, [TRACE_FUN]: fun, [TRACE_ERR]: err }]
    throw error
  }
}
