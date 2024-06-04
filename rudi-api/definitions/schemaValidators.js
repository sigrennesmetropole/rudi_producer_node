// const mod = 'valid'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------

// \d : digit character == \d
// \w : word character == [0-9a-zA-Z_]
// /i (at the end) : expression is case insensitive

// -------------------------------------------------------------------------------------------------
// Generic functions
// -------------------------------------------------------------------------------------------------
export const validateSchema = (schemaStr, regExPattern) => {
  return !!schemaStr.match(new RegExp(regExPattern))
}

// -------------------------------------------------------------------------------------------------
// Word
// -------------------------------------------------------------------------------------------------
export const REGEX_WORD = /^\w[\w-]*$/
export const VALID_WORD = [REGEX_WORD, `'{VALUE}' contains illegal characters`]

// -------------------------------------------------------------------------------------------------
// Epoch time
// -------------------------------------------------------------------------------------------------
export const EPOCH_MS = /^\d{13}$/
export const VALID_EPOCH_MS = [EPOCH_MS, `'{VALUE}' is not a valid Epoch time in milliseconds`]

export const EPOCH_S = /^\d{10}$/
export const VALID_EPOCH_S = [EPOCH_S, `'{VALUE}' is not a valid Epoch time in seconds`]

// -------------------------------------------------------------------------------------------------
// UUID
// -------------------------------------------------------------------------------------------------
export const REGEX_UUID = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
export const VALID_UUID = [REGEX_UUID, `'{VALUE}' is not a valid UUID v4`]

export const isUUID = (id) => validateSchema(id, REGEX_UUID)

// -------------------------------------------------------------------------------------------------
// DOI
// -------------------------------------------------------------------------------------------------
// source: https://www.crossref.org/blog/dois-and-matching-regular-expressions/
// alternative: https://github.com/regexhq/doi-regex/blob/master/index.js
export const REGEX_DOI = /^10.\d{4,9}\/[-.;()/:\w]+$/i
export const VALID_DOI = [REGEX_DOI, `'{VALUE}' is not a valid DOI`]

// -------------------------------------------------------------------------------------------------
// URI
// -------------------------------------------------------------------------------------------------
export const REGEX_URI =
  /^(https?|ftp):\/\/([\w-]+(\.[\w-]+)+|(:\d+)?)(([\w.,@?^=%:\/~+#-]|&amp;)*([\w@?^=%\/~+#-]|&amp;))?$/
export const VALID_URI = [REGEX_URI, `'{VALUE}' is not a valid URI`]

// -------------------------------------------------------------------------------------------------
// E-mail
// -------------------------------------------------------------------------------------------------
export const REGEX_EMAIL =
  /^([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/
export const VALID_EMAIL = [REGEX_EMAIL, `'{VALUE}' is not a valid e-mail`]

// -------------------------------------------------------------------------------------------------
// API version
// -------------------------------------------------------------------------------------------------
export const REGEX_API_VERSION = /^\d+\.\d+(\.\d+)?[a-z]*$/
export const VALID_API_VERSION = [
  REGEX_API_VERSION,
  `'{VALUE}' does not appear to be a valid RUDI API version number! Expected format: '0.0.0abc' `,
]

// -------------------------------------------------------------------------------------------------
// Base 64
// -------------------------------------------------------------------------------------------------
const base64RegexStrict = (charSet) =>
  new RegExp(`${charSet}(${charSet}{4})*(${charSet}{3}|${charSet}{2}=|${charSet}==|===)`)

export const REGEX_B64_STRICT = base64RegexStrict('[a-zA-Z\\d+\\/]')
export const REGEX_B64URL_STRICT = base64RegexStrict('[\\w-]')

export const REGEX_B64_NO_PADDING = '[a-zA-Z\\d+\\/]+'

// -------------------------------------------------------------------------------------------------
// JSON Web Token
// -------------------------------------------------------------------------------------------------
export const REGEX_JWT_ENCODED = /^[\w-]+\.[\w-]+\.([\w-]+={0,3})$/
export const REGEX_JWT_AUTH = /^Bearer [\w-]+\.[\w-]+\.[\w-]+={0,3}$/
export const REGEX_BASIC_AUTH = /^Basic [\w-]+={0,3}$/

// -------------------------------------------------------------------------------------------------
// Request protection
// -------------------------------------------------------------------------------------------------
export const REGEX_URL_WRONG_CHAR = /[\$;\{\}\[\]]/
