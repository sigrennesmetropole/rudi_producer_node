'use strict'

const mod = 'custErr'

// ------------------------------------------------------------------------------------------------
// External dependencies
// ------------------------------------------------------------------------------------------------
const { nanoid } = require('nanoid')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const { beautify } = require('./jsUtils')
const log = require('./logging')
const { objectNotFound, parameterExpected } = require('./msg')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const { TRACE, STATUS_CODE, TRACE_MOD, TRACE_FUN, TRACE_ERR } = require('../config/confApi')

const DEFAULT_MESSAGE = 'Rudi producer node - API Server Error'
const IS_RUDI_ERROR = 'is_rudi_error'
const ERR_ID = 'errId'

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Custom http errors
// ------------------------------------------------------------------------------------------------
class RudiError extends Error {
  constructor(message, code, name, description, errTrace, ctxMod, ctxFun) {
    // const fun = 'RudiError()'
    // log.t(mod, fun, `${beautify(errTrace)}`)
    // const lastTrace = getLast(errTrace)
    // if (lastTrace) log.d(lastTrace.mod, lastTrace.fun, lastTrace.err)
    // else log.t(mod, fun, ``)
    super(message || DEFAULT_MESSAGE)
    this[IS_RUDI_ERROR] = true
    this[STATUS_CODE] = code || 500
    this.name = name || 'Internal Server Error'
    this.error = description || 'An unexpected error occured'
    this.type = this.constructor.name
    this[TRACE] = errTrace || []
    this.setId()
    this[TRACE_MOD] = ctxMod
    this[TRACE_FUN] = ctxFun
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

  addTrace(ctxMod, ctxFun, ctxErr) {
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
        log.w(mod, fun, `property '${TRACE}' not found`)
        return
      }
      errContext.map((previousErr) => {
        log.w(
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
    // log.d(ctxMod, ctxFun, beautify(ctxErr))
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

  static createRudiHttpError(code, message, ctxMod, ctxFun) {
    const fun = 'createRudiHttpError'
    try {
      log.d(mod, fun, `Error ${code}: ${message}`)
      switch (code) {
        case 400:
          return new BadRequestError(message, ctxMod, ctxFun)
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
  static treatError(ctxMod, ctxFun, error) {
    const fun = 'treatError'
    try {
      if (!error) throw new ParameterExpectedError('error', mod, fun)
      if (!ctxMod) throw new ParameterExpectedError('ctxMod', mod, fun)
      if (!ctxFun) throw new ParameterExpectedError('ctxFun', mod, fun)
      if (error.name === 'ValidationError') error[STATUS_CODE] = 400

      // log.d(mod, fun, `A) ${error} -> ${beautify(error)}`)
      if (!error[TRACE]) {
        error[TRACE] = []
      } else if (!Array.isArray(error[TRACE])) {
        log.w(mod, fun, beautify(error[TRACE]))
        throw new InternalServerError('Misuse of error trace')
      }
      const errTrace = error[TRACE].concat({
        [TRACE_MOD]: ctxMod,
        [TRACE_FUN]: ctxFun,
        [TRACE_ERR]: error.message || error,
      })

      const transmittedError = new RudiError(
        error.message || error,
        error[STATUS_CODE],
        error.name,
        error.error,
        errTrace,
        ctxMod,
        ctxFun
      )
      // log.d(mod, fun, error.isRudiError())

      // log.d(mod, fun, `B) ${error} -> ${beautify(transmittedError)}`)
      return transmittedError
    } catch (err) {
      // log.w(mod, fun, err)
      throw err
    }
  }

  // eslint-disable-next-line complexity
  static treatCommunicationError(ctxMod, ctxFun, portalError) {
    const fun = 'treatCommunicationError'
    log.t(mod, fun, ``)

    let error
    try {
      if (
        portalError.response &&
        portalError.response.data &&
        portalError.response.data.label &&
        portalError.response.data.code
      ) {
        log.d(mod, fun, `portal error code: ${beautify(portalError.response.data.code)}`)
        log.d(mod, fun, `portal error msg: ${beautify(portalError.response.data.label)}`)
        error = RudiError.createRudiHttpError(
          portalError.response.data.code,
          portalError.response.data.label
        )
      } else if (portalError.response && portalError.response.data) {
        if (portalError.response.data.status === 401) {
          log.d(mod, fun, `Portal error 401`)
          error = new UnauthorizedError('Credentials used for Portal are incorrect')
        } else {
          log.t(mod, fun, `Portal error data: ${beautify(portalError)}`)
          const errMsg =
            (portalError.response.data.path
              ? `Path '${portalError.response.data.path} `
              : undefined) +
            (portalError.response.data.error
              ? `${portalError.response.data.error}`
              : portalError.response.data)
          log.t(mod, fun, `Portal error msg: ${errMsg}`)
          error = RudiError.createRudiHttpError(
            portalError.response.data.status ? portalError.response.data.status : 500,
            errMsg
          )
        }
      } else if (portalError.message) {
        if (portalError.message === 'Request failed with status code 401') {
          log.t(mod, fun, `Portal error message 401: ${beautify(portalError)}`)
          error = new UnauthorizedError(portalError.message)
        } else if (portalError.message === 'Request failed with status code 403') {
          log.t(mod, fun, `Portal error message 403: ${beautify(portalError)}`)
          error = new ForbiddenError(portalError.message)
        } else {
          log.t(mod, fun, `Portal error message: ${beautify(portalError)}`)
          error = new RudiError(portalError.message)
        }
      } else {
        if (portalError.response) {
          log.t(mod, fun, `Portal error response: ${beautify(portalError)}`)
          error = new RudiError(portalError.response)
        } else {
          log.t(mod, fun, `Portal error: ${beautify(portalError)}`)
          if (portalError === 'Error 401: Request failed with status code 401') {
            error = new UnauthorizedError(portalError)
          } else if (portalError === 'Error 403: Request failed with status code 401') {
            error = new ForbiddenError(portalError)
          } else {
            error = new RudiError(portalError)
          }
        }
      }
      log.d(mod, fun, beautify(error))
      error.addTrace(ctxMod, ctxFun, portalError)
      return error
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }
}

class BadRequestError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 400, 'Bad request', 'The JSON is not valid', undefined, ctxMod, ctxFun)
  }
}

class UnauthorizedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      401,
      'Unauthorized',
      'The request requires an user authentication',
      undefined,
      ctxMod,
      ctxFun
    )
  }
}

class ForbiddenError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 403, 'Forbidden', 'The access is not allowed', undefined, ctxMod, ctxFun)
  }
}

class NotFoundError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 404, 'Not Found', 'The resource was not found', undefined, ctxMod, ctxFun)
  }
}

class ObjectNotFoundError extends NotFoundError {
  constructor(objectType, objectId, ctxMod, ctxFun) {
    super(`${objectNotFound(objectType, objectId)}`, undefined, ctxMod, ctxFun)
  }
}

class MethodNotAllowedError extends RudiError {
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

class NotAcceptableError extends RudiError {
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

class InternalServerError extends RudiError {
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

class ParameterExpectedError extends InternalServerError {
  constructor(param, ctxMod, ctxFun) {
    super(`${parameterExpected(ctxFun, param)}`, ctxMod, ctxFun)
  }
}

class NotImplementedError extends RudiError {
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

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------

module.exports = {
  RudiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ObjectNotFoundError,
  MethodNotAllowedError,
  NotAcceptableError,
  InternalServerError,
  ParameterExpectedError,
  NotImplementedError,
}
