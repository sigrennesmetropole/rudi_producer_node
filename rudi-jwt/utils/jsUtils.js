/* eslint-disable no-console */
'use strict'

const mod = 'utils'

// -----------------------------------------------------------------------------
// External dependancies
// -----------------------------------------------------------------------------
import _ from 'lodash'
const { floor } = _

import datetime from 'date-and-time'
const { format: dateFormat } = datetime

import { inspect } from 'util'

// -----------------------------------------------------------------------------
// String
// -----------------------------------------------------------------------------
export const toBase64 = (str) => convertEncoding(str, 'utf-8', 'base64')
export const toBase64url = (str) => convertEncoding(str, 'utf-8', 'base64url')
export const decodeBase64 = (data) => convertEncoding(data, 'base64', 'utf-8')
export const decodeBase64url = (data) => convertEncoding(data, 'base64url', 'utf-8')

export function convertEncoding(data, fromEncoding, toEncoding) {
  const fun = 'convertEncoding'
  try {
    let dataStr = data
    // if (typeof data === 'object') dataStr = JSON.stringify(data)
    return Buffer.from(dataStr, fromEncoding).toString(toEncoding)
  } catch (err) {
    consoleErr(mod, fun, err)
    throw err
  }
}

// -----------------------------------------------------------------------------
// Dates
// -----------------------------------------------------------------------------
export const nowISO = () => new Date().toISOString()
export const nowEpochMs = () => new Date().getTime()
export const nowEpochS = () => floor(nowEpochMs() / 1000)

export const dateEpochSToIso = (utcSeconds) => dateEpochMsToIso(utcSeconds * 1000)
export const dateEpochMsToIso = (utcMs) => new Date(utcMs).toISOString()

export const LOG_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss SSS'

export const nowLocaleFormatted = () => dateFormat(new Date(), LOG_DATE_FORMAT)

// -----------------------------------------------------------------------------
// Arrays
// -----------------------------------------------------------------------------
export const isString = (str) => typeof str === 'string'

// -----------------------------------------------------------------------------
// Arrays
// -----------------------------------------------------------------------------
export const isArray = (anArray) => Array.isArray(anArray)
export const isNotEmptyArray = (anArray) => Array.isArray(anArray) && anArray.length > 0
export const isEmptyArray = (anArray) => Array.isArray(anArray) && anArray.length === 0

// -----------------------------------------------------------------------------
// Objects
// -----------------------------------------------------------------------------
export const isEmptyObject = (obj) =>
  typeof obj === 'object' && !isArray(obj) && Object.keys(obj).length === 0

export const isNotEmptyObject = (obj) => obj && Object.keys(obj).length > 0

export const NOT_FOUND = '!_not_found_!'
export function quietAccess(obj, prop) {
  try {
    return obj[prop]
  } catch {
    return NOT_FOUND
  }
}

/**
 * Safe access to a property of a JSON object: ensures the property is defined
 * @param {JSON} jsonObject
 * @param {String} jsonProperty
 * @returns {String} The property value
 * @throws object property is missing
 */
export function accessProperty(jsonObject, jsonProperty) {
  // log.d(mod, fun, `Accessing property '${jsonProperty}' from object '${utils.beautify(jsonObject)}'`)
  const value = jsonObject[jsonProperty]
  // log.d(mod, fun, `=> value = ${utils.beautify(value)}`)
  if (!value) throw new Error(`The property '${jsonProperty}' should be defined`)
  // log.d(mod, fun, `=> ${jsonProperty} = ${utils.beautify(value)}`)
  return value
}

// -----------------------------------------------------------------------------
// JSON
// -----------------------------------------------------------------------------
export function isEmpty(prop) {
  const strProp = beautify(prop)
  return prop === '' || prop === '{}' || prop === '[]' || strProp === '{}' || strProp === '[]'
}

export const isNothing = (prop) => !prop || isEmpty(prop)

/**
 * Custom JSON beautifying function
 * @param {JSON} jsonObject: a JSON object
 * @param {String or number} options: JSON.stringify options. 4 or '\t' make it possible
 *                                    to display the JSON on several lines
 * @returns {String} JSON.stringify options
 */
export function beautify(jsonObject, option) {
  try {
    return `${JSON.stringify(jsonObject, null, option).replace(/\\"/g, '"')}${
      option != null ? '\n' : ''
    }`
  } catch (err) {
    return `${inspect(jsonObject)}`
  }
}

/**
 * Clone a (JSON) object through JSON.stringify then JSON.parse (beware, it can be slow)
 * @param {JSON} jsonObject
 * @returns {JSON} The deep (dissociated) clone of the input object
 * @throws parameter 'jsonObject' is undefined, null or empty
 */
export const deepClone = (jsonObject) => JSON.parse(beautify(jsonObject))

// -----------------------------------------------------------------------------
// Basic logging
// -----------------------------------------------------------------------------
export function separateLogs(insertStr) {
  const logSeparator = !insertStr
    ? `--------------------------------------------------------------------------`
    : `---------------------------------------------------------------[${insertStr}]--`
  console.log(nowLocaleFormatted(), logSeparator)
  return logSeparator
}

export function logWhere(loc_mod, loc_fun) {
  return !loc_mod ? loc_fun : !loc_fun ? loc_mod : `${loc_mod} . ${loc_fun}`
}

export function displayStr(loc_mod, loc_fun, msg) {
  return `[ ${logWhere(loc_mod, loc_fun)} ] ${msg !== '' ? msg : '<-'}`
}
export function consoleLog(loc_mod, loc_fun, msg) {
  console.log(nowLocaleFormatted(), '.debug.', displayStr(loc_mod, loc_fun, msg))
}

export function consoleErr(loc_mod, loc_fun, msg) {
  const errMsg = msg.err || msg
  console.error(nowLocaleFormatted(), '.error.', displayStr(loc_mod, loc_fun, errMsg))
}

// -----------------------------------------------------------------------------
// Crypto
// -----------------------------------------------------------------------------
