'use strict'

const mod = 'contSch'
// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { omit } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const ids = require('../schemas/Identifiers')
const valid = require('../schemaValidators')

const { RudiError } = require('../../utils/errors')
const { makeSearchable } = require('../../db/dbActions')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  FIELDS_TO_SKIP,
  DB_PUBLISHED_AT,
  API_COLLECTION_TAG,
  API_CONTACT_ID,
  API_CONTACT_MAIL,
  API_CONTACT_ROLE,
  API_CONTACT_NAME,
  API_ORGANIZATION_NAME,
  DB_CREATED_AT,
} = require('../../db/dbFields')

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
const ContactSchema = new mongoose.Schema(
  {
    // Unique and permanent identifier for the contact in RUDI
    // system (required)
    [API_CONTACT_ID]: ids.UUIDv4,

    /** Updated offical name of the contact's organization */
    [API_ORGANIZATION_NAME]: {
      type: String,
    },

    /** Updated name of the service, or possibly the person */
    [API_CONTACT_NAME]: {
      type: String,
      required: true,
    },

    /** Updated status of the contact person */
    [API_CONTACT_ROLE]: {
      type: String,
    },

    /** Updated offical postal address of the organization */
    [API_CONTACT_MAIL]: {
      type: String,
      trim: true,
      required: true, // [true, 'Please enter Email Address'],
      unique: true,
      index: true,
      lowercase: true,
      dropDups: true,
      match: valid.VALID_EMAIL,
    },

    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: {
      type: String,
    },

    /** Time when this contact was successfully published on RUDI portal  */
    [DB_PUBLISHED_AT]: {
      type: Date,
    },
    /** Creation date, made immutable  */
    [DB_CREATED_AT]: {
      type: Date,
      immutable: true,
    },
  },
  {
    id: false,
    timestamps: true,
    // optimisticConcurrency: true,
  }
)

// ------------------------------------------------------------------------------------------------
// Schema refinements
// ------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
ContactSchema.methods.toJSON = function () {
  // return this.toObject()
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
const Contact = mongoose.model('Contact', ContactSchema)

Contact.getSearchableFields = () => [
  API_CONTACT_ID,
  API_CONTACT_NAME,
  API_CONTACT_ROLE,
  API_CONTACT_MAIL,
]

const fun = 'createSearchIndexes'
Contact.createSearchIndexes = async () => {
  try {
    await makeSearchable(Contact)
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
Contact.createSearchIndexes()
  .catch((err) => {
    throw RudiError.treatError(mod, fun, `Failed to create search indexes: ${err}`)
  })
  .then(log.t(mod, fun, 'done'))

module.exports = { Contact }
