'use strict'

const mod = 'reportSch'
// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { omit } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const { HTTP_METHODS } = require('../../config/confApi')

const { makeSearchable } = require('../../db/dbActions')
const { RudiError } = require('../../utils/errors')

const ids = require('../schemas/Identifiers')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  FIELDS_TO_SKIP,
  API_COLLECTION_TAG,
  API_REPORT_RESOURCE_ID,
  API_REPORT_ID,
  API_DATA_NAME_PROPERTY,
  API_REPORT_SUBMISSION_DATE,
  API_REPORT_TREATMENT_DATE,
  API_REPORT_VERSION,
  API_REPORT_STATUS,
  API_REPORT_ERRORS,
  LOCAL_REPORT_ERROR_MSG,
  LOCAL_REPORT_ERROR,
  LOCAL_REPORT_ERROR_TYPE,
  API_REPORT_FIELD,
  API_REPORT_ERROR_MSG,
  API_REPORT_METHOD,
  API_REPORT_COMMENT,
  API_REPORT_ERROR_CODE,
} = require('../../db/dbFields')

const IntegrationStatus = {
  OK: 'OK',
  KO: 'KO',
}

// ------------------------------------------------------------------------------------------------
// Custom schema definition: Report
// ------------------------------------------------------------------------------------------------

const ReportSchema = new mongoose.Schema(
  {
    /** Unique identifier of the integration report (required) */
    [API_REPORT_ID]: ids.UUIDv4,

    /**
     * Unique and permanent identifier for the resource in RUDI
     * system (required)
     */
    [API_REPORT_RESOURCE_ID]: ids.UUID,

    /**
     * Title of the resource
     */
    [API_DATA_NAME_PROPERTY]: String,

    /** Date when the integration request was submitted by the Producer */
    [API_REPORT_SUBMISSION_DATE]: Date,

    /** Date when the integration request was processed by the Portal */
    [API_REPORT_TREATMENT_DATE]: Date,

    /** Method used for the integration request by the Producer */
    [API_REPORT_METHOD]: {
      type: String,
      enum: Object.values(HTTP_METHODS),
    },

    /** Version number of the integration contract used for the file */
    [API_REPORT_VERSION]: {
      type: String,
      required: true,
      // match: Validation.API_VERSION,
    },

    /** State of the integration of the resource in the Portal */
    [API_REPORT_STATUS]: {
      type: String,
      // enum: Object.values(this.IntegrationStatus),
    },

    /**
     * Comment on the state of the integration of the resource in the
     * Portal
     */
    [API_REPORT_COMMENT]: {
      type: String,
    },

    /**
     * List of all the errors that were encountered during the
     * integration of the resource.
     */
    [API_REPORT_ERRORS]: {
      type: [
        {
          [API_REPORT_ERROR_CODE]: {
            type: String,
            // type: Int32,
            // min: 0,
            required: true,
          },
          [API_REPORT_ERROR_MSG]: {
            type: String,
            required: true,
          },
          [API_REPORT_FIELD]: {
            type: String,
          },
        },
      ],
    },

    [LOCAL_REPORT_ERROR]: {
      [LOCAL_REPORT_ERROR_TYPE]: String,
      [LOCAL_REPORT_ERROR_MSG]: String,
    },

    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: {
      type: String,
    },
  },
  {
    timestamps: true,
    id: false,
  }
)

// ----- toJSON cleanup
ReportSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

/* 
ReportSchema.pre('save', async function (next) {
  const fun = 'pre save hook'
  // if(this.version === 'v1') this.version = api.VERSION
  log.d(mod, fun, `this: ${beautify(this)}`)

  next()
})
 */
// ------------------------------------------------------------------------------------------------
// Models definition
// ------------------------------------------------------------------------------------------------
const Report = mongoose.model('Report', ReportSchema)

Report.getSearchableFields = () => [
  API_REPORT_ID,
  API_REPORT_RESOURCE_ID,
  API_DATA_NAME_PROPERTY,
  API_REPORT_STATUS,
  `${API_REPORT_ERRORS}.${API_REPORT_ERROR_MSG}`,
  `${API_REPORT_ERRORS}.${API_REPORT_FIELD}`,
  `${LOCAL_REPORT_ERROR}.${LOCAL_REPORT_ERROR_TYPE}`,
  `${LOCAL_REPORT_ERROR}.${LOCAL_REPORT_ERROR_MSG}`,
]

const fun = 'createSearchIndexes'
Report.createSearchIndexes = async () => {
  try {
    await makeSearchable(Report)
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
Report.createSearchIndexes()
  .catch((err) => {
    throw RudiError.treatError(mod, fun, `Failed to create search indexes: ${err}`)
  })
  .then(log.t(mod, fun, 'done'))

module.exports = { Report, IntegrationStatus }
