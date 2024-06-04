const mod = 'dbCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
const { map } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------

import { MONGO_ERROR, PARAM_OBJECT, URL_PV_DB_ACCESS } from '../config/constApi.js'

import { BadRequestError, NotFoundError, RudiError } from '../utils/errors.js'

import { daDropCollection, daDropDB, daGetCollections } from '../db/dbActions.js'

import { accessReqParam } from '../utils/jsonAccess.js'
import { logT } from '../utils/logging.js'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Controllers
// -------------------------------------------------------------------------------------------------

export const getCollections = async (req, reply) => {
  const fun = 'getCollections'
  logT(mod, fun, `< GET ${URL_PV_DB_ACCESS}`)
  try {
    return map(await daGetCollections(), 'name').sort()
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

export const dropCollection = async (req, reply) => {
  const fun = 'dropCollection'
  logT(mod, fun, `< DELETE ${URL_PV_DB_ACCESS}/:${PARAM_OBJECT}`)
  try {
    const collectionName = accessReqParam(req, PARAM_OBJECT)
    const dbActionResult = await daDropCollection(collectionName)
    return dbActionResult
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

export const dropDB = async (req, reply) => {
  const fun = 'dropDB'
  logT(mod, fun, `< DELETE ${URL_PV_DB_ACCESS}`)
  try {
    const dbActionResult = await daDropDB()
    return dbActionResult
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}
