const twoDigits = (n) => `${n}`.padStart(2, '0')

/**
 * Format a date string
 * @param {string | number} date A date
 * @return {string} A date in format YYYY.MM.DD hh:mm:ss
 */
exports.getLocaleFormatted = (date) => {
  const d = new Date(date)
  return (
    `${twoDigits(d.getDate())}/${twoDigits(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}:${twoDigits(d.getSeconds())}`
  )
}

exports.timeEpochMs = (delayMs = 0) => new Date().getTime() + delayMs
exports.timeEpochS = (delayS = 0) => Math.floor(new Date().getTime() / 1000) + delayS

exports.lastMonth = () => new Date(new Date().getTime() - 2592000000)

/**
 * Displays a JSON object content
 * @param {Object} obj a JSON object
 * @param {BigInt} option adds indentation
 * @return {string} The JSON object as a string
 */
exports.showObj = (obj, option = 2) => {
  try {
    return `${JSON.stringify(obj, null, option).replace(/\\"/g, '"')}${option != null ? '\n' : ''}`
  } catch (err) {
    return `${obj}`
  }
}

exports.getObjFormUrl = (formUrl, objType = '', queryParams = '') => formUrl + objType + queryParams
