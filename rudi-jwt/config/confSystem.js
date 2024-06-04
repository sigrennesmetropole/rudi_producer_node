'use strict'

const mod = 'sysConf'
// -----------------------------------------------------------------------------
// External dependecies
// -----------------------------------------------------------------------------
import 'winston'

// -----------------------------------------------------------------------------
// Internal dependecies
// -----------------------------------------------------------------------------
import { readIniFile } from '../utils/fileActions.js'
import { NOT_FOUND, consoleLog, quietAccess, separateLogs } from '../utils/jsUtils.js'

separateLogs()

// -----------------------------------------------------------------------------
// Constants: local ini file configuration settings
// -----------------------------------------------------------------------------

// Conf files
// - directory
const iniDir = './0-ini'
// - user conf path
const userConfFile = `${iniDir}/conf_custom.ini`
// - default conf path
const defConfFile = `${iniDir}/conf_default.ini`

// Node Server section
const SERVER_SECTION = 'server'
const _serverAddress = 'listening_address'
const _serverPort = 'listening_port'

// RUDI producer API module section
const PROD_API_SECTION = 'rudi_prod_api'
const _prodApiAddress = 'address'
const _prodApiPort = 'port'
const _prodApiSuffix = 'suffix'

// DB section
const DB_SECTION = 'database'

const _dbUrl = 'db_url'
const _dbName = 'db_name'
const _dbPort = 'db_port'

// Logs section
const LOG_SECTION = 'logging'

const _appName = 'app_name'
const _logDir = 'log_dir'
const _logFileName = 'log_file'
const _logLevel = 'log_level'
const _expires = 'expires'

// Security section
const SECURITY_SECTION = 'security'
const _profiles = 'profiles'
const _expTime = 'exp_time'
export const DEFAULT_EXP = 6000

// -----------------------------------------------------------------------------
// Constants: user and local configuration
// -----------------------------------------------------------------------------
// Getting user conf file value
// if null, local conf file value
// if null , default value
const USER_CONF = readIniFile(userConfFile)
const LOCAL_CONF = readIniFile(defConfFile)

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------

// Get values from global constants
// -> gets user conf file value
//    if null get local conf file value
//    if null get default value
function getIniValue(section, field) {
  const userValue = quietAccess(USER_CONF[section], field)
  const localValue = quietAccess(LOCAL_CONF[section], field)

  if (userValue != NOT_FOUND) return userValue
  if (localValue != NOT_FOUND) return localValue
  return NOT_FOUND
}

export const LISTENING_ADDR = getIniValue(SERVER_SECTION, _serverAddress)
export const LISTENING_PORT = getIniValue(SERVER_SECTION, _serverPort)

// RUDI API server
const PROD_API_ADDR = getIniValue(PROD_API_SECTION, _prodApiAddress)
const PROD_API_PORT = getIniValue(PROD_API_SECTION, _prodApiPort)
export const PROD_API_PREFIX = getIniValue(PROD_API_SECTION, _prodApiSuffix)
export const PROD_API_SERVER =
  'http://' + PROD_API_ADDR + ':' + PROD_API_PORT + '/' + PROD_API_PREFIX

export const DB_NAME = getIniValue(DB_SECTION, _dbName)
const DB_URL_PREFIX = getIniValue(DB_SECTION, _dbUrl)
export const DB_URL = `${DB_URL_PREFIX}${DB_NAME}`

export const APP_NAME = getIniValue(LOG_SECTION, _appName)
export const LOG_DIR = getIniValue(LOG_SECTION, _logDir)
export const LOG_FILE = getIniValue(LOG_SECTION, _logFileName)
export const OUT_LOG = `${LOG_DIR}/${LOG_FILE}`
export const SYMLINK_NAME = `${APP_NAME}-current.log`
export const LOG_LVL = getIniValue(LOG_SECTION, _logLevel)
export const LOG_EXP = getIniValue(LOG_SECTION, _expires)

// Security
const profileList = getIniValue(SECURITY_SECTION, _profiles)
export const PROFILES = readIniFile(profileList)
export const EXP_TIME = getIniValue(SECURITY_SECTION, _expTime) || DEFAULT_EXP

export const PUB_KEY = 'pub_key'
export const PRV_KEY = 'prv_key'

const fun = 'export'

consoleLog(mod, fun, `APP_NAME: ${APP_NAME}`)
consoleLog(mod, fun, `LISTENING_ADDR: ${LISTENING_ADDR}`)
consoleLog(mod, fun, `LISTENING_PORT: ${LISTENING_PORT}`)

export const getHost = () => `http://${LISTENING_ADDR}:${LISTENING_PORT}`
