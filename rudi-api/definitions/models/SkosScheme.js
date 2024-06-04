// const mod = 'SkosScheme'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
import mongoose from 'mongoose'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { FIELDS_TO_SKIP } from '../../db/dbFields.js'
import { VALID_URI } from '../schemaValidators.js'
import { UuidV4Schema } from '../schemas/Identifiers.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { isNotEmptyArray } from '../../utils/jsUtils.js'

// -------------------------------------------------------------------------------------------------
// Other custom schema definitions
// -------------------------------------------------------------------------------------------------
import { DictionaryEntrySchema } from '../schemas/DictionaryEntry.js'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
const validArrayNotNull = {
  validator: isNotEmptyArray,
  message: `'{PATH}' property should not be empty`,
}

// -------------------------------------------------------------------------------------------------
// Custom schema definition: SkosScheme
// -------------------------------------------------------------------------------------------------
/**
 * Set of SKOS concepts gathered in a transversal and hierarchical
 * relationships.
 */
const SkosSchemeSchema = new mongoose.Schema(
  {
    // ---------------------------
    // ConceptScheme identifiers
    // ---------------------------

    /**
     * Unique and permanent identifier for the concept scheme in RUDI system (required)
     */
    scheme_id: UuidV4Schema,

    /**
     * Short abstract code / simple name for the concept scheme
     * === <#CONCEPT_LABEL> a skos:Concept
     */
    scheme_code: {
      type: String,
      minlength: 2,
      maxlength: 30,
      unique: true,
      index: true,
      lowercase: true,
      required: true,
    },

    /** Short code for the concept scheme */
    scheme_label: {
      type: [DictionaryEntrySchema],
      required: true,
      validate: validArrayNotNull,
    },

    /** Web page that document the SKOS concept scheme */
    scheme_uri: {
      type: String,
      match: VALID_URI,
    },

    /** List of the highest level concepts in the concept scheme */
    top_concepts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SkosConcept',
        },
      ],
    },
  },
  {
    timestamps: true,
    id: false,
    optimisticConcurrency: true,
    useNestedStrict: true,
    toObject: {
      getters: true,
      setters: true,
      virtuals: true,
    },
    toJSON: {
      getters: true,
      setters: true,
      virtuals: true,
    },
  }
)

// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
SkosSchemeSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
const SkosScheme = mongoose.model('SkosScheme', SkosSchemeSchema)
export default SkosScheme
