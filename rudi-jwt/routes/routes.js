'use strict'

const {
  URL_JWT,
  URL_SUFFIX_FORGE,
  URL_SUFFIX_CHECK,
  URL_REDIRECT,
  SUFFIX_REDIRECT,
  URL_LOGS,
} = require('../config/confApi')
const { URL_PREFIX } = require('../config/confApi')
const { forgeToken, checkToken } = require('../handlers/jwtController')
const { getLogs, clearLogs } = require('../handlers/logController')
const { redirectReq } = require('../handlers/redirectController')

const mod = 'routes'

exports.privateRoutes = [
  // -----------------------------------------------------------------------------
  // JWT routes
  // -----------------------------------------------------------------------------
  /**
   * Ask for a JWT to access RUDI proxy API module with a given request
   */
  {
    method: 'POST',
    url: `${URL_JWT}/${URL_SUFFIX_FORGE}`,
    // preHandler: logRequest,
    handler: forgeToken,
  },
  /**
   * Simply test the JWT in the header
   */
  {
    method: 'GET',
    url: `${URL_JWT}/${URL_SUFFIX_CHECK}`,
    // preHandler: logRequest,
    handler: checkToken,
  },
  {
    method: 'POST',
    url: `${URL_JWT}/${URL_SUFFIX_CHECK}`,
    // preHandler: logRequest,
    handler: checkToken,
  },
  // -----------------------------------------------------------------------------
  // Redirections
  // -----------------------------------------------------------------------------
  /**
   * Re-route the GET request
   */
  {
    method: 'GET',
    url: `${URL_REDIRECT}/${SUFFIX_REDIRECT}`,
    // preHandler: logRequest,
    handler: redirectReq,
  },
  {
    method: 'POST',
    url: `${URL_REDIRECT}/${SUFFIX_REDIRECT}`,
    // preHandler: logRequest,
    handler: redirectReq,
  },
  {
    method: 'PUT',
    url: `${URL_REDIRECT}/${SUFFIX_REDIRECT}`,
    // preHandler: logRequest,
    handler: redirectReq,
  },
  {
    method: 'DELETE',
    url: `${URL_REDIRECT}/${SUFFIX_REDIRECT}`,
    // preHandler: logRequest,
    handler: redirectReq,
  },

  // -----------------------------------------------------------------------------
  // Logs
  // -----------------------------------------------------------------------------
  {
    method: 'GET',
    url: URL_LOGS,
    handler: getLogs,
  },
  {
    method: 'DELETE',
    url: URL_LOGS,
    handler: clearLogs,
  },
]
