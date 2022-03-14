'use strict'

const mod = 'dbAct'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const { beautify } = require('../utils/jsUtils')
const log = require('../utils/logging')
const { RudiError } = require('../utils/errors')

const { LogEntry } = require('../definitions/models/LogEntry')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const { PARAM_THESAURUS_LANG } = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Actions on DB tables
// ------------------------------------------------------------------------------------------------
exports.getCollections = async () => {
  const fun = `getCollections`
  try {
    const collections = await mongoose.connection.db.listCollections().toArray()
    collections.map((collection) => collection.name)
    return collections
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.dropDB = async (req, reply) => {
  const fun = `dropDB`
  try {
    log.t(mod, fun, ``)
    /* Drop the whole DB !!! */
    // const dbActionResult = await mongoose.connection.db.dropDatabase()
    // log.d(mod, fun, 'DB dropped')

    const logsCollection =
      LogEntry && LogEntry.collection && LogEntry.collection.name
        ? LogEntry.collection.name
        : 'logentries'

    const listCollections = await mongoose.connection.db.listCollections().toArray()
    // log.d(mod, fun, `listCollections: ${utils.beautify(listCollections)}`)
    log.d(mod, fun, `listCollections: ${beautify(listCollections)}`)

    const collectionDropped = {}
    await Promise.all(
      listCollections.map(async (collection) => {
        if (!collection) log.d(mod, fun, `Weird: ${beautify(collection)}`)
        if (collection.name !== logsCollection) {
          log.d(mod, fun, `dropping '${collection.name}'`)
          mongoose.connection.db.dropCollection(collection.name)
          collectionDropped[collection.name] = true
        }
      })
    )
    return collectionDropped
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.dropCollection = async (collectionName) => {
  const fun = `dropCollection`
  try {
    const listCollections = await mongoose.connection.db.listCollections().toArray()
    // log.d(mod, fun, `listCollections: ${utils.beautify(listCollections)}`)
    let isCollectionDropped = false
    await Promise.all(
      listCollections.map(async (collection) => {
        if (collection.name === collectionName) {
          mongoose.connection.db.dropCollection(collectionName)
          isCollectionDropped = true
          return isCollectionDropped
        }
        return isCollectionDropped
      })
    )
    if (isCollectionDropped) {
      log.d(mod, fun, `Dropped collection '${collectionName}'`)
      return true
    } else {
      log.d(mod, fun, `Collection '${collectionName}' was not found`)
      return false
    }
  } catch (err) {
    // log.w(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}

// const MDB_SEARCH_INDEXES = { _fts: 'text', _ftsx: 1 }
const SEARCH_INDEX = 'searchIndex'

exports.makeSearchable = async (Model) => {
  const fun = 'makeSearchable'
  try {
    log.t(mod, fun, ``)
    let collection
    try {
      collection = Model.collection
    } catch (err) {
      log.d(mod, fun, `No collection for '${Model.name}: ${err}`)
    }
    if (!collection) {
      log.d(mod, fun, `No collection for '${Model.name}`)
      return
    }
    const listFields = Model.getSearchableFields()
    if (!listFields) {
      log.d(mod, fun, `No searchable fields for '${Model.name}`)
    }
    // Preparing the 'text' (=== searchable) indexes
    const searchIndexes = {}
    listFields.map((field) => (searchIndexes[field] = 'text'))

    const indexOpts = {
      name: SEARCH_INDEX,
      default_language: 'french',
      language_override: PARAM_THESAURUS_LANG,
    }

    // log.d(mod, fun, utils.beautify(searchIndexes))

    // Dropping current text indexes if they exist
    try {
      const indexes = await collection.getIndexes()
      await Promise.all(
        Object.entries(indexes).map(async (key) => {
          // log.d(mod, fun, `${collection.name} - ${index}: ${key}`)
          if (key === `${SEARCH_INDEX},_fts,text,_ftsx,1`) {
            log.t(mod, fun, `Dropping search indexes for '${collection.name}'`)
            collection.dropIndex(SEARCH_INDEX)
          }
        })
      )
    } catch (er) {
      if (er.codeName === 'NamespaceNotFound') log.v(mod, fun, 'Not dropping inexistant indexes')
      else log.w(mod, fun, er) // throw er?
    }
    // (Re)creating the indexes
    log.t(mod, fun, `Creating search indexes for collection '${collection.name}'`)
    await collection.createIndex(searchIndexes, indexOpts)
  } catch (err) {
    log.w(mod, fun, `Couldn't create indexes for '${Model.collection.name}': ${err}`)
    throw RudiError.treatError(mod, fun, err)
  }
}
