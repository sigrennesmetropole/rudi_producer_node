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
export const DictionaryListSchema = {
  [DICT_LANG]: {
    type: String,
    default: Languages.fr,
    enum: Object.values(Languages),
    required: true,
  },
  [DICT_TEXT]: {
    type: [String], // THE difference with DictionaryEntry: we can have several labels per langauge here !
    required: true,
  },
}
