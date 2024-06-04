const mod = 'repCtrl'
/*
 * This file describes the different steps followed for each
 * action on the integration reports submitted by the Portal
 * (for metadata as well as organizations and contacts integration)
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'

import mongoose from 'mongoose'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  ACT_DELETION,
  ACT_REPORT,
  API_VERSION,
  DEFAULT_QUERY_LIMIT,
  OBJ_METADATA,
  OBJ_REPORTS,
  PARAM_ID,
  PARAM_OBJECT,
  PARAM_REPORT_ID,
  QUERY_FILTER,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_SUBMITTED_BEFORE,
  QUERY_SUBMITTED_BEFORE_CAML,
  QUERY_TREATED_BEFORE,
  QUERY_TREATED_BEFORE_CAML,
  QUERY_UPDATED_BEFORE,
  QUERY_UPDATED_BEFORE_CAML,
  URL_PUB_METADATA,
  URL_PV_OBJECT_GENERIC,
} from '../config/constApi.js'
import {
  API_COLLECTION_TAG,
  API_DATA_NAME_PROPERTY,
  API_INTEGRATION_ERROR_ID,
  API_METADATA_ID,
  API_REPORT_COMMENT,
  API_REPORT_ERRORS,
  API_REPORT_ERROR_CODE,
  API_REPORT_ERROR_MSG,
  API_REPORT_ID,
  API_REPORT_METHOD,
  API_REPORT_RESOURCE_ID,
  API_REPORT_STATUS,
  API_REPORT_SUBMISSION_DATE,
  API_REPORT_TREATMENT_DATE,
  API_REPORT_VERSION,
  DB_PUBLISHED_AT,
  DB_UPDATED_AT,
  LOCAL_REPORT_ERROR,
  LOCAL_REPORT_ERROR_MSG,
  LOCAL_REPORT_ERROR_TYPE,
} from '../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify, isEmptyObject, nowISO, padZerosLeft as pad0 } from '../utils/jsUtils.js'

import {
  BadRequestError,
  InternalServerError,
  MethodNotAllowedError,
  ObjectNotFoundError,
  ParameterExpectedError,
  RudiError,
} from '../utils/errors.js'
import { accessProperty, accessReqParam } from '../utils/jsonAccess.js'

import { cleanDate } from '../utils/parseRequest.js'

import {
  deleteAllDbObjectsWithType,
  deleteManyDbObjectsWithFilter,
  doesObjectExistWithRudiId,
  getDbObjectList,
  getEnsuredObjectWithRudiId,
  getMetadataWithRudiId,
  getObjectWithRudiId,
  overwriteDbObject,
} from '../db/dbQueries.js'

import { logD, logI, logMetadata, logT, logW } from '../utils/logging.js'
import { objectAlreadyExists, parametersMismatch } from '../utils/msg.js'

// -------------------------------------------------------------------------------------------------
// Data models
// -------------------------------------------------------------------------------------------------
import { IntegrationStatus, Report } from '../definitions/models/Report.js'

import { setFlagIntegrationKO } from './metadataController.js'
import { removeMetadataFromWaitingList } from './portalController.js'

// -------------------------------------------------------------------------------------------------
// Conformity functions
// -------------------------------------------------------------------------------------------------
function fromPortalToRudiFormat(reportBody) {
  if (reportBody[API_REPORT_VERSION] === 'v1') {
    reportBody[API_REPORT_VERSION] = API_VERSION
  }
  if (!reportBody[API_REPORT_ERRORS] && !!reportBody.errors) {
    reportBody[API_REPORT_ERRORS] = reportBody.errors
  }
  reportBody[API_REPORT_SUBMISSION_DATE] = dateArrayToDate(reportBody[API_REPORT_SUBMISSION_DATE])
  reportBody[API_REPORT_TREATMENT_DATE] = dateArrayToDate(reportBody[API_REPORT_TREATMENT_DATE])

  return reportBody
}

function dateArrayToDate(dateArray) {
  const fun = 'dateArrayToDate'
  try {
    if (!Array.isArray(dateArray) || dateArray.length !== 7) return dateArray
    logD(mod, fun, `Date is an array: ${dateArray}`)
    return (
      `${dateArray[0]}-${pad0(dateArray[1])}-${pad0(dateArray[2])}T` +
      `${pad0(dateArray[3])}:${pad0(dateArray[4])}:${pad0(dateArray[5])}.${dateArray[6]}Z`
    )
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const setPublishedFlag = async (dbObject, rudiId) => {
  const fun = 'setPublishedFlag'
  logD(mod, fun, '')
  try {
    if (!dbObject) throw new ParameterExpectedError('dbObject', mod, fun)
    if (!dbObject[DB_PUBLISHED_AT]) {
      dbObject[DB_PUBLISHED_AT] = nowISO()
      await dbObject.save()
      logD(mod, fun, `dbObject published: ${logMetadata(dbObject)}`)
    } else {
      logI(mod, fun, `Data had already been published for id '${rudiId}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Controllers: integration report for any object
// -------------------------------------------------------------------------------------------------

// Add a new report for one object integration
export const addSingleReportForObject = async (req, reply) => {
  const fun = 'addSingleReportForObject'
  try {
    logT(mod, fun, `< POST ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
    // retrieve url parameters: object type, object id
    const objectType = accessReqParam(req, PARAM_OBJECT)
    const urlObjectId = accessReqParam(req, PARAM_ID)

    const reportBody = fromPortalToRudiFormat(req.body)

    // retrieve body parameters: object id, report id
    const reportId = accessProperty(reportBody, API_REPORT_ID)
    const bodyObjectId = accessProperty(reportBody, API_REPORT_RESOURCE_ID)

    // ensure url object id and body object id match
    if (urlObjectId !== bodyObjectId)
      throw new BadRequestError(`${parametersMismatch(urlObjectId, bodyObjectId)}`)

    // ensure object exists
    const dbObject = await getObjectWithRudiId(objectType, urlObjectId)
    if (!dbObject) {
      logW(mod, fun, `Object '${objectType}' not found for id: ${urlObjectId}`)
      reportBody[LOCAL_REPORT_ERROR] = {
        [LOCAL_REPORT_ERROR_TYPE]: 'Object not found',
        [LOCAL_REPORT_ERROR_MSG]: `The '${objectType}' object concerned by the report was not found`,
      }
    }

    // ensure report doesn't exist
    const existsReport = await doesObjectExistWithRudiId(OBJ_REPORTS, reportId)
    if (existsReport)
      throw new MethodNotAllowedError(`${objectAlreadyExists(OBJ_REPORTS, reportId)}`)

    // add new integration report
    logD(mod, fun, `add new integration report`)
    const dbReadyReport = new Report(reportBody)
    logD(mod, fun, `save new integration report`)
    await dbReadyReport.save()
    logI(mod, fun, `Report saved: ${beautify(dbReadyReport)}`)
    logD(mod, fun, `dbObject: ${beautify(dbObject)}`)

    if (dbObject) {
      if (reportBody[API_REPORT_STATUS] === IntegrationStatus.OK) {
        await setPublishedFlag(dbObject, urlObjectId)
      } else {
        await setFlagIntegrationKO(dbObject, reportBody[API_REPORT_ID])
        // TODO: IntegrationStatus.KO => flag to set a problem
      }
    }

    return dbReadyReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Update an existing report for one object integration (public)
export const addOrEditSingleReportForMetadata = async (req, reply) => {
  const fun = 'addOrEditSingleReportForMetadata'
  logT(mod, fun, `< PUT ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
  return await addOrEditSingleReport(OBJ_METADATA, req, reply)
}

// Update an existing report for one object integration (private)
export const addOrEditSingleReportForObject = async (req, reply) => {
  const fun = 'addOrEditSingleReportForObject'
  logT(mod, fun, `< PUT ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${ACT_REPORT}`)
  const objectType = accessReqParam(req, PARAM_OBJECT)
  return await addOrEditSingleReport(objectType, req, reply)
}

export const addOrEditSingleReport = async (objectType, req, reply) => {
  const fun = 'addOrEditSingleReport'
  try {
    logT(mod, fun)
    // retrieve url parameters: object type, object id
    const urlObjectId = accessReqParam(req, PARAM_ID)
    const reportBody = fromPortalToRudiFormat(req.body)

    let reportSrc = reportBody[API_COLLECTION_TAG] ? 'test' : 'Portal'
    logD(mod, fun, `Incoming ${reportSrc} report: ${beautify(req.body)}`)

    // retrieve body parameters: object id, report id
    const reportId = accessProperty(reportBody, API_REPORT_ID)
    const bodyObjectId = accessProperty(reportBody, API_REPORT_RESOURCE_ID)
    removeMetadataFromWaitingList(urlObjectId, reportId)

    // ensure url object id and body object id match
    if (urlObjectId !== bodyObjectId)
      throw new BadRequestError(`${parametersMismatch(urlObjectId, bodyObjectId)}`)

    // ensure object exists
    const method = reportBody[API_REPORT_METHOD]
    const dbObject = await getObjectWithRudiId(objectType, urlObjectId)
    if (!dbObject) {
      logW(mod, fun, `Object '${objectType}' not found for id: ${urlObjectId}`)
      if (!method || method.toUpperCase() !== 'DELETE') {
        reportBody[LOCAL_REPORT_ERROR] = {
          [LOCAL_REPORT_ERROR_TYPE]: 'Object not found',
          [LOCAL_REPORT_ERROR_MSG]: `The '${objectType}' object concerned by the report was not found`,
        }
      }
    }

    const dbReadyReport = putReport(reportBody)

    if (dbObject) {
      if (reportBody[API_REPORT_STATUS] === IntegrationStatus.OK) {
        await setPublishedFlag(dbObject, urlObjectId)
      } else {
        await setFlagIntegrationKO(dbObject, reportBody[API_REPORT_ID])
        // TODO: IntegrationStatus.KO => flag to set a problem
      }
      // console.debug(`T (${fun}) dbObject:`, dbObject)
    }

    return dbReadyReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration (public)
export const getReportListForMetadata = async (req, reply) => {
  const fun = 'getReportListForMetadata'
  logT(mod, fun, `< GET ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
  return await getReportList(OBJ_METADATA, req, reply)
}

// Get every reports for one object integration (private)
export const getReportListForObject = async (req, reply) => {
  const fun = 'getReportListForObject'
  logT(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${ACT_REPORT}`)
  const objectType = accessReqParam(req, PARAM_OBJECT)
  return await getReportList(objectType, req, reply)
}

export const getReportList = async (objectType, req, reply) => {
  const fun = 'getReportList'
  logT(mod, fun)
  try {
    // retrieve url parameters: object id
    const urlObjectId = accessReqParam(req, PARAM_ID)

    // retrieve query parameters: 'limit' and 'offset'
    const limit = parseInt(req.query[QUERY_LIMIT]) || DEFAULT_QUERY_LIMIT
    const offset = parseInt(req.query[QUERY_OFFSET]) || 0

    // ensure object exists
    const existsObject = await doesObjectExistWithRudiId(objectType, urlObjectId)
    if (!existsObject) throw new ObjectNotFoundError(objectType, urlObjectId)

    // get all reports for this object
    const options = {
      [QUERY_LIMIT]: limit,
      [QUERY_OFFSET]: offset,
      [QUERY_FILTER]: { [API_REPORT_RESOURCE_ID]: urlObjectId },
    }
    const dbReportList = await getDbObjectList(OBJ_REPORTS, options)

    return dbReportList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
export const getSingleReportForMetadata = async (req, reply) => {
  const fun = 'getSingleReportForMetadata'
  logD(mod, fun, `< GET ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`)
  return await getSingleReport(OBJ_METADATA, req, reply)
}

// Get every reports for one object integration
export const getSingleReportForObject = async (req, reply) => {
  const fun = 'getSingleReportForObject'
  logD(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`)
  // retrieve url parameters: object type
  const objectType = accessReqParam(req, PARAM_OBJECT)
  return await getSingleReport(objectType, req, reply)
}

// Get every reports for one object integration
export const getSingleReport = async (objectType, req, reply) => {
  const fun = 'getSingleReport'

  try {
    // retrieve url parameters: object id
    const urlObjectId = accessReqParam(req, PARAM_ID)
    const reportId = accessReqParam(req, PARAM_REPORT_ID)

    // ensure object exists
    const existsObject = await doesObjectExistWithRudiId(objectType, urlObjectId)
    if (!existsObject) throw new ObjectNotFoundError(objectType, urlObjectId)

    // ensure report doesn't exist
    const dbReport = await getEnsuredObjectWithRudiId(OBJ_REPORTS, reportId)

    // ensure report is for the object
    const resourceId = accessProperty(dbReport, API_REPORT_RESOURCE_ID)
    if (resourceId !== urlObjectId) throw new ObjectNotFoundError(objectType, urlObjectId)

    return dbReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
export const deleteSingleReportForObject = async (req, reply) => {
  const fun = 'deleteSingleReportForObject'
  logD(mod, fun, `< DELETE ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`)
  try {
    // retrieve url parameters: object id
    // retrieve body parameters: report id

    // ensure object exists
    // ensure report exists

    // delete this integration report for this object
    return `Function '${fun}' still needs to be implemented in module ${mod}`
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deleteReportsBefore = async (req, reply) => {
  const fun = 'deleteReportsBefore'
  try {
    logT(mod, fun)
    const queryParams = req.query
    if (isEmptyObject(queryParams)) return await deleteAllDbObjectsWithType(OBJ_REPORTS)

    // logT(mod, fun, `reqParams: ${beautify(queryParams)}`)

    const dateFilters = {
      [DB_UPDATED_AT]: [QUERY_UPDATED_BEFORE, QUERY_UPDATED_BEFORE_CAML],
      [API_REPORT_TREATMENT_DATE]: [QUERY_TREATED_BEFORE, QUERY_TREATED_BEFORE_CAML],
      [API_REPORT_SUBMISSION_DATE]: [QUERY_SUBMITTED_BEFORE, QUERY_SUBMITTED_BEFORE_CAML],
    }

    const filters = []
    for (const metadataDateProp in dateFilters) {
      const dateQueryFilters = dateFilters[metadataDateProp]
      const dateRaw = queryParams[dateQueryFilters[0]] || queryParams[dateQueryFilters[1]]
      if (dateRaw) {
        const dateClean = cleanDate(dateRaw)
        logT(mod, fun, dateRaw)
        logT(mod, fun, dateClean)
        filters.push({ [metadataDateProp]: mongoose.trusted({ $lte: dateClean }) })
        delete queryParams[dateQueryFilters[0]]
        delete queryParams[dateQueryFilters[1]]
      }
    }
    for (const additionalFilter in queryParams) {
      filters.push({ [additionalFilter]: mongoose.trusted(queryParams[additionalFilter]) })
    }
    return await deleteManyDbObjectsWithFilter(OBJ_REPORTS, { $and: filters })
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
export const deleteEveryReportForObject = async (req, reply) => {
  const fun = 'deleteEveryReportForObject'
  logT(mod, fun, `< DELETE ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
  try {
    // retrieve url parameters: object id

    // ensure object exists

    // delete every integration report for this object
    return `Function '${fun}' still needs to be implemented in module ${mod}`
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
export const deleteManyReportForObject = async (req, reply) => {
  const fun = 'deleteManyReportForObject'
  const errMsg = `< POST ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/${ACT_DELETION}`
  logD(mod, fun, errMsg)
  try {
    // retrieve url parameters: object id

    // ensure object exists

    // delete every integration report for this object
    return `Function '${fun}' still needs to be implemented in module ${mod}`
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
export const getReportListForObjectType = async (req, reply) => {
  const fun = 'getReportListForObjectType'
  logT(mod, fun, `< GET ${URL_PUB_METADATA}/${ACT_REPORT}`)
  try {
    // delete every integration report for all objects
    return `Function '${fun}' still needs to be implemented in module ${mod}`
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Creates an internal report, e.g. for errors happening during a transmission to the portal
 * @param {MetadataSchema} metadata
 * @param {HTTP_METHODS} httpMethod
 */
export const createErrorReport = async (err, details, shouldUpdateMetadataStatus) => {
  const fun = 'createErrorReport'
  if (!details) throw new InternalServerError('Input details should not be null', mod, fun)
  const { step, description, method, url, metadata } = details

  const metaId = metadata?.[API_METADATA_ID]
  const reportId = uuidv4()
  try {
    const body = {
      [API_REPORT_ID]: reportId,
      [API_REPORT_RESOURCE_ID]: metaId,
      [API_DATA_NAME_PROPERTY]:
        metadata?.[API_DATA_NAME_PROPERTY] || description || `An error occurred while ${step}`,
      [API_REPORT_SUBMISSION_DATE]: nowISO(),
      [API_REPORT_METHOD]: method?.toUpperCase(),
      [API_REPORT_VERSION]: API_VERSION,
      [API_REPORT_STATUS]: IntegrationStatus.KO,
      [API_REPORT_COMMENT]: `While ${step}` + url ? `on ${url}` : '',
      [API_REPORT_ERRORS]: {
        [API_REPORT_ERROR_CODE]: err?.statusCode || 500,
        [API_REPORT_ERROR_MSG]: `${description}: ${err.message || err}`,
      },
    }
    await putReport(body)

    if (shouldUpdateMetadataStatus && metaId) {
      const dbMeta = await getMetadataWithRudiId(metaId)
      if (!dbMeta) {
        logW(mod, fun, `Metadata was not found with id ${metaId}`)
        return
      }
      dbMeta[API_INTEGRATION_ERROR_ID] = reportId
      // updateMetadataStatus(dbMeta) // Done in metadata.save()
      await dbMeta.save()
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const putReport = async (reportBody) => {
  const fun = 'putReport'
  try {
    // check if the report exists
    const dbReport = await getObjectWithRudiId(OBJ_REPORTS, reportBody[API_REPORT_ID])

    let dbReadyReport
    if (!dbReport) {
      // adding new report
      // logD(mod, fun, `Adding new report`)
      // add new integration report
      try {
        dbReadyReport = new Report(reportBody)
        await dbReadyReport.save()
        logI(mod, fun, `Report created: ${beautify(dbReadyReport)}`)
      } catch (er) {
        const errMsg = `Couldn't create a new report with incoming data: ${beautify(
          reportBody
        )}. Cause: ${er}`
        logW(mod, fun, errMsg)
        throw new BadRequestError(errMsg, mod, fun)
      }
    } else {
      // updating existing report
      logD(mod, fun, `Updating existing report`)
      dbReadyReport = await overwriteDbObject(OBJ_REPORTS, reportBody)
      logI(mod, fun, `Report edited: ${beautify(dbReadyReport)}`)
    }
    return dbReadyReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
