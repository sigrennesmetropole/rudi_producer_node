// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  API_LICENCE_CUSTOM_LABEL,
  API_LICENCE_CUSTOM_URI,
  API_LICENCE_LABEL,
  API_LICENCE_TYPE,
  LicenceTypes,
} from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { VALID_URI } from '../schemaValidators.js'
import { DictionaryEntrySchema } from './DictionaryEntry.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const LicenceSchema = {
  /** Enum to differenciate standard from custom licence */
  [API_LICENCE_TYPE]: {
    type: String,
    enum: Object.values(LicenceTypes),
    required: true,
  },

  /** Standard licence (recognized by RUDI system): label of the licence = concept code */
  [API_LICENCE_LABEL]: {
    type: String,
    default: undefined,
  },

  /** Custom licence: Title of the custom licence */
  [API_LICENCE_CUSTOM_LABEL]: {
    type: [DictionaryEntrySchema],
    default: undefined,
    _id: false,
  },

  /** Custom licence: Informative URL towards the custom licence */
  [API_LICENCE_CUSTOM_URI]: {
    type: String,
    match: VALID_URI,
    index: {
      unique: true,
      // accept empty values as non-duplicates
      partialFilterExpression: {
        [API_LICENCE_CUSTOM_URI]: {
          $exists: true,
          $gt: '',
        },
      },
    },
  },
}
