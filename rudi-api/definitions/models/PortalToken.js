// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

import _ from 'lodash'
const { omit } = _

import mongooseInt32 from 'mongoose-int32'
const Int32 = mongooseInt32.loadType(mongoose)

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { FIELDS_TO_SKIP } from '../../db/dbFields.js'
import { UuidSchema } from '../schemas/Identifiers.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const PortalTokenSchema = new mongoose.Schema(
  {
    /** Base 64 encoded token information */
    access_token: String,

    token_type: String,

    /** Token life span in seconds */
    expires_in: Int32,

    /** Expiration date in Epoch seconds */
    exp: Int32,

    scope: String,

    jti: UuidSchema,
  },
  {
    timestamps: true,
  }
)

PortalTokenSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
const PortalToken = mongoose.model('PortalToken', PortalTokenSchema)
export default PortalToken
