'use strict'

const mod = 'sysCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const { execSync } = require('child_process')
const { readFileSync } = require('fs')

const mongoose = require('mongoose')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const utils = require('../utils/jsUtils')
const { RudiError } = require('../utils/errors')
const { getGitHash, getAppHash } = require('../config/confSystem')
const { API_VERSION } = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// App ID
// ------------------------------------------------------------------------------------------------

/**
 * @returns the actual git hash
 */
exports.getGitHash = () => {
  const fun = 'getGitHash'
  try {
    log.t(mod, fun, ``)
    return getGitHash()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/** @returns the git hash of the last time the app was launched */
exports.getAppHash = () => {
  const fun = 'getCurrentAppId'
  try {
    log.t(mod, fun, ``)
    return getAppHash()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
exports.getApiVersion = () => API_VERSION

exports.ENV_DEV = 'local'
exports.ENV_TEST = 'test'
exports.ENV_SHARED = 'shared'
exports.ENV_RELEASE = 'release'

/** @returns the current environment for this module */
exports.getEnvironment = () => {
  const fun = 'getEnvironment'
  try {
    log.t(mod, fun, process.env.RUDI_API_ENV)
    const env = process.env.RUDI_API_ENV ? process.env.RUDI_API_ENV : utils.NOT_FOUND
    return env
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/** Returns the node and npm versions */
exports.getNodeVersion = async () => {
  const fun = 'getNodeVersion'
  try {
    // log.d(mod, fun, ` GET ${URL_PV_NODE_VERSION_ACCESS}`)
    const nodeVersion = execSync('node -v')
    const npmVersion = execSync('npm -v')

    let mongooseVersion = 'n/a'
    try {
      mongooseVersion = execSync('npm view mongoose version')
    } catch (err) {
      log.w(mod, fun, `Command 'npm view mongoose version' failed: ${err}`)
    }

    let mongoDbVersion = 'n/a'
    try {
      mongoDbVersion = await getMongDbVersion()
    } catch (err) {
      log.w(mod, fun, `Couldn't get MongoDB version: ${err}`)
    }

    const nVersions = {
      node: `${nodeVersion}`.trim(),
      npm: `${npmVersion}`.trim(),
      mongoose: `${mongooseVersion}`.trim(),
      mongodb: `${mongoDbVersion}`.trim(),
    }
    // log.d(mod, fun, `${utils.beautify(nVersions)}`)

    return nVersions
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

async function getMongDbVersion() {
  const fun = 'getMongDbVersion'
  try {
    const admin = new mongoose.mongo.Admin(mongoose.connection.db)
    let mongoInfo = await admin.buildInfo()
    // log.d(mod, fun, `Mongo : ${mongoInfo.version}`)
    return mongoInfo.version
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const DAY_IN_S = 24 * 60 * 60
const MONTH_IN_S = 30 * DAY_IN_S
const MONTH_IN_MS = MONTH_IN_S * 1000

exports.serveFavicon = (req, res) => {
  const fun = 'serveFavicon'
  try {
    const favicon = readFileSync('./img/rudi_favicon.png') // read file
    // const favicon = new Buffer.from(
    //   'AAABAAEAEBAQAAAAAAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAA/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEREQAAAAAAEAAAEAAAAAEAAAABAAAAEAAAAAAQAAAQAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAA//8AAP//AAD8HwAA++8AAPf3AADv+wAA7/sAAP//AAD//wAA+98AAP//AAD//wAA//8AAP//AAD//wAA',
    //   'base64'
    // )
    res.header('Content-Length', favicon.length)
    res.header('Content-Type', 'image/png')
    res.header('Cache-Control', `public, max-age=${MONTH_IN_S}`) // expiers after a month
    res.header('Expires', new Date(Date.now() + MONTH_IN_MS).toUTCString())
    res.statusCode = 200
    res.send(favicon)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
