const mod = 'custErr'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { nanoid } from 'nanoid'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
const DEFAULT_MESSAGE = 'Rudi producer node - API Server Error'
const IS_RUDI_ERROR = 'is_rudi_error'
const ERR_ID = 'errId'

import {
  ERR_PATH,
  STATUS_CODE,
  TRACE,
  TRACE_ERR,
  TRACE_FUN,
  TRACE_MOD,
} from '../config/constApi.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify, isArray } from './jsUtils.js'
import { logD, logT, logW } from './logging.js'
import { objectNotFound, parameterExpected } from './msg.js'

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Custom http errors
// -------------------------------------------------------------------------------------------------
export class RudiError extends Error {
  constructor(message, code, name, description, errTrace, ctxMod, ctxFun, path) {
    // const fun = 'RudiError()'
    // logT(mod, fun, `${beautify(errTrace)}`)
    // const lastTrace = getLast(errTrace)
    // if (lastTrace) logD(lastTrace.mod, lastTrace.fun, lastTrace.err)
    // else logT(mod, fun)
    super(message || DEFAULT_MESSAGE)
    this[IS_RUDI_ERROR] = true
    this[STATUS_CODE] = code || 500
    this.name = name || 'Internal Server Error'
    this.error = description || 'An unexpected error occurred'
    this.type = this.constructor.name
    this[TRACE] = errTrace || []
    this.setId()
    this[TRACE_MOD] = ctxMod
    this[TRACE_FUN] = ctxFun
    this[ERR_PATH] = path
  }

  toString() {
    return `Error ${this[STATUS_CODE]} (${this.name}): ${this.message}`
  }
  toJSON() {
    return {
      [STATUS_CODE]: this[STATUS_CODE],
      type: this.constructor.name,
      name: this.name,
      error: this.error,
      message: this.message,
      id: this.id,
    }
  }

  setId() {
    if (!this[ERR_ID]) this[ERR_ID] = nanoid(8)
  }
  get id() {
    return this[ERR_ID]
  }
  get code() {
    return this[STATUS_CODE]
  }
  addTrace(ctxMod, ctxFun, ctxErr) {
    if (!this[TRACE]) this[TRACE] = []
    this[TRACE].push({ [TRACE_MOD]: ctxMod, [TRACE_FUN]: ctxFun, [TRACE_ERR]: ctxErr })
  }
  get primeError() {
    return this[TRACE] ? this[TRACE][0] : this
  }
  static logErrorPile(error) {
    const fun = 'logErrorPile'
    try {
      const errContext = error[TRACE]
      if (!errContext) {
        logW(mod, fun, `property '${TRACE}' not found`)
        return
      }
      errContext.map((previousErr) => {
        logW(
          previousErr[TRACE_MOD],
          previousErr[TRACE_FUN],
          previousErr[TRACE_ERR].message || previousErr[TRACE_ERR]
        )
      })
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  static isRudiError = (error) => error[IS_RUDI_ERROR] === true

  static createNewRudiError(error, ctxMod, ctxFun) {
    // logD(ctxMod, ctxFun, beautify(ctxErr))
    if (!error[TRACE]) error[TRACE] = []
    const errTrace = error[TRACE].concat({
      [TRACE_MOD]: ctxMod,
      [TRACE_FUN]: ctxFun,
      [TRACE_ERR]: error.message || error,
    })

    return new RudiError(
      error.message || error,
      error[STATUS_CODE],
      error.name,
      error.error,
      errTrace,
      ctxMod,
      ctxFun
    )
  }

  static createRudiHttpError(code, message, ctxMod, ctxFun, path) {
    const fun = 'createRudiHttpError'
    try {
      logD(mod, fun, `Error ${code}: ${message}`)
      switch (parseInt(code)) {
        case 400:
          return new BadRequestError(message, ctxMod, ctxFun, path)
        case 401:
          return new UnauthorizedError(message, ctxMod, ctxFun)
        case 403:
          return new ForbiddenError(message, ctxMod, ctxFun)
        case 404:
          return new NotFoundError(message, ctxMod, ctxFun)
        case 405:
          return new MethodNotAllowedError(message, ctxMod, ctxFun)
        case 406:
          return new NotAcceptableError(message, ctxMod, ctxFun)
        case 501:
          return new NotImplementedError(message, ctxMod, ctxFun)
        case 500:
        default:
          return new InternalServerError(message, ctxMod, ctxFun)
      }
    } catch (err) {
      // consoleErr(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  /**
   * Function used to aggregate errors in an error pile.
   * @param {string} error error message
   * @param {*} errLocation error location (mod: module/file, fun: function)
   * @returns
   */
  static treatError(ctxMod, ctxFun, error, path) {
    const fun = 'treatError'
    try {
      if (!ctxMod) throw new ParameterExpectedError('ctxMod', mod, fun)
      if (!ctxFun) throw new ParameterExpectedError('ctxFun', mod, fun)
      if (!error) throw new ParameterExpectedError('error', mod, fun)
      if (error.name === 'ValidationError') error[STATUS_CODE] = 400

      // logD(mod, fun, `A) ${error} -> ${beautify(error)}`)
      if (!error[TRACE]) {
        error[TRACE] = []
      } else if (!Array.isArray(error[TRACE])) {
        logW(mod, fun, beautify(error[TRACE]))
        throw new InternalServerError('Misuse of error trace')
      }
      const errTrace = error[TRACE].concat({
        [TRACE_MOD]: ctxMod,
        [TRACE_FUN]: ctxFun,
        [TRACE_ERR]: error.message || error,
      })

      const transmittedError = new RudiError(
        error.message || error,
        error[STATUS_CODE] || error.code,
        error.name,
        error.error,
        errTrace,
        ctxMod,
        ctxFun,
        path || error.path
      )
      // logD(mod, fun, error.isRudiError())
      if (transmittedError[STATUS_CODE] > 600) transmittedError[STATUS_CODE] = 500
      // logD(mod, fun, `B) ${error} -> ${beautify(transmittedError)}`)
      return transmittedError
    } catch (err) {
      logW(mod, fun, err)
      throw err
    }
  }

  // eslint-disable-next-line complexity
  static treatCommunicationError(ctxMod, ctxFun, comError, errPrefix) {
    const fun = 'treatCommunicationError'
    try {
      logT(mod, fun)

      let error
      const errFlag = `${errPrefix ? errPrefix + ' ' : ''}`
      // logD(mod, fun, `message: ${comError.message}`)
      // logD(mod, fun, `name: ${comError.name}`)
      // // logD(mod, fun, `config: ${beautify(comError.config)}`)
      // logD(mod, fun, `status: ${JSON.parse(JSON.stringify(comError)).status}`)
      // logD(mod, fun, JSON.parse(JSON.stringify(comError)).status)
      // logD(mod, fun, `data: ${beautify(comError.response?.data)}`)

      // logW(mod, fun, beautify(comError.response))

      // logD(mod, fun, `comError.status : ${comError.status}`)
      // // logD(mod, fun, `comError.status : ${JSON.parse(beautify(comError)).status}`)
      // logD(mod, fun, `comError.response.status : ${comError.response?.status}`)
      // logD(mod, fun, `comError.response?.data?.code : ${comError.response?.data?.code}`)
      // logD(mod, fun, `comError.code : ${comError.code}`)
      // logD(mod, fun, `comError.response?.data?.status : ${comError.response?.data?.status}`)

      const errCode =
        parseInt(
          comError.response?.data?.code ||
            comError.status ||
            comError.response?.status ||
            comError.code ||
            comError.statusCode ||
            comError.response?.data?.status ||
            JSON.parse(JSON.stringify(comError)).status
        ) || (comError.code == 'ENOTFOUND' ? 404 : 0)

      // logD(mod, fun, `${errFlag}error code: ${errCode}`)

      // logD(mod, fun, `response?.data?.label : ${comError.response?.data?.label}`)
      // logD(mod, fun, `message : ${comError.message}`)
      // logD(mod, fun, `data?.message : ${comError.data?.message}`)

      const errMessage = `${
        comError.response?.data?.label || comError.message || comError.data?.message
      }`

      logW(mod, fun, beautify(errMessage))

      if (errCode && errMessage) {
        // logT(mod, fun, beautify(errMessage))
        return RudiError.createRudiHttpError(errCode, errMessage)
      } else if (comError.response?.data) {
        const errData = comError.response.data
        if (errCode === 401) {
          logD(mod, fun, `${errFlag}error 401`)
          error = new UnauthorizedError('Credentials are incorrect')
        } else {
          logT(mod, fun, `${errFlag}error data: ${beautify(comError)}`)
          const errMsg = (errData.path ? `Path '${errData.path} ` : '') + (errData.error || errData)
          logT(mod, fun, `${errFlag}error msg: ${errMsg}`)
          error = RudiError.createRudiHttpError(errCode ? errCode : 500, errMsg)
        }
      } else if (comError.message) {
        const errMsg = comError.message
        if (errMsg.startsWith('Request failed with status code ')) {
          const errCode = `${errMsg}`.substring(32, 35)
          logT(mod, fun, `${errFlag}error message ${errCode}: ${beautify(comError)}`)
          error = RudiError.createRudiHttpError(errCode, errMsg)
        } else {
          logT(mod, fun, `${errFlag}error message: ${beautify(errMsg)}`)
          error = new RudiError(errMsg)
        }
      } else {
        if (comError.response) {
          logT(mod, fun, `${errFlag}error response: ${beautify(comError)}`)
          error = new RudiError(comError.response)
        } else {
          logT(mod, fun, `${errFlag}error: ${beautify(comError)}`)
          if (comError === 'Error 400: Request failed with status code 400') {
            error = new BadRequestError(comError)
          } else if (comError === 'Error 401: Request failed with status code 401') {
            error = new UnauthorizedError(comError)
          } else if (comError === 'Error 403: Request failed with status code 403') {
            error = new ForbiddenError(comError)
          } else {
            error = new RudiError(comError)
          }
        }
      }
      logD(mod, fun, beautify(error))
      error.addTrace(ctxMod, ctxFun, comError)
      return error
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }
}

export class BadRequestError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun, pathArray) {
    super(
      errMessage,
      400,
      'Bad request',
      'The JSON (or the request) is not valid',
      undefined,
      ctxMod,
      ctxFun,
      pathArray
    )
    if (pathArray && !isArray(pathArray)) {
      logW(ctxMod, ctxFun, `BadRequest constructor Error: 4th parameter should be an array`)
      this.path = [pathArray]
    }
  }
  toJSON() {
    return {
      [STATUS_CODE]: this[STATUS_CODE],
      type: this.constructor.name,
      name: this.name,
      error: this.error,
      message: this.message,
      id: this.id,
      path: this.path,
    }
  }

  toString() {
    return `Error ${this[STATUS_CODE]} (${this.name}): ${this.message} [${this.path}]`
  }
}

export class UnauthorizedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      401,
      'Unauthorized',
      'The request requires a user authentication',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}

export class ForbiddenError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 403, 'Forbidden', 'The access is not allowed', undefined, ctxMod, ctxFun)
  }
}

export class NotFoundError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 404, 'Not Found', 'The resource was not found', undefined, ctxMod, ctxFun)
  }
}

export class ObjectNotFoundError extends NotFoundError {
  constructor(objectType, objectId, ctxMod, ctxFun) {
    super(`${objectNotFound(objectType, objectId)}`, ctxMod, ctxFun)
  }
}

export class MethodNotAllowedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      405,
      'Method Not Allowed',
      'Request method is not supported for the requested resource',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}

export class NotAcceptableError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      406,
      'Not Acceptable',
      'Headers sent in the request are not compatible with the service',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}

export class InternalServerError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      500,
      'Internal Server Error',
      'Internal Server Error',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}

export class ParameterExpectedError extends InternalServerError {
  constructor(param, ctxMod, ctxFun) {
    super(`${parameterExpected(ctxFun, param)}`, ctxMod, ctxFun)
  }
}

export class ConfigurationError extends RudiError {
  constructor(param, fileName, ctxMod, ctxFun) {
    super(
      `The parameter '${param}' is incorrectly set in file '${fileName}'`,
      500,
      'Configuration Error',
      'Configuration Error',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}

export class NotImplementedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      501,
      'Not Implemented',
      'The server does not support the functionality required to fulfill the request',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}
