const { RudiError } = require('../utils/errors')
const log = require('../utils/logger')

const mod = 'errHandler'
const fun = ''

exports.error = (error, req, options) => {
  try {
    let errorToDisplay
    if (!error) return new RudiError(`Error was unidentified: ${error}`)
    // log.e(mod, fun, error);
    // log.e(mod, fun, error.response?.data);
    // log.e(mod, fun, error.response?.status);
    // log.e(mod, fun, error.response?.headers);
    let statusCode =
      error?.response?.data?.statusCode ||
      error?.response?.status ||
      error?.response?.statusCode ||
      error?.statusCode ||
      error?.status ||
      error?.code ||
      501
    if (statusCode === 'ERR_INVALID_URL') {
      console.error('T (errorHandler) err', error)
      statusCode = 404
    } else {
      statusCode = parseInt(statusCode)
      if (isNaN(statusCode)) statusCode = 500
    }
    options.statusCode = statusCode
    error.statusCode = statusCode
    console.error('T (errHandler) statusCode', statusCode)
    console.error('T (errHandler) error', error)
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      log.sysError(mod, fun, error.response?.data || error.response, log.getContext(req, options))

      errorToDisplay = error.toJSON()
      errorToDisplay.moreInfo = error.response?.data || error.response
    } else if (error.request) {
      errorToDisplay = error
    }
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    else {
      // Something happened in setting up the request that triggered an Error
      errorToDisplay = { message: error?.message || error, statusCode }
    }
    log.e(mod, fun, error?.message || error)
    log.sysError(mod, fun, error?.message || error, log.getContext(req, options))
    if( error?.config) log.e(mod, fun, error.config)

    return errorToDisplay
  } catch (err) {
    log.e(mod, fun, err)
    return { statusCode: 500, message: err, error: err }
  }
}
