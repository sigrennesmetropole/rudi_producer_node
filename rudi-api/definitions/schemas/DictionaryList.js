'use strict'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const Language = require('../thesaurus/Languages').get()

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
const DictionaryList = new mongoose.Schema(
  {
    lang: {
      type: String,
      default: Language.fr_FR,
      enum: Object.values(Language),
      required: true,
    },
    text: {
      type: [String],
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
module.exports = DictionaryList
