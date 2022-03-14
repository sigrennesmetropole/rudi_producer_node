/* eslint-disable no-console */
'use strict'

const mod = 'utils'

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------
const util = require('util')
const { floor, pick } = require('lodash')
const dateTime = require('date-and-time')

// -----------------------------------------------------------------------------
// String
// -----------------------------------------------------------------------------
exports.toBase64 = (str) => this.convertEncoding(str, 'utf-8', 'base64')
exports.toBase64url = (str) => this.convertEncoding(str, 'utf-8', 'base64url')
exports.decodeBase64 = (data) => this.convertEncoding(data, 'base64', 'utf-8')
exports.decodeBase64url = (data) => this.convertEncoding(data, 'base64url', 'utf-8')

exports.convertEncoding = (data, fromEncoding, toEncoding) => {
  const fun = 'convertEncoding'
  try {
    let dataStr = data
    // if (typeof data === 'object') dataStr = JSON.stringify(data)
    return Buffer.from(dataStr, fromEncoding).toString(toEncoding)
  } catch (err) {
    this.consoleErr(mod, fun, err)
    throw err
  }
}

// -----------------------------------------------------------------------------
// Dates
// -----------------------------------------------------------------------------
exports.nowISO = () => {
  return new Date().toISOString()
}

exports.nowEpochMs = () => {
  return new Date().getTime()
}
exports.nowEpochS = () => {
  return floor(this.nowEpochMs() / 1000)
}
exports.dateEpochSToIso = (utcSeconds) => {
  const fun = 'dateEpochSToIso'
  try {
    return this.dateEpochMsToIso(utcSeconds * 1000)
  } catch (err) {
    this.consoleErr(mod, fun, `input: ${utcSeconds} -> err: ${err}`)
  }
}
exports.dateEpochMsToIso = (utcMs) => {
  const fun = 'dateEpochMsToIso'
  try {
    return new Date(utcMs).toISOString()
  } catch (err) {
    this.consoleErr(mod, fun, `input: ${utcMs} -> err: ${err}`)
  }
}

exports.LOG_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss SSS'

exports.nowLocaleFormatted = () => {
  return dateTime.format(new Date(), this.LOG_DATE_FORMAT)
  // const [date, month, year] = new Date().toLocaleDateString('fr-FR').split('/')
  // const [h, m, s] = new Date().toLocaleTimeString('fr-FR').split(/:| /)
  // return `${year}/${month}/${date} ${h}:${m}:${s}`
}

// -----------------------------------------------------------------------------
// Arrays
// -----------------------------------------------------------------------------
exports.isString = (str) => {
  return typeof str === 'string'
}

// -----------------------------------------------------------------------------
// Arrays
// -----------------------------------------------------------------------------
exports.isArray = (anArray) => {
  return Array.isArray(anArray)
}

exports.isNotEmptyArray = (anArray) => {
  return Array.isArray(anArray) && anArray.length > 0
}

exports.isEmptyArray = (anArray) => {
  return Array.isArray(anArray) && anArray.length === 0
}

// -----------------------------------------------------------------------------
// Objects
// -----------------------------------------------------------------------------
exports.isEmptyObject = (obj) => {
  const fun = 'isEmptyObject'
  // this.consoleLog(mod, fun, `isString: ${this.isString(obj)}`)
  // this.consoleLog(mod, fun, `isArray: ${this.isArray(obj)}`)
  // this.consoleLog(mod, fun, `keys(obj).length: ${Object.keys(obj).length === 0}`)
  return !this.isString(obj) && !this.isArray(obj) && Object.keys(obj).length === 0
}

exports.isNotEmptyObject = (obj) => {
  return obj && Object.keys(obj).length > 0
}

exports.NOT_FOUND = '!_not_found_!'
exports.quietAccess = (obj, prop) => {
  try {
    return obj[prop]
  } catch {
    return this.NOT_FOUND
  }
}


/**
 * Safe access to a property of a JSON object: ensures the property is defined
 * @param {JSON} jsonObject
 * @param {String} jsonProperty
 * @returns {String} The property value
 * @throws object property is missing
 */
 exports.accessProperty = (jsonObject, jsonProperty) => {
  // log.d(mod, fun, `Accessing property '${jsonProperty}' from object '${utils.beautify(jsonObject)}'`)
  const value = jsonObject[jsonProperty]
  // log.d(mod, fun, `=> value = ${utils.beautify(value)}`)
  if (!value) throw new Error(`The property '${jsonProperty}' should be defined`)
  // log.d(mod, fun, `=> ${jsonProperty} = ${utils.beautify(value)}`)
  return value
}


/** !! TODO: treat object arrays! */
exports.getPaths = async (root, parentKeyName) => {
  // if obj has no keys, abort
  if (this.isString(root) || this.isArray(root) || Object.keys(root).length === 0) {
    return []
  }
  const keys = Object.keys(root)
  let rootSubPaths = []

  // console.log(this.beautify(root))

  await Promise.all(
    keys.map(async (key) => {
      const subObj = root[key]
      if (!subObj) return
      const keyPath = parentKeyName ? `${parentKeyName}.${key}` : `${key}`
      // console.log(`keyPath: ${keyPath}`)
      rootSubPaths.push(keyPath)
      if (this.isNotEmptyObject(subObj)) {
        const keyPaths = await this.getPaths(subObj, keyPath)
        rootSubPaths = rootSubPaths.concat(keyPaths)
        return true
      } else return false
    })
  )
  // console.log(this.beautify(rootSubPaths))
  return rootSubPaths
}

exports.listPick = (objList, fieldList) => {
  const reshapedList = objList.map((obj) => pick(obj, fieldList))
  return reshapedList
}

exports.filterOnValue = async (obj, predicate) => {
  const result = {}

  await Promise.all(
    Object.keys(obj).map((key) => {
      if (predicate(obj[key])) {
        result[key] = obj[key]
      }
      return result[key]
    })
  )

  return result
}

// -----------------------------------------------------------------------------
// JSON
// -----------------------------------------------------------------------------
exports.isEmpty = (prop) => {
  const strProp = JSON.stringify(prop)
  return prop === '' || prop === '{}' || prop === '[]' || strProp === '{}' || strProp === '[]'
}

/* 
  TRUE:
    !null
    !undefined
    !''

  FALSE:
    !{}
    ![]
*/
exports.isNothing = (prop) => {
  return !prop || this.isEmpty(prop)
}

/**
 * Custom JSON beautifying function
 * @param {JSON} jsonObject: a JSON object
 * @param {String or number} options: JSON.stringify options. 4 or '\t' make it possible
 *                                    to display the JSON on several lines
 * @returns {String} JSON.stringify options
 */
exports.beautify = (jsonObject, option) => {
  try {
    return `${JSON.stringify(jsonObject, null, option).replace(/\\"/g, '"')}${
      option != null ? '\n' : ''
    }`
  } catch (err) {
    return `${util.inspect(jsonObject)}`
  }
}

/**
 * Clone a (JSON) object through JSON.stringify then JSON.parse (beware, it can be slow)
 * @param {JSON} jsonObject
 * @returns {JSON} The deep (dissociated) clone of the input object
 * @throws parameter 'jsonObject' is undefined, null or empty
 */
exports.deepClone = (jsonObject) => {
  return JSON.parse(JSON.stringify(jsonObject))
}

// -----------------------------------------------------------------------------
// Basic logging
// -----------------------------------------------------------------------------
exports.separateLogs = (insertStr) => {
  const logSeparator = !insertStr
    ? `--------------------------------------------------------------------------`
    : `---------------------------------------------------------------[${insertStr}]--`
  console.log(this.nowLocaleFormatted(), logSeparator)
  return logSeparator
}

exports.logWhere = (loc_mod, loc_fun) => {
  return !loc_mod ? loc_fun : !loc_fun ? loc_mod : `${loc_mod} . ${loc_fun}`
}

exports.displayStr = (loc_mod, loc_fun, msg) => {
  return `[ ${this.logWhere(loc_mod, loc_fun)} ] ${msg !== '' ? msg : '<-'}`
}
exports.consoleLog = (loc_mod, loc_fun, msg) => {
  console.log(this.nowLocaleFormatted(), '.debug.', this.displayStr(loc_mod, loc_fun, msg))
}

exports.consoleErr = (loc_mod, loc_fun, msg) => {
  const errMsg = msg.err || msg
  console.error(this.nowLocaleFormatted(), '.error.', this.displayStr(loc_mod, loc_fun, errMsg))
}

// -----------------------------------------------------------------------------
// Crypto
// -----------------------------------------------------------------------------
