'use strict'

const mod = 'repCtrl'
/*
 * This file describes the different steps followed for each
 * action on the intergration reports submitted by the Portal
 * (for metadata as well as organizations and contacts integration)
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const msg = require('../utils/msg')

const db = require('../db/dbQueries')
const utils = require('../utils/jsUtils')
const json = require('../utils/jsonAccess')

const { setPublishedFlag } = require('../controllers/genericController')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  API_REPORT_ID,
  API_REPORT_RESOURCE_ID,
  API_REPORT_STATUS,
  LOCAL_REPORT_ERROR,
  LOCAL_REPORT_ERROR_TYPE,
  LOCAL_REPORT_ERROR_MSG,
  API_REPORT_VERSION,
  API_REPORT_ERRORS,
  API_REPORT_SUBMISSION_DATE,
  API_REPORT_TREATMENT_DATE,
  API_REPORT_METHOD,
  API_COLLECTION_TAG,
} = require('../db/dbFields')

const {
  PARAM_OBJECT,
  PARAM_ID,
  PARAM_REPORT_ID,
  QUERY_LIMIT,
  QUERY_OFFSET,
  ACT_REPORT,
  URL_PUB_METADATA,
  ACT_DELETION,
  API_VERSION,
  OBJ_METADATA,
  URL_PV_OBJECT_GENERIC,
  DEFAULT_QUERY_LIMIT,
  QUERY_FILTER,
  OBJ_REPORTS,
} = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Data models
// ------------------------------------------------------------------------------------------------
const { Report, IntegrationStatus } = require('../definitions/models/Report')
const {
  BadRequestError,
  ObjectNotFoundError,
  MethodNotAllowedError,
  RudiError,
} = require('../utils/errors')

// ------------------------------------------------------------------------------------------------
// Comformity functions
// ------------------------------------------------------------------------------------------------
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
    log.d(mod, fun, `Date is an array: ${dateArray}`)
    return
    ;`${dateArray[0]}-${pad(dateArray[1])}-${pad(dateArray[2])}T` +
      `${pad(dateArray[3])}:${pad(dateArray[4])}:${pad(dateArray[5])}.${dateArray[6]}Z`
    // log.d(mod, fun, `Date: ${date}`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
function pad(number, nbZeros) {
  // const fun = 'pad'
  if (!nbZeros) nbZeros = 2
  return String(number).padStart(nbZeros, '0')
}
// ------------------------------------------------------------------------------------------------
// Controllers: integration report for any object
// ------------------------------------------------------------------------------------------------

// Add a new report for one object integration
exports.addSingleReportForObject = async (req, reply) => {
  const fun = 'addSingleReportForObject'
  log.t(mod, fun, `< POST ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = json.accessReqParam(req, PARAM_OBJECT)
    const urlObjectId = json.accessReqParam(req, PARAM_ID)

    const reportBody = fromPortalToRudiFormat(req.body)

    // retrieve body parameters: object id, report id
    const reportId = json.accessProperty(reportBody, API_REPORT_ID)
    const bodyObjectId = json.accessProperty(reportBody, API_REPORT_RESOURCE_ID)

    // ensure url object id and body object id match
    if (urlObjectId !== bodyObjectId)
      throw new BadRequestError(`${msg.parametersMismatch(urlObjectId, bodyObjectId)}`)

    // ensure object exists
    const dbObject = await db.getObjectWithRudiId(objectType, urlObjectId)
    if (!dbObject) {
      log.w(mod, fun, `Object '${objectType}' not found for id: ${urlObjectId}`)
      reportBody[LOCAL_REPORT_ERROR] = {
        [LOCAL_REPORT_ERROR_TYPE]: 'Object not found',
        [LOCAL_REPORT_ERROR_MSG]: `The '${objectType}' object concerned by the report was not found`,
      }
    }

    // ensure report doesn't exist
    const existsReport = await db.doesObjectExistWithRudiId(OBJ_REPORTS, reportId)
    if (existsReport)
      throw new MethodNotAllowedError(`${msg.objectAlreadyExists(OBJ_REPORTS, reportId)}`)

    // add new integration report
    log.d(mod, fun, `add new integration report`)
    const dbReadyReport = await new Report(reportBody)
    log.d(mod, fun, `save new integration report`)
    await dbReadyReport.save()
    log.i(mod, fun, `Report saved: ${utils.beautify(dbReadyReport)}`)
    log.d(mod, fun, `dbObject: ${utils.beautify(dbObject)}`)

    if (dbObject && reportBody[API_REPORT_STATUS] === IntegrationStatus.OK) {
      await setPublishedFlag(dbObject, urlObjectId)
    }

    return dbReadyReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Update an existing report for one object integration (public)
exports.addOrEditSingleReportForMetadata = async (req, reply) => {
  const fun = 'addOrEditSingleReportForMetadata'
  log.t(mod, fun, `< PUT ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
  return await this.addOrEditSingleReport(OBJ_METADATA, req, reply)
}

// Update an existing report for one object integration (private)
exports.addOrEditSingleReportForObject = async (req, reply) => {
  const fun = 'addOrEditSingleReportForObject'
  log.t(mod, fun, `< PUT ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${ACT_REPORT}`)
  const objectType = json.accessReqParam(req, PARAM_OBJECT)
  return await this.addOrEditSingleReport(objectType, req, reply)
}

exports.addOrEditSingleReport = async (objectType, req, reply) => {
  const fun = 'addOrEditSingleReport'
  try {
    log.t(mod, fun, ``)
    // retrieve url parameters: object type, object id
    const urlObjectId = json.accessReqParam(req, PARAM_ID)
    const reportBody = fromPortalToRudiFormat(req.body)

    let reportSrc = reportBody[API_COLLECTION_TAG] ? 'test' : 'Portal'
    log.d(mod, fun, `Incoming ${reportSrc} report: ${utils.beautify(req.body)}`)

    // log.v(mod, fun, `new report: ${utils.beautify(reportBody)}`)
    /* if (reportBody[API_COLLECTION_TAG]) {
      try {
        await checkRudiProdPermission(req, reply)
        log.i(mod, fun, `Report accepted with test access`)
      } catch (err) {
        const errMsg = `Incoming test integration report should be presented with a JWT identified request. Error: ${err}`
        log.w(mod, fun, errMsg)
        throw new ForbiddenError(errMsg)
      }
    } else {
      try {
        const header = json.accessProperty(req, 'headers')
        const auth = json.accessProperty(header, 'authorization')
        const portalToken = auth.substring(7)
        await getTokenCheckedByPortal(portalToken) // TODO: check ourselves
        log.i(mod, fun, `JWT issued from RUDI Portal`)
      } catch (er) {
        const errMsg = `Incoming Portal integration report should be presented with a JWT identified request. Error: ${error}`
        log.w(mod, fun, errMsg)
        throw new ForbiddenError(errMsg)
      }
    } */

    // retrieve body parameters: object id, report id
    const reportId = json.accessProperty(reportBody, API_REPORT_ID)
    const bodyObjectId = json.accessProperty(reportBody, API_REPORT_RESOURCE_ID)

    // ensure url object id and body object id match
    if (urlObjectId !== bodyObjectId)
      throw new BadRequestError(`${msg.parametersMismatch(urlObjectId, bodyObjectId)}`)

    // ensure object exists
    const method = reportBody[API_REPORT_METHOD]
    const dbObject = await db.getObjectWithRudiId(objectType, urlObjectId)
    if (!dbObject) {
      log.w(mod, fun, `Object '${objectType}' not found for id: ${urlObjectId}`)
      if (!method || method.toUpperCase() !== 'DELETE') {
        reportBody[LOCAL_REPORT_ERROR] = {
          [LOCAL_REPORT_ERROR_TYPE]: 'Object not found',
          [LOCAL_REPORT_ERROR_MSG]: `The '${objectType}' object concerned by the report was not found`,
        }
      }
    }

    // check if the report exists
    const dbReport = await db.getObjectWithRudiId(OBJ_REPORTS, reportId)

    let dbReadyReport
    if (!dbReport) {
      // adding new report
      // log.d(mod, fun, `Adding new report`)
      // add new integration report
      try {
        dbReadyReport = await new Report(reportBody)
        await dbReadyReport.save()
        log.i(mod, fun, `Report created: ${utils.beautify(dbReadyReport)}`)
      } catch (er) {
        const errMsg = `Couldn't create a new report with incoming data: ${utils.beautify(
          reportBody
        )}. Cause: ${er}`
        log.w(mod, fun, errMsg)
        throw new BadRequestError(errMsg)
      }
    } else {
      // updating existing report
      log.d(mod, fun, `Updating existing report`)
      dbReadyReport = await db.overwriteObject(OBJ_REPORTS, reportBody)
      log.i(mod, fun, `Report edited: ${utils.beautify(dbReadyReport)}`)
    }

    if (dbObject && reportBody[API_REPORT_STATUS] === IntegrationStatus.OK) {
      await setPublishedFlag(dbObject, urlObjectId)
    }

    return dbReadyReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration (public)
exports.getReportListForMetadata = async (req, reply) => {
  const fun = 'getReportListForMetadata'
  log.t(mod, fun, `< GET ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
  return await this.getReportList(OBJ_METADATA, req, reply)
}

// Get every reports for one object integration (private)
exports.getReportListForObject = async (req, reply) => {
  const fun = 'getReportListForObject'
  log.t(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${ACT_REPORT}`)
  const objectType = json.accessReqParam(req, PARAM_OBJECT)
  return await this.getReportList(objectType, req, reply)
}

exports.getReportList = async (objectType, req, reply) => {
  const fun = 'getReportList'
  log.t(mod, fun, ``)
  try {
    // retrieve url parameters: object id
    const urlObjectId = json.accessReqParam(req, PARAM_ID)

    // retrieve query parameters: 'limit' and 'offset'
    const limit = parseInt(req.query[QUERY_LIMIT]) || DEFAULT_QUERY_LIMIT
    const offset = parseInt(req.query[QUERY_OFFSET]) || 0

    // ensure object exists
    const existsObject = await db.doesObjectExistWithRudiId(objectType, urlObjectId)
    if (!existsObject) throw new ObjectNotFoundError(objectType, urlObjectId)

    // get all reports for this object
    const options = {
      [QUERY_LIMIT]: limit,
      [QUERY_OFFSET]: offset,
      [QUERY_FILTER]: { [API_REPORT_RESOURCE_ID]: urlObjectId },
    }
    const dbReportList = await db.getObjectList(OBJ_REPORTS, options)

    return dbReportList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
exports.getSingleReportForMetadata = async (req, reply) => {
  const fun = 'getSingleReportForMetadata'
  log.d(mod, fun, `< GET ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`)
  return await this.getSingleReport(OBJ_METADATA, req, reply)
}

// Get every reports for one object integration
exports.getSingleReportForObject = async (req, reply) => {
  const fun = 'getSingleReportForObject'
  log.d(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`)
  // retrieve url parameters: object type
  const objectType = json.accessReqParam(req, PARAM_OBJECT)
  return await this.getSingleReport(objectType, req, reply)
}

// Get every reports for one object integration
exports.getSingleReport = async (objectType, req, reply) => {
  const fun = 'getSingleReport'

  try {
    // retrieve url parameters: object id
    const urlObjectId = json.accessReqParam(req, PARAM_ID)
    const reportId = json.accessReqParam(req, PARAM_REPORT_ID)

    // ensure object exists
    const existsObject = await db.doesObjectExistWithRudiId(objectType, urlObjectId)
    if (!existsObject) throw new ObjectNotFoundError(objectType, urlObjectId)

    // ensure report doesn't exist
    const dbReport = await db.getEnsuredObjectWithRudiId(OBJ_REPORTS, reportId)

    // ensure report is for the object
    const resourceId = json.accessProperty(dbReport, API_REPORT_RESOURCE_ID)
    if (resourceId !== urlObjectId) throw new ObjectNotFoundError(objectType, urlObjectId)

    return dbReport
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// Get every reports for one object integration
exports.deleteSingleReportForObject = async (req, reply) => {
  const fun = 'deleteSingleReportForObject'
  log.d(mod, fun, `< DELETE ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`)
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

// Get every reports for one object integration
exports.deleteEveryReportForObject = async (req, reply) => {
  const fun = 'deleteEveryReportForObject'
  log.t(mod, fun, `< DELETE ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`)
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
exports.deleteManyReportForObject = async (req, reply) => {
  const fun = 'deleteManyReportForObject'
  const errMsg = `< POST ${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/${ACT_DELETION}`
  log.d(mod, fun, errMsg)
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
exports.getReportListForObjectType = async (req, reply) => {
  const fun = 'getReportListForObjectType'
  log.t(mod, fun, `< GET ${URL_PUB_METADATA}/${ACT_REPORT}`)
  try {
    // delete every integration report for all objects
    return `Function '${fun}' still needs to be implemented in module ${mod}`
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
