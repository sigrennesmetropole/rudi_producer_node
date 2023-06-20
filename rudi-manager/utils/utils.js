const { floor } = require('lodash')

// ---- Dates
exports.timeEpochMs = (delayMs = 0) => new Date().getTime() + delayMs
exports.timeEpochS = (delayS = 0) => floor(this.timeEpochMs() / 1000) + delayS

exports.nowFormatted = () => new Date().toISOString().replace(/T\./, ' ').replace('Z', '')

// ---- Strings
exports.toBase64 = (data) => this.convertEncoding(data, 'utf-8', 'base64')
exports.toBase64url = (str) => this.convertEncoding(str, 'utf-8', 'base64url')
exports.decodeBase64 = (data) => this.convertEncoding(data, 'base64', 'utf-8')
exports.decodeBase64url = (data) => this.convertEncoding(data, 'base64url', 'utf-8')

exports.convertEncoding = (data, fromEncoding, toEncoding) => {
  try {
    const dataStr = data
    // if (typeof data === 'object') dataStr = JSON.stringify(data)
    return Buffer.from(dataStr, fromEncoding).toString(toEncoding)
  } catch (err) {
    throw err
  }
}

exports.toInt = (str) => {
  const i = parseInt(str, 10)
  // console.log('T (toInt)', str, '->', i);
  return Number.isNaN(i) || `${i}` !== str ? str : i
}

// ---- URL
exports.getCompletedUrl = (baseUrl, subUrl) => {
  if (!subUrl) return baseUrl
  if (`${subUrl}`.startsWith('/')) subUrl = `${subUrl}`.substring(1)
  return `${baseUrl}`.endsWith('/') ? `${baseUrl}${subUrl}` : `${baseUrl}/${subUrl}`
}
