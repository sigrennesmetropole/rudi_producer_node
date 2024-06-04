const mod = 'contSch'
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
  API_COLLECTION_TAG,
  API_CONTACT_ID,
  API_CONTACT_MAIL,
  API_CONTACT_NAME,
  API_CONTACT_ROLE,
  API_CONTACT_SUMMARY,
  API_ORGANIZATION_NAME,
  DB_CREATED_AT,
  DB_PUBLISHED_AT,
  FIELDS_TO_SKIP,
} from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { VALID_EMAIL } from '../schemaValidators.js'
import { UuidV4Schema } from '../schemas/Identifiers.js'

import { logW } from '../../utils/logging.js'

import { RudiError } from '../../utils/errors.js'

import { makeSearchable } from '../../db/dbActions.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const ContactSchema = new mongoose.Schema(
  {
    // Unique and permanent identifier for the contact in RUDI
    // system (required)
    [API_CONTACT_ID]: UuidV4Schema,

    /** Updated offical name of the contact's organization */
    [API_ORGANIZATION_NAME]: String,

    /** Updated name of the service, or possibly the person */
    [API_CONTACT_NAME]: {
      type: String,
      required: true,
    },

    /** Updated status of the contact person */
    [API_CONTACT_ROLE]: String,

    /** Description of the contact person */
    [API_CONTACT_SUMMARY]: String,

    /** Updated offical postal address of the organization */
    [API_CONTACT_MAIL]: {
      type: String,
      trim: true,
      required: true, // [true, 'Please enter Email Address'],
      unique: true,
      index: true,
      lowercase: true,
      dropDups: true,
      match: VALID_EMAIL,
    },

    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: {
      type: String,
    },

    /** Time when this contact was successfully published on RUDI portal  */
    [DB_PUBLISHED_AT]: Date,

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

// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
ContactSchema.methods.toJSON = function () {
  // return this.toObject()
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export const Contact = mongoose.model('Contact', ContactSchema)

Contact.getSearchableFields = () => [
  API_CONTACT_ID,
  API_CONTACT_NAME,
  API_CONTACT_ROLE,
  API_CONTACT_MAIL,
]

Contact.initialize = async () => {
  const fun = 'initContact'
  try {
    // logT(mod, fun)
    await makeSearchable(Contact)
    return `Contact indexes created`
  } catch (err) {
    logW(mod, fun, err)
    RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export default Contact
