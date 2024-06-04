// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
import { Schema, model } from 'mongoose'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { RMToken } from '../constructors/RMToken'
// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { FIELDS_TO_SKIP } from '../../db/dbFields.js'
import { UUIDv4 } from '../constructors/UUIDv4'
// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const RudiPortalTokenSchema =
  new Schema() <
  RMToken >
  ({
    tokenInfo: {
      access_token: 'string', // a JWT
      token_type: 'string', // 'bearer'
      expires_in: 'number', // period of time in Epoch seconds
      scope: 'string', // 'read'
      jti: UUIDv4, // JWT identifier
    },
  },
  {
    timestamps: true,
  })

RudiPortalTokenSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export default model < RMToken > ('PortalToken', RudiPortalTokenSchema)
