'use strict'

const mod = 'logDb'
// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const { Schema, model } = require('mongoose')
const datetime = require('date-and-time')
const { v4 } = require('uuid')
// const { omit } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const { LOG_DATE_FORMAT, consoleErr } = require('../../utils/jsUtils')
const { LOG_EXP } = require('../../config/confLogs')
const { VALID_UUID, VALID_EPOCH_MS } = require('../schemaValidators')

const {
  DB_CREATED_AT,
  LOG_ID,
  LOG_TIME,
  LOG_MSG,
  LOG_LVL,
  LOG_USR,
  LOG_FUN,
  LOG_MOD,
  DB_UPDATED_AT,
} = require('../../db/dbFields')

const { PARAM_THESAURUS_LANG } = require('../../config/confApi')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
// const dayS = 60 * 60 * 24
// const logExpirationTime = 100 // 7 * dayS

// ------------------------------------------------------------------------------------------------
// Custom schema definition
// ------------------------------------------------------------------------------------------------
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

// LogEntrySchema.virtual('time').get(() => this.createdAt.getTime())

// ------------------------------------------------------------------------------------------------
// Schema refinements
// ------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
LogEntrySchema.methods.toJSON = function () {
  return logLineToString(this)

  // return omit(this.toObject(), [DB_ID, DB_V, DB_UPDATED_AT])
}

LogEntrySchema.methods.toString = function () {
  return logLineToString(this)
}

// ------------------------------------------------------------------------------------------------
// Helper function
// ------------------------------------------------------------------------------------------------
function makeLogInfo(logLvl, mod, fun, msg) {
  if (!msg) msg = ''
  return {
    message: msg, // .replace(/\"/g, "'"),
    log_level: logLvl,
    location_module: mod,
    location_function: fun,
  }
}

function logLineToString(logLine) {
  // const fun = 'logLineToString'
  // log.d(mod, fun , `logLine: ${beautify(logLine)}`)
  // const dateStr = `${format(logLine[DB_CREATED_AT], LOG_DATE_FORMAT)} ${logLine[
  //   DB_CREATED_AT
  // ].getTime()}`
  return (
    `${datetime.format(logLine[DB_CREATED_AT], LOG_DATE_FORMAT)} ${logLine.time} ${
      logLine.log_level
    } ` + `[ ${logLine.location_module} . ${logLine.location_function} ] ${logLine.message}`
  )
}

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
const LogEntry = model('LogEntry', LogEntrySchema)

LogEntry.getSearchableFields = () => [LOG_MSG, LOG_LVL, LOG_USR]
const SEARCH_INDEX = 'searchIndex'

const fun = 'createSearchIndexes'
LogEntry.createSearchIndexes = async () => {
  try {
    const collection = LogEntry.collection
    const listFields = LogEntry.getSearchableFields()
    const searchIndexes = {}

    listFields.map((field) => (searchIndexes[field] = 'text'))

    const indexOpts = {
      name: SEARCH_INDEX,
      default_language: 'french',
      language_override: PARAM_THESAURUS_LANG,
    }

    // Dropping current text indexes if they exist
    const indexes = await collection.getIndexes()
    await Promise.all(
      Object.entries(indexes).map(async (key) => {
        if (key === `${SEARCH_INDEX},_fts,text,_ftsx,1`) await collection.dropIndex(SEARCH_INDEX)
      })
    )
    // (Re)creating the indexes
    await collection.createIndex(searchIndexes, indexOpts)
  } catch (err) {
    consoleErr(mod, fun, err)
  }
}
LogEntry.createSearchIndexes().catch((err) => {
  throw new Error(`[mod, fun] Failed to create search indexes: ${err}`)
})
LogEntry.collection.dropIndex({ [DB_UPDATED_AT]: 1 }).catch(() => 'nevermind')

module.exports = { LogEntry, makeLogInfo, logLineToString }
