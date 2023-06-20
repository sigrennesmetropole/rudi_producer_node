const mod = 'orgSch'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

import _ from 'lodash'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  FIELDS_TO_SKIP,
  DB_PUBLISHED_AT,
  API_ORGANIZATION_ID,
  API_COLLECTION_TAG,
  API_ORGANIZATION_NAME,
  API_ORGANIZATION_ADDRESS,
  API_ORGANIZATION_COORDINATES,
  API_ORGANIZATION_CAPTION,
  API_ORGANIZATION_SUMMARY,
} from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { GpsCoordinatesSchema } from '../schemas/GpsCoordinates.js'
import { UuidV4Schema } from '../schemas/Identifiers.js'
import { RudiError } from '../../utils/errors.js'
import { makeSearchable } from '../../db/dbActions.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const OrganizationSchema = new mongoose.Schema(
  {
    /**
     * Unique and permanent identifier for the organization in RUDI
     * system (required)
     */
    [API_ORGANIZATION_ID]: UuidV4Schema,

    /** Updated offical name of the organization */
    [API_ORGANIZATION_NAME]: {
      type: String,
      required: true,
    },

    /** Explicit/complete name for an acronym, or alternative name of the organization */
    [API_ORGANIZATION_CAPTION]: String,

    /** Description of the organization */
    [API_ORGANIZATION_SUMMARY]: String,

    /** Updated offical postal address of the organization */
    [API_ORGANIZATION_ADDRESS]: String,

    /** 2D GPS coordinates of the organization (EPSG:4326/WGS 84) */
    [API_ORGANIZATION_COORDINATES]: GpsCoordinatesSchema,

    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: String,

    /** Time when this organization was succesfully published on RUDI portal */
    [DB_PUBLISHED_AT]: Date,
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

// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
OrganizationSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export const Organization = mongoose.model('Organization', OrganizationSchema)

Organization.getSearchableFields = () => [API_ORGANIZATION_ID, API_ORGANIZATION_NAME]

Organization.initialize = async () => {
  const fun = 'initOrganization'
  try {
    // logT(mod, fun, ``)
    await makeSearchable(Organization)
    return `Organization indexes created`
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export default Organization
