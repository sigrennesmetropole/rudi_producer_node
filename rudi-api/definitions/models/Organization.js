'use strict'

const mod = 'orgSch'
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
const { RudiError } = require('../../utils/errors')
const { makeSearchable } = require('../../db/dbActions')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  FIELDS_TO_SKIP,
  DB_PUBLISHED_AT,
  API_ORGANIZATION_ID,
  API_COLLECTION_TAG,
  API_ORGANIZATION_NAME,
  API_ORGANIZATION_ADDRESS,
} = require('../../db/dbFields')

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
const OrganizationSchema = new mongoose.Schema(
  {
    /**
     * Unique and permanent identifier for the organization in RUDI
     * system (required)
     */
    [API_ORGANIZATION_ID]: ids.UUIDv4,

    /** Updated offical name of the organization */
    [API_ORGANIZATION_NAME]: {
      type: String,
      required: true,
    },

    /** Updated offical postal address of the organization */
    [API_ORGANIZATION_ADDRESS]: {
      type: String,
    },

    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: {
      type: String,
    },

    /** Time when this organization was succesfully published on RUDI portal */
    [DB_PUBLISHED_AT]: {
      type: Date,
    },
  },
  {
    // Adds mongoose fields 'updatedAt' and 'createdAt'
    timestamps: true,
    id: false,

    // optimisticConcurrency: true,
    // strict: true,
    // runSettersOnQuery: true,
    // toObject: {
    //   getters: true,
    //   setters: true,
    //   virtuals: false
    // },
  }
)

// ------------------------------------------------------------------------------------------------
// Schema refinements
// ------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
OrganizationSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
const Organization = mongoose.model('Organization', OrganizationSchema)

Organization.getSearchableFields = () => [API_ORGANIZATION_ID, API_ORGANIZATION_NAME]

const fun = 'createSearchIndexes'
Organization.createSearchIndexes = async () => {
  try {
    await makeSearchable(Organization)
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
Organization.createSearchIndexes()
  .catch((err) => {
    throw RudiError.treatError(mod, fun, `Failed to create search indexes: ${err}`)
  })
  .then(log.t(mod, fun, 'done'))

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = { Organization }
