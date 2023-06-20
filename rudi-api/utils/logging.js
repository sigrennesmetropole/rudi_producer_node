/* eslint-disable no-console */
const mod = 'logging'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
const { pick } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { API_METADATA_ID, API_DATA_NAME_PROPERTY } from '../db/dbFields.js'
import { HEADERS, HD_URL, HD_METHOD, HD_AUTH } from '../config/headers.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { displayStr, logWhere, beautify, shorten, consoleErr } from './jsUtils.js'

import {
  wConsoleLogger as wLogger,
  sysLogger,
  getLogLevel,
  SHOULD_SYSLOG,
  SHOULD_LOG_CONSOLE,
} from '../config/confLogs.js'

import { makeLogInfo, LogEntry } from '../definitions/models/LogEntry.js'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
const ERR_LEVEL_TRACE = 'trace'

// -------------------------------------------------------------------------------------------------
// Colors
// -------------------------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------------------------
// Display functions
// -------------------------------------------------------------------------------------------------

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

// -------------------------------------------------------------------------------------------------
// Logging functions
// -------------------------------------------------------------------------------------------------
export const logLine = (logLevel, srcMod, srcFun, msg) => {
  try {
    if (SHOULD_LOG_CONSOLE)
      wLogger.log({ level: logLevel, message: displayStr(srcMod, srcFun, msg) })
    // console.log(displayStr(srcMod, srcFun, msg))
    if (`${msg}` === '[Object]: Object' || `${msg}` === '[object Object]') msg = JSON.stringify(msg)
    addLogEntry(logLevel, srcMod, srcFun, msg)
  } catch (e) {
    consoleErr(e)
  }
}
export const logE = (srcMod, srcFun, msg) => logLine('error', srcMod, srcFun, msg)
export const logW = (srcMod, srcFun, msg) => logLine('warn', srcMod, srcFun, msg)
export const logI = (srcMod, srcFun, msg) => logLine('info', srcMod, srcFun, msg)
export const logV = (srcMod, srcFun, msg) => logLine('verbose', srcMod, srcFun, msg)
export const logD = (srcMod, srcFun, msg) => logLine('debug', srcMod, srcFun, msg)

export const logT = (srcMod, srcFun, msg) =>
  getLogLevel() === ERR_LEVEL_TRACE ? logLine('debug', srcMod, srcFun, msg) : () => null

// -------------------------------------------------------------------------------------------------
// Syslog functions
// -------------------------------------------------------------------------------------------------
export const displaySyslog = (srcMod, srcFun, msg) => {
  return `[ ${logWhere(srcMod, srcFun)} ] ${msg !== '' ? msg : '<-'}`
}

// -------------------------------------------------------------------------------------------------
// Syslog functions: system level
// -------------------------------------------------------------------------------------------------
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
    logE(mod, 'sysLog', err)
  }
}
// System-related "panic" conditions
export const sysEmerg = (msg, location, context, info, cid) =>
  sysLog('emergency', msg, location, context, cid, info)

// Something bad is about to happen, deal with it NOW!
export const sysCrit = (msg, location, context, info, cid) =>
  sysLog('critical', msg, location, context, cid, info)

// Events that are unusual but not error conditions - might be summarized in an email to developers
// or admins to spot potential problems - no immediate action required.
export const sysNotice = (msg, location, context, info, cid) =>
  sysLog('notice', msg, location, context, cid, info)

// -------------------------------------------------------------------------------------------------
// Syslog functions: app level
// -------------------------------------------------------------------------------------------------

// Something bad happened, deal with it NOW!
export const sysAlert = (msg, location, context, info, cid) =>
  sysLog('alert', msg, location, context, cid, info)

// A failure in the system that needs attention.
export const sysError = (msg, location, context, info, cid) =>
  sysLog('error', msg, location, context, cid, info)

// Something will happen if it is not dealt within a timeframe.
export const sysWarn = (msg, location, context, info, cid) =>
  sysLog('warn', msg, location, context, cid, info)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
export const sysInfo = (msg, location, context, info, cid) =>
  sysLog('info', msg, location, context, cid, info)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
export const sysDebug = (msg, location, context, info, cid) =>
  sysLog('debug', msg, location, context, cid, info)

// Normal operational messages - may be harvested for reporting, measuring throughput, etc.
// No action required.
export const sysTrace = (msg, location, context, info, cid) =>
  getLogLevel() === ERR_LEVEL_TRACE
    ? sysLog('debug', msg, location, context, cid, info)
    : () => null

// -------------------------------------------------------------------------------------------------
// Fastify logger
// -------------------------------------------------------------------------------------------------
function FFLogger(...args) {
  this.level = args?.level
}
FFLogger.prototype.fatal = (msg) => sysAlert(typeof msg == 'string' ? msg : `${beautify(msg)}`)
FFLogger.prototype.error = (msg) => sysError(typeof msg == 'string' ? msg : `${beautify(msg)}`)
FFLogger.prototype.warn = (msg) => sysWarn(typeof msg == 'string' ? msg : `${beautify(msg)}`)
FFLogger.prototype.info = () => {}
// FFLogger.prototype.info = (msg) => sysInfo(typeof msg == 'string' ? msg : `${beautify(msg)}`)
FFLogger.prototype.debug = (msg) => sysDebug(typeof msg == 'string' ? msg : `${beautify(msg)}`)
FFLogger.prototype.trace = (msg) =>
  sysTrace(
    typeof msg == 'string' ? msg : msg?.err ? `ERR ${msg.err.code} ${msg.err.message}` : `${msg}`
  )

FFLogger.prototype.child = () => new FFLogger()

export const fastifyLogger = (...args) => new FFLogger(args)

// -------------------------------------------------------------------------------------------------
// Syslog functions: specific macros
// -------------------------------------------------------------------------------------------------
// export const sysOnSend = (request, context, reply) => {}
export const sysOnError = (statusCode, errMsg, context, details) => {
  const fun = 'sysOnError'
  try {
    logT(mod, fun, ``)
    logE(mod, fun, errMsg) //`Error ${err.statusCode} (${err.name}): ${err.message}`)
    const errCode = parseInt(statusCode)
    let sysLogErr = isNaN(errCode) || errCode >= 500 ? sysCrit : sysError
    sysLogErr(errMsg, '', context, details)
    //   `Error ${err.statusCode} (${err.name}): ${err.message}`,
    //   '',
    //   context,
    //   `errPlace:'${context.errorLocation}', errOnReq:'${context.formatReqDetails()}'`
    // )
  } catch (err) {
    logE(mod, fun, err)
    throw err
  }
}
// -------------------------------------------------------------------------------------------------
// Http
// -------------------------------------------------------------------------------------------------
export const logHttpAnswer = (loggedMod, loggedFun, httpAnswer) => {
  const fun = 'logHttpAnswer'
  try {
    logT(mod, fun, ``)
    // d(mod, fun, `${loggedMod}.${loggedFun} : ${httpAnswer}`)
    if (httpAnswer.config) {
      const resExtract = pick(httpAnswer.config, [HD_METHOD, HEADERS, HD_URL])
      resExtract[HD_URL] = resExtract.url ? shorten(resExtract[HD_URL], 70) : undefined
      resExtract[HEADERS][HD_AUTH] =
        resExtract[HEADERS] && resExtract[HEADERS][HD_AUTH]
          ? shorten(resExtract[HEADERS][HD_AUTH], 30)
          : undefined
      const redactedRes = `HTTP answer: ${beautify(resExtract)}`
      logD(loggedMod, loggedFun, redactedRes)
      // sysInfo(redactedRes) // TODO ?
    }
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}

// -------------------------------------------------------------------------------------------------
// Metadata
// -------------------------------------------------------------------------------------------------
export const logMetadata = (metadata) => {
  return `${beautify(pick(metadata, [API_METADATA_ID, API_DATA_NAME_PROPERTY]))}`
}

// -------------------------------------------------------------------------------------------------
// DB
// -------------------------------------------------------------------------------------------------

// No logD / logE function here or you'll create a loopback !!!
export const addLogEntry = async (logLvl, loc_module, loc_function, msg) => {
  const fun = 'addLogEntry'
  try {
    if (!msg || msg == '') msg = '<-'
    else msg = `${msg}`
    // utils.consoleLog(mod, fun, ``)
    const logInfo = makeLogInfo(logLvl, loc_module, loc_function, msg)
    const logEntry = new LogEntry(logInfo)
    return await logEntry.save()
  } catch (err) {
    // No logD / logE function here or you'll create a loopback !!!
    consoleErr(
      loc_module,
      `${loc_function} > ${fun}`,
      `${logLvl} logging failed! msg: ${msg}, err: ${err}`
    )
    // throw err
  }
}

// -------------------------------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------------------------------

// export const logErrorPile = (error) => {
//   // const fun = 'showErrorPile'
//   const errContext = error.context
//   if (!errContext) return
//   errContext.map((error) => {
//     logW(error.mod, error.fun, `${error[TRACE]}`)
//   })
// }
// export const logRequest = (req) => {
//   const fun = 'apiCall'
//   i('http', fun, `${req.method} ${req.url} <- ${displayIps(req)}`)
// }
// return
// d(mod, fun, `method: ${utils.beautify(req.method)}`)
// d(mod, fun, `url: ${utils.beautify(req.url)}`)
// d(mod, fun, `routerMethod: ${utils.beautify(req.routerMethod)}`)
// d(mod, fun, `routerPath: ${utils.beautify(req.routerPath)}`)
// d(mod, fun, `params: ${utils.beautify(req.params)}`)
// d(mod, fun, `body: ${utils.beautify(req.body)}`)
// d(mod, fun, `query: ${utils.beautify(req.query)}`)
// d(mod, fun, `headers: ${utils.beautify(req.headers)}`)
// d(mod, fun, `id: ${utils.beautify(req.id)}`)
// d(mod, fun, `ip: ${utils.beautify(req.ip)}`)
// d(mod, fun, `ips: ${utils.beautify(req.ips)}`)
// d(mod, fun, `hostname: ${utils.beautify(req.hostname)}`)
// d(mod, fun, `protocol: ${utils.beautify(req.protocol)}`)
// d(mod, fun, `raw: ${utils.beautify(req.req)}`)
// d(mod, fun, `socket: ${util.inspect(req.socket)}`)
