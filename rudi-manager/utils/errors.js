/* eslint-disable require-jsdoc */

const STATUS_CODE = 'statusCode'

class RudiError extends Error {
  constructor(message, code, name, desc, ctxMod, ctxFun) {
    super(message)
    this[STATUS_CODE] = code || 500
    this.name = name
    this.description = desc
    this.ctxMod = ctxMod
    this.ctxFun = ctxFun
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
    }
  }

  get code() {
    return this[STATUS_CODE]
  }

  static createRudiHttpError(code, message, ctxMod, ctxFun) {
    try {
      switch (parseInt(code)) {
        case 400:
          return new BadRequestError(message, ctxMod, ctxFun)
        case 460:
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
      throw new Error(`Uncaught error during error creation: ${err}`)
    }
  }
}

class BadRequestError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 400, 'Bad request', 'The JSON (or the request) is not valid', ctxMod, ctxFun)
  }

  toString() {
    return `Error ${this[STATUS_CODE]} (${this.name}): ${this.message} [${this.path}]`
  }
}

class UnauthorizedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      401,
      'Unauthorized',
      'The request requires an user authentication',
      ctxMod,
      ctxFun
    )
  }
}

class ForbiddenError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 403, 'Forbidden', 'The access is not allowed', ctxMod, ctxFun)
  }
}

class NotFoundError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 404, 'Not Found', 'The resource was not found', ctxMod, ctxFun)
  }
}

class MethodNotAllowedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      405,
      'Method Not Allowed',
      'Request method is not supported for the requested resource',
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
      ctxMod,
      ctxFun
    )
  }
}

class InternalServerError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(errMessage, 500, 'Internal Server Error', 'Internal Server Error', ctxMod, ctxFun)
  }
}

class NotImplementedError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      501,
      'Not Implemented',
      'The server does not support the functionality required to fulfill the request',
      ctxMod,
      ctxFun
    )
  }
}

class ConnectionError extends RudiError {
  constructor(errMessage, ctxMod, ctxFun) {
    super(
      errMessage,
      503,
      'Connection Failed',
      'Connection failed, target server is unreachable. Contact the RUDI admin ',
      ctxMod,
      ctxFun
    )
  }
}

exports.statusOK = (message) => ({ status: 'OK', message })

exports.BadRequestError = BadRequestError
exports.UnauthorizedError = UnauthorizedError
exports.ForbiddenError = ForbiddenError
exports.NotFoundError = NotFoundError
exports.MethodNotAllowedError = MethodNotAllowedError
exports.NotAcceptableError = NotAcceptableError
exports.InternalServerError = InternalServerError
exports.ConnectionError = ConnectionError
exports.RudiError = RudiError
exports.STATUS_CODE = STATUS_CODE
