'use strict'

const mod = 'licenceCtrl'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const uuid = require('uuid')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const { isEmptyArray } = require('../utils/jsUtils')
const db = require('../db/dbQueries')
const skosController = require('./skosController')

const { InternalServerError, RudiError } = require('../utils/errors')

const {
  URL_PV_LICENCE_ACCESS,
  URL_PV_LICENCE_CODES_ACCESS,
  ACT_INIT,
} = require('../config/confApi')

const { API_SKOS_CONCEPT_CODE, LICENCE_CONCEPT_ROLE } = require('../db/dbFields')
const { OBJ_LICENCES } = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const LICENCES_SCHEME = require('../doc/api/licences.json')

// ------------------------------------------------------------------------------------------------
// Controller
// ------------------------------------------------------------------------------------------------
// Cache for licences
let LICENCE_LIST, LICENCE_CODE_LIST

exports.getLicences = async () => {
  const fun = 'getLicenceList'
  try {
    log.t(mod, fun, ``)
    if (!LICENCE_LIST) {
      log.d(mod, fun, `Init LICENCE_LIST`)
      let dblicenceList = await db.getAllConceptsWithRole(LICENCE_CONCEPT_ROLE)
      if (isEmptyArray(dblicenceList)) {
        await this.initializeLicences()
        dblicenceList = await db.getAllConceptsWithRole(LICENCE_CONCEPT_ROLE)
      }
      LICENCE_LIST = await skosController.dbConceptListToRudiRecursive(dblicenceList)
    }
    return LICENCE_LIST
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getLicenceCodes = async () => {
  const fun = `getLicenceCodes`
  try {
    log.t(mod, fun, ``)
    if (!LICENCE_CODE_LIST) {
      const licenceList = await this.getLicences()
      const licenceCodeList = licenceList.map((obj) => obj[API_SKOS_CONCEPT_CODE])
      LICENCE_CODE_LIST = licenceCodeList.sort()
    }
    return LICENCE_CODE_LIST
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.initializeLicences = async () => {
  const fun = 'initializeLicences'
  try {
    await db.cleanLicences()
    LICENCE_CODE_LIST = null
    log.d(mod, fun, `Licences initialized`)
    const licenceStr = JSON.stringify(LICENCES_SCHEME)
    const licenceData = JSON.parse(licenceStr.replace(/\{\{\w+\}\}/g, () => uuid.v4()))
    // log.d(mod, fun, licenceData)
    const reply = await skosController.newSkosScheme(licenceData)
    if (!reply) throw new InternalServerError(`Licence integration failed`)
    return await this.getLicenceCodes()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getLicenceWithCode = async (licenceCode) => {
  return await db.searchDbIdWithJson(OBJ_LICENCES, { API_LICENCE_LABEL: licenceCode })
}

// ------------------------------------------------------------------------------------------------
// Controller
// ------------------------------------------------------------------------------------------------
exports.getAllLicences = async (req, reply) => {
  const fun = `getAllLicences`
  log.t(mod, fun, `< GET ${URL_PV_LICENCE_ACCESS}`)
  // log.t(mod, fun, ``)

  return await this.getLicences()
}

exports.getAllLicenceCodes = async (req, reply) => {
  const fun = `getAllLicenceCodes`
  log.t(mod, fun, `< GET ${URL_PV_LICENCE_CODES_ACCESS}`)
  // log.t(mod, fun, ``)

  return await this.getLicenceCodes()
}

exports.initLicences = async (req, reply) => {
  const fun = `initLicences`
  log.t(mod, fun, `< POST ${URL_PV_LICENCE_ACCESS}/${ACT_INIT}`)
  return await this.initializeLicences()
}
