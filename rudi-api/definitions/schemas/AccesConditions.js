// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { API_CONFIDENTIALITY, API_LICENCE, API_RESTRICTED_ACCESS } from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { DictionaryEntrySchema } from './DictionaryEntry.js'
import { LicenceSchema } from './Licence.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const AccesConditionSchema = {
  /** 'licence': Standard licence (recognized by RUDI system) */
  [API_LICENCE]: LicenceSchema,

  /** 'confidentiality': Restriction level for the resource */
  [API_CONFIDENTIALITY]: {
    /**
     * 'restricted_access': True if the dataset has a restricted access, false for open data
     */
    [API_RESTRICTED_ACCESS]: { type: Boolean, default: false },

    /** True if the dataset embeds personal data */
    gdpr_sensitive: { type: Boolean, default: false },
  },

  /** Describes how constrained is the use of the resource */
  usage_constraint: { type: [DictionaryEntrySchema], default: undefined, _id: false },

  /** Information that MUST be cited every time the data is used */
  bibliographical_reference: { type: [DictionaryEntrySchema], default: undefined, _id: false },

  /**
   * Mention that must be cited verbatim in every publication that
   * makes use of the data
   */
  mandatory_mention: { type: [DictionaryEntrySchema], default: undefined, _id: false },
  access_constraint: { type: [DictionaryEntrySchema], default: undefined, _id: false },
  other_constraints: { type: [DictionaryEntrySchema], default: undefined, _id: false },
}
