'use strict'

const mod = 'sysCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------
const prcs = require('child_process')

// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
const sys = require('../config/confSystem')
const log = require('../utils/logging')
const utils = require('../utils/jsUtils')

const {
  URL_PV_LOGS_ACCESS,
  URL_PV_GIT_HASH_ACCESS,
  URL_PV_NODE_VERSION_ACCESS,
  PARAM_LOGS_LINES,
  QUERY_LIMIT,
} = require('../config/confApi')

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
let CURRENT_APP_HASH

// -----------------------------------------------------------------------------
// App ID
// -----------------------------------------------------------------------------

/** Returns the actual git hash */
exports.getGitHash = () => {
    const fun = 'getGitHash'
    // log.d(mod, fun, ``)
    try {
        let hashId = process.env.RUDI_CRYPTO_GIT_REV
        if (!hashId) {
            hashId = require('child_process').execSync('git rev-parse --short HEAD')
            // log.d(mod, fun, utils.beautify(process.env))
        }
        return `${hashId}`.trim()
    } catch (err) {
        log.e(mod, fun, err)
        throw boomify(err)
    }
}

/** Returns the git hash of the last time the app was launched */
exports.getAppHash = () => {
  const fun = 'getCurrentAppId'
  try {
    if (!CURRENT_APP_HASH) CURRENT_APP_HASH = this.getGitHash()
    return CURRENT_APP_HASH
  } catch (err) {
    log.e(mod, fun, err)
    throw boomify(err)
  }
}

/** Returns the node and npm versions */
exports.getNodeVersion = async () => {
  const fun = 'getNodeVersion'
  try {
    // log.d(mod, fun, ` GET ${URL_PV_NODE_VERSION_ACCESS}`)
    const nodeVersion = prcs.execSync('node -v')
    const npmVersion = prcs.execSync('npm -v')
    const mongooseVersion = prcs.execSync('npm view mongoose version')
    const mongoDbVersion = await getMongDbVersion()
    const nVersions = {
      node: `${nodeVersion}`.trim(),
      npm: `${npmVersion}`.trim(),
      mongoose: `${mongooseVersion}`.trim(),
      mongodb: `${mongoDbVersion}`.trim(),
    }
    // log.d(mod, fun, `${utils.beautify(nVersions)}`)

    return nVersions
  } catch (err) {
    log.e(mod, fun, err)
    throw boomify(err)
  }
}
