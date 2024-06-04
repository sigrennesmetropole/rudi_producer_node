const mod = 'dbAct'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'
const { connection } = mongoose

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { DICT_LANG } from './dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify } from '../utils/jsUtils.js'

import { LogEntry } from '../definitions/models/LogEntry.js'

import { logD, logT, logV, logW } from '../utils/logging.js'

import { RudiError } from '../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Actions on MongoDB tables from mongoose
// -------------------------------------------------------------------------------------------------
export const daDropModelCollection = (ObjModel) =>
  ObjModel?.collection
    ?.drop()
    .then(() => logD(mod, 'dropModelCollection', `done`))
    .catch((err) => logW(mod, 'dropModelCollection', err))

// -------------------------------------------------------------------------------------------------
// Actions on MongoDB tables
// -------------------------------------------------------------------------------------------------
export const daGetCollections = async () => {
  const fun = `getCollections`
  try {
    const collections = await connection.db.listCollections().toArray()
    collections.forEach((collection) => collection.name)
    return collections
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const daDropDB = async (req, reply) => {
  const fun = `daDropDB`
  try {
    logT(mod, fun)
    /* Drop the whole DB !!! */
    // const dbActionResult = await connection.db.dropDatabase()
    // logD(mod, fun, 'DB dropped')

    const logsCollection = LogEntry?.collection?.name || 'logentries'

    const listCollections = await connection.db.listCollections().toArray()
    // logD(mod, fun, `listCollections: ${beautify(listCollections)}`)

    const droppedCollections = []
    await Promise.all(
      listCollections.map(async (collection) => {
        if (!collection) logD(mod, fun, `Weird: ${beautify(collection)}`)
        if (collection?.name !== logsCollection)
          droppedCollections.push(await daDropCollection(collection.name))
        else
          droppedCollections.push({
            name: logsCollection,
            dropped: false,
          })
      })
    )
    return droppedCollections
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const daDropCollection = async (collectionName) => {
  const fun = `daDropCollection`
  try {
    const listCollections = await connection.db.listCollections().toArray()
    // logD(mod, fun, `listCollections: ${utils.beautify(listCollections)}`)
    const droppedCollections = []
    let isCollectionDropped = false
    await Promise.all(
      listCollections.map(async (collection) => {
        if (collection.name === collectionName) {
          droppedCollections.push({
            name: collectionName,
            id: collection.info?.uuid,
            dropped: await connection.db.dropCollection(collectionName),
          })
          isCollectionDropped = true
        }
        return isCollectionDropped
      })
    )
    if (isCollectionDropped) {
      logD(mod, fun, `Dropped collection '${collectionName}'`)
      return droppedCollections[0]
    } else {
      logD(mod, fun, `Collection '${collectionName}' was not found`)
      return { name: collectionName, dropped: false }
    }
  } catch (err) {
    // logW(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}

// const MDB_SEARCH_INDEXES = { _fts: 'text', _ftsx: 1 }
const SEARCH_INDEX = 'searchIndex'

export const makeSearchable = async (ObjModel) => {
  const fun = 'makeSearchable'
  try {
    // logT(mod, fun)
    let collection
    try {
      collection = ObjModel.collection
    } catch (err) {
      logW(mod, fun, `No collection for '${ObjModel.name}': ${err}`)
      return
    }
    if (!collection) {
      logW(mod, fun, `No collection for '${ObjModel.name}'`)
      return
    }

    let searchableFields
    try {
      searchableFields = ObjModel.getSearchableFields()
      if (!searchableFields)
        throw Error(`Can't find any searchable field for Model '${collection.name}'`)
    } catch (err) {
      // => searchableFields is undefined or method ObjModel.getSearchableFields() doesn't exist
      logD(mod, fun, `No searchable fields for '${collection.name}'`)
      return
    }

    logD(mod, fun, `Searchable fields for ${collection.name}: ${searchableFields}`)

    // Dropping current text indexes if they exist
    try {
      const indexes = await collection.getIndexes()
      if (indexes[SEARCH_INDEX]) {
        // const val = indexes[SEARCH_INDEX]
        logD(mod, fun, `Search indexes already exist: ${collection.name}`)
        // logT(mod, fun, `Dropping search indexes for '${collection.name}'`)
        // await collection.dropIndex(SEARCH_INDEX)
      }
    } catch (er) {
      if (er.codeName === 'NamespaceNotFound') {
        logV(mod, fun, 'Not dropping inexistant indexes')
      } else {
        logW(mod, fun, er) // throw er?
      }
    }
    // Preparing the 'text' (=== searchable) indexes
    const searchIndexes = {}
    searchableFields.map((field) => (searchIndexes[field] = 'text'))

    const indexOpts = {
      name: SEARCH_INDEX,
      default_language: 'french',
      language_override: DICT_LANG,
    }

    // (Re)creating the indexes
    // logT(mod, fun, `Creating search indexes for collection '${collection.name}'}`)
    try {
      try {
        await collection.createIndex(searchIndexes, indexOpts)
      } catch (e) {
        logT(mod, fun, `Need for droping ${collection.name} indexes`)
        await collection.dropIndex(SEARCH_INDEX)
        await collection.createIndex(searchIndexes, indexOpts)
      }
      const indexes = await collection.getIndexes()
      const msg = `Indexes creation for ${collection.name}: ${
        indexes[SEARCH_INDEX] ? 'ok' : 'KO!!'
      }`
      logT(mod, fun, msg)
    } catch (e) {
      logW(mod, fun, `Indexes not created for '${ObjModel.collection.name}': ${e}`)
      throw RudiError.treatError(mod, fun, e)
    }
    return `${collection.name} indexes created`
  } catch (err) {
    logW(mod, fun, `Couldn't create indexes for '${ObjModel.collection.name}': ${err}`)
    throw RudiError.treatError(mod, fun, err)
  }
}
