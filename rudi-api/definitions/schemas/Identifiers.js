// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { VALID_DOI, VALID_UUID } from '../schemaValidators.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const UuidV4Schema = {
  type: String,
  // default: _ => uuid.v4(),
  trim: true,
  required: true,
  unique: true,
  index: true,
  lowercase: true,
  match: VALID_UUID,
}

export const UuidSchema = {
  type: String,
  // default: _ => uuid.v4(),
  trim: true,
  lowercase: true,
  match: VALID_UUID,
}

export const DoiSchema = {
  type: String,
  trim: true,
  unique: true,
  sparse: true, // accept empty values as non-duplicates
  lowercase: true,
  match: VALID_DOI,
  default: undefined,
}
