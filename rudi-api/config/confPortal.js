const mod = 'confPortal'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { NOT_FOUND, quietAccess, separateLogs, toBase64 } from '../utils/jsUtils.js'

import { ConfigurationError, RudiError } from '../utils/errors.js'

import { readIniFile } from '../utils/fileActions.js'
import { logD } from '../utils/logging.js'

separateLogs('Portal conf', true) ////////////////////////////////////////////////////////

// -------------------------------------------------------------------------------------------------
// Constants: Portal JWT properties
// -------------------------------------------------------------------------------------------------
export const PARAM_TOKEN = 'token'
export const FIELD_TOKEN = 'access_token'
export const JWT_USER = 'user_name'

export const NO_PORTAL_MSG = 'No portal connected'

// -------------------------------------------------------------------------------------------------
// Constants: Portal configuration
// -------------------------------------------------------------------------------------------------
// Conf files
// - directory
const INI_DIR = './0-ini'
// - user conf path
const PORTAL_CONF_ENV = process.env.RUDI_API_PORTAL_CONF
const PORTAL_CUSTOM_CONF_FILE = PORTAL_CONF_ENV || `${INI_DIR}/portal_conf_custom.ini`
// - default conf path
const PORTAL_DEFT_CONF_FILE = `${INI_DIR}/portal_conf_default.ini`

// -------------------------------------------------------------------------------------------------
// Constants: user and local configuration
// -------------------------------------------------------------------------------------------------
// Getting user conf file value
// if null, local conf file value
// if null , default value
const getPortalCustomConf = () => {
  const fun = 'getPortalCustomConf'
  try {
    logD(mod, fun, `Conf file: ${PORTAL_CONF_ENV ? 'env' : 'ini'}`)
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

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------
const getPortalIniValue = (section, field, defaultVal) => {
  try {
    const userValue = quietAccess(PORTAL_CUSTOM_CONF[section], field)
    const localValue = quietAccess(PORTAL_LOCAL_CONF[section], field)

    if (userValue != NOT_FOUND) return userValue
    if (localValue != NOT_FOUND) return localValue
    if (typeof defaultVal === 'undefined') {
      throw new ConfigurationError(`${section}.${field}`, PORTAL_CUSTOM_CONF_FILE)
    } else return defaultVal
  } catch (err) {
    throw RudiError.treatError(mod, 'getPortalIniValue', err)
  }
}
// -------------------------------------------------------------------------------------------------
// Extracting and exporting sys configuration
// -------------------------------------------------------------------------------------------------
const PORTAL_SECTION = 'portal'

// ----- Auth
const AUTH_URL = getPortalIniValue(PORTAL_SECTION, 'auth_url')
const AUTH_GET = getPortalIniValue(PORTAL_SECTION, 'auth_get')
const AUTH_CHK = getPortalIniValue(PORTAL_SECTION, 'auth_chk')
const JWT_PUB_KEY_URL = getPortalIniValue(PORTAL_SECTION, 'auth_pub')
const CRYPT_PUB_KEY_URL = getPortalIniValue(PORTAL_SECTION, 'encrypt_pub')

export const getAuthUrl = () => `${AUTH_URL}/${AUTH_GET}`
export const getCheckAuthUrl = () => `${AUTH_URL}/${AUTH_CHK}`
export const getPortalJwtPubKeyUrl = () => `${AUTH_URL}/${JWT_PUB_KEY_URL}`
export const getPortalCryptPubUrl = () => `${AUTH_URL}/${CRYPT_PUB_KEY_URL}`

// ----- Creds
const isPwdB64 = getPortalIniValue(PORTAL_SECTION, 'is_pwd_b64')
const LOGIN = getPortalIniValue(PORTAL_SECTION, 'login')
const READ_PASSW = getPortalIniValue(PORTAL_SECTION, 'passw')
// consoleLog(mod, 'readPortalConf',`READ_PASSW: ${READ_PASSW}` )
const PASSW_B64 =
  isPwdB64 == 1 ||
  `${isPwdB64}`.toLocaleLowerCase() === 'true' ||
  `${isPwdB64}`.toLocaleLowerCase() === 'yes'
    ? READ_PASSW
    : toBase64(READ_PASSW)
// consoleLog(mod, 'readPortalConf', `PASSW_B64: ${PASSW_B64}`)
const SHOULD_CONTROL_EXT_REQUESTS = getPortalIniValue(
  PORTAL_SECTION,
  'should_control_public_requests',
  false
)

export const getCredentials = () => [LOGIN, PASSW_B64]
export const shouldControlExtRequest = () => SHOULD_CONTROL_EXT_REQUESTS

// ----- API
const API_PORTAL_URL = PORTAL_CUSTOM_CONF?.[PORTAL_SECTION]?.portal_url
export const isPortalConnectionDisabled = () => !API_PORTAL_URL
export const getPortalBaseUrl = () => API_PORTAL_URL || NO_PORTAL_MSG

const API_GET_URL = getPortalIniValue(PORTAL_SECTION, 'get_url', '')
const API_SEND_URL = getPortalIniValue(PORTAL_SECTION, 'put_url', '')

export const getPortalMetaUrl = (id, additionalParameters) => {
  if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
  const reqUrl = !id
    ? `${API_PORTAL_URL}/${API_GET_URL.replace('/{{id}}', '')}`
    : `${API_PORTAL_URL}/${API_GET_URL.replace('{{id}}', id)}`
  const options = additionalParameters ? `?${additionalParameters}` : ''
  return `${reqUrl}${options}`
}
export const postPortalMetaUrl = (id) =>
  !id ? `${API_PORTAL_URL}/${API_SEND_URL}` : `${API_PORTAL_URL}/${API_SEND_URL}/${id}`

const apiGetUrlElements = getPortalMetaUrl().split('/')
const API_GET_PROTOCOL = apiGetUrlElements[0].replace(/:/, '')
const API_GET_PORT = API_GET_PROTOCOL === 'https' ? 443 : 80
const API_GET_HOST = apiGetUrlElements[2]
const API_GET_PATH = apiGetUrlElements.splice(3).join('/')

const apiSendUrlElements = postPortalMetaUrl().split('/')
const API_SEND_PROTOCOL = apiSendUrlElements[0].replace(/:/, '')
const API_SEND_PORT = API_SEND_PROTOCOL === 'https' ? 443 : 80
const API_SEND_HOST = apiSendUrlElements[2]
const API_SEND_PATH = apiSendUrlElements.splice(3).join('/')

// ----- API: Get

export const apiGetOptions = (id) => {
  return {
    protocol: API_GET_PROTOCOL,
    hostname: API_GET_HOST,
    port: API_GET_PORT,
    path: API_GET_PATH?.replace(/{{id}}/, id),
  }
}

// ----- API: Send

export const apiSendOptions = () => {
  return {
    protocol: API_SEND_PROTOCOL,
    hostname: API_SEND_HOST,
    port: API_SEND_PORT,
    path: API_SEND_PATH,
  }
}

// ----- Feedback
logD(mod, '', `Portal - Data: '${API_PORTAL_URL}'`)
logD(mod, '', `Portal - Auth: '${AUTH_URL}'`)
