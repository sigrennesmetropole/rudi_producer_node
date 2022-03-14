'use strict'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const { Schema, model } = require('mongoose')
const { omit } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Inbternal dependancies
// ------------------------------------------------------------------------------------------------
const { RMToken } = require('../constructors/RMToken')
// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const { FIELDS_TO_SKIP } = require('../../db/dbFields')
const { UUIDv4 } = require('../constructors/UUIDv4')
// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = model < RMToken > ('PortalToken', RudiPortalTokenSchema)
