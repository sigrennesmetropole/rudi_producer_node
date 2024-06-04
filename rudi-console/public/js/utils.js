'use strict'

/**
 * Joins several string arguments with the character on which the function is called.
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

export const pathJoin = (...args) => '/'.merge(...args)

export const lastElementOfArray = (anArray) =>
  !Array.isArray(anArray) ? null : anArray[anArray.length - 1]

/**
 * Get the extension of a file name
 */
export const getFileExtension = (fileName) => lastElementOfArray(`${fileName}`.split('.'))

/**
 * Split an input string with an array of single characters
 * @param {*} strInput the input string
 * @param {*} delimiters an array of single characters
 * @returns the splitted string
 */
export const multiSplit = (inputStr, singleCharDelimiterArray, shouldTrim) => {
  if (!inputStr) return []
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
  for (const inputChar of inputStr) {
    let isDelimiter = false
    // Check if the current input character is a delimiter
    for (const delimiter of delimiters) {
      if (inputChar === delimiter) {
        // Current input character is a delimiter
        if (shouldTrim) chunk = chunk.trim()
        if (chunk.length > 0) result.push(chunk)
        chunk = ''
        isDelimiter = true
        break
      }
    }
    if (!isDelimiter) chunk += inputChar
  }
  if (shouldTrim) chunk = chunk.trim()
  if (chunk.length > 0) result.push(chunk)
  return result
}

/**
 * Little utility to enable copying of data inside a RudiForm
 * Mainly for dev purposes
 * @author Florian Desmortreux
 */
export function devPaste(rudiForm) {
  try {
    const devPaste = document.getElementById('dev_paste')
    devPaste.focus()
    devPaste.addEventListener('keydown', function (e) {
      if (e.key == 'Enter' && !e.shiftKey) {
        let val
        try {
          val = JSON.parse(devPaste.value)
        } catch (e) {
          console.error(e)
        }
        e.preventDefault()
        e.stopPropagation()
        rudiForm.setValue(val)
        if (e.ctrlKey) rudiForm.showResultOverlay()
      }
    })
  } catch (e) {
    console.error('E [devPaste] ERR: ', e)
  }
}

/**
 *
 * @param {String} name Name of the cookie we want to access.
 *  Only non-httpOnly cookies are accessible by definition
 * @returns the value of the cookie
 */
export const getCookie = (name = 'consoleToken') => {
  const cookieDecoded = decodeURIComponent(document.cookie)
  const cookieArray = cookieDecoded.split('; ')
  let foundCookie
  for (const cookie of cookieArray) {
    if (cookie.startsWith(`${name}=`)) {
      foundCookie = cookie.substring(name.length + 1)
      break
    }
  }
  if (!foundCookie) {
    console.error(`Cookie not found: ${name}`)
    throw new Error('Cookie not found')
  }
  if (!checkCookieExp(foundCookie)) {
    console.error(`Cookie not valid: ${name}`)
    throw new Error('Cookie not valid')
  }
  return foundCookie
}

/**
 *
 * @param {*} cookieStr
 * @returns
 */
export const checkCookieExp = (cookieStr) => {
  if (!cookieStr) return false
  try {
    const payloadB64url = cookieStr.split('.')[1]
    const payload = JSON.parse(decodeBase64url(payloadB64url))
    const exp = payload.exp
    return nowEpochS() < exp
  } catch (e) {
    console.error('[checkCookieExp]', e)
    return false
  }
}

export const nowEpochS = () => Math.floor(new Date().getTime() / 1000)

export const padEndModulo = (str, base, padSign) => {
  const modulo = str.length % base
  return modulo === 0
    ? str
    : str.padEnd(str.length + base - modulo, padSign?.substring(0, 1) || '=')
}
export const padWithEqualSignBase4 = (str) => padEndModulo(str, 4, '=')

export const base64urlToBase64 = (b64urlStr) => b64urlStr.replace(/\+/g, '-').replace(/\//g, '_')

export const decodeBase64url = (b64urlStr) => {
  const paddedB64Str = base64urlToBase64(b64urlStr)
  return decodeURIComponent(atob(paddedB64Str))
}
