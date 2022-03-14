'use strict'
// const mod = 'SkosConcept'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { omit } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const utils = require('../../utils/jsUtils')
const Validation = require('../schemaValidators')

// ------------------------------------------------------------------------------------------------
// Other custom schema definitions
// ------------------------------------------------------------------------------------------------
const ids = require('../schemas/Identifiers')
const DictionaryEntry = require('../schemas/DictionaryEntry')
const DictionaryList = require('../schemas/DictionaryList')
const { FIELDS_TO_SKIP } = require('../../db/dbFields')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const validArrayNotNull = {
  validator: utils.isNotEmptyArray,
  message: `'{PATH}' property should not be empty`,
}

// ------------------------------------------------------------------------------------------------
// Custom schema definition: SkosConcept
// ------------------------------------------------------------------------------------------------
/**
 * A SKOS concept is an element in a controlled vocabulary such as a
 * thesaurus. It offers to link concepts in hierarchical (broader/narrower)
 * or neighbouring relationships.
 * A set of SKOS concepts is gathered in one concept scheme.
 * If a SKOS concept appears in two different concept schemes, it should be
 * duplicated as there are chances the context is slightly different and the
 * meaning will be hard to unify.
 */
const SkosConceptSchema = new mongoose.Schema(
  {
    // ---------------------------
    // Identifiers
    // ---------------------------

    /**
     * Unique and permanent identifier for the concept in RUDI system (required)
     * === skos:notation
     */
    concept_id: ids.UUIDv4,

    /**
     * Short abstract code / simple name for the concept
     * === <#CONCEPT_LABEL> a skos:Concept
     */
    concept_code: {
      type: String,
      minlength: 2,
      maxlength: 30,
      unique: true,
      index: true,
      // lowercase: true,
      required: true,
    },

    /**
     * Web page that document the SKOS concept
     */
    concept_uri: {
      type: String,
      match: Validation.VALID_URI,
    },

    // ---------------------------
    // Labels
    // ---------------------------

    /**
     * Preferred lexical label for the resource, one for each language
     */
    pref_label: {
      type: [DictionaryEntry],
      required: true,
      validate: validArrayNotNull,
    },

    /**
     * List of alternative labels (in each language)
     */
    alt_labels: {
      type: [DictionaryList],
    },

    /**
     * List of alternative orthographs (in each language)
     */
    hidden_labels: [DictionaryList],

    // ---------------------------
    // Classification
    // ---------------------------
    /**
     * Reference to the compiled vocabulary,
     * thesaurus or classification scheme
     */
    of_scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkosScheme',
      required: true,
    },

    /**
     * Underlines a particular use for this Concept, e.g. a potential
     * value for a property (e.g. "metadata.theme", "metadata.keywords",
     * "metadata.licence")
     */
    concept_role: {
      type: String,
    },

    // ---------------------------
    // Relationships
    // ---------------------------

    /**
     * References to the 'parent' SKOS concepts with a broader scope
     * than the current concept
     */
    broader_concepts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SkosConcept',
        },
      ],
    },

    /**
     * References to the 'children' SKOS concepts with a narrower scope
     * than the current concept
     */
    narrower_concepts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SkosConcept',
        },
      ],
    },

    /**
     * References to the SKOS concepts that are neighbouring meanings
     * of the current concept
     */
    siblings_concepts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SkosConcept',
        },
      ],
    },

    /**
     * References to the SKOS concepts that can be associated in a
     * non-transitive relationship
     */
    relative_concepts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SkosConcept',
        },
      ],
    },

    // ---------------------------
    // Documentation
    // ---------------------------
    /**
     * Contextual information about the intended meaning of the concept,
     * especially as an indication of how the use of the concept
     */
    scope_note: [DictionaryEntry],

    /**
     * Documentation: complete (internationalized) explanation of the intended
     * meaning of a concept
     */
    concept_definition: [DictionaryEntry],

    /** Documentation: internationalized example */
    concept_example: [DictionaryEntry],

    /*
  // Documentation: internationalized validation msg
  concept_editorial_note: {
    validation_date: Date,
    validated_by: Contact
  }
  */
  },
  {
    timestamps: true,
    id: false,
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

// ------------------------------------------------------------------------------------------------
// Schema refinements
// ------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
SkosConceptSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
const SkosConcept = mongoose.model('SkosConcept', SkosConceptSchema)
module.exports = SkosConcept
