'use strict'

const mod = 'files'

// -----------------------------------------------------------------------------
// External dependecies
// -----------------------------------------------------------------------------
import { readFileSync } from 'fs'
import { parse } from 'ini'

// -----------------------------------------------------------------------------
// Internal dependecies
// -----------------------------------------------------------------------------
import { consoleErr, consoleLog } from './jsUtils.js'

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

// Local configuration file extraction
export function readIniFile(confFile) {
  const fun = 'readIniFile'
  try {
    const fileContent = readFileSync(`${confFile}`, 'utf-8')
    consoleLog(mod, fun, `Conf file found at ${confFile}`)
    const conf = parse(fileContent)
    return conf
  } catch (err) {
    consoleErr(mod, fun, `Couldn't read file '${confFile}': ${err}`)
    return false
  }
}
