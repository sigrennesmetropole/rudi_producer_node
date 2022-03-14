'use strict'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
const ReferenceDatesSchema = new mongoose.Schema(
  {
    created: {
      type: Date,
      required: [true, `Creation date is required`],
    },
    validated: {
      type: Date,
    },
    published: {
      type: Date,
    },
    updated: {
      type: Date,
    },
    deleted: {
      type: Date,
    },
  },
  {
    _id: false,
  }
)

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = ReferenceDatesSchema
