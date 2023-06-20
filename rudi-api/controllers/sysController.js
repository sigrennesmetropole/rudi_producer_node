const mod = 'sysCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

import mongoose from 'mongoose'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { NOT_FOUND } from '../utils/jsUtils.js'
import { getGitHash as getGitHashOpt, getAppOptions, OPT_APP_ENV } from '../config/appOptions.js'
import { getAppHash as getAppHashOpt } from '../config/confSystem.js'
import { RudiError } from '../utils/errors.js'
import { API_VERSION } from '../config/confApi.js'
import { logT, logW } from '../utils/logging.js'

// -------------------------------------------------------------------------------------------------
// App ID
// -------------------------------------------------------------------------------------------------

/**
 * @returns the actual git hash
 */
export const getGitHash = () => {
  const fun = 'getGitHash'
  try {
    logT(mod, fun, ``)
    return getGitHashOpt()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/** @returns the git hash of the last time the app was launched */
export const getAppHash = () => {
  const fun = 'getCurrentAppId'
  try {
    logT(mod, fun, ``)
    return getAppHashOpt()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
export const getApiVersion = () => API_VERSION

/** @returns the current environment for this module */
export const getEnvironment = () => {
  const fun = 'getEnvironment'
  try {
    logT(mod, fun, getAppOptions(OPT_APP_ENV))
    const appEnv = getAppOptions(OPT_APP_ENV)
    const env = appEnv || NOT_FOUND
    return env
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/** Returns the node and npm versions */
export const getNodeVersion = async () => {
  const fun = 'getNodeVersion'
  try {
    // logD(mod, fun, ` GET ${URL_PV_NODE_VERSION_ACCESS}`)
    const nodeVersion = execSync('node -v')
    const npmVersion = execSync('npm -v')

    let mongooseVersion = 'n/a'
    try {
      mongooseVersion = execSync('npm view mongoose version')
    } catch (err) {
      logW(mod, fun, `Command 'npm view mongoose version' failed: ${err}`)
    }

    let mongoDbVersion = 'n/a'
    try {
      mongoDbVersion = await getMongoDbVersion()
    } catch (err) {
      logW(mod, fun, `Couldn't get MongoDB version: ${err}`)
    }

    const nVersions = {
      node: `${nodeVersion}`.trim(),
      npm: `${npmVersion}`.trim(),
      mongoose: `${mongooseVersion}`.trim(),
      mongodb: `${mongoDbVersion}`.trim(),
    }
    // logD(mod, fun, `${utils.beautify(nVersions)}`)

    return nVersions
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

async function getMongoDbVersion() {
  const fun = 'getMongDbVersion'
  try {
    const admin = new mongoose.mongo.Admin(mongoose.connection.db)
    let mongoInfo = await admin.buildInfo()
    // logD(mod, fun, `Mongo : ${mongoInfo.version}`)
    return mongoInfo.version
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const DAY_IN_S = 24 * 60 * 60
const MONTH_IN_S = 30 * DAY_IN_S
const MONTH_IN_MS = MONTH_IN_S * 1000

export const serveFavicon = (req, res) => {
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
