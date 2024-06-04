/* eslint-disable no-console */
'use strict'

const mod = 'logger'

// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import {
  addColors,
  config,
  createLogger,
  loggers,
  format as winstonFormat,
  transports as winstonTransports,
} from 'winston'
import 'winston-daily-rotate-file'

import { existsSync, mkdirSync } from 'fs'

// -----------------------------------------------------------------------------
// Internal dependencies
// -----------------------------------------------------------------------------
import { LOG_DATE_FORMAT, consoleErr, consoleLog, nowLocaleFormatted } from '../utils/jsUtils.js'
import { APP_NAME, LOG_DIR, LOG_LVL, OUT_LOG, SYMLINK_NAME } from './confSystem.js'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
// const errorLogsFileName = 'rudiProxy-errors.log'
const errorDBLogsFileName = 'ff-errors.log'

// -----------------------------------------------------------------------------
// Creating local log dir
// -----------------------------------------------------------------------------

try {
  // first check if directory already exists
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
    consoleLog(mod, '', 'Log directory has been created.')
  } else {
    consoleLog(mod, '', 'Log directory exists.')
  }
} catch (err) {
  console.error(nowLocaleFormatted(), `[${mod}]`, 'Log directory creation failed:')
  console.error(nowLocaleFormatted(), `[${mod}]`, err)
}

// -----------------------------------------------------------------------------
// Winston logger creation
// -----------------------------------------------------------------------------

addColors({
  error: 'bold red',
  warn: 'italic magenta',
  info: 'italic yellow',
  verbose: 'green',
  debug: 'cyan',
})

const FORMAT_TIMESTAMP = { format: LOG_DATE_FORMAT }
const COLORIZE_ALL = { all: true }

const FORMAT_PRINTF = (info) => `${info.timestamp} .${info.level}. ${info.message}`

const formatConsoleLogs = winstonFormat.combine(
  winstonFormat.json(),
  winstonFormat.colorize(COLORIZE_ALL),
  winstonFormat.timestamp(FORMAT_TIMESTAMP),
  winstonFormat.printf(FORMAT_PRINTF)
)

const formatFileLogs = winstonFormat.combine(
  winstonFormat.simple(),
  winstonFormat.timestamp(FORMAT_TIMESTAMP),
  winstonFormat.printf(FORMAT_PRINTF)
)

const MAX_SIZE = 50 * 1024 * 1024

// Loggers configuration
const logOutputs = {
  // - Write to the console
  console: new winstonTransports.Console({
    name: 'consoleLogs',
    format: formatConsoleLogs,
  }),

  // - Write all logs with logger level to a dated file
  datedFile: new winstonTransports.DailyRotateFile({
    name: 'datedLogs',
    dirname: LOG_DIR,
    filename: `${APP_NAME}-%DATE%`,
    datePattern: 'YYYY-MM-DD-HH',
    createSymlink: true,
    symlinkName: SYMLINK_NAME,
    maxSize: '75m',
    maxFiles: '7d',
    extension: '.log',
    zippedArchive: true,
    format: formatFileLogs,
  }),
  // - Write all logs with level `debug`
  combined: new winstonTransports.File({
    name: 'combinedlogs',
    filename: OUT_LOG,
    level: LOG_LVL,
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
  ffError: new winstonTransports.File({
    name: 'ffLogs',
    filename: `${LOG_DIR}/${errorDBLogsFileName}`,
    level: 'error',
    maxsize: MAX_SIZE,
    maxFiles: 2,
    zippedArchive: true,
    format: formatFileLogs,
  }),
  // - Write to the web
  // new(winston.transports.Http)({host: 'localhost', port: 3000, path: '/logs'}),
}

export const logger = createLogger({
  level: LOG_LVL,
  defaultMeta: {
    service: 'user-service',
  },

  transports: [logOutputs.console, logOutputs.datedFile, logOutputs.combined],
})

/* 
  function extractErrorFromFastifyMsg(msg) {
    try {
      return msg.split('err: ')[1].split('\n')
    } catch (err) {
      return msg
    }
  }
 const formatFastifyOutput = (info) =>
  `${info.timestamp} .${info.level}. [fastify] ${extractErrorFromFastifyMsg(info.message)}`
  const formatConsoleFastifyLogs = winstonFormat.combine(
  winstonFormat.json(),
  winstonFormat.colorize(COLORIZE_ALL),
  winstonFormat.timestamp(FORMAT_TIMESTAMP),
  winstonFormat.printf(formatFastifyOutput)
)
 */
export function initFFLogger(appname) {
  const fun = 'initFFLogger'
  // Here we use winston.containers IoC
  loggers.add('default', {
    level: 'warn',
    // Adding ISO levels of logging from PINO
    levels: {
      fatal: 0,
      warn: 4,
      trace: 7,
      ...config.syslog.levels,
    },
    defaultMeta: {
      service: appname + '_' + (process.env.NODE_ENV || 'development'),
    },
    transports: [logOutputs.ffError],
  })

  // Here we use winston.containers IoC get accessor
  const logger = loggers.get('default')

  process.on('uncaughtException', function (err) {
    consoleErr(mod, fun, `UncaughtException processing: ${err}`)
    console.error('UncaughtException processing: %s', err)
  })

  // PINO like, we link winston.containers to use only one instance of logger
  logger.child = () => loggers.get('default')

  return logger
}
