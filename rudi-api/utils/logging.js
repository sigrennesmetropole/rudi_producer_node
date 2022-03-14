/* eslint-disable no-console */
'use strict'

const mod = 'logging'
// ------------------------------------------------------------------------------------------------
// External dependencies
// ------------------------------------------------------------------------------------------------
const { pick } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const { displayStr, logWhere, beautify, shorten, consoleErr } = require('./jsUtils')

const {
  logger,
  sysLogger,
  getLogLevel,
  SHOULD_SYSLOG,
  SHOULD_LOG_CONSOLE,
} = require('../config/confLogs')
const { API_METADATA_ID, API_DATA_NAME_PROPERTY } = require('../db/dbFields')
const { makeLogInfo, LogEntry } = require('../definitions/models/LogEntry')
const { HEADERS, HD_URL, HD_METHOD, HD_AUTH } = require('../config/headers')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const ERR_LEVEL_TRACE = 'trace'

// ------------------------------------------------------------------------------------------------
// Colors
// ------------------------------------------------------------------------------------------------
/*
const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',

  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',

  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m'
}
 */
// const FgErrorDebug = Colors.FgCyan
// const FgErrorColor = Colors.FgRed
// const BgErrorDebug = ''
// const BgErrorColor = Colors.BgWhite

// ------------------------------------------------------------------------------------------------
// Display functions
// ------------------------------------------------------------------------------------------------

// function displayColor(fgColor, bgColor, msg) {
//   console.log(fgColor, bgColor, msg, Colors.Reset)
// }

// function display(logLvl, msg) {
//   displayColor(
//     logLvl === ERROR ? FgErrorColor : FgErrorDebug,
//     logLvl === ERROR ? BgErrorColor : BgErrorDebug,
//     `[ ${logLvl} ] ${msg}`)
// }

// function displayLine(logLvl, mod, fun, msg) {
//   display(logLvl, `. ${displayStr(mod, fun, msg)}`)
// }
// "indent": ["info", 2, { "SwitchCase": 1 }],

// ------------------------------------------------------------------------------------------------
// Logging functions
// ------------------------------------------------------------------------------------------------
const log = (logLevel, srcMod, srcFun, msg) => {
  try {
    if (SHOULD_LOG_CONSOLE) logger[logLevel](displayStr(srcMod, srcFun, msg))
    // console.log(displayStr(srcMod, srcFun, msg))
    this.addLogEntry(logLevel, srcMod, srcFun, msg)
  } catch (e) {
    consoleErr(e)
  }
}
exports.e = (srcMod, srcFun, msg) => log('error', srcMod, srcFun, msg)
exports.w = (srcMod, srcFun, msg) => log('warn', srcMod, srcFun, msg)
exports.i = (srcMod, srcFun, msg) => log('info', srcMod, srcFun, msg)
exports.v = (srcMod, srcFun, msg) => log('verbose', srcMod, srcFun, msg)
exports.d = (srcMod, srcFun, msg) => log('debug', srcMod, srcFun, msg)

exports.t = (srcMod, srcFun, msg) =>
  getLogLevel() === ERR_LEVEL_TRACE ? log('debug', srcMod, srcFun, msg) : () => null

// ------------------------------------------------------------------------------------------------
// Syslog functions
// ------------------------------------------------------------------------------------------------
exports.displaySyslog = (srcMod, srcFun, msg) => {
  return `[ ${logWhere(srcMod, srcFun)} ] ${msg !== '' ? msg : '<-'}`
}

// ------------------------------------------------------------------------------------------------
// Syslog functions: system level
// ------------------------------------------------------------------------------------------------
function sysLog(level, msg, location, context, cid, info) {
  try {
    if (SHOULD_SYSLOG)
      sysLogger[level](
        msg,
        location,
        context,
        cid ? cid : context ? context.id : null,
        info ? info : context ? context.detailsStr : null
      )
    else () => null
  } catch (err) {
    this.e(mod, 'sysLog', err)
  }
}
// System-related "panic" conditions
exports.sysEmerg = (msg, location, context, info, cid) =>
  sysLog('emergency', msg, location, context, cid, info)

// Something bad is about to happen, deal with it NOW!
exports.sysCrit = (msg, location, context, info, cid) =>
  sysLog('critical', msg, location, context, cid, info)

// Events that are unusual but not error conditions - might be summarized in an email to developers
// or admins to spot potential problems - no immediate action required.
exports.sysNotice = (msg, location, context, info, cid) =>
  sysLog('notice', msg, location, context, cid, info)

// ------------------------------------------------------------------------------------------------
// Syslog functions: app level
// ------------------------------------------------------------------------------------------------

// Something bad happened, deal with it NOW!
exports.sysAlert = (msg, location, context, info, cid) =>
  sysLog('alert', msg, location, context, cid, info)

// A failure in the system that needs attention.
exports.sysError = (msg, location, context, info, cid) =>
  sysLog('error', msg, location, context, cid, info)

// Something will happen if it is not dealt within a timeframe.
exports.sysWarn = (msg, location, context, info, cid) =>
  sysLog('warn', msg, location, context, cid, info)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
exports.sysInfo = (msg, location, context, info, cid) =>
  sysLog('info', msg, location, context, cid, info)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
exports.sysDebug = (mod, fun, msg, context, info, cid) =>
  sysLog('debug', msg, `${mod.fun}`, context, cid, info)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
exports.sysTrace = (mod, fun, msg, context, info, cid) =>
  getLogLevel() === ERR_LEVEL_TRACE
    ? sysLog('debug', msg, `${mod.fun}`, context, cid, info)
    : () => null

// ------------------------------------------------------------------------------------------------
// Syslog functions: specific macros
// ------------------------------------------------------------------------------------------------
// exports.sysOnSend = (request, context, reply) => {}
exports.sysOnError = (statusCode, errMsg, context, details) => {
  const fun = 'sysOnError'
  try {
    this.t(mod, fun, ``)
    this.e(mod, fun, errMsg) //`Error ${err.statusCode} (${err.name}): ${err.message}`)

    let sysLogErr = parseInt(statusCode) < 500 ? this.sysError : this.sysCrit
    sysLogErr(errMsg, '', context, details)
    //   `Error ${err.statusCode} (${err.name}): ${err.message}`,
    //   '',
    //   context,
    //   `errPlace:'${context.errorLocation}', errOnReq:'${context.formatReqDetails()}'`
    // )
  } catch (err) {
    this.e(mod, fun, err)
    throw err
  }
}
// ------------------------------------------------------------------------------------------------
// Http
// ------------------------------------------------------------------------------------------------
exports.logHttpAnswer = (loggedMod, loggedFun, httpAnswer) => {
  const fun = 'logHttpAnswer'
  try {
    this.t(mod, fun, ``)
    // this.d(mod, fun, `${loggedMod}.${loggedFun} : ${httpAnswer}`)
    if (httpAnswer.config) {
      const resExtract = pick(httpAnswer.config, [HD_METHOD, HEADERS, HD_URL])
      resExtract[HD_URL] = resExtract.url ? shorten(resExtract[HD_URL], 70) : undefined
      resExtract[HEADERS][HD_AUTH] =
        resExtract[HEADERS] && resExtract[HEADERS][HD_AUTH]
          ? shorten(resExtract[HEADERS][HD_AUTH], 30)
          : undefined
      const redactedRes = `HTTP answer: ${beautify(resExtract)}`
      this.d(loggedMod, loggedFun, redactedRes)
      // this.sysInfo(redactedRes) // TODO ?
    }
  } catch (err) {
    this.w(mod, fun, err)
    throw err
  }
}

// ------------------------------------------------------------------------------------------------
// Metadata
// ------------------------------------------------------------------------------------------------
exports.logMetadata = (metadata) => {
  return `${beautify(pick(metadata, [API_METADATA_ID, API_DATA_NAME_PROPERTY]))}`
}

// ------------------------------------------------------------------------------------------------
// DB
// ------------------------------------------------------------------------------------------------

// No log.d / log.e function here or you'll create a loopback !!!
exports.addLogEntry = async (logLvl, loc_module, loc_function, msg) => {
  const fun = 'addLogEntry'
  try {
    if (!msg || msg == '') msg = '<-'
    // utils.consoleLog(mod, fun, ``)
    const logInfo = makeLogInfo(logLvl, loc_module, loc_function, msg)
    const logEntry = await new LogEntry(logInfo)
    return await logEntry.save()
  } catch (err) {
    // No log.d / log.e function here or you'll create a loopback !!!
    consoleErr(
      loc_module,
      `${loc_function} > ${fun}`,
      `${logLvl} logging failed! msg: ${msg}, err: ${err}`
    )
    // throw err
  }
}

// ------------------------------------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------------------------------------

// exports.logErrorPile = (error) => {
//   // const fun = 'showErrorPile'
//   const errContext = error.context
//   if (!errContext) return
//   errContext.map((error) => {
//     this.w(error.mod, error.fun, `${error[TRACE]}`)
//   })
// }
// exports.logRequest = (req) => {
//   const fun = 'apiCall'
//   this.i('http', fun, `${req.method} ${req.url} <- ${displayIps(req)}`)
// }
// return
// this.d(mod, fun, `method: ${utils.beautify(req.method)}`)
// this.d(mod, fun, `url: ${utils.beautify(req.url)}`)
// this.d(mod, fun, `routerMethod: ${utils.beautify(req.routerMethod)}`)
// this.d(mod, fun, `routerPath: ${utils.beautify(req.routerPath)}`)
// this.d(mod, fun, `params: ${utils.beautify(req.params)}`)
// this.d(mod, fun, `body: ${utils.beautify(req.body)}`)
// this.d(mod, fun, `query: ${utils.beautify(req.query)}`)
// this.d(mod, fun, `headers: ${utils.beautify(req.headers)}`)
// this.d(mod, fun, `id: ${utils.beautify(req.id)}`)
// this.d(mod, fun, `ip: ${utils.beautify(req.ip)}`)
// this.d(mod, fun, `ips: ${utils.beautify(req.ips)}`)
// this.d(mod, fun, `hostname: ${utils.beautify(req.hostname)}`)
// this.d(mod, fun, `protocol: ${utils.beautify(req.protocol)}`)
// this.d(mod, fun, `raw: ${utils.beautify(req.req)}`)
// this.d(mod, fun, `socket: ${util.inspect(req.socket)}`)
