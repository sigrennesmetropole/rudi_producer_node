'use strict'

const mod = 'confPortal'

// ------------------------------------------------------------------------------------------------
// Internal dependecies
// ------------------------------------------------------------------------------------------------
const utils = require('../utils/jsUtils')
const log = require('../utils/logging')
const { RudiError } = require('../utils/errors')
const { readIniFile } = require('../utils/fileActions')

// ------------------------------------------------------------------------------------------------
// Constants: Portal JWT properties
// ------------------------------------------------------------------------------------------------
exports.PARAM_TOKEN = 'token'
exports.FIELD_TOKEN = 'access_token'
exports.JWT_USER = 'user_name'

// ------------------------------------------------------------------------------------------------
// Constants: Portal configuration
// ------------------------------------------------------------------------------------------------
// Conf files
// - directory
const INI_DIR = './0-ini'
// - user conf path
const PORTAL_CONF_ENV = process.env.RUDI_API_PORTAL_CONF
const PORTAL_CUSTOM_CONF_FILE = PORTAL_CONF_ENV || `${INI_DIR}/portal_conf_custom.ini`
// - default conf path
const PORTAL_DEFT_CONF_FILE = `${INI_DIR}/portal_conf_default.ini`

// ------------------------------------------------------------------------------------------------
// Constants: user and local configuration
// ------------------------------------------------------------------------------------------------
// Getting user conf file value
// if null, local conf file value
// if null , default value
const getPortalCustomConf = () => {
  const fun = 'getPortalCustomConf'
  try {
    log.d(mod, fun, `Conf file: ${PORTAL_CONF_ENV ? 'env' : 'ini'}`)
    return readIniFile(PORTAL_CUSTOM_CONF_FILE)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
const getPortalDefaultConf = () => {
  try {
    return readIniFile(PORTAL_DEFT_CONF_FILE)
  } catch (err) {
    throw RudiError.treatError(mod, 'getPortalDefaultConf', err)
  }
}

const PORTAL_CUSTOM_CONF = getPortalCustomConf()
const PORTAL_LOCAL_CONF = getPortalDefaultConf()

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------
const getPortalIniValue = (section, field, defaultVal) => {
  try {
    const userValue = utils.quietAccess(PORTAL_CUSTOM_CONF[section], field)
    const localValue = utils.quietAccess(PORTAL_LOCAL_CONF[section], field)

    if (userValue != utils.NOT_FOUND) return userValue
    if (localValue != utils.NOT_FOUND) return localValue
    return typeof defaultVal === 'undefined' ? utils.NOT_FOUND : defaultVal
  } catch (err) {
    throw RudiError.treatError(mod, 'getPortalIniValue', err)
  }
}
// ------------------------------------------------------------------------------------------------
// Extracting and exporting sys configuration
// ------------------------------------------------------------------------------------------------
const PORTAL_SECTION = 'portal'

// ----- Auth
const AUTH_URL = getPortalIniValue(PORTAL_SECTION, 'auth_url')
const AUTH_GET = getPortalIniValue(PORTAL_SECTION, 'auth_get')
const AUTH_CHK = getPortalIniValue(PORTAL_SECTION, 'auth_chk')
const PUB_KEY_URL = getPortalIniValue(PORTAL_SECTION, 'auth_pub')

exports.getAuthUrl = () => `${AUTH_URL}/${AUTH_GET}`
exports.getCheckAuthUrl = () => `${AUTH_URL}/${AUTH_CHK}`
exports.getPortalPubKeyUrl = () => `${AUTH_URL}/${PUB_KEY_URL}`

// ----- Creds
const isPwdClear = getPortalIniValue(PORTAL_SECTION, 'is_pwd_clear')
const LOGIN = getPortalIniValue(PORTAL_SECTION, 'login')
const READ_PASSW = getPortalIniValue(PORTAL_SECTION, 'passw')
// utils.consoleLog(mod, 'readPortalConf',`READ_PASSW: ${READ_PASSW}` )
const PASSW_B64 = isPwdClear ? utils.toBase64(READ_PASSW) : READ_PASSW
// utils.consoleLog(mod, 'readPortalConf',`PASSW_B64: ${PASSW_B64}` )
const SHOULD_CONTROL_EXT_REQUESTS = getPortalIniValue(
  PORTAL_SECTION,
  'should_control_public_requests'
)

exports.getCredentials = () => [LOGIN, PASSW_B64]
exports.shouldControlExtRequest = () => SHOULD_CONTROL_EXT_REQUESTS

// ----- API
const API_PORTAL_URL = getPortalIniValue(PORTAL_SECTION, 'portal_url', false)
exports.isPortalConnectionDisabled = () => {
  return !API_PORTAL_URL
}

const API_GET_URL = getPortalIniValue(PORTAL_SECTION, 'get_url', '')
const API_SEND_URL = getPortalIniValue(PORTAL_SECTION, 'put_url', '')

exports.getPortalMetaUrl = (id) =>
  !id
    ? `${API_PORTAL_URL}/${API_GET_URL.replace('/{{id}}', '')}`
    : `${API_PORTAL_URL}/${API_GET_URL.replace('{{id}}', id)}`

exports.postPortalMetaUrl = (id) =>
  !id ? `${API_PORTAL_URL}/${API_SEND_URL}` : `${API_PORTAL_URL}/${API_SEND_URL}/${id}`

const apiGetUrlElements = this.getPortalMetaUrl().split('/')
const API_GET_PROTOCOL = apiGetUrlElements[0].replace(/:/, '')
const API_GET_PORT = this.API_GET_PROTOCOL === 'https' ? 443 : 80
const API_GET_HOST = apiGetUrlElements[2]
const API_GET_PATH = apiGetUrlElements.splice(3).join('/')

const apiSendUrlElements = this.postPortalMetaUrl().split('/')
const API_SEND_PROTOCOL = apiSendUrlElements[0].replace(/:/, '')
const API_SEND_PORT = API_SEND_PROTOCOL === 'https' ? 443 : 80
const API_SEND_HOST = apiSendUrlElements[2]
const API_SEND_PATH = apiSendUrlElements.splice(3).join('/')

// ----- API: Get

exports.apiGetOptions = (id) => {
  return {
    protocol: API_GET_PROTOCOL,
    hostname: API_GET_HOST,
    port: API_GET_PORT,
    path: API_GET_PATH?.replace(/{{id}}/, id),
  }
}

// ----- API: Send

exports.apiSendOptions = () => {
  return {
    protocol: API_SEND_PROTOCOL,
    hostname: API_SEND_HOST,
    port: API_SEND_PORT,
    path: API_SEND_PATH,
  }
}

// ----- Feedback
log.d(mod, '', `Portal - Data: '${API_PORTAL_URL}'`)
log.d(mod, '', `Portal - Auth: '${AUTH_URL}'`)
