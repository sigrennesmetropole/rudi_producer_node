'use strict'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { PARAM_THESAURUS_LANG } = require('../../config/confApi')
const Language = require('../thesaurus/Languages').get()

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
const DictionaryEntry = new mongoose.Schema(
  {
    [PARAM_THESAURUS_LANG]: {
      type: String,
      default: Language.fr,
      enum: Object.values(Language),
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
)

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = DictionaryEntry
