'use strict'

const mod = 'errors'

// -----------------------------------------------------------------------------
// Http errors
// -----------------------------------------------------------------------------
const DEFAULT_MESSAGE = 'Rudi producer node - API Server Error'

class RudiHttpError extends Error {
  constructor(message, code, name, description) {
    super(message || DEFAULT_MESSAGE)
    this.statusCode = code || 500
    this.name = name || 'Internal Server Error'
    this.error = description || 'An unexpected error occured'
  }
  toString() {
    return `Error ${this.statusCode} (${this.name}): ${this.message}`
  }
  toJSON() {
    return {
      statusCode: this.statusCode,
      type: this.constructor.name,
      name: this.name,
      error: this.error,
      message: this.message,
    }
  }
}

class BadRequestError extends RudiHttpError {
  constructor(errMessage) {
    super(errMessage, 400, 'Bad request', 'The JSON is not valid')
  }
}

class UnauthorizedError extends RudiHttpError {
  constructor(errMessage) {
    super(errMessage, 401, 'Unauthorized', 'The request requires an user authentication')
  }
}

class ForbiddenError extends RudiHttpError {
  constructor(errMessage) {
    super(errMessage, 403, 'Forbidden', 'The access is not allowed')
  }
}

class NotFoundError extends RudiHttpError {
  constructor(errMessage) {
    super(errMessage, 404, 'Not Found', 'The resource was not found')
  }
}

class MethodNotAllowedError extends RudiHttpError {
  constructor(errMessage) {
    super(
      errMessage,
      405,
      'Method Not Allowed',
      'Request method is not supported for the requested resource'
    )
  }
}

class NotAcceptableError extends RudiHttpError {
  constructor(errMessage) {
    super(
      errMessage,
      406,
      'Not Acceptable',
      'Headers sent in the request are not compatible with the service'
    )
  }
}

class InternalServerError extends RudiHttpError {
  constructor(errMessage) {
    super(errMessage, 500, 'Internal Server Error', 'Internal Server Error')
  }
}

class NotImplementedError extends RudiHttpError {
  constructor(errMessage) {
    super(
      errMessage,
      501,
      'Not Implemented',
      'The server does not support the functionality required to fulfill the request'
    )
  }
}

function createRudiHttpError(code, message) {
  let err
  switch (code) {
    case 400:
      return new BadRequestError(message)
    case 401:
      return new UnauthorizedError(message)
    case 403:
      return new ForbiddenError(message)
    case 404:
      return new NotFoundError(message)
    case 405:
      return new MethodNotAllowedError(message)
    case 406:
      return new NotAcceptableError(message)
    case 501:
      return new NotImplementedError(message)
    case 500:
    default:
      return new InternalServerError(message)
  }
}

module.exports = {
  RudiHttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  NotAcceptableError,
  InternalServerError,
  NotImplementedError,
  createRudiHttpError,
}
