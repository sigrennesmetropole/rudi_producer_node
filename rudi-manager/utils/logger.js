// External dependencies
const rudiLogger = require('@aqmo.org/rudi_logger')

// Internal dependencies
const { getConf } = require('../config/config')
const { getBackOptions, OPT_GIT_HASH } = require('../config/backOptions')
const { nowFormatted } = require('./utils')

// Constants
const APP_NAME = getConf('logging', 'app_name')

// Helper functions

/**
 * build ips array from the request
 * @param {*} req Request
 * @return {Array} Array of ip and redirections
 */
function extractIpRedirections(req) {
  const headers = req.headers
  if (!headers) return []
  const redirections = headers['x-forwarded-for'] || headers['X-Forwarded-For']
  let result = []
  if (Array.isArray(redirections)) {
    result = redirections
  }
  if (typeof redirections === 'string') {
    result = redirections.split(',')
  }
  return result
}
/**
 * build the logger option object
 * @return {Object} option for the logger
 */
function getRudiLoggerOptions() {
  let facility = 20
  if (getConf('syslog', 'syslog_facility').substr(0, 5) == 'local') {
    facility = 16 + Number(getConf('syslog', 'syslog_facility').substr(5, 1))
  }
  let transports = 2
  let path = getConf('syslog', 'syslog_host')
  switch (getConf('syslog', 'syslog_protocol')) {
    case 'tcp':
      transports = 1
      break
    case 'udp':
      transports = 2
      break
    case 'unix':
      transports = 4
      path = getConf('syslog', 'syslog_socket')
      break
  }
  const rudiLoggerOpts = {
    log_server: {
      path: path,
      port: getConf('syslog', 'syslog_port'),
      facility: facility,
      transport: transports,
    },
  }

  rudiLoggerOpts.log_local = {
    console: true,
    consoleData: false,
    directory: getConf('logging', 'log_dir'),
    prefix: 'rudiProd.manager.syslog',
  }
  return rudiLoggerOpts
}

const syslog = new rudiLogger.RudiLogger(
  APP_NAME,
  getBackOptions(OPT_GIT_HASH),
  getRudiLoggerOptions()
)

const rplog = function (logLevel, srcMod, srcFun, msg, context) {
  const Severity = rudiLogger.Severity
  let severity = Severity.Critical
  const message = displayStr(srcMod, srcFun, msg)
  switch (logLevel) {
    case 'error':
      severity = Severity.Error
      break
    case 'warn':
      severity = Severity.Warning
      break
    case 'info':
      severity = Severity.Info
      break
    case 'verbose':
      severity = Severity.Notice
      break
    case 'debug':
      severity = Severity.Debug
      break
  }
  let ctx = undefined
  if (!!context) {
    ctx = {
      subject: context.subject,
      req_ip: context.ip,
      client_id: context.id,
    }
  }
  syslog.log(severity, message, '', ctx)
}

// END RUDILOGGER configuration

const noCycle = () => {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }
}
const logWhere = (srcMod, srcFun) => {
  return !srcMod ? srcFun : !srcFun ? srcMod : `${srcMod} . ${srcFun}`
}

const displayStr = (srcMod, srcFun, msg) => {
  return `[ ${logWhere(srcMod, srcFun)} ] ${msg !== '' ? JSON.stringify(msg, noCycle()) : '<-'}`
}
const createLogLine = (level, srcMod, srcFun, msg) => {
  return `${nowFormatted()} ${level} ${displayStr(srcMod, srcFun, msg)}`
}

// Controllers
exports.getContext = (req, options = {}) => {
  const ctx = {}
  if (!req) {
    ctx.auth = {
      userId: '',
      clientApp: APP_NAME,
      reqIP: [],
    }
  } else {
    ctx.auth = {
      userId: req.user ? req.user.id : '',
      clientApp: APP_NAME,
      reqIP: [req.ip, ...extractIpRedirections(req)],
    }
  }

  ctx.operation = {
    opType: options.opType || 'other',
    statusCode: options.statusCode || '',
    id: options.id || '',
  }
  return ctx
}

exports.e = (srcMod, srcFun, msg, context) => {
  console.error(createLogLine('error', srcMod, srcFun, msg))
  this.sysWarn(srcMod, srcFun, msg, context)
}

exports.w = (srcMod, srcFun, msg) => {
  console.warn(createLogLine('warn', srcMod, srcFun, msg))
}

exports.i = (srcMod, srcFun, msg, context) => {
  console.info(createLogLine('info', srcMod, srcFun, msg))
  this.sysInfo(srcMod, srcFun, msg, context)
}

exports.v = (srcMod, srcFun, msg) => {
  console.log(createLogLine('verbose', srcMod, srcFun, msg))
}

exports.d = (srcMod, srcFun, msg) => {
  console.debug(createLogLine('debug', srcMod, srcFun, msg))
}

// ------------------------------------------------------------------------------------------------
// Syslog functions
// ------------------------------------------------------------------------------------------------

// System-related "panic" conditions
exports.sysEmerg = (srcMod, srcFun, msg, context) =>
  rplog('emergency', srcMod, srcFun, msg, context)

// Something bad is about to happen, deal with it NOW!
exports.sysCrit = (srcMod, srcFun, msg, context) => rplog('critical', srcMod, srcFun, msg, context)

// Events that are unusual but not error conditions - might be summarized in an email to developers
// or admins to spot potential problems - no immediate action required.
exports.sysNotice = (srcMod, srcFun, msg, context) => rplog('notice', srcMod, srcFun, msg, context)

// ------------------------------------------------------------------------------------------------
// Syslog functions: app level
// ------------------------------------------------------------------------------------------------

// Something bad happened, deal with it NOW!
exports.sysAlert = (srcMod, srcFun, msg, context) => rplog('alert', srcMod, srcFun, msg, context)

// A failure in the system that needs attention.
exports.sysError = (srcMod, srcFun, msg, context) => rplog('error', srcMod, srcFun, msg, context)

// Something will happen if it is not dealt within a timeframe.
exports.sysWarn = (srcMod, srcFun, msg, context) => rplog('warn', srcMod, srcFun, msg, context)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
exports.sysInfo = (srcMod, srcFun, msg, context) => rplog('info', srcMod, srcFun, msg, context)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
exports.sysDebug = (srcMod, srcFun, msg, context) => rplog('debug', srcMod, srcFun, msg, context)
