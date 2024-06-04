// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
import mongoose from 'mongoose'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  API_COLLECTION_TAG,
  API_PUB_KEY,
  API_PUB_NAME,
  API_PUB_PEM,
  API_PUB_PROP,
  API_PUB_TYPE,
  API_PUB_URL,
  FIELDS_TO_SKIP,
} from '../../db/dbFields.js'
import { VALID_URI, VALID_WORD } from '../schemaValidators.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const PublicKeySchema = new mongoose.Schema(
  {
    /** Identifier for the public key, should be unique on a producer node */
    [API_PUB_NAME]: {
      type: String,
      required: [true, 'Please enter a name (letters, numbers, minus and underscore accepted'],
      trim: true,
      unique: true,
      index: true,
      lowercase: true,
      dropDups: true,
      validate: VALID_WORD,
    },

    /** URL of the public key, should be accessible and deliver a PEM-shaped public key or object */
    [API_PUB_URL]: {
      type: String,
      validate: VALID_URI,
    },
    /**
     * Property of the public key, in case the URL delivers an object such property of which is
     * the PEM-shaped public key
     */
    [API_PUB_PROP]: {
      type: String,
      validate: VALID_WORD,
    },

    /** PEM-shaped key string content */
    [API_PUB_PEM]: String,

    /** The parsed public key */
    [API_PUB_KEY]: String,

    /** Type/algo of the public key */
    [API_PUB_TYPE]: {
      type: String,
      validate: VALID_WORD,
    },

    /** Tag for identifying a collection of keys */
    [API_COLLECTION_TAG]: {
      type: String,
      validate: VALID_WORD,
    },
  },
  {
    timestamps: true,
  }
)

PublicKeySchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export const PublicKey = mongoose.model('PublicKey', PublicKeySchema)
export default PublicKey
