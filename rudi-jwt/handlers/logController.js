'use strict'

const mod = 'logCtrl'

// -----------------------------------------------------------------------------
// External dependencies
// -----------------------------------------------------------------------------
import { readFileSync, truncateSync } from 'fs'

// -----------------------------------------------------------------------------
// Internal dependencies
// -----------------------------------------------------------------------------
import { LOG_DIR, SYMLINK_NAME } from '../config/confSystem.js'
import { logW } from '../utils/logging.js'

// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------
export function getLogs(req, reply) {
  const fun = 'getLogs'
  try {
    const logFile = `${LOG_DIR}/${SYMLINK_NAME}`
    const logs = readFileSync(logFile)
    return logs
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}
export function clearLogs(req, reply) {
  const fun = 'clearLogs'
  try {
    const logFile = `${LOG_DIR}/${SYMLINK_NAME}`
    truncateSync(logFile, 0)
    return 'Log file cleared'
  } catch (err) {
    logW(mod, fun, err)
    throw err
  }
}
