const mod = 'licenceCtrl'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { v4 as uuid } from 'uuid'
// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { OBJ_LICENCES } from '../config/confApi.js'
import { API_SKOS_CONCEPT_CODE, LICENCE_CONCEPT_ROLE, API_LICENCE_LABEL } from '../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { isEmptyArray } from '../utils/jsUtils.js'
import { logD, logT } from '../utils/logging.js'
import { InternalServerError, RudiError } from '../utils/errors.js'
import { dbConceptListToRudiRecursive, newSkosScheme } from './skosController.js'
import { cleanLicences, getAllConceptsWithRole, searchDbIdWithJson } from '../db/dbQueries.js'

import {
  get as getLicenceCodeList,
  setAll as setLicenceCodes,
  initialize as initLicenceCodes,
} from '../definitions/thesaurus/LicenceCodes.js'

import licenceScheme from '../doc/api/licences.js'

// -------------------------------------------------------------------------------------------------
// Controller
// -------------------------------------------------------------------------------------------------
// Cache for licences
let LICENCE_LIST

export const getLicences = async () => {
  const fun = 'getLicenceList'
  try {
    logT(mod, fun, ``)
    if (!LICENCE_LIST) {
      logD(mod, fun, `Init LICENCE_LIST`)
      let dblicenceList = await getAllConceptsWithRole(LICENCE_CONCEPT_ROLE)
      if (isEmptyArray(dblicenceList)) {
        await initializeLicences()
        dblicenceList = await getAllConceptsWithRole(LICENCE_CONCEPT_ROLE)
      }
      LICENCE_LIST = await dbConceptListToRudiRecursive(dblicenceList)
    }
    return LICENCE_LIST
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getLicenceCodes = async () => {
  const fun = `getLicenceCodes`
  try {
    logT(mod, fun, ``)
    if (getLicenceCodeList().length === 0) {
      const licenceList = await getLicences()
      const licenceCodeList = licenceList.map((obj) => obj[API_SKOS_CONCEPT_CODE])
      setLicenceCodes(licenceCodeList.sort())
    }
    return getLicenceCodeList()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const initializeLicences = async () => {
  const fun = 'initializeLicences'
  try {
    await cleanLicences()
    initLicenceCodes()
    logD(mod, fun, `Licences erased`)
    const licenceStr = JSON.stringify(licenceScheme)
    const licenceData = JSON.parse(licenceStr.replace(/\{\{\w+\}\}/g, () => uuid()))
    const reply = await newSkosScheme(licenceData)
    if (!reply) throw new InternalServerError(`Licence integration failed`)

    const newLicenceCodeList = await getLicenceCodes()
    setLicenceCodes(newLicenceCodeList.sort())
    logD(mod, fun, `Licences initialized`)
    return getLicenceCodeList()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getLicenceWithCode = async (licenceCode) => {
  return await searchDbIdWithJson(OBJ_LICENCES, { [API_LICENCE_LABEL]: licenceCode })
}

// -------------------------------------------------------------------------------------------------
// Controller
// -------------------------------------------------------------------------------------------------
export const getAllLicences = async (req, reply) => {
  const fun = `getAllLicences`
  logT(mod, fun, `< ${req?.method} ${req?.url}`)
  // logT(mod, fun, ``)

  return await getLicences()
}

export const getAllLicenceCodes = async (req, reply) => {
  const fun = `getAllLicenceCodes`
  logT(mod, fun, `< ${req?.method} ${req?.url}`)
  // logT(mod, fun, ``)

  return await getLicenceCodes()
}

export const initLicences = async (req, reply) => {
  const fun = `initLicences`
  logT(mod, fun, `< ${req?.method} ${req?.url}`)
  return await initializeLicences()
}
