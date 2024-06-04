// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
import mongoose from 'mongoose'
import mongooseInt32 from 'mongoose-int32'
const { omit } = _
const Int32 = mongooseInt32.loadType(mongoose)

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { FIELDS_TO_SKIP } from '../../db/dbFields.js'

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

    jti: String,
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
