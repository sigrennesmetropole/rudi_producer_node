'use strict'

const mod = 'sysCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------
import { execSync } from 'child_process'

// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
import { logE } from '../utils/logging.js'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// App ID
// -----------------------------------------------------------------------------

/** Returns the actual git hash */
export function getGitHash() {
  const fun = 'getGitHash'
  // log.d(mod, fun, ``)
  try {
    return (process.env.RUDI_CRYPTO_GIT_REV || `${execSync('git rev-parse --short HEAD')}`)?.trim()
  } catch (err) {
    logE(mod, fun, err)
    throw err
  }
}

let CURRENT_APP_HASH
/** Returns the git hash of the last time the app was launched */
export function getAppHash() {
  const fun = 'getCurrentAppId'
  try {
    if (!CURRENT_APP_HASH) CURRENT_APP_HASH = getGitHash()
    return CURRENT_APP_HASH
  } catch (err) {
    logE(mod, fun, err)
    throw err
  }
}

/** Returns the node and npm versions */
export async function getNodeVersion() {
  const fun = 'getNodeVersion'
  try {
    // log.d(mod, fun, ` GET ${URL_PV_NODE_VERSION_ACCESS}`)
    const nodeVersion = execSync('node -v')
    const npmVersion = execSync('npm -v')
    const nVersions = {
      node: `${nodeVersion}`.trim(),
      npm: `${npmVersion}`.trim(),
    }
    // log.d(mod, fun, `${utils.beautify(nVersions)}`)

    return nVersions
  } catch (err) {
    logE(mod, fun, err)
    throw err
  }
}
