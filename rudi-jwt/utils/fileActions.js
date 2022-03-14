'use strict'

const mod = 'files'

// -----------------------------------------------------------------------------
// External dependecies
// -----------------------------------------------------------------------------
const fs = require('fs')
const ini = require('ini')
const utils = require('./jsUtils')

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

// Local configuration file extraction
exports.readIniFile = (confFile, debug) => {
  const fun = 'readIniFile'
  try {
    const fileContent = fs.readFileSync(`${confFile}`, 'utf-8')
    utils.consoleLog(mod, fun, `Conf file found at ${confFile}`)
    // if (debug) utils.consoleLog(mod, fun, `INI file content: ${fileContent}`)
    const conf = ini.parse(fileContent)
    // if (debug) utils.consoleLog(mod, fun, `Conf: ${utils.beautify(conf)}`)
    return conf
  } catch (err) {
    utils.consoleErr(mod, fun, `Couldn't read file '${confFile}': ${err}`)
    return false
  }
}
