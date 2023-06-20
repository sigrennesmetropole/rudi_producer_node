// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { DICT_LANG, DICT_TEXT } from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { get as getLanguages } from '../thesaurus/Languages.js'
const Languages = getLanguages()

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const DictionaryEntrySchema = {
  type: {
    [DICT_LANG]: {
      type: String,
      default: Languages.fr,
      enum: Object.values(Languages),
      required: true,
    },
    [DICT_TEXT]: {
      type: String, // Only one entry per language!
      required: true,
    },
  },
  _id: false,
}
