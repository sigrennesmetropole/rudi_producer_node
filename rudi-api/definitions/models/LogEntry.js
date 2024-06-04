const mod = 'logDb'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------

import mongoose from 'mongoose'
const { Schema, model } = mongoose

import datetime from 'date-and-time'
import { v4 } from 'uuid'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  DB_CREATED_AT,
  DB_UPDATED_AT,
  DICT_LANG,
  LOG_FUN,
  LOG_ID,
  LOG_LVL,
  LOG_MOD,
  LOG_MSG,
  LOG_TIME,
  LOG_USR,
} from '../../db/dbFields.js'

import { VALID_EPOCH_MS, VALID_UUID } from '../schemaValidators.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { LOG_DATE_FORMAT, consoleErr } from '../../utils/jsUtils.js'

import { LOG_EXP } from '../../config/confLogs.js'

// const dayS = 60 * 60 * 24
// const logExpirationTime = 100 // 7 * dayS

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const LogEntrySchema = new Schema(
  {
    /** Unique and permanent identifier for the log entry (required) */
    [LOG_ID]: {
      type: String,
      default: v4,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      match: VALID_UUID,
    },

    /** Epoch time of the event in ms */
    [LOG_TIME]: {
      type: Number,
      default: Date.now,
      required: true,
      match: VALID_EPOCH_MS,
      index: true,
    },

    /** Message that describes the event */
    [LOG_MSG]: {
      type: String,
      required: true,
    },

    /** Log level */
    [LOG_LVL]: {
      type: String,
      required: true,
    },

    /** Module/file the log is coming from */
    [LOG_MOD]: {
      type: String,
    },

    /** Function the log is coming from */
    [LOG_FUN]: {
      type: String,
    },

    /** User identified for the request */
    [LOG_USR]: {
      type: String,
    },
  },
  {
    // Adds mongoose fields 'updatedAt' and 'createdAt'
    timestamps: true,
    id: false,

    // optimisticConcurrency: true,
    // strict: true,
    // runSettersOnQuery: true,
    toObject: {
      // getters: true,
      // setters: true,
      virtuals: true,
    },
    toJSON: {
      virtuals: true,
    },
  }
)

LogEntrySchema.index({ [DB_UPDATED_AT]: 1 }, { expires: LOG_EXP })

// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
LogEntrySchema.methods.toJSON = function () {
  return logLineToString(this)
  // return omit(this.toObject(), [DB_ID, DB_V, DB_UPDATED_AT])
}

LogEntrySchema.methods.toString = function () {
  return logLineToString(this)
}

// -------------------------------------------------------------------------------------------------
// Helper function
// -------------------------------------------------------------------------------------------------
export function makeLogInfo(logLvl, mod, fun, msg) {
  if (!msg) msg = ''
  return {
    message: msg, // .replace(/\"/g, "'"),
    log_level: logLvl,
    location_module: mod,
    location_function: fun,
  }
}

export const logLineToString = (logLine) =>
  `${datetime.format(logLine[DB_CREATED_AT], LOG_DATE_FORMAT)} ${logLine.time} ${
    logLine.log_level
  } ` + `[ ${logLine.location_module} . ${logLine.location_function} ] ${logLine.message}`

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export const LogEntry = model('LogEntry', LogEntrySchema)

LogEntry.getSearchableFields = () => [LOG_MSG, LOG_LVL, LOG_USR]
const SEARCH_INDEX = 'searchIndex'

LogEntry.initialize = async () => {
  const fun = 'initLogEntry'
  try {
    const collection = LogEntry.collection
    const listFields = LogEntry.getSearchableFields()
    const searchIndexes = {}

    listFields.map((field) => (searchIndexes[field] = 'text'))

    const indexOpts = {
      name: SEARCH_INDEX,
      default_language: 'french',
      language_override: DICT_LANG,
    }

    // Dropping current text indexes if they exist
    const indexes = await collection.getIndexes()
    await Promise.all(
      Object.entries(indexes).map(async (key) => {
        if (key == `${SEARCH_INDEX},_fts,text,_ftsx,1`) await collection.dropIndex(SEARCH_INDEX)
      })
    )
    // (Re)creating the indexes
    await collection.createIndex(searchIndexes, indexOpts)
    return `LogEntry indexes created`
  } catch (err) {
    consoleErr(mod, fun, err)
  }
}
