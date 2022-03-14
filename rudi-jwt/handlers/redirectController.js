'use strict'

const mod = 'redirect'

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------

const { v4 } = require('uuid')
const axios = require('axios')

// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
const log = require('../utils/logging')
const { beautify, nowEpochS } = require('../utils/jsUtils')
const { SUFFIX_REDIRECT, URL_REDIRECT } = require('../config/confApi')
const { APP_NAME, PROD_API_SERVER, PROD_API_PREFIX, EXP_TIME } = require('../config/confSystem')

const {
  forgeToken,
  createRudiApiToken,
  JWT_SUB,
  JWT_EXP,
  JWT_ID,
  JWT_CLIENT,
  REQ_MTD,
  REQ_URL,
} = require('./jwtController')
const { createRudiHttpError, BadRequestError } = require('../utils/errors')
const { HEADERS, AUTH } = require('../config/headers')

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Redirection controllers
// -----------------------------------------------------------------------------
exports.redirectReq = async (req, reply) => {
  const fun = 'redirectReq'
  try {
    log.v(mod, fun, `< ${URL_REDIRECT}/:${SUFFIX_REDIRECT}`)

    // Extracting the parameters
    const method = req.context.config.method
    const url = req.raw.url
    const redirectedUrlSuffix = req.raw.url.substring(URL_REDIRECT.length)
    const body = req.body
    log.d(mod, fun, beautify(req.raw.url))
    log.d(mod, fun, beautify(redirectedUrlSuffix))

    const redirectUrl = PROD_API_SERVER +  redirectedUrlSuffix
    const partialUrl = '/' + PROD_API_PREFIX +  redirectedUrlSuffix
    log.d(mod, fun, `redirected request: ${method} ${redirectUrl}`)

    // log.d(mod, fun, `body: ${body}`)

    const subject = req[HEADERS][JWT_SUB] || APP_NAME
    const clientId = req[HEADERS][JWT_CLIENT] || v4()

    // Forging the token with the final request
    const jwtPayload = {
      [JWT_EXP]: nowEpochS() + EXP_TIME,
      [JWT_ID]: v4(),
      [JWT_SUB]: subject,
      [JWT_CLIENT]: clientId,
      [REQ_MTD]: method,
      [REQ_URL]: partialUrl,
    }
    const jwt = createRudiApiToken(jwtPayload)
    // log.d(mod, fun, `jwt: ${jwt}`)

    // Creating the header
    const reqOpts = {
      [HEADERS]: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
        [AUTH]: `Bearer ${jwt}`,
      },
    }

    let answer
    try {
      switch (method) {
        case 'GET':
        case 'get':
          // log.d(mod, fun, `reqOpts: ${beautify(reqOpts)}`)
          const answer = await axios.get(redirectUrl, reqOpts)
          // log.d(mod, fun, `answer: ${beautify(answer.data)}`)
          return answer.data
        case 'DELETE':
        case 'delete':
        case 'DEL':
        case 'del':
          answer = await axios.delete(redirectUrl, reqOpts)
          // log.d(mod, fun, `answer: ${beautify(answer.data)}`)
          return answer.data
        case 'POST':
        case 'post':
          answer = await axios.post(redirectUrl, body, reqOpts)
          // log.d(mod, fun, `answer: ${beautify(answer.data)}`)
          return answer.data
        case 'PUT':
        case 'put':
          answer = await axios.put(redirectUrl, body, reqOpts)
          // log.d(mod, fun, `answer: ${beautify(answer.data)}`)
          return answer.data

        default:
          throw new BadRequestError(`Method unkown: ${method}`)
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const errData = err.response ? err.response.data : err
        log.w(mod, fun, `Error sending request ${method} ${redirectedUrlSuffix}: ${beautify(errData)}`)
        const rudiHttpError  = createRudiHttpError(errData.statusCode, errData.message)
        throw rudiHttpError
      } else {
        log.w(mod, fun, `Error sending request ${method} ${redirectedUrlSuffix}: ${err}`)
        throw err
      }
    }

    return 'ok'
  } catch (err) {
    log.w(mod, fun, err)
    throw err
  }
}

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------
async function redirect(httpMethod, urlSuffix, body) {}
