const mod = 'logCtrl'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
const { pick } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
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
} from '../config/confApi.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logD, logT, logW } from '../utils/logging.js'
import { RudiError } from '../utils/errors.js'
import { isEmptyArray } from '../utils/jsUtils.js'

import { getLogEntries, searchDbObjects } from '../db/dbQueries.js'
import { parseQueryParameters } from '../utils/parseRequest.js'

// -------------------------------------------------------------------------------------------------
// Logs API access
// -------------------------------------------------------------------------------------------------

export const getLogs = async (req, reply) => {
  const fun = 'getLogs'
  try {
    logD(mod, fun, `GET ${URL_PV_LOGS_ACCESS}`)
    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(OBJ_LOGS, req.url)
    } catch (err) {
      logW(mod, fun, err)
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

export const searchLogs = async (req, reply) => {
  const fun = 'searchObjects'
  logT(mod, fun, `< GET ${URL_PV_LOGS_ACCESS}/${ACT_SEARCH}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = OBJ_LOGS

    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(objectType, req.url)
    } catch (err) {
      logW(mod, fun, err)
      return []
    }

    // If there w
    if (isEmptyArray(parsedParameters)) {
      logW(mod, fun, 'No search parameters given')
      return []
    } else {
      // logW(mod, fun, `Parsed parameters: ${beautify(parsedParameters)}`)
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
    const objectList = await searchDbObjects(objectType, options)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
