'use strict'

const mod = 'files'

// ------------------------------------------------------------------------------------------------
// External dependecies
// ------------------------------------------------------------------------------------------------
const fs = require('fs')
const ini = require('ini')
const utils = require('./jsUtils')

// ------------------------------------------------------------------------------------------------
// Functions
// ------------------------------------------------------------------------------------------------

// Local configuration file extraction
exports.readIniFile = (confFile) => {
  const fun = 'readIniFile'
  try {
    const fileContent = fs.readFileSync(`${confFile}`, 'utf-8')
    // utils.consoleLog(mod, fun, `Conf file: ${confFile}`)
    const conf = ini.parse(fileContent)
    return conf
  } catch (err) {
    utils.consoleErr(mod, fun, `Couldn't read file '${confFile}': ${err}`)
    throw new Error(`Couldn't read file '${confFile}': ${err}`)
  }
}
