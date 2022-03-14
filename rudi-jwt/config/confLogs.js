/* eslint-disable no-console */
'use strict'

const mod = 'logger'

// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
const winston = require('winston')
require('winston-daily-rotate-file')

const { transports } = winston
// const {
//   combine,
//   timestamp,
//   label,
//   printf
// } = format

const {existsSync, mkdirSync} = require('fs')

// -----------------------------------------------------------------------------
// Internal dependencies
// -----------------------------------------------------------------------------
const sys = require('./confSystem')
const utils = require('../utils/jsUtils')

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const errorLogsFileName = 'rudiProxy-errors.log'
const errorDBLogsFileName = 'ff-errors.log'

// -----------------------------------------------------------------------------
// Creating local log dir
// -----------------------------------------------------------------------------

try {
  // first check if directory already exists
  if (!existsSync(sys.LOG_DIR)) {
    mkdirSync(sys.LOG_DIR, { recursive: true })
    utils.consoleLog(mod, '', 'Log directory has been created.')
  } else {
    utils.consoleLog(mod, '', 'Log directory exists.')
  }
} catch (err) {
  console.error(utils.nowLocaleFormatted(), `[${mod}]`, 'Log directory creation failed:')
  console.error(utils.nowLocaleFormatted(), `[${mod}]`, err)
}

// -----------------------------------------------------------------------------
// Winston logger creation
// -----------------------------------------------------------------------------

// datedRotatingFile.on('rotate', function (oldFilename, newFilename) {
//   // perform an action when rotation takes place
// })
/*
// - New transport : MongoDB
const options ={
  db: `${sys.DB_LOGS_URL}`,
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

const FORMAT_TIMESTAMP = { format: utils.LOG_DATE_FORMAT }
const COLORIZE_ALL = { all: true }

const FORMAT_PRINTF = (info) => `${info.timestamp} .${info.level}. ${info.message}`

const formatConsoleLogs = winston.format.combine(
  winston.format.json(),
  winston.format.colorize(COLORIZE_ALL),
  winston.format.timestamp(FORMAT_TIMESTAMP),
  winston.format.printf(FORMAT_PRINTF)
)

const formatFileLogs = winston.format.combine(
  winston.format.simple(),
  winston.format.timestamp(FORMAT_TIMESTAMP),
  winston.format.printf(FORMAT_PRINTF)
)

const MAX_SIZE = 50 * 1024 * 1024

// Loggers configuration
const logOutputs = {
  // - Write to the console
  console: new winston.transports.Console({
    name: 'consoleLogs',
    format: formatConsoleLogs,
  }),

  // - Write all logs with logger level to a dated file
  datedFile: new winston.transports.DailyRotateFile({
    name: 'datedLogs',
    dirname: sys.LOG_DIR,
    filename: `${sys.APP_NAME}-%DATE%`,
    datePattern: 'YYYY-MM-DD-HH',
    createSymlink: true,
    symlinkName: sys.SYMLINK_NAME,
    maxSize: '75m',
    maxFiles: '7d',
    extension: '.log',
    zippedArchive: true,
    format: formatFileLogs,
  }),
  // - Write all logs with level `debug`
  combined: new winston.transports.File({
    name: 'combinedlogs',
    filename: sys.OUT_LOG,
    level: sys.LOG_LVL,
    maxsize: MAX_SIZE,
    maxFiles: 5,
    zippedArchive: true,
    format: formatFileLogs,
  }),
  /* 
  // - Write all logs with level `error` and below to `error.log`
  error: new winston.transports.File({
    name: 'errorLogs',
    filename: `${sys.LOG_DIR}/${errorLogsFileName}`,
    level: 'error',
    maxsize: MAX_SIZE,
    maxFiles: 2,
    format: formatFileLogs,
  }),
  */
  ffError: new winston.transports.File({
    name: 'ffLogs',
    filename: `${sys.LOG_DIR}/${errorDBLogsFileName}`,
    level: 'error',
    maxsize: MAX_SIZE,
    maxFiles: 2,
    zippedArchive: true,
    format: formatFileLogs,
  }),
  // - Write to the web
  // new(winston.transports.Http)({host: 'localhost', port: 3000, path: '/logs'}),
}

// Loggers creation
exports.logger = winston.createLogger({
  level: sys.LOG_LVL,
  defaultMeta: {
    service: 'user-service',
  },

  transports: [logOutputs.console, logOutputs.datedFile, logOutputs.combined],
})

function extractErrorFromFastifyMsg(msg) {
  try {
    return msg.split('err: ')[1].split('\n')
  } catch (err) {
    return msg
  }
}
const FORMAT_PRINTFF = (info) =>
  `${info.timestamp} .${info.level}. [fastify] ${extractErrorFromFastifyMsg(info.message)}`

const formatConsoleFastifyLogs = winston.format.combine(
  winston.format.json(),
  winston.format.colorize(COLORIZE_ALL),
  winston.format.timestamp(FORMAT_TIMESTAMP),
  winston.format.printf(FORMAT_PRINTFF)
)

exports.initFFLogger = (appname) => {
  const fun = 'initFFLogger'
  // Here we use winston.containers IoC
  winston.loggers.add('default', {
    level: 'warn',
    // Adding ISO levels of logging from PINO
    levels: Object.assign(
      {
        fatal: 0,
        warn: 4,
        trace: 7,
      },
      winston.config.syslog.levels
    ),
    // format: format.combine(format.splat(), format.json()),
    defaultMeta: {
      service: appname + '_' + (process.env.NODE_ENV || 'development'),
    },
    transports: [logOutputs.ffError],
  })

  // Here we use winston.containers IoC get accessor
  const logger = winston.loggers.get('default')
  /* 
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new transports.Console({
        format: formatConsoleFastifyLogs,

        handleExceptions: true,
      })
    )
  } */

  process.on('uncaughtException', function (err) {
    utils.consoleErr(mod, fun, `UncaughtException processing: ${err}`)
    console.error('UncaughtException processing: %s', err)
  })

  // PINO like, we link winston.containers to use only one instance of logger
  logger.child = function () {
    return winston.loggers.get('default')
  }

  return logger
}
