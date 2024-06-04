const mod = 'files'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { readFileSync } from 'fs'
import { parse } from 'ini'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { consoleErr, consoleLog } from './jsUtils.js'

// -------------------------------------------------------------------------------------------------
// Functions
// -------------------------------------------------------------------------------------------------

/** Local configuration file extraction */
export const readIniFile = (confFile) => {
  const fun = 'readIniFile'
  try {
    consoleLog(mod, fun, confFile)
    const fileContent = readFileSync(`${confFile}`, 'utf-8')
    const conf = JSON.parse(JSON.stringify(parse(fileContent)))
    return conf
  } catch (err) {
    consoleErr(mod, fun, `Couldn't read file '${confFile}': ${err}`)
    throw new Error(`Couldn't read file '${confFile}': ${err}`)
  }
}

/** Reads a JSON file and returns a Javascript object */
export const readJsonFile = (jsonFile) => {
  const fun = 'readJsonFile'
  let jsonStr
  try {
    jsonStr = readFileSync(jsonFile, 'utf-8')
  } catch (err) {
    consoleErr(mod, fun, `Couldn't read file '${jsonFile}': ${err}`)
    throw new Error(`Couldn't read file '${jsonFile}': ${err}`)
  }
  try {
    return JSON.parse(jsonStr)
  } catch (err) {
    consoleErr(mod, fun, `Couldn't parse file '${jsonFile}': ${err}`)
    throw new Error(`Couldn't parse file '${jsonFile}': ${err}`)
  }
}
