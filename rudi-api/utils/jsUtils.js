/* eslint-disable no-console */

const mod = 'utils'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { inspect } from 'util'
import objectPath from 'object-path'

import _ from 'lodash'
const { floor, pick } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { TRACE } from '../config/confApi.js'

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
// String
// -------------------------------------------------------------------------------------------------
export const isString = (str) => typeof str === 'string'

export const padWithEqualSignBase4 = (str) => pad(str, 4, '=')
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
export const pad = (str, base, padSign) => {
  const fun = 'pad'
  // consoleLog(mod, fun, `base = ${base}, sign = '${padSign}'`)
  try {
    padSign = padSign?.substring(0, 1)
    const modulo = str.length % base
    if (modulo === 0) return str

    let padding = padSign
    for (let i = modulo; i > base; i++) {
      padding = `${padding}${padSign}`
    }
    // consoleLog(mod, fun, `padding: ${padding}`)
    return `${str}${padding}`
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
  var norm = Math.floor(Math.abs(num))
  return (norm < 10 ? '0' : '') + norm
}

export const padZerosLeft = (number, nbZeros = 2) => String(number).padStart(nbZeros, '0')

// -------------------------------------------------------------------------------------------------
// Dates
// -------------------------------------------------------------------------------------------------
export const nowISO = () => new Date().toISOString()

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

export const nowEpochMs = () => new Date().getTime()
export const nowEpochS = () => floor(nowEpochMs() / 1000)

export const dateEpochSToIso = (utcSeconds) => {
  const fun = 'dateEpochSToIso'
  try {
    return dateEpochMsToIso(utcSeconds * 1000)
  } catch (err) {
    consoleErr(mod, fun, `input: ${utcSeconds} -> err: ${err}`)
  }
}

export const dateEpochMsToIso = (utcMs) => {
  const fun = 'dateEpochMsToIso'
  try {
    return new Date(utcMs).toISOString()
  } catch (err) {
    consoleErr(mod, fun, `input: ${utcMs} -> err: ${err}`)
  }
}
// const [date, month, year] = new Date().toLocaleDateString('fr-FR').split('/')
// const [h, m, s] = new Date().toLocaleTimeString('fr-FR').split(/:| /)
// return `${year}/${month}/${date} ${h}:${m}:${s}`

// -------------------------------------------------------------------------------------------------
// Strings
// -------------------------------------------------------------------------------------------------
/**
 * Split an input string with an array of single characters
 * @param {*} inputStr the input string
 * @param {*} singleCharDelimiterArray an array of single characters
 * @param {*} shouldTrim true if each chunk should be trimmed
 * @returns the splitted string
 */
export const multiSplit = (inputStr, singleCharDelimiterArray, shouldTrim) => {
  if (!Array.isArray(singleCharDelimiterArray) && singleCharDelimiterArray.length > 0)
    throw new Error('Wrong use, second parameter should be an array')

  // Converts input delimiters array elements into string
  const delimiters = []
  singleCharDelimiterArray.map((c) => {
    if (`${c}`.length !== 1)
      throw new Error('Wrong use, second parameter should be an array of single character strings')
    delimiters.push(`${c}`)
  })

  // Examine input string, one character at a time
  const result = []
  let chunk = ''
  for (let i = 0; i < inputStr.length; i++) {
    let isDelimiter = false
    // Check if the current input character is a delimiter
    for (let j = 0; j < delimiters.length; j++) {
      if (inputStr[i] === delimiters[j]) {
        // Current input character is a delimiter
        if (shouldTrim) chunk = chunk.trim()
        if (chunk.length > 0) result.push(chunk)
        chunk = ''
        isDelimiter = true
        break
      }
    }
    if (!isDelimiter) chunk += inputStr[i]
  }
  if (shouldTrim) chunk = chunk.trim()
  if (chunk.length > 0) result.push(chunk)
  return result
}
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

export const getSubProp = (obj, propArray) => objectPath.get(obj, propArray)
export const setSubProp = (obj, propArray, value) => objectPath.set(obj, propArray, value)

// -------------------------------------------------------------------------------------------------
// JSON
// -------------------------------------------------------------------------------------------------
export const isEmpty = (prop) => {
  const strProp = JSON.stringify(prop)
  return prop == '' || prop == '{}' || prop == '[]' || strProp == '{}' || strProp == '[]'
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
export const deepClone = (jsonObject) => {
  return JSON.parse(JSON.stringify(jsonObject))
}

export const logWhere = (srcMod, srcFun) =>
  !srcMod ? srcFun : !srcFun ? srcMod : `${srcMod} . ${srcFun}`

export const displayStr = (srcMod, srcFun, msg) =>
  `[ ${logWhere(srcMod, srcFun)} ] ${msg !== '' ? msg : '<-'}`

export const consoleLog = (srcMod, srcFun, msg) =>
  console.log('D', nowLocaleFormatted(), displayStr(srcMod, srcFun, msg))

export const consoleErr = (srcMod, srcFun, msg) =>
  console.error(
    'E',
    nowLocaleFormatted(),
    displayStr(srcMod, srcFun, !msg ? undefined : msg[TRACE] || msg)
  )
