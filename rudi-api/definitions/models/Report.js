const mod = 'reportSch'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
import mongoose from 'mongoose'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------

import { HTTP_METHODS } from '../../config/constApi.js'
import { UuidSchema, UuidV4Schema } from '../schemas/Identifiers.js'

import { makeSearchable } from '../../db/dbActions.js'
import { RudiError } from '../../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  API_COLLECTION_TAG,
  API_DATA_NAME_PROPERTY,
  API_REPORT_COMMENT,
  API_REPORT_ERRORS,
  API_REPORT_ERROR_CODE,
  API_REPORT_ERROR_MSG,
  API_REPORT_FIELD,
  API_REPORT_ID,
  API_REPORT_METHOD,
  API_REPORT_RESOURCE_ID,
  API_REPORT_STATUS,
  API_REPORT_SUBMISSION_DATE,
  API_REPORT_TREATMENT_DATE,
  API_REPORT_VERSION,
  FIELDS_TO_SKIP,
  LOCAL_REPORT_ERROR,
  LOCAL_REPORT_ERROR_MSG,
  LOCAL_REPORT_ERROR_TYPE,
} from '../../db/dbFields.js'
export const IntegrationStatus = {
  OK: 'OK',
  KO: 'KO',
}

// -------------------------------------------------------------------------------------------------
// Custom schema definition: Report
// -------------------------------------------------------------------------------------------------

const ReportSchema = new mongoose.Schema(
  {
    /** Unique identifier of the integration report (required) */
    [API_REPORT_ID]: UuidV4Schema,

    /**
     * Unique and permanent identifier for the resource in RUDI
     * system (required)
     */
    [API_REPORT_RESOURCE_ID]: UuidSchema,

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
      // match: API_VERSION,
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
  logD(mod, fun, `this: ${beautify(this)}`)

  next()
})
 */
// -------------------------------------------------------------------------------------------------
// Models definition
// -------------------------------------------------------------------------------------------------
export const Report = mongoose.model('Report', ReportSchema)

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

Report.initialize = async () => {
  const fun = 'initReport'
  try {
    await makeSearchable(Report)
    return `Report indexes created`
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
