'use strict'

const mod = 'sysConf'
// -----------------------------------------------------------------------------
// External dependecies
// -----------------------------------------------------------------------------
require('winston')

// -----------------------------------------------------------------------------
// Internal dependecies
// -----------------------------------------------------------------------------
const fa = require('../utils/fileActions')
const utils = require('../utils/jsUtils')

utils.separateLogs()

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
exports.DEFAULT_EXP = 6000

// -----------------------------------------------------------------------------
// Constants: user and local configuration
// -----------------------------------------------------------------------------
// Getting user conf file value
// if null, local conf file value
// if null , default value
const USER_CONF = fa.readIniFile(userConfFile)
const LOCAL_CONF = fa.readIniFile(defConfFile)

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------

// Get values from global constants
// -> gets user conf file value
//    if null get local conf file value
//    if null get default value
function getIniValue(section, field) {
  const userValue = utils.quietAccess(USER_CONF[section], field)
  const localValue = utils.quietAccess(LOCAL_CONF[section], field)

  if (userValue != utils.NOT_FOUND) return userValue
  if (localValue != utils.NOT_FOUND) return localValue
  return utils.NOT_FOUND
}

// -----------------------------------------------------------------------------
// Extracting and exporting sys configuration
// -----------------------------------------------------------------------------

// Server
exports.LISTENING_ADDR = getIniValue(SERVER_SECTION, _serverAddress)
exports.LISTENING_PORT = getIniValue(SERVER_SECTION, _serverPort)

// RUDI API server
const PROD_API_ADDR = getIniValue(PROD_API_SECTION, _prodApiAddress)
const PROD_API_PORT = getIniValue(PROD_API_SECTION, _prodApiPort)
exports.PROD_API_PREFIX = getIniValue(PROD_API_SECTION, _prodApiSuffix)
exports.PROD_API_SERVER = 'http://' + PROD_API_ADDR + ':' + PROD_API_PORT + '/' + this.PROD_API_PREFIX

// DB
exports.DB_NAME = getIniValue(DB_SECTION, _dbName)
const DB_URL_PREFIX = getIniValue(DB_SECTION, _dbUrl)
exports.DB_URL = `${DB_URL_PREFIX}${this.DB_NAME}`

// Logs
exports.APP_NAME = getIniValue(LOG_SECTION, _appName)
exports.LOG_DIR = getIniValue(LOG_SECTION, _logDir)
exports.LOG_FILE = getIniValue(LOG_SECTION, _logFileName)
exports.OUT_LOG = `${this.LOG_DIR}/${this.LOG_FILE}`
exports.SYMLINK_NAME = `${this.APP_NAME}-current.log`
exports.LOG_LVL = getIniValue(LOG_SECTION, _logLevel)
exports.LOG_EXP = getIniValue(LOG_SECTION, _expires)

// Security
const profileList = getIniValue(SECURITY_SECTION, _profiles)
exports.PROFILES = fa.readIniFile(profileList)
exports.EXP_TIME = getIniValue(SECURITY_SECTION, _expTime) || this.DEFAULT_EXP

exports.PUB_KEY = 'pub_key'
exports.PRV_KEY = 'prv_key'

const fun = 'export'
// const now = utils.nowLocaleFormatted()

utils.consoleLog(mod, fun, `APP_NAME: ${this.APP_NAME}`)
utils.consoleLog(mod, fun, `LISTENING_ADDR: ${this.LISTENING_ADDR}`)
utils.consoleLog(mod, fun, `LISTENING_PORT: ${this.LISTENING_PORT}`)
// utils.consoleLog(mod, fun, `OUT_LOG: ${this.OUT_LOG}`)
// utils.consoleLog(mod, fun, `LOG_LVL: ${this.LOG_LVL}`)
// utils.consoleLog(mod, fun, `LOG_EXP: ${this.LOG_EXP}`)
// utils.consoleLog(mod, fun, `DB_NAME: ${this.DB_NAME}`)
// utils.consoleLog(mod, fun, `DB_URL: ${this.DB_URL}`)

// console.log('OPTION: '+util.inspect(exports));

exports.getHost = () => `http://${this.LISTENING_ADDR}:${this.LISTENING_PORT}`

