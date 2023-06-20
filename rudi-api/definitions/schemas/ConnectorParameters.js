// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
const ValueTypes = {
  String: 'STRING',
  Boolean: 'BOOLEAN',
  Date: 'DATE',
  Long: 'LONG',
  Double: 'DOUBLE',
  Enum: 'ENUM',
}

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const ConnectorParameter = {
  key: String,
  value: String,
  type: {
    type: String,
    enum: Object.values(ValueTypes),
    _id: false,
  },
  usage: String,
  accepted_values: {
    type: [mongoose.Mixed],
    default: undefined,
    _id: false,
  },
}
