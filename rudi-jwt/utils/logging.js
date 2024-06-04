/* eslint-disable no-console */
'use strict'

const mod = 'logging'
// -----------------------------------------------------------------------------
// Internal dependencies
// -----------------------------------------------------------------------------
import { displayStr } from './jsUtils.js'

import { logger } from '../config/confLogs.js'

// -----------------------------------------------------------------------------
// Colors
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Logging functions
// -----------------------------------------------------------------------------
// const ERROR = 'ERROR'
// const WARNING = 'WARNING'
// const INFO = 'INFO'
// const VERBOSE = 'VERBOSE'
// const DEBUG = 'DEBUG'

export const logE = (mod, fun, msg) => logger.error(displayStr(mod, fun, msg))
export const logW = (mod, fun, msg) => logger.warn(displayStr(mod, fun, msg))
export const logI = (mod, fun, msg) => logger.info(displayStr(mod, fun, msg))
export const logV = (mod, fun, msg) => logger.verbose(displayStr(mod, fun, msg))
export const logD = (mod, fun, msg) => logger.debug(displayStr(mod, fun, msg))

// -----------------------------------------------------------------------------
// Request inspector
// -----------------------------------------------------------------------------

export const logRequest = (req, res) =>
  logI('http', 'request', `${req.method} ${req.url} <- ${req.ip} `)
