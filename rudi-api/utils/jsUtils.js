/* eslint-disable no-console */

const mod = 'utils'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import objectPath from 'object-path'
import { inspect } from 'util'

import _ from 'lodash'
const { pick } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { TRACE } from '../config/constApi.js'

// -------------------------------------------------------------------------------------------------
// Basic logging
// -------------------------------------------------------------------------------------------------

export const LOG_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss SSS'
export const nowLocaleFormatted = () =>
  new Date().toISOString().replace(/T\./, ' ').replace('Z', '')
// datetime.format(new Date(), LOG_DATE_FORMAT)

const BASE_LINE =
  '=====================================================' +
  '====================================================='
export const separateLogs = (insertStr, shouldDisplayDate) => {
  const dateStr = shouldDisplayDate ? `${nowLocaleFormatted()} ` : ''
  const inputStr = `${insertStr}` ? `[ ${insertStr} ]==` : ''
  const eatenCharacters = dateStr.length + inputStr.length
  // const line = inputStr.padStart(BASE_LINE.length - eatenCharacters, '=')
  const line = BASE_LINE.substring(eatenCharacters)

  const logSeparator = `${dateStr}${line}${inputStr}`

  console.log('D ' + logSeparator)
  return logSeparator
}
separateLogs('Booting', true)

// -------------------------------------------------------------------------------------------------
// Integer
// -------------------------------------------------------------------------------------------------
export const isInt = (n) => Number.isInteger(n)
export const isPositiveInt = (n) => isInt(n) && n >= 0

// -------------------------------------------------------------------------------------------------
// String
// -------------------------------------------------------------------------------------------------
/* eslint no-extend-native: ["error", { "exceptions": ["String"] }] */
String.prototype.merge = function (...args) {
  const argNb = args.length
  if (argNb == 0) return ''
  let finalString = `${args[0]}`
  for (let i = 1; i < argNb; i++) {
    const str = `${args[i]}`
    const mergableStr = str.startsWith(this) ? str : `${this}${str}`
    finalString = !finalString.endsWith(this)
      ? finalString + mergableStr
      : finalString.substring(0, finalString.length - 1) + mergableStr
  }
  return finalString
}

export const pathJoin = (...args) => '/'.merge(...args)

export const isString = (str) => typeof str === 'string'

export const padWithEqualSignBase4 = (str) => padEndModulo(str, 4, '=')
export const toBase64 = (str) => convertEncoding(str, 'utf-8', 'base64')
export const toBase64url = (str) => convertEncoding(str, 'utf-8', 'base64url')
export const toPaddedBase64url = (str) => padWithEqualSignBase4(toBase64url(str))
export const decodeBase64 = (data) => convertEncoding(data, 'base64', 'utf-8')
export const decodeBase64url = (data) => convertEncoding(data, 'base64url', 'utf-8')

export const convertEncoding = (data, fromEncoding, toEncoding) =>
  Buffer.from(typeof data === 'object' ? JSON.stringify(data) : data, fromEncoding).toString(
    toEncoding
  )

/**
 * Adds a sign at the end of a string so that the padded string has a length that is a multiple of a given base.
 * @param {String} str The input string
 * @param {Number} base The number the length of the padded string must be a multiple of
 * @param {String} padSign The character used for the padding
 * @returns
 */
export const padEndModulo = (str, base, padSign) => {
  const fun = 'pad'
  // consoleLog(mod, fun, `base = ${base}, sign = '${padSign}'`)
  try {
    padSign = padSign?.substring(0, 1)
    const modulo = str.length % base
    return modulo === 0 ? str : str.padEnd(str.length + base - modulo, padSign)
  } catch (err) {
    consoleErr(mod, fun, err)
    throw err
  }
}

export const shorten = (str, len) => {
  if (!str) return
  if (str.length < len) return str
  return str.substring(0, len) + '[...]'
}

export const padA1 = (num) => {
  const norm = Math.floor(Math.abs(num))
  return (norm < 10 ? '0' : '') + norm
}

export const padZerosLeft = (number, nbZeros = 2) => `${number}`.padStart(nbZeros, '0')

/**
 * Split an input string with an array of single characters
 * @param {string} inputStr the input string
 * @param {string[]} splitterArray an array of single characters
 * @param {boolean} shouldTrim true if each chunk should be trimmed
 * @returns the splitted string
 */
export const multiSplit = (inputStr, splitterArray, shouldTrim = true) => {
  const splitters = splitterArray.map((d) => d[0]).join('')
  const rgxStr = shouldTrim ? `(?:\\s*[${splitters}]\\s*)+` : `[${splitters}]+`
  return `${inputStr}`.split(RegExp(rgxStr))
}
// -------------------------------------------------------------------------------------------------
// Dates
// -------------------------------------------------------------------------------------------------

export const toISOLocale = (date) => {
  if (!date) date = new Date()

  const isoTimezoneOffset = -date.getTimezoneOffset()
  const dif = isoTimezoneOffset >= 0 ? '+' : '-'

  return (
    date.getFullYear() +
    '-' +
    padA1(date.getMonth() + 1) +
    '-' +
    padA1(date.getDate()) +
    'T' +
    padA1(date.getHours()) +
    ':' +
    padA1(date.getMinutes()) +
    ':' +
    padA1(date.getSeconds()) +
    dif +
    padA1(isoTimezoneOffset / 60) +
    ':' +
    padA1(isoTimezoneOffset % 60)
  )
}

export const timeEpochMs = (delayMs = 0) => new Date().getTime() + delayMs
export const timeEpochS = (delayS = 0) => Math.floor(new Date().getTime() / 1000) + delayS

export const dateToIso = (date) => {
  const fun = 'dateToIso'
  try {
    return (date ? new Date(date) : new Date()).toISOString()
  } catch (err) {
    consoleErr(mod, fun, `input: ${date} -> err: ${err}`)
    throw new Error(`input: ${date} -> err: ${err}`)
  }
}
export const nowISO = () => dateToIso()

export const dateEpochSToIso = (utcSeconds) => {
  const fun = 'dateEpochSToIso'
  try {
    return utcSeconds ? dateEpochMsToIso(utcSeconds * 1000) : nowISO()
  } catch (err) {
    consoleErr(mod, fun, `input: ${utcSeconds} -> err: ${err}`)
    throw new Error(`input: ${utcSeconds} -> err: ${err}`)
  }
}

export const dateEpochMsToIso = (utcMs) => {
  const fun = 'dateEpochMsToIso'
  try {
    return utcMs ? new Date(utcMs).toISOString() : nowISO()
  } catch (err) {
    consoleErr(mod, fun, `input: ${utcMs} -> err: ${err}`)
    throw new Error(`input: ${utcMs} -> err: ${err}`)
  }
}

// const [date, month, year] = new Date().toLocaleDateString('fr-FR').split('/')
// const [h, m, s] = new Date().toLocaleTimeString('fr-FR').split(/:| /)
// return `${year}/${month}/${date} ${h}:${m}:${s}`

export const dateToEpochMs = (date) => new Date(date).getUTCMilliseconds()

// -------------------------------------------------------------------------------------------------
// Arrays
// -------------------------------------------------------------------------------------------------
export const isArray = (anArray) => Array.isArray(anArray)
export const isNotEmptyArray = (anArray) => Array.isArray(anArray) && anArray.length > 0
export const isEmptyArray = (anArray) => Array.isArray(anArray) && anArray.length === 0
export const getLast = (array) => (Array.isArray(array) ? array[array.length - 1] : null)

// -------------------------------------------------------------------------------------------------
// Objects
// -------------------------------------------------------------------------------------------------
export const isObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]'
//Object.keys(obj).length > 0
export const isEmptyObject = (obj) =>
  !isString(obj) && !Array.isArray(obj) && Object.keys(obj).length === 0
export const isNotEmptyObject = (obj) => obj && Object.keys(obj).length > 0

export const NOT_FOUND = '!_not_found_!'
export const quietAccess = (obj, prop) => {
  try {
    if (typeof obj[prop] === 'undefined') return NOT_FOUND
    return obj[prop]
  } catch {
    return NOT_FOUND
  }
}

/** !! TODO: treat object arrays! */
export const getPaths = async (root, parentKeyName) => {
  // if obj has no keys, abort
  if (isString(root) || Array.isArray(root) || Object.keys(root).length === 0) {
    return []
  }
  const keys = Object.keys(root)
  let rootSubPaths = []

  // console.log(beautify(root))

  await Promise.all(
    keys.map(async (key) => {
      const subObj = root[key]
      if (!subObj) return
      const keyPath = parentKeyName ? `${parentKeyName}.${key}` : `${key}`
      // console.log(`keyPath: ${keyPath}`)
      rootSubPaths.push(keyPath)
      if (isNotEmptyObject(subObj)) {
        const keyPaths = await getPaths(subObj, keyPath)
        rootSubPaths = rootSubPaths.concat(keyPaths)
        return true
      } else return false
    })
  )
  // console.log(beautify(rootSubPaths))
  return rootSubPaths
}

export const listPick = (objList, fieldList) => {
  const reshapedList = objList.map((obj) => pick(obj, fieldList))
  return reshapedList
}

export const filterOnValue = async (obj, predicate) => {
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

export const setSubProp = (obj, propArray, value) => objectPath.set(obj, propArray, value)

// -------------------------------------------------------------------------------------------------
// JSON
// -------------------------------------------------------------------------------------------------
export const isEmpty = (prop) => {
  const strProp = JSON.stringify(prop)
  return prop == '' || prop == '{}' || prop == '[]' || strProp == '{}' || strProp == '[]'
}

export const isNothing = (prop) => {
  return !prop || isEmpty(prop)
}

/**
 * Custom JSON beautifying function
 * @param {JSON} jsonObject: a JSON object
 * @param {String or number} options: JSON.stringify options. 4 or '\t' make it possible
 *                                    to display the JSON on several lines
 * @returns {String} JSON.stringify options
 */
export const beautify = (jsonObject, option) => {
  try {
    return isString(jsonObject)
      ? jsonObject
      : `${JSON.stringify(jsonObject, null, option).replace(/\\"/g, '"')}${option != null ? '\n' : ''}`
  } catch (err) {
    return `${jsonToString(jsonObject)}`
  }
}

export const jsonToString = (jsonObject) => inspect(jsonObject, false, 5, true)

/**
 * Clone a (JSON) object through JSON.stringify then JSON.parse (beware, it can be slow)
 * @param {JSON} jsonObject
 * @returns {JSON} The deep (dissociated) clone of the input object
 * @throws parameter 'jsonObject' is undefined, null or empty
 */
export const deepClone = (jsonObject) => JSON.parse(JSON.stringify(jsonObject))

export const logWhere = (srcMod, srcFun) =>
  srcMod && srcFun ? `${srcMod} . ${srcFun}` : srcMod || srcFun

export const displayStr = (srcMod, srcFun, msg = '<-') => `[ ${logWhere(srcMod, srcFun)} ] ${msg}`

export const consoleLog = (srcMod, srcFun, msg = '<-') =>
  console.log('D', nowLocaleFormatted(), displayStr(srcMod, srcFun, msg))

export const consoleErr = (srcMod, srcFun, msg = 'No error message :(') =>
  console.error('E', nowLocaleFormatted(), displayStr(srcMod, srcFun, msg[TRACE] || msg))
