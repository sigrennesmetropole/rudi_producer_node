'use strict'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
// const uuid = require('uuid')

const validation = require('../schemaValidators')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

exports.UUIDv4 = {
  type: String,
  // default: _ => uuid.v4(),
  trim: true,
  required: true,
  unique: true,
  index: true,
  lowercase: true,
  match: validation.VALID_UUID,
}

exports.UUID = {
  type: String,
  // default: _ => uuid.v4(),
  trim: true,
  lowercase: true,
  match: validation.VALID_UUID,
}

exports.DOI = {
  type: String,
  trim: true,
  unique: true,
  sparse: true, // accept empty values as non-duplicates
  lowercase: true,
  match: validation.VALID_DOI,
  default: undefined,
}
