'use strict'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { omit } = require('lodash')

const Int32 = require('mongoose-int32').loadType(mongoose)

// ------------------------------------------------------------------------------------------------
// Inbternal dependancies
// ------------------------------------------------------------------------------------------------
const Ids = require('../schemas/Identifiers')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const { FIELDS_TO_SKIP } = require('../../db/dbFields')
// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
const PortalTokenSchema = new mongoose.Schema(
  {
    /** Base 64 encoded token information */
    access_token: {
      type: String,
    },

    token_type: {
      type: String,
    },

    /** Token life span in seconds */
    expires_in: {
      type: Int32,
    },

    /** Expiration date in Epoch seconds */
    exp: {
      type: Int32,
    },

    scope: {
      type: String,
    },

    jti: {
      type: Ids.UUID,
    },
  },
  {
    timestamps: true,
  }
)

PortalTokenSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
const PortalToken = mongoose.model('PortalToken', PortalTokenSchema)
module.exports = PortalToken
