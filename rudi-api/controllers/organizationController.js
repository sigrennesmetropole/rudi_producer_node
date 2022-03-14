'use strict'

const mod = 'orgCtrl'
/*
 * This file describes the steps followed for each
 * action on the organizations (producer or publisher)
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const { beautify } = require('../utils/jsUtils')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Data models
// ------------------------------------------------------------------------------------------------
const { Organization } = require('../definitions/models/Organization')
const { RudiError } = require('../utils/errors')
// const cache = require('../db/dbCache')

exports.newOrganization = async (orgJson) => {
  const fun = 'newOrganization'
  log.d(mod, fun, `${beautify(orgJson)}`)

  let dbOrganization

  try {
    dbOrganization = await new Organization(orgJson)
    await dbOrganization.save()
    // cache.addOrganization(dbOrganization)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
  return dbOrganization
}
