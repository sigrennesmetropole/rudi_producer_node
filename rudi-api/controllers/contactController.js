'use strict'

const mod = 'contCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the contacts (producer or publisher)
 */

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const { beautify } = require('../utils/jsUtils')
const { RudiError } = require('../utils/errors')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Data models
// ------------------------------------------------------------------------------------------------
const { Contact } = require('../definitions/models/Contact')

// ------------------------------------------------------------------------------------------------
// Controller functions
// ------------------------------------------------------------------------------------------------
exports.newContact = async (contactJson) => {
  const fun = 'newContact'
  log.d(mod, fun, `${beautify(contactJson)}`)
  let dbContact
  try {
    dbContact = await new Contact(contactJson)
    await dbContact.save()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
  return dbContact
}
