'use strict'

const mod = 'redirect'

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------

import axios from 'axios'
const { delete: del, get, post, put } = axios

import { v4 as uuid4 } from 'uuid'

// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
import { SUFFIX_REDIRECT, URL_REDIRECT } from '../config/confApi.js'
import { APP_NAME, EXP_TIME, PROD_API_PREFIX, PROD_API_SERVER } from '../config/confSystem.js'
import { beautify, nowEpochS } from '../utils/jsUtils.js'
import { logD, logV, logW } from '../utils/logging.js'

import { AUTH, HEADERS } from '../config/headers.js'
import { BadRequestError, createRudiHttpError } from '../utils/errors.js'
import {
  JWT_CLIENT,
  JWT_EXP,
  JWT_ID,
  JWT_SUB,
  REQ_MTD,
  REQ_URL,
  createRudiApiToken,
} from './jwtController.js'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Redirection controllers
// -----------------------------------------------------------------------------
export async function redirectReq(req, reply) {
  const fun = 'redirectReq'
  try {
    logV(mod, fun, `< ${URL_REDIRECT}/:${SUFFIX_REDIRECT}`)

    // Extracting the parameters
    const method = req.context?.config?.method
    const redirectedUrlSuffix = req.raw?.url?.substring(URL_REDIRECT.length)
    const body = req.body
    logD(mod, fun, beautify(req.raw?.url))
    logD(mod, fun, beautify(redirectedUrlSuffix))

    const redirectUrl = PROD_API_SERVER + redirectedUrlSuffix
    const partialUrl = '/' + PROD_API_PREFIX + redirectedUrlSuffix
    logD(mod, fun, `redirected request: ${method} ${redirectUrl}`)

    // log.d(mod, fun, `body: ${body}`)

    const subject = req[HEADERS][JWT_SUB] || APP_NAME
    const clientId = req[HEADERS][JWT_CLIENT] || uuid4()

    // Forging the token with the final request
    const jwtPayload = {
      [JWT_EXP]: nowEpochS() + EXP_TIME,
      [JWT_ID]: uuid4(),
      [JWT_SUB]: subject,
      [JWT_CLIENT]: clientId,
      [REQ_MTD]: method,
      [REQ_URL]: partialUrl,
    }

    // Creating the header
    const reqOpts = {
      [HEADERS]: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
        [AUTH]: `Bearer ${createRudiApiToken(jwtPayload)}`,
      },
    }

    try {
      switch (method) {
        case 'GET':
        case 'get':
          return (await get(redirectUrl, reqOpts))?.data
        case 'DELETE':
        case 'delete':
        case 'DEL':
        case 'del':
          return (await del(redirectUrl, reqOpts))?.data
        case 'POST':
        case 'post':
          return (await post(redirectUrl, body, reqOpts))?.data
        case 'PUT':
        case 'put':
          return (await put(redirectUrl, body, reqOpts))?.data
        default:
          throw new BadRequestError(`Method unkown: ${method}`)
      }
    } catch (err) {
      if (err.response?.data) {
        const errData = err.response.data || err
        logW(
          mod,
          fun,
          `Error sending request ${method} ${redirectedUrlSuffix}: ${beautify(errData)}`
        )
        throw createRudiHttpError(errData.statusCode, errData.message)
      } else {
        logW(mod, fun, `Error sending request ${method} ${redirectedUrlSuffix}: ${err}`)
        throw err
      }
    }
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------
