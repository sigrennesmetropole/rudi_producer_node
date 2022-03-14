'use strict'

const mod = 'logCtrl'
// ------------------------------------------------------------------------------------------------
// External dependencies
// ------------------------------------------------------------------------------------------------
const { pick } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  URL_PV_LOGS_ACCESS,
  QUERY_LIMIT,
  QUERY_OFFSET,
  OBJ_LOGS,
  QUERY_FILTER,
  QUERY_FIELDS,
  QUERY_SORT_BY,
  QUERY_SEARCH_TERMS,
  QUERY_COUNT_BY,
  ACT_SEARCH,
} = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const { RudiError } = require('../utils/errors')
const { isEmptyArray } = require('../utils/jsUtils')

const { getLogEntries, searchObjects } = require('../db/dbQueries')
const { parseQueryParameters } = require('./genericController')

// ------------------------------------------------------------------------------------------------
// Logs API access
// ------------------------------------------------------------------------------------------------

exports.getLogs = async (req, reply) => {
  const fun = 'getLogs'
  try {
    log.d(mod, fun, `GET ${URL_PV_LOGS_ACCESS}`)
    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(OBJ_LOGS, req.url)
    } catch (err) {
      log.w(mod, fun, err)
      return []
    }
    const options = pick(parsedParameters, [QUERY_LIMIT, QUERY_OFFSET, QUERY_FILTER, QUERY_FIELDS])

    const logLines = await getLogEntries(options)
    return logLines //.map((logLine) => logLineToString(logLine))
  } catch (err) {
    // consoleErr(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.searchLogs = async (req, reply) => {
  const fun = 'searchObjects'
  log.t(mod, fun, `< GET ${URL_PV_LOGS_ACCESS}/${ACT_SEARCH}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = OBJ_LOGS

    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(objectType, req.url)
    } catch (err) {
      log.w(mod, fun, err)
      return []
    }

    // If there w
    if (isEmptyArray(parsedParameters)) {
      log.w(mod, fun, 'No search parameters given')
      return []
    } else {
      // log.w(mod, fun, `Parsed parameters: ${beautify(parsedParameters)}`)
    }

    const options = pick(parsedParameters, [
      QUERY_LIMIT,
      QUERY_OFFSET,
      QUERY_SORT_BY,
      QUERY_FILTER,
      QUERY_FIELDS,
      QUERY_SEARCH_TERMS,
      QUERY_COUNT_BY,
    ])
    const objectList = await searchObjects(objectType, options)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
