
/**
 * Joins several string argument with the character on which the function is called
 * This is basically the reverse of the String split function, with the difference that we make sure
 * the merging character is not duplicated
 * @param {...string} args strings to be joined
 * @return {string}
 */
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

const twoDigits = (n) => `${n}`.padStart(2, '0')

/**
 * Format a date string
 * @param {string | number} date A date
 * @return {string} A date in format YYYY.MM.DD hh:mm:ss
 */
export const getLocaleFormatted = (date) => {
  const d = new Date(date)
  return (
    `${twoDigits(d.getDate())}/${twoDigits(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}:${twoDigits(d.getSeconds())}`
  )
}

export const timeEpochMs = (delayMs = 0) => new Date().getTime() + delayMs
export const timeEpochS = (delayS = 0) => Math.floor(new Date().getTime() / 1000) + delayS

export const lastMonth = () => new Date(new Date().getTime() - 2592000000)

/**
 * Displays a JSON object content
 * @param {Object} obj a JSON object
 * @param {BigInt} option adds indentation
 * @return {string} The JSON object as a string
 */
export const showObj = (obj, option = 2) => {
  try {
    return `${JSON.stringify(obj, null, option).replace(/\\"/g, '"')}${option != null ? '\n' : ''}`
  } catch (err) {
    return `${obj}`
  }
}

export const getObjFormUrl = (formUrl, objType = '', queryParams = '') =>
  formUrl + objType + queryParams

export const ensureEndsWithSlash = (url) => (`${url}`.endsWith('/') ? url : `${url}/`)

export const pathJoin = (...args) => '/'.merge(...args)

export const getCookie = (name) =>
  document.cookie
    ?.split('; ')
    ?.find((row) => row.startsWith(`${name}`))
    ?.split('=')[1]
