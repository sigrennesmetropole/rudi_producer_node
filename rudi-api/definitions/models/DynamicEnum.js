// const mod = 'DynEnumSch'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

import _ from 'lodash'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { FIELDS_TO_SKIP } from '../../db/dbFields.js'

import { DictionaryEntrySchema } from '../schemas/DictionaryEntry.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const ENUM_CODE = 'code'
export const ENUM_VALUES = 'values'

export const ENUM_KEY = 'key'
export const ENUM_LABELS = 'labels'
export const ENUM_LABELLED_VALUES = 'labelledValues'

const DynamicEnumSchema = new mongoose.Schema(
  {
    [ENUM_CODE]: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    [ENUM_VALUES]: {
      type: [String],
    },
    [ENUM_LABELLED_VALUES]: {
      [ENUM_KEY]: String,
      [ENUM_LABELS]: [DictionaryEntrySchema],
    },
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

// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
DynamicEnumSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export const DynamicEnum = mongoose.model('DynamicEnum', DynamicEnumSchema)
