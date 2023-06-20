const mod = 'logConf'
const fun = 'init'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { existsSync, mkdirSync } from 'fs'

import winston from 'winston'
import 'winston-daily-rotate-file'
// require('winston-syslog').Syslog
import rudiLogger from '@aqmo.org/rudi_logger'

const { combine, timestamp, printf, colorize, simple } = winston.format
const syslogLevels = winston.config.syslog.levels
Object.assign(
  {
    fatal: 0,
    warn: 4,
    trace: 7,
  },
  syslogLevels
)

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { getGitHash, getAppOptions, OPT_NODE_ENV } from './appOptions.js'
import { consoleLog, consoleErr, LOG_DATE_FORMAT, separateLogs } from '../utils/jsUtils.js'
import {
  getAppName,
  getIniValue,
  shouldControlPrivateRequests,
  shouldControlPublicRequests,
} from './confSystem.js'

separateLogs('Loading log conf', true) ///////////////////////////////////////////////////////////

// -------------------------------------------------------------------------------------------------
// Reading conf file
// -------------------------------------------------------------------------------------------------
const APP_NAME = getAppName()

// ----- Flags section
const FLAGS_SECTION = 'flags'

export const SHOULD_LOG_CONSOLE = getIniValue(FLAGS_SECTION, 'should_log_console', false)
const SHOULD_FILELOG = getIniValue(FLAGS_SECTION, 'should_log_in_file', false)
const SHOULD_SHOW_ERROR_PILE = getIniValue(FLAGS_SECTION, 'should_show_error_pile', false)
const SHOULD_SHOW_ROUTES = getIniValue(FLAGS_SECTION, 'should_show_routes', true)
export const SHOULD_SYSLOG = getIniValue(FLAGS_SECTION, 'should_syslog')
const SHOULD_SYSLOG_IN_CONSOLE = getIniValue(FLAGS_SECTION, 'should_syslog_in_console')
const SHOULD_SYSLOG_IN_FILE = getIniValue(FLAGS_SECTION, 'should_syslog_in_file')

export const shouldShowErrorPile = () => SHOULD_SHOW_ERROR_PILE
export const shouldShowRoutes = () => SHOULD_SHOW_ROUTES

// Log feedback
const checkOption = (msg, flag) => consoleLog(mod, fun, `[${flag ? 'x' : ' '}] ${msg}`)
checkOption('Should log on console', SHOULD_LOG_CONSOLE)
checkOption('Control private requests', shouldControlPrivateRequests())
checkOption('Control public requests', shouldControlPublicRequests())
checkOption('Log in file', SHOULD_FILELOG)
checkOption('Show error pile', SHOULD_SHOW_ERROR_PILE)
checkOption('Sent syslogs', SHOULD_SYSLOG)
checkOption('Backup syslogs in file', SHOULD_SYSLOG_IN_FILE)

// ----- Logs section
const LOG_SECTION = 'logging'

const LOG_LVL = getIniValue(LOG_SECTION, 'log_level', 'debug')
consoleLog(mod, fun, `Log level set to '${LOG_LVL.toUpperCase()}'`)

const LOG_DIR = getIniValue(LOG_SECTION, 'log_dir')
const LOG_FILE = getIniValue(LOG_SECTION, 'log_file')

export const LOG_EXP = getIniValue(LOG_SECTION, 'expires', '7d')
export const getLogLevel = () => LOG_LVL

// ----- Syslog
const SYSLOG_SECTION = 'syslog'

// const SYSLOG_LVL = getIniValue(SYSLOG_SECTION, '◊log_level', 'info')
// const SYSLOG_NODE_NAME = getIniValue(SYSLOG_SECTION, 'syslog_node_name')
const SYSLOG_PROTOCOL = getIniValue(SYSLOG_SECTION, 'syslog_protocol', 'unix')
const SYSLOG_FACILITY = getIniValue(SYSLOG_SECTION, 'syslog_facility', 'local4')
const SYSLOG_HOST = getIniValue(SYSLOG_SECTION, 'syslog_host')
const SYSLOG_PORT = getIniValue(SYSLOG_SECTION, 'syslog_port', 514) // default: 514
// const SYSLOG_TYPE = getIniValue(SYSLOG_SECTION, 'syslog_type', 'RFC5424') // bsd | 5424
const SYSLOG_SOCKET = getIniValue(SYSLOG_SECTION, 'syslog_socket') // the socket for sending syslog diagrams
const SYSLOG_DIR = getIniValue(SYSLOG_SECTION, 'syslog_dir') // path of the syslog backup file

// -------------------------------------------------------------------------------------------------
// Creating local log dir
// -------------------------------------------------------------------------------------------------
if (SHOULD_FILELOG) {
  try {
    // first check if directory already exists
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true })
      consoleLog(mod, fun, 'Log directory has been created')
    } else {
      consoleLog(mod, fun, 'Log directory exists')
    }
  } catch (err) {
    consoleErr(mod, fun, `Log directory creation failed: ${err}`)
    throw err
  }
}

if (SHOULD_SYSLOG_IN_FILE) {
  try {
    // first check if directory already exists
    if (!existsSync(SYSLOG_DIR)) {
      mkdirSync(SYSLOG_DIR, { recursive: true })
      consoleLog(mod, fun, 'Syslog directory has been created.')
    } else {
      consoleLog(mod, fun, 'Syslog directory exists.')
    }
  } catch (err) {
    consoleErr(mod, fun, `Log directory creation failed: ${err}`)
    throw err
  }
}

// -------------------------------------------------------------------------------------------------
// Winston logger creation : LOG FILE
// -------------------------------------------------------------------------------------------------

// datedRotatingFile.on('rotate', function (oldFilename, newFilename) {
//   // perform an action when rotation takes place
// })
/*
// - New transport : MongoDB
const options ={
  db: `${DB_LOGS_URL}`,
  collection: 'logs'
}
const transportMongoDb = new winston.transports.MongoDB(options)
 */
winston.addColors({
  error: 'bold red',
  warn: 'italic magenta',
  info: 'italic yellow',
  verbose: 'green',
  debug: 'cyan',
})

const FORMAT_TIMESTAMP = { format: LOG_DATE_FORMAT }
const LOGS_FORMAT_PRINTF = (info) =>
  `${info.level}`.substring(0, 1).toUpperCase() + ` ${info.timestamp} ${info.message}`

const formatConsoleLogs = combine(
  timestamp(FORMAT_TIMESTAMP),
  printf(LOGS_FORMAT_PRINTF),
  colorize({ all: true })
)
const formatFileLogs = combine(simple(), timestamp(FORMAT_TIMESTAMP), printf(LOGS_FORMAT_PRINTF))

const MAX_SIZE = 50 * 1024 * 1024

// Loggers configuration
const logOutputs = {
  // - Write to the console
  console: new winston.transports.Console({
    name: 'consoleLogs',
    level: LOG_LVL === 'trace' ? 'debug' : LOG_LVL,
    levels: syslogLevels,
    format: formatConsoleLogs,
  }),

  // To log errors caught on fastify level (obsolete)
  ffError: new winston.transports.File({
    name: 'ffLogs',
    filename: `${LOG_DIR}/ff-errors.log`,
    level: 'warn',
    maxsize: MAX_SIZE,
    maxFiles: 2,
    format: formatFileLogs,
  }),
}

// Console/file logger creation
const loggerOpts = {
  defaultMeta: {
    service: 'user-service',
  },

  transports: [logOutputs.console],
  // transports: [logOutputs.console, logOutputs.datedFile, logOutputs.combined],
}

if (SHOULD_FILELOG) {
  // Dated files
  loggerOpts.transports.push(
    new winston.transports.DailyRotateFile({
      name: 'datedLogs',
      dirname: LOG_DIR,
      filename: `${APP_NAME}-%DATE%`,
      datePattern: 'YYYY-MM-DD-HH',
      createSymlink: true,
      symlinkName: `${APP_NAME}-current.log`,
      maxSize: '75m',
      maxFiles: '7d',
      extension: '.log',
      format: formatFileLogs,
      level: LOG_LVL,
    })
  )

  // - Write all logs with level `debug`
  loggerOpts.transports.push(
    new winston.transports.File({
      name: 'combinedlogs',
      filename: `${LOG_DIR}/${LOG_FILE}`,
      maxsize: MAX_SIZE,
      maxFiles: 5,
      zippedArchive: false, // zip doesn't work unfortunately
      format: formatFileLogs,
    })
  )

  // // - Write all logs with level `error` and below to `error.log`
  // loggerOpts.transports.push(
  //   new winston.transports.File({
  //     name: 'errorLogs',
  //     filename: `${logDir()}/${errorLogsFileName}`,
  //     level: 'error',
  //     maxsize: MAX_SIZE,
  //     maxFiles: 2,
  //     format: formatFileLogs,
  //   })
  // )
}

export const wConsoleLogger = winston.createLogger(loggerOpts)

// -------------------------------------------------------------------------------------------------
// Winston logger creation : logger for errors caught only on Fastify level (should be obsolete)
// -------------------------------------------------------------------------------------------------
const FF_LOGGER = 'ffLogger'
export const initFFLogger = () => {
  const fun = 'initFFLogger'
  // Here we use winston.containers IoC
  winston.loggers.add(FF_LOGGER, {
    level: 'warn',
    // Adding ISO levels of logging from PINO
    levels: syslogLevels,
    // format: format.combine(format.splat(), format.json()),
    defaultMeta: {
      service: getAppName() + '_' + (getAppOptions(OPT_NODE_ENV) || 'dev'),
    },
    transports: [logOutputs.ffError],
  })

  // Here we use winston.containers IoC get accessor
  const ffLogger = winston.loggers.get(FF_LOGGER)

  process.on('uncaughtException', (err) => {
    consoleErr(mod, fun, `UncaughtException processing: ${err}`)
  })

  // PINO like, we link winston.containers to use only one instance of logger
  ffLogger.child = () => winston.loggers.get(FF_LOGGER)

  return ffLogger
}

// -------------------------------------------------------------------------------------------------
// Winston logger creation : SYSLOG
// -------------------------------------------------------------------------------------------------

// const SYSLOGS_FORMAT_PRINTF = (info) =>
//   `${info.level} ${utils.toISOLocale()} ${info.message}` +
//   ` ${info.meta ? utils.beautify(info.meta) : ''}`

// const formatConsoleSyslogs = combine(timestamp(), printf(SYSLOGS_FORMAT_PRINTF))

// const syslogOpts = {
//   levels: syslogLevels,
//   transports: [
//     new winston.transports.Console({
//       name: 'consoleSysLogs',
//       levels: syslogLevels,
//       format: formatConsoleSyslogs,
//     }),
//   ],
// }

// if (SHOULD_SYSLOG) {
//   // Push to syslog socket
//   syslogOpts.transports.push(
//     new winston.transports.Syslog({
//       name: 'syslogSocket',
//       localhost: SYSLOG_NODE_NAME,
//       facility: SYSLOG_FACILITY,
//       protocol: SYSLOG_PROTOCOL,
//       host: SYSLOG_HOST,
//       port: SYSLOG_PORT,
//       path: SYSLOG_SOCKET,
//       type: SYSLOG_TYPE,
//       app_name: APP_NAME,
//       level: SYSLOG_LVL,
//     })
//   )
//   // syslogOpts.transports.push(logOutputs.console)
//   // } else {
//   //   syslogOpts.transports.push(logOutputs.console)
// }

// if (SHOULD_SYSLOG_IN_FILE) {
//   // Write in a dedicated syslog file
//   syslogOpts.transports.push(
//     new winston.transports.DailyRotateFile({
//       name: 'syslogFile',
//       dirname: SYSLOG_DIR,
//       filename: `syslog-${APP_NAME}-%DATE%`,
//       datePattern: 'YYYY-MM-DD-HH',
//       createSymlink: true,
//       symlinkName: `syslog-${APP_NAME}-current.log`,
//       maxSize: '75m',
//       maxFiles: '7d',
//       extension: '.log',
//       format: formatFileLogs,
//     })
//   )
// }

// export const sysLogger = winston.createLogger(syslogOpts)
function getRudiLoggerOptions() {
  var facility = 20
  if (SYSLOG_FACILITY.substr(0, 5) === 'local') {
    facility = 16 + Number(SYSLOG_FACILITY.substr(5, 1))
  }
  var transports = 2
  var path = SYSLOG_HOST
  switch (SYSLOG_PROTOCOL) {
    case 'tcp':
      transports = 1
      break
    case 'udp':
      transports = 2
      break
    case 'unix':
      transports = 4
      path = SYSLOG_SOCKET
      break
  }
  const rudiLoggerOpts = {
    log_server: { path: path, port: SYSLOG_PORT, facility: facility, transport: transports },
  }

  rudiLoggerOpts.log_local = {
    console: !!SHOULD_SYSLOG_IN_CONSOLE,
    consoleData: !!SHOULD_SYSLOG_IN_CONSOLE,
    directory: LOG_DIR,
    prefix: 'rudiProd.api.syslog',
  }
  return rudiLoggerOpts
}

export const sysLogger = new rudiLogger.RudiLogger(
  getAppName(),
  getGitHash(),
  getRudiLoggerOptions()
)
