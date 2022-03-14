'use strict'

const mod = 'dbCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const { map } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')

const { URL_PV_DB_ACCESS, PARAM_OBJECT, MONGO_ERROR } = require('../config/confApi')

const { NotFoundError, BadRequestError, RudiError } = require('../utils/errors')
const { dropDB, getCollections, dropCollection } = require('../db/dbActions')
const { accessReqParam } = require('../utils/jsonAccess')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------

exports.getCollections = async (req, reply) => {
  const fun = 'getCollections'
  log.t(mod, fun, `< GET ${URL_PV_DB_ACCESS}`)
  try {
    const dbActionResult = await getCollections()
    return map(dbActionResult, 'name').sort()
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

exports.dropCollection = async (req, reply) => {
  const fun = 'dropDB'
  log.t(mod, fun, `< DELETE ${URL_PV_DB_ACCESS}/:${PARAM_OBJECT}`)
  try {
    const collectionName = accessReqParam(req, PARAM_OBJECT)
    const dbActionResult = await dropCollection(collectionName)
    return dbActionResult
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

exports.dropDB = async (req, reply) => {
  const fun = 'dropDB'
  log.t(mod, fun, `< DELETE ${URL_PV_DB_ACCESS}`)
  try {
    const dbActionResult = await dropDB()
    return dbActionResult
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}
