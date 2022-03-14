'use strict'

const mod = 'db'
/*
 * In this file are made the different calls to the database
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { omit, pick } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const msg = require('../utils/msg')

const json = require('../utils/jsonAccess')
const utils = require('../utils/jsUtils')

const {
  ParameterExpectedError,
  NotFoundError,
  ObjectNotFoundError,
  NotImplementedError,
  BadRequestError,
  RudiError,
} = require('../utils/errors')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  PARAM_ID,
  OBJ_METADATA,
  OBJ_ORGANIZATIONS,
  OBJ_CONTACTS,
  OBJ_MEDIA,
  OBJ_SKOS_SCHEMES,
  OBJ_SKOS_CONCEPTS,
  OBJ_REPORTS,
  OBJ_LOGS,
  OBJ_LICENCES,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_FILTER,
  QUERY_FIELDS,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_OFFSET,
  QUERY_SORT_BY,
  QUERY_SEARCH_TERMS,
  MAX_QUERY_LIMIT,
  DEFAULT_QUERY_LIMIT,
  DEFAULT_QUERY_OFFSET,
  QUERY_COUNT_BY,
  MONGO_ERROR,
  COUNT_LABEL,
  LIST_LABEL,
} = require('../config/confApi')

// Fields from the JSON as definied in the API
const {
  DB_ID,
  DB_CREATED_AT,
  API_METADATA_ID,
  API_ORGANIZATION_ID,
  API_CONTACT_ID,
  API_MEDIA_ID,
  API_REPORT_ID,
  API_DATA_PRODUCER_PROPERTY,
  API_DATA_CONTACTS_PROPERTY,
  API_METAINFO_PROPERTY,
  API_METAINFO_PROVIDER_PROPERTY,
  API_METAINFO_CONTACTS_PROPERTY,
  API_SKOS_SCHEME_ID,
  API_SKOS_CONCEPT_ID,
  API_SKOS_SCHEME_CODE,
  API_SKOS_CONCEPT_ROLE,
  FIELDS_TO_SKIP,
  API_MEDIA_PROPERTY,
  LOG_ID,
} = require('./dbFields')

const { JWT_EXP } = require('../utils/crypto')

// ------------------------------------------------------------------------------------------------
// Data models
// ------------------------------------------------------------------------------------------------
const SkosScheme = require('../definitions/models/SkosScheme')
const SkosConcept = require('../definitions/models/SkosConcept')
const PortalToken = require('../definitions/models/PortalToken')

const { Organization } = require('../definitions/models/Organization')
const { Contact } = require('../definitions/models/Contact')

const { Media } = require('../definitions/models/Media')
const { Metadata, METADATA_FIELDS_TO_POPULATE } = require('../definitions/models/Metadata')

const { Report } = require('../definitions/models/Report')
const { LogEntry, logLineToString } = require('../definitions/models/LogEntry')
const { dropCollection } = require('./dbActions')

// ------------------------------------------------------------------------------------------------
// Properties with special treatments
// ------------------------------------------------------------------------------------------------
/** Fields to skip while populating */
const SKIP_FIELDS = `-${FIELDS_TO_SKIP.join(' -')}`

// ------------------------------------------------------------------------------------------------
// Specific object accesses
// ------------------------------------------------------------------------------------------------
const OBJ_MODEL = 'Model'
const OBJ_ID = 'idField'

const RUDI_OBJECTS = {
  [OBJ_METADATA]: { [OBJ_MODEL]: Metadata, [OBJ_ID]: API_METADATA_ID },
  [OBJ_ORGANIZATIONS]: { [OBJ_MODEL]: Organization, [OBJ_ID]: API_ORGANIZATION_ID },
  [OBJ_CONTACTS]: { [OBJ_MODEL]: Contact, [OBJ_ID]: API_CONTACT_ID },
  [OBJ_MEDIA]: { [OBJ_MODEL]: Media, [OBJ_ID]: API_MEDIA_ID },
  [OBJ_SKOS_SCHEMES]: { [OBJ_MODEL]: SkosScheme, [OBJ_ID]: API_SKOS_SCHEME_ID },
  [OBJ_SKOS_CONCEPTS]: { [OBJ_MODEL]: SkosConcept, [OBJ_ID]: API_SKOS_CONCEPT_ID },
  [OBJ_REPORTS]: { [OBJ_MODEL]: Report, [OBJ_ID]: API_REPORT_ID },
  [OBJ_LOGS]: { [OBJ_MODEL]: LogEntry, [OBJ_ID]: LOG_ID },
  [OBJ_LICENCES]: { [OBJ_MODEL]: SkosConcept, [OBJ_ID]: API_SKOS_CONCEPT_ID },
}

exports.getRudiObjectList = () => RUDI_OBJECTS

function assertIsString(fun, param) {
  if (typeof param !== 'string') {
    const err = new BadRequestError(msg.parameterTypeExpected(fun, 'string', param))
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getObjectAccesses = (objectType) => {
  const fun = 'getObjectAccesses'
  try {
    // log.t(mod, fun, ``)
    // assertIsString(fun, objectType)
    if (!RUDI_OBJECTS[objectType]) throw new NotFoundError(msg.objectTypeNotFound(objectType))
    return RUDI_OBJECTS[objectType]
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getObjectModel = (objectType) => {
  const fun = 'getObjectModel'
  try {
    // // log.t(mod, fun, ``)
    return this.getObjectAccesses(objectType)[OBJ_MODEL]
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getObjectIdField = (objectType) => {
  const fun = 'getObjectIdField'
  try {
    // // log.t(mod, fun, ``)
    return this.getObjectAccesses(objectType)[OBJ_ID]
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getSearchableFields = (objectType) => {
  const fun = 'getSearchableFields'
  try {
    const Model = this.getObjectModel(objectType)

    try {
      return Model.getSearchableFields()
    } catch (err) {
      throw NotImplementedError(`Object '${objectType}' is not searchable yet.`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
/**
 * If the input field is not a reference to another Collection, return null
 * If the input filed is a property from another Collection, return the root
 * field and the corresponding Model
 */
exports.getRootRef = (objectType, field) => {
  const FieldModel = this.getFieldModel(objectType, field)
  if (!FieldModel) return [false, false]
  const rootProp = field.split('.')[0]
  return [FieldModel, rootProp]
}

exports.getFieldModel = (objectType, field) => {
  const fun = 'getFieldModel'
  // log.d(mod, fun, `field: ${utils.beautify(field)}`)

  assertIsString(fun, objectType)
  assertIsString(fun, field)

  if (objectType !== OBJ_METADATA) return null

  const prop = field.split('.')[0]

  switch (prop) {
    case API_DATA_PRODUCER_PROPERTY:
    case `${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`:
      return Organization
    case API_DATA_CONTACTS_PROPERTY:
    case `${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`:
      return Contact
    case API_MEDIA_PROPERTY:
      return Media
    default:
      return null
  }
}

exports.getMetadataFieldsWithObjectType = (objectType) => {
  const fun = 'getMetadataFieldsWithObjectType'
  assertIsString(fun, objectType)

  if (objectType === OBJ_METADATA) return null

  switch (objectType) {
    case OBJ_ORGANIZATIONS:
      return [
        Organization,
        [API_DATA_PRODUCER_PROPERTY, `${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`],
      ]
    case OBJ_CONTACTS:
      return [
        Contact,
        [API_DATA_CONTACTS_PROPERTY, `${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`],
      ]
    case OBJ_MEDIA:
      return [Media, [API_MEDIA_PROPERTY]]
    default:
      return null
  }
}

function getPopulateOptions(objectType) {
  if (objectType === OBJ_METADATA) {
    return [
      {
        path: METADATA_FIELDS_TO_POPULATE,
        select: SKIP_FIELDS,
      },
    ]
  } else {
    return []
  }
}

function getPopulateFields(objectType) {
  if (objectType !== OBJ_METADATA) return []
  return METADATA_FIELDS_TO_POPULATE
}

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------
exports.getModelPropertyNames = (Model) => {
  return Object.keys(Model.schema.paths)
}

exports.isProperty = (Model, prop) => {
  return this.getModelPropertyNames(Model).includes(prop)
}

// ------------------------------------------------------------------------------------------------
// Actions on DB tables
// ------------------------------------------------------------------------------------------------

exports.cleanLicences = async () => {
  const fun = `cleanLicences`

  // const CONCEPTS_COLLECTION_NAME = 'skosconcepts'
  // const SCHEMES_COLLECTION_NAME = 'skosschemes'

  try {
    // TODO: target only licences hierarchy!
    await dropCollection(SkosConcept.collection.name)
    await dropCollection(SkosScheme.collection.name)
  } catch (err) {
    // log.w(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Generic functions: get single object
// ------------------------------------------------------------------------------------------------
exports.getObject = async (objectType, filter) => {
  const fun = `getObject`
  // // log.t(mod, fun, ``)

  try {
    const Model = this.getObjectModel(objectType)
    const populateOpts = getPopulateOptions(objectType)

    // log.d(mod, fun, `populateOpts: ${utils.beautify(populateOpts)}`)

    if (utils.isEmptyArray(populateOpts)) {
      const obj = await Model.findOne(filter)
      // log.v(mod, fun, `obj: ${utils.beautify(obj)}`)
      return obj
    } else {
      const obj = await Model.findOne(filter).populate(populateOpts)
      // log.v(mod, fun, `obj: ${utils.beautify(obj)}`)
      return obj
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getObjectWithDbId = async (objectType, dbId) => {
  // const fun = `getObjectWithDbId`
  // log.t(mod, fun, ``)
  const filter = { [DB_ID]: dbId }
  return await this.getObject(objectType, filter)
}

exports.getObjectWithRudiId = async (objectType, rudiId) => {
  const fun = `getObjectWithRudiId`
  // // log.t(mod, fun, ``)
  try {
    if (!rudiId) throw new ParameterExpectedError(PARAM_ID, mod, fun) // TODO xxxx   treatError(mod, fun, err, mod, fun)

    const idField = this.getObjectIdField(objectType)
    const filter = { [idField]: rudiId }

    return await this.getObject(objectType, filter)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getEnsuredObjectWithRudiId = async (objectType, rudiId) => {
  const fun = `getEnsuredObjectWithRudiId`
  // log.t(mod, fun, ``)
  try {
    if (!rudiId) throw new ParameterExpectedError(PARAM_ID, mod, fun)
    const dbObject = await this.getObjectWithRudiId(objectType, rudiId)
    if (!dbObject) throw new ObjectNotFoundError(objectType, rudiId)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getObjectWithJson = async (objectType, rudiObject) => {
  const fun = `getObjectWithJson`
  // // log.t(mod, fun, ``)
  try {
    const idField = this.getObjectIdField(objectType)
    const rudiId = json.accessProperty(rudiObject, idField)
    return await this.getObjectWithRudiId(objectType, rudiId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.searchDbIdWithJson = async (objectType, rudiObject) => {
  const fun = `searchObjectWithJson`
  try {
    log.t(mod, fun, ``)
    const Model = this.getObjectModel(objectType)
    return await Model.findOne(rudiObject)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getEnsuredObjectWithJson = async (objectType, rudiObject) => {
  const fun = `getEnsuredObjectWithJson`
  // log.t(mod, fun, ``)
  try {
    const idField = this.getObjectIdField(objectType)
    const rudiId = json.accessProperty(rudiObject, idField)
    const dbObject = await this.getObjectWithRudiId(objectType, rudiId)
    if (!dbObject) throw new ObjectNotFoundError(objectType, rudiId)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getEnsuredObjectWithDbId = async (objectType, dbId) => {
  const fun = `getEnsuredObjectWithDbId`
  // log.t(mod, fun, ``)
  try {
    const dbObject = await this.getObjectWithDbId(objectType, dbId)
    if (!dbObject) throw new ObjectNotFoundError(objectType, dbId)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.doesObjectExistWithRudiId = async (objectType, rudiId) => {
  const fun = `doesObjectExistWithRudiId`
  // log.t(mod, fun, ``)
  try {
    const dbObject = await this.getObjectWithRudiId(objectType, rudiId)
    return !!dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.doesObjectExistWithJson = async (objectType, rudiObject) => {
  const fun = `doesObjectExistWithJson`
  // // log.t(mod, fun, ``)
  try {
    const dbObject = await this.getObjectWithJson(objectType, rudiObject)
    return !!dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getNestedObject = async (objectType, nestedObjectProperty, filter, fieldSelection) => {
  const fun = `getNestedObject`
  log.d(
    mod,
    fun,
    `objectType: ${objectType}, nestedObjectProperty: ${utils.beautify(nestedObjectProperty)}, ` +
      `filter : ${utils.beautify(filter)}, fieldSelection: ${utils.beautify(fieldSelection)} `
  )
  try {
    if (Array.isArray(fieldSelection)) fieldSelection = fieldSelection.join(' ')

    const FieldModel = this.getFieldModel(objectType, nestedObjectProperty)
    if (!fieldSelection) {
      return await FieldModel.find(filter)
    } else {
      const dbObjects = await FieldModel.find(filter, fieldSelection)
      // log.d(mod, fun, `dbObjects: ${dbObjects}`)
      if (utils.isEmptyArray(dbObjects))
        throw new NotFoundError(
          `Object not found! Type: '${nestedObjectProperty}', filter: ${utils.beautify(filter)}`
        )

      return dbObjects // .map((obj) => new mongoose.Types.ObjectId(obj._id))
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Generic functions: get single object / partial access
// ------------------------------------------------------------------------------------------------
exports.getObjectPropertiesWithDbId = async (objectType, dbId, propertyList) => {
  const fun = `getObjectPropertiesWithDbId`
  // log.t(mod, fun, ``)
  try {
    const Model = this.getObjectModel(objectType)
    const populateFields = getPopulateFields(objectType)
    const fields = propertyList.join(' ')
    const filter = { [DB_ID]: dbId }

    if (utils.isEmptyArray(populateFields)) {
      return await Model.findOne(filter, fields)
    } else {
      return await Model.findOne(filter, fields).populate(populateFields)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getObjectPropertiesWithRudiId = async (objectType, rudiId, propertyList) => {
  const fun = `getObjectPropertiesWithRudiId`
  // log.d(mod, fun, `type '${objectType}': ${rudiId}`)
  try {
    const { Model, idField } = this.getObjectAccesses(objectType)
    const filter = { [idField]: rudiId }

    const fields = propertyList.join(' ')
    const populateFields = getPopulateFields(objectType)
    if (!populateFields) {
      return await Model.findOne(filter, fields)
    } else {
      return await Model.findOne(filter, fields).populate(populateFields)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getDbIdWithRudiId = async (objectType, rudiId) => {
  const fun = `getDbIdWithRudiId`
  // log.t(mod, fun, ``)
  // log.d(mod, fun, `objectType: ${objectType}`)
  // log.d(mod, fun, `idField: ${idField}`)
  // log.d(mod, fun, `rudiId: ${rudiId}`)
  try {
    const partialDbObject = await this.getObjectPropertiesWithRudiId(objectType, rudiId, [DB_ID])
    return partialDbObject ? partialDbObject[DB_ID] : null
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getEnsuredDbIdWithRudiId = async (objectType, rudiId) => {
  const fun = `getEnsuredDbIdWithRudiId`
  // log.t(mod, fun, ``)
  try {
    const dbId = await this.getDbIdWithRudiId(objectType, rudiId)
    if (!dbId) throw new ObjectNotFoundError(objectType, rudiId)
    return dbId
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getDbIdWithJson = async (objectType, rudiObject) => {
  const fun = `getDbIdWithJson`
  // log.t(mod, fun, ``)
  try {
    const idField = this.getObjectIdField(objectType)
    const rudiId = json.accessProperty(rudiObject, idField)
    return await this.getDbIdWithRudiId(objectType, rudiId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getEnsuredDbIdWithJson = async (objectType, rudiObject) => {
  const fun = `getEnsuredDbIdWithJson`
  // log.t(mod, fun, ``)
  // log.d(mod, fun, `objectType: ${objectType}`)
  // log.d(mod, fun, `idField: ${idField}`)
  // log.d(mod, fun, `jsonObject: ${utils.beautify(jsonObject)}`)
  try {
    const idField = this.getObjectIdField(objectType)
    const rudiId = json.accessProperty(rudiObject, idField)
    return await this.getEnsuredDbIdWithRudiId(objectType, rudiId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/*
exports.getObjectWithField = async (Model, fieldName, fieldValue, populateFields) => {
  const fun = `getObjectWithField`
  // // log.t(mod, fun, ``)
  try {
    if (!fieldName) throw new ParameterExpectedError('field name', mod, fun)

    const filter = {
      [fieldName]: fieldValue
    }
    return await this.getObject(Model, filter, populateFields)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
 */

// ------------------------------------------------------------------------------------------------
// Generic functions: get object list
// ------------------------------------------------------------------------------------------------
/* const LIST = 'list'
const FIELD = 'field'
const ID = 'id'

function toMongoSortOptions(initialCriteria, sortByFields, conculsionCriteria) {
  const fun = 'toMongoSortOptions'
  const sortOptions = {}
  const listOptions = { id: '$_id' }

  if (sortByFields) {
    let i = 1
    sortByFields.map((field) => {
      let absoluteField
      const genericName = `${FIELD}${i}`
      const genericField = `${LIST}.${genericName}`
      if (field[0] === '-') {
        absoluteField = field.substring(1)
        sortOptions[genericField] = -1
      } else {
        absoluteField = field
        sortOptions[genericField] = 1
      }
      listOptions[genericName] = `$${absoluteField}`

      ++i
    })
    // log.d(mod, fun, utils.beautify(sortOptions))
  }
  return [{ ...initialCriteria, ...sortOptions, ...conculsionCriteria }, listOptions]
}
 */

// function addToFilterUpdated(filter, key, dateVal) {
//   const fun = 'addToFilterUpdated'
//   // // log.t(mod, fun, ``)
//   const date = new Date(dateVal)
//   if (!filter.updatedAt) filter.updatedAt = { [key]: date }
// }

function getParamValue(options, param, defaultVal, maxVal) {
  const val = options ? options[param] : null
  if (!val) return defaultVal
  if (!maxVal || val < maxVal) return val
  return maxVal
}

exports.getObjectList = async (objectType, options) => {
  const fun = `getObjectList`
  try {
    log.t(mod, fun, ``)
    //--- Parameters
    // Identify object type characteristics
    const Model = this.getObjectModel(objectType)

    // Extract options
    const limit = getParamValue(options, QUERY_LIMIT, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT)
    const offset = getParamValue(options, QUERY_OFFSET, DEFAULT_QUERY_OFFSET)
    const filter = getParamValue(options, QUERY_FILTER)
    const fields = getParamValue(options, QUERY_FIELDS)
    const sortByFields = getParamValue(options, QUERY_SORT_BY)

    const populateFields = getPopulateFields(objectType)

    // log.d(mod, fun, `options: ${utils.beautify(options)}`)

    // log.d(mod, fun, `filter: ${utils.beautify(filter)}`)

    // const [sortOptions] = toMongoSortOptions({}, sortBy, { [idField]: 1 })
    const sortOptions = {}
    if (sortByFields) {
      sortByFields.map((field) => {
        if (field[0] === '-') {
          sortOptions[field.substring(1)] = -1
        } else {
          sortOptions[field] = 1
        }
      })
    }
    sortOptions[DB_ID] = 1 // Default sort to get consistent offset/limit results

    // log.d(mod, fun, `sortOptions: ${utils.beautify(sortOptions)}`)

    //--- Find
    if (utils.isEmptyArray(populateFields)) {
      const fieldsToKeep = fields ? fields.join(' ') : ``
      return await Model.find(filter, fieldsToKeep).sort(sortOptions).limit(limit).skip(offset)
    } else {
      // Populate
      const objectList = await Model.find(filter)
        .sort(sortOptions)
        .skip(offset)
        .limit(limit)
        .populate(getPopulateOptions(objectType))

      if (!fields) return objectList

      return utils.listPick(objectList, fields)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Request to access objects and return both the filtered list and the global count
 * @param {String} objectType
 * @param {JSON} options
 * @returns
 */
exports.getObjectListAndCount = async (objectType, options) => {
  const fun = `getObjectListAndCount`
  try {
    log.t(mod, fun, ``)
    // log.t(mod, fun, `objectType: '${objectType}', options: ${utils.beautify(options)}`)

    //--- Parameters
    // Identify object type characteristics
    const Model = this.getObjectModel(objectType)

    // Extract options
    const limit = getParamValue(options, QUERY_LIMIT, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT)
    const offset = getParamValue(options, QUERY_OFFSET, DEFAULT_QUERY_OFFSET)
    const filter = getParamValue(options, QUERY_FILTER, {})
    const fieldsToKeep = getParamValue(options, QUERY_FIELDS)
    const sortByFields = getParamValue(options, QUERY_SORT_BY)

    log.d(mod, fun, `options: ${utils.beautify(options)}`)

    // log.d(mod, fun, `filter: ${utils.beautify(filter)}`)

    // const [sortOptions] = toMongoSortOptions({}, sortBy, { [idField]: 1 })
    const sortOptions = {}
    if (sortByFields) {
      sortByFields.map((field) => {
        if (field[0] === '-') {
          sortOptions[field.substring(1)] = -1
        } else {
          sortOptions[field] = 1
        }
      })
    }
    sortOptions[DB_ID] = 1 // Default sort to get consistent offset/limit results

    // log.d(mod, fun, `sortOptions: ${utils.beautify(sortOptions)}`)

    //--- Aggregation
    let aggregateOptions = [
      { $match: filter },
      {
        $facet: {
          [COUNT_LABEL]: [{ $group: { _id: null, count: { $sum: 1 } } }],
          [LIST_LABEL]: [{ $sort: sortOptions }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]
    log.d(mod, fun, `aggregateOptions: ${utils.beautify(aggregateOptions)}`)

    const result = await Model.aggregate(aggregateOptions).exec()

    const globalCount = result[0][COUNT_LABEL][0] ? result[0][COUNT_LABEL][0].count : 0
    const objectList = result[0][LIST_LABEL]

    log.d(mod, fun, `total: ${globalCount}`)

    let populateOptions = getPopulateOptions(objectType)
    const objListPopulated = await Model.populate(objectList, populateOptions)

    // Reshaping: selecting fields
    let finalObjList
    if (!fieldsToKeep) {
      finalObjList = objListPopulated.map((obj) => omit(obj, FIELDS_TO_SKIP))
    } else {
      finalObjList = objListPopulated.map((obj) => pick(obj, fieldsToKeep))
    }

    const reshapedResult = {
      [COUNT_LABEL]: globalCount,
      [LIST_LABEL]: finalObjList,
    }
    // log.d(mod, fun, `reshapedResult: ${utils.beautify(reshapedResult)}`)
    return reshapedResult
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Request to access objects and return both the filtered list and the global count
 * @param {JSON} options
 * @returns
 */
exports.getMetadataListAndCount = async (options) => {
  const fun = `getMetadataListAndCount`
  try {
    log.t(mod, fun, ``)
    return await this.getObjectListAndCount(OBJ_METADATA, options)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const MDB_ERR_NO_INDEX = `Error 500 (${MONGO_ERROR}): text index required for $text query`
const MDB_ERR_MSG_NO_INDEX = `text index required for $text query`
exports.searchObjects = async (objectType, options) => {
  const fun = 'searchObjects'
  try {
    log.t(mod, fun, ``)
    // log.d(mod, fun, `options: ${utils.beautify(options)}`)

    // Setting the filter as a research of terms
    const searchTermsList = getParamValue(options, QUERY_SEARCH_TERMS)
    if (!utils.isArray(searchTermsList))
      throw new RudiError('Input option search terms should be an array')

    options[QUERY_FILTER].$text = { $search: searchTermsList.join(' ') }
    const countBy = options[QUERY_COUNT_BY]
    // const groupBy = options[QUERY_GROUP_BY]

    // Case objectType is a metadata
    try {
      if (countBy) {
        return await this.countObjectList(objectType, countBy, options)
        // } else if (groupBy) {
        //   return await this.groupObjectList(objectType, groupBy, options)
      } else if (objectType === OBJ_METADATA) {
        return await this.getMetadataListAndCount(options)
      } else {
        return await this.getObjectListAndCount(objectType, options)
      }
    } catch (err) {
      // log.v(mod, fun, utils.beautify(err.message.substring(0, MDB_ERR_MSG_NO_INDEX.length)))
      if (err.message?.substring(0, MDB_ERR_MSG_NO_INDEX.length) === MDB_ERR_MSG_NO_INDEX) {
        log.v(mod, fun, `No search index: let's recreate them`)
        const Model = this.getObjectModel(objectType)
        try {
          await Model.createSearchIndexes()
        } catch (er) {
          log.v(mod, fun, utils.beautify(er.message))
          if (er == 'TypeError: Model.createSearchIndexes is not a function')
            throw new NotImplementedError(`Searching '${objectType}' is not yet implemented`)

          log.w(
            mod,
            fun,
            `Couldn't create indexes for collection '${Model.collection.name}': ${er}`
          )
          throw new RudiError(`Couldn't create indexes`)
        }
        return await this.searchObjects(objectType, options)
      } else if (`${err}`.substring(0, MDB_ERR_NO_INDEX.length) === MDB_ERR_NO_INDEX) {
        log.w(mod, fun, err)
        return { total: 0, items: [] }
      } else {
        log.w(mod, fun, `${err}`.substring(0, MDB_ERR_NO_INDEX.length))
        throw err
      }
    }
  } catch (err) {
    log.v(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * This function makes it possible to perform an aggregation on a type of object
 * @param {String} objectType The type of object: 'resources', 'organizations', 'contacts', etc.
 * @param {String} unionField The (unique) field used to group the data
 * @param {Object} options Here is a list of options that can be used to customize the grouping result:
 *    - limit / offset: browse the list of resulting groups
 *    - group_limit / group_offset: browse the lists of aggregated objects within a group
 *    - fields: array of properties to keep for the aggregated objects
 *    - sort_by: array of properties used to order the aggregated objects (use minus sign for descending order)
 * @returns list of objects with count, the property used for grouping, and the
 * list of aggregated objects that share this property
 */
exports.groupObjectList = async (objectType, unionField, options) => {
  const fun = `groupObjectList`

  try {
    log.t(mod, fun, `options: ${options}`)
    //--- Parameters
    // Identify object type characteristics
    const Model = this.getObjectModel(objectType)

    // Check if the given unionField is a subproperty of a different Model
    const [FieldModel, rootProp] = this.getRootRef(objectType, unionField)
    const pivot = !FieldModel ? unionField : rootProp

    // Extract options
    const limit = getParamValue(options, QUERY_LIMIT, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT)
    const offset = getParamValue(options, QUERY_OFFSET, DEFAULT_QUERY_OFFSET)
    const groupLimit = getParamValue(
      options,
      QUERY_GROUP_LIMIT,
      DEFAULT_QUERY_LIMIT,
      MAX_QUERY_LIMIT
    )
    const groupOffset = getParamValue(options, QUERY_GROUP_OFFSET, DEFAULT_QUERY_OFFSET)
    const filter = getParamValue(options, QUERY_FILTER, {})
    const fieldsToKeep = getParamValue(options, QUERY_FIELDS)
    const sortByFields = getParamValue(options, QUERY_SORT_BY)

    // Prepare sortBy options for MongoDB
    const groupList = 'list'
    // const genField = 'field'
    const objId = 'obj_id'

    const sortOptions = { count: -1, _id: 1 }
    const listOptions = { [objId]: '$_id' }

    if (sortByFields) {
      let i = 1
      sortByFields.map((field) => {
        let absoluteField
        const genericName = `${field}${i}`
        const genericField = `${groupList}.${genericName}`
        if (field[0] === '-') {
          absoluteField = field.substring(1)
          sortOptions[genericField] = -1
        } else {
          absoluteField = field
          sortOptions[genericField] = 1
        }
        listOptions[genericName] = `$${absoluteField}`

        ++i
      })
    }
    sortOptions[`${groupList}.${objId}`] = 1

    log.d(mod, fun, `listOptions: ${utils.beautify(listOptions)}`)
    log.d(mod, fun, `sortOptions: ${utils.beautify(sortOptions)}`)

    //--- Aggregation
    const aggregateOptions = [
      { $match: filter },
      { $unwind: `$${pivot}` },
      {
        $group: {
          _id: `$${pivot}`,
          count: { $sum: 1 },
          [groupList]: { $push: listOptions }, //  {"id":"$_id","field1":"$createdAt","field2":"$updatedAt"}
        },
      },
      { $unwind: `$${groupList}` },
      { $sort: sortOptions },
      {
        $group: {
          _id: `$_id`,
          count: { $sum: 1 },
          [groupList]: { $push: `$${groupList}` },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $skip: offset },
      { $limit: limit },
    ]
    // log.d(mod, fun, `aggregateOptions: ${utils.beautify(aggregateOptions)}`)

    let objectList = await Model.aggregate(aggregateOptions).exec()

    // log.d(mod, fun, `objectList: ${utils.beautify(objectList)}`)

    //--- Reshaping
    let populateOptions = getPopulateOptions(objectType)

    const finalGroupList = await Promise.all(
      objectList.map(async (group) => {
        const objList = group[groupList]

        // Reshaping: sort + limit / offset
        const objShortList = objList.slice(groupOffset, groupOffset + groupLimit)
        // Reshaping: populating results
        const objListPopulated = await Model.populate(objShortList, {
          path: objId,
          populate: populateOptions,
        })
        // Reshaping: selecting fields
        let finalObjList
        if (!fieldsToKeep) {
          finalObjList = objListPopulated.map((obj) => obj[objId])
        } else {
          finalObjList = objListPopulated.map((obj) => pick(obj[objId], fieldsToKeep))
        }
        const reshapedResult = {
          count: group.count,
          [pivot]: group._id,
          list: finalObjList,
        }
        // log.d(mod, fun, `reshapedResult: ${utils.beautify(reshapedResult)}`)
        return reshapedResult
      })
    )

    // Reshaping: populating the union field
    if (!FieldModel) return finalGroupList
    return await FieldModel.populate(finalGroupList, pivot)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.countObjectList = async (objectType, unionField, options) => {
  const fun = `countObjectList`

  try {
    log.t(mod, fun, `unionField: ${unionField}, options: ${utils.beautify(options)}`)
    //--- Parameters
    // Identify object type characteristics
    const Model = this.getObjectModel(objectType)

    // Check if the given unionField is a subproperty of a different Model
    const [FieldModel, rootProp] = this.getRootRef(objectType, unionField)
    const pivot = !FieldModel ? unionField : rootProp

    // Extract options
    const limit = getParamValue(options, QUERY_LIMIT, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT)
    const offset = getParamValue(options, QUERY_OFFSET, DEFAULT_QUERY_OFFSET)
    const filter = getParamValue(options, QUERY_FILTER)
    // const sortByFields = getParamValue(options, QUERY_SORT_BY)

    //--- Aggregation
    let aggregateOptions = [
      { $match: filter },
      { $unwind: `$${pivot}` },
      {
        $group: {
          _id: `$${pivot}`,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $skip: offset },
      { $limit: limit },
    ]
    // log.d(mod, fun, `aggregateOptions: ${utils.beautify(aggregateOptions)}`)
    let objectList = await Model.aggregate(aggregateOptions).exec()
    // log.d(mod, fun, `objectList: ${utils.beautify(objectList)}`)

    //--- Reshaping

    // Reshaping: renaming the union field
    if (!FieldModel) {
      objectList.map((obj) => {
        obj[pivot] = obj._id
        delete obj._id
      })
      return objectList
    }
    // Reshaping: populating the union field
    await Promise.all(
      objectList.map(async (obj) => {
        obj[pivot] = await FieldModel.findById(obj._id)
        delete obj._id
      })
    )
    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.updateObject = async (objectType, updateData) => {
  const fun = `updateObject`
  // log.t(mod, fun, ``)
  try {
    assertIsString(fun, objectType)

    log.d(mod, fun, `objectType: ${objectType}`)

    const { Model, idField } = this.getObjectAccesses(objectType)
    const rudiId = json.accessProperty(updateData, idField)
    const filter = { [idField]: rudiId }
    const updateOpts = { new: true }

    const populateOptions = getPopulateOptions(objectType)
    if (utils.isEmptyArray(populateOptions)) {
      return await Model.findOneAndUpdate(filter, updateData, updateOpts)
    } else {
      return await Model.findOneAndUpdate(filter, updateData, updateOpts).populate(populateOptions)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
  // log.d(mod, fun, `updatedObject: ${utils.beautify(updatedObject)}`)
}

exports.overwriteObject = async (objectType, updateData) => {
  const fun = `overwriteObject`
  // log.t(mod, fun, ``)
  log.t(mod, fun, `objectType: ${objectType}`)
  try {
    assertIsString(fun, objectType)

    const { Model, idField } = this.getObjectAccesses(objectType)
    const rudiId = json.accessProperty(updateData, idField)
    const filter = { [idField]: rudiId }
    const updateOpts = {
      new: true, // returns the updated document
      overwrite: true,
      upsert: true, // creates the document if it wasn't found
    }

    const existingObject = await Model.findOne(filter)
    if (!!existingObject) {
      // document exists in DB, we preserve the creation date
      updateData[DB_CREATED_AT] = existingObject[DB_CREATED_AT]
    }
    const dbObject = await Model.findOneAndUpdate(filter, updateData, updateOpts)

    // log.d(mod, fun, `dbObject: ${utils.beautify(dbObject)}`)
    await dbObject.save()

    // log.d(mod, fun, `dbObject: ${utils.beautify(dbObject)}`)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
  // log.d(mod, fun, `updatedObject: ${utils.beautify(updatedObject)}`)
}

/**
 *
 * @param {String} objectType Object type ('organizations', 'contacts' or 'media')
 * @returns
 */
exports.getOrphans = async (objectType) => {
  const fun = `getUnlinkdedObjects`
  // log.t(mod, fun, ``)
  if (objectType === OBJ_METADATA) {
    const errMsg = 'Not implemented'
    log.d(mod, fun, errMsg)
    throw new NotImplementedError(errMsg)
  }
  const [Model, listMetadataFields] = this.getMetadataFieldsWithObjectType(objectType)
  // const idField = this.getObjectIdField(objectType)
  //
  // for (const field in listMetadataFields)
  let aggregateOptions = [
    // accumule Metadata.field1 et Metadata.field2 dans un set => tableau
    // cherche les valeurs de Model._id qui ne sont pas dans le tableau
  ]
  await Model.aggregate()

  //unwindOpts.concat([{ $set: { $add: [] } }])
  //aggregateOptions.unshift(unwindOpts)

  let objectList = await Model.aggregate(aggregateOptions).exec()
  return objectList
}

exports.deleteObject = async (objectType, rudiId) => {
  const fun = `deleteObject`
  log.t(mod, fun, ``)
  try {
    const { Model, idField } = this.getObjectAccesses(objectType)
    const filter = { [idField]: rudiId }

    const populateFields = getPopulateFields(objectType)
    if (utils.isEmptyArray(populateFields)) {
      return await Model.findOneAndRemove(filter)
    } else {
      return await Model.findOneAndRemove(filter).populate(populateFields)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.deleteAll = async (objectType) => {
  const fun = `deleteAll`
  // log.d(mod, fun, `Model: ${Model}`)
  const Model = this.getObjectModel(objectType)
  try {
    return await Model.deleteMany()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.deleteManyWithRudiIds = async (objectType, rudiIdList) => {
  const fun = `deleteManyWithRudiIds`
  // log.d(mod, fun, `conditions: ${conditions}`)

  // TODO: to be consolidated!
  // if (typeof (conditions) === 'string')

  if (!Array.isArray(rudiIdList)) {
    log.i(mod, fun, msg.parameterExpected(fun, 'rudiIdList'))
    return {
      deletedCount: 0,
    }
  }

  const { Model, idField } = this.getObjectAccesses(objectType)
  const filter = { [idField]: { $in: rudiIdList } }

  log.d(mod, fun, utils.beautify(filter))

  try {
    const deletionInfo = await Model.deleteMany(filter)
    return deletionInfo
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.deleteManyWithFilter = async (objectType, conditions) => {
  const fun = `deleteManyWithFilter`
  log.d(mod, fun, `conditions: ${utils.beautify(conditions)}`)
  const Model = this.getObjectModel(objectType)

  // const regexConditions = {
  //   $and: Object.keys(conditions).map((key) => {
  //     const rx = new RegExp(conditions[key])
  //     log.d(mod, fun, `rx: ${rx}`)
  //     return { [key]: { $regex: rx } }
  //   }),
  // }
  // log.d(mod, fun, `regexConditions: ${utils.beautify(regexConditions)}`)

  try {
    const deletionInfo = await Model.deleteMany(conditions)
    return deletionInfo
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function changeConditionsIntoRegex(conditions) {
  const fun = `changeConditionsIntoRegex`

  const regexConditions = []
  Object.keys(conditions).forEach((key) => {
    // const regexp = new RegExp(conditions[key])
    // log.d(mod, fun, regexp)
    // const regexp = new RegExp(`^${conditions[key]}$`)
    // log.d(mod, fun, regexp)
    regexConditions.push({ [key]: { $regex: /^${conditions[key]}$/ } })
    log.d(mod, fun, `${key}: ${regexConditions[key]}`)
  })
  log.d(mod, fun, `regexConditions: ${utils.beautify(regexConditions)}`)

  return { $match: { $and: regexConditions } }
}

// ------------------------------------------------------------------------------------------------
// Specific functions
// ------------------------------------------------------------------------------------------------

// ----------------------------------------
// - Metadata
// ----------------------------------------
exports.getMetadataWithJson = async (metadataJson) => {
  // const fun = `getMetadataFromJson`
  // log.t(mod, fun, ``)
  return await this.getObjectWithJson(OBJ_METADATA, metadataJson)
}

exports.getEnsuredMetadataWithJson = async (metadataJson) => {
  // const fun = `getEnsuredMetadataFromJson`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithJson(OBJ_METADATA, metadataJson)
}

exports.getMetadataWithRudiId = async (rudiId) => {
  // const fun = `getMetadataWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithRudiId(OBJ_METADATA, rudiId)
}

exports.getEnsuredMetadataWithRudiId = async (rudiId) => {
  // const fun = `getEnsuredMetadataWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithRudiId(OBJ_METADATA, rudiId)
}

exports.updateMetadata = async (jsonMetadata) => {
  const fun = `updateMetadata`
  // log.t(mod, fun, ``)
  try {
    // Checking incoming data for an id
    const id = jsonMetadata[API_METADATA_ID]
    if (!id)
      throw new BadRequestError(`${msg.missingObjectProperty(jsonMetadata, API_METADATA_ID)}`)

    // Checking that the metadata already exists
    const existingMetadata = await this.getMetadataWithRudiId(id)
    if (!existingMetadata) throw new NotFoundError(`${msg.metadataNotFound(id)}`)

    // Updating the ùetadata
    const updatedMetadata = await this.overwriteObject(OBJ_METADATA, jsonMetadata)

    return updatedMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.deleteMetadata = async (metadataRudiId) => {
  const fun = `deleteOrganization`
  // log.t(mod, fun, ``)

  // Checking the id parameter
  if (!metadataRudiId) throw new ParameterExpectedError(API_METADATA_ID, mod, fun)

  // Checking that the metadata already exists
  if (!(await this.doesObjectExistWithRudiId(OBJ_METADATA, metadataRudiId)))
    throw new NotFoundError(`${msg.metadataNotFound(metadataRudiId)}`)

  // Deleting the metadata
  const deletedMetadata = await this.deleteObject(OBJ_METADATA, metadataRudiId)

  return deletedMetadata
}

// ----------------------------------------
// - Organization
// ----------------------------------------
exports.getOrganizationWithJson = async (organizationJson) => {
  // const fun = `getOrganizationWithJson`
  // log.t(mod, fun, ``)
  return await this.getObjectWithJson(OBJ_ORGANIZATIONS, organizationJson)
}

exports.getEnsuredOrganizationWithJson = async (organizationJson) => {
  // const fun = `getEnsuredOrganizationWithJson`
  // log.t(mod, fun, ``)
  const rudiId = json.accessProperty(organizationJson, API_ORGANIZATION_ID)
  return await this.getEnsuredOrganizationWithRudiId(rudiId)
}

exports.getOrganizationWithRudiId = async (rudiId) => {
  // const fun = `getOrganizationWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithRudiId(OBJ_ORGANIZATIONS, rudiId)
}

exports.getEnsuredOrganizationWithRudiId = async (rudiId) => {
  // const fun = `getEnsuredOrganizationWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithRudiId(OBJ_ORGANIZATIONS, rudiId)
}

exports.getOrganizationWithDbId = async (id) => {
  // const fun = `getOrganizationWithDbId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithDbId(OBJ_ORGANIZATIONS, id)
}

exports.getEnsuredOrganizationWithDbId = async (dbId) => {
  // const fun = `getOrganizationWithDbId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithDbId(OBJ_ORGANIZATIONS, dbId)
}

exports.getEnsuredOrganizationDbIdWithJson = async (organizationJson) => {
  // const fun = `getEnsuredOrganizationDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getEnsuredDbIdWithJson(OBJ_ORGANIZATIONS, organizationJson)
}

exports.getOrganizationDbIdWithJson = async (organizationJson) => {
  // const fun = `getEnsuredOrganizationDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithJson(OBJ_ORGANIZATIONS, organizationJson)
}

exports.getAllOrganizations = async () => {
  // const fun = `getAllOrganizations`
  // log.t(mod, fun, ``)

  const organizationList = await Organization.find({})
  // log.d(mod, fun, `metadataList: ${metadataList}`)

  return organizationList
}

exports.updateOrganization = async (jsonOrganization) => {
  const fun = `updateOrganization`
  // log.t(mod, fun, ``)

  // Checking incoming data for an id
  const id = jsonOrganization[API_ORGANIZATION_ID]
  if (!id) {
    throw new BadRequestError(`${msg.missingObjectProperty(jsonOrganization, API_ORGANIZATION_ID)}`)
  }

  // Checking that the organization already exists
  const existingOrganization = await this.getOrganizationWithRudiId(id)
  if (!existingOrganization) {
    throw new NotFoundError(`${msg.organizationNotFound(id)}`)
  }

  // Updating the organization
  const updatedOrganization = await this.overwriteObject(OBJ_ORGANIZATIONS, jsonOrganization)
  log.d(mod, fun, `${msg.organizationUpdated(id)}`)

  return updatedOrganization
}

exports.deleteOrganization = async (organizationRudiId) => {
  const fun = `deleteOrganization`
  // log.t(mod, fun, ``)

  // Checking the id parameter
  if (!organizationRudiId) {
    throw new ParameterExpectedError(API_ORGANIZATION_ID, mod, fun)
  }

  // Checking that the organization already exists
  await this.getEnsuredOrganizationWithRudiId(organizationRudiId)

  // Deleting the organization
  const deletedOrganization = await this.deleteObject(OBJ_ORGANIZATIONS, organizationRudiId)
  log.d(mod, fun, `${msg.organizationDeleted(organizationRudiId)}`)

  return deletedOrganization
}

// ----------------------------------------
// - Contacts
// ----------------------------------------

exports.getContactWithRudiId = async (contactRudiId) => {
  // const fun = `getContactWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithRudiId(OBJ_CONTACTS, contactRudiId)
}

exports.getEnsuredContactWithRudiId = async (contactRudiId) => {
  // const fun = `getEnsuredContactWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithRudiId(OBJ_CONTACTS, contactRudiId)
}

exports.getContactWithJson = async (contactJson) => {
  // const fun = `getContactWithJson`
  // log.t(mod, fun, ``)
  return await this.getObjectWithJson(OBJ_CONTACTS, contactJson)
}

exports.getEnsuredContactWithJson = async (contactJson) => {
  // const fun = `getEnsuredContactWithJson`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithJson(OBJ_CONTACTS, contactJson)
}

exports.getContactWithDbId = async (contactDbId) => {
  // const fun = `getContactWithDbId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithDbId(OBJ_CONTACTS, contactDbId)
}

exports.getEnsuredContactWithDbId = async (contactDbId) => {
  // const fun = `getEnsuredContactWithDbId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithDbId(OBJ_CONTACTS, contactDbId)
}

exports.getContactDbIdWithJson = async (contactJson) => {
  // const fun = `getContactDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithJson(OBJ_CONTACTS, contactJson)
}

exports.getEnsuredContactDbIdWithJson = async (contactJson) => {
  // const fun = `getEnsuredContactDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getEnsuredDbIdWithJson(OBJ_CONTACTS, contactJson)
}

exports.getAllContacts = async () => {
  // const fun = `getAllContacts`
  // log.t(mod, fun, ``)
  return await Contact.find({})
}

exports.updateContact = async (jsonContact) => {
  const fun = `updateContact`
  // log.t(mod, fun, ``)

  // Checking incoming data for an id
  const rudiId = json.accessProperty(jsonContact, API_CONTACT_ID)

  // Checking that the contact already exists
  this.getEnsuredContactWithRudiId(rudiId)

  // Updating the contact
  const updatedcontact = await this.overwriteObject(OBJ_CONTACTS, jsonContact)
  log.d(mod, fun, `${msg.contactUpdated(rudiId)}`)

  return updatedcontact
}

exports.deleteContact = async (contactRudiId) => {
  const fun = `deleteContact`
  // log.t(mod, fun, ``)

  // Checking the id parameter
  if (!contactRudiId) throw new ParameterExpectedError(API_CONTACT_ID, mod, fun)

  // Checking that the contact already exists
  await this.getEnsuredContactWithRudiId(contactRudiId)

  // Deleting the contact
  const deletedContact = await this.deleteObject(OBJ_CONTACTS, contactRudiId)
  log.d(mod, fun, `${msg.contactDeleted(contactRudiId)}`)

  return deletedContact
}

// ----------------------------------------
// - Media
// ----------------------------------------
exports.getMediaDbIdWithJson = async (mediaJson) => {
  // const fun = `getMediaDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithJson(OBJ_MEDIA, mediaJson)
}

exports.getEnsuredMediaDbIdWithJson = async (mediaJson) => {
  // const fun = `getEnsuredMediaDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getEnsuredDbIdWithJson(OBJ_MEDIA, mediaJson)
}

exports.getMediaWithDbId = async (mediaDbId) => {
  // const fun = `getMediaWithDbId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithDbId(OBJ_MEDIA, mediaDbId)
}

exports.getEnsuredMediaWithDbId = async (mediaDbId) => {
  // const fun = `getEnsuredMediaWithDbId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithDbId(OBJ_MEDIA, mediaDbId)
}

// ----------------------------------------
// - SKOS: Scheme
// ----------------------------------------
exports.getSchemeDbIdWithJson = async (schemeJson) => {
  // const fun = `getSchemeDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithJson(OBJ_SKOS_SCHEMES, schemeJson)
}

exports.getSchemeDbIdWithRudiId = async (schemeRudiId) => {
  // const fun = `getSchemeDbIdWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithRudiId(OBJ_SKOS_SCHEMES, schemeRudiId)
}

exports.getEnsuredSchemeDbIdWithRudiId = async (schemeRudiId) => {
  // const fun = `getEnsuredSchemeDbIdWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredDbIdWithRudiId(OBJ_SKOS_SCHEMES, schemeRudiId)
}

exports.getSchemeRudiIdWithDbId = async (schemeDbId) => {
  // const fun = `getEnsuredSchemeDbIdWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getObjectPropertiesWithDbId(OBJ_SKOS_SCHEMES, schemeDbId, [API_SKOS_SCHEME_ID])
}

exports.getSchemeWithDbId = async (schemeDbId) => {
  // const fun = `getSchemeWithDbId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithDbId(OBJ_SKOS_SCHEMES, schemeDbId)
}

exports.getEnsuredSchemeWithDbId = async (schemeDbId) => {
  // const fun = `getSchemeJsonIdWithDbId`
  // log.t(mod, fun, ``)
  return await this.getEnsuredObjectWithDbId(OBJ_SKOS_SCHEMES, schemeDbId)
}
/*
exports.getEnsuredSchemeWithCode = async (schemeCode) => {
  const fun = `getSchemeJsonIdWithDbId`
  // log.t(mod, fun, ``)
  return this.getEnsuredObjectWithRudiId(URL_OBJECT_SKOS_SCHEME, SkosScheme, schemeDbId)
}
 */
// ----------------------------------------
// - SKOS: Concept
// ----------------------------------------

exports.getConceptWithDbId = async (conceptDbId) => {
  // const fun = `getConceptWithDbId`
  // log.t(mod, fun, ``)
  return await this.getObjectWithDbId(SkosConcept, conceptDbId)
}

exports.getConceptRudiIdWithDbId = async (conceptDbId) => {
  // const fun = `getConceptRudiIdWithDbId`
  // log.t(mod, fun, ``)
  return await this.getObjectPropertiesWithDbId(OBJ_SKOS_CONCEPTS, conceptDbId)
}

exports.getConceptWithJson = async (conceptJson) => {
  // const fun = `getConceptWithJson`
  // // log.t(mod, fun, ``)
  return await this.getObjectWithJson(OBJ_SKOS_CONCEPTS, conceptJson)
}

exports.getConceptDbIdWithJson = async (conceptJson) => {
  // const fun = `getConceptDbIdWithJson`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithJson(OBJ_SKOS_CONCEPTS, conceptJson)
}

exports.getConceptDbIdWithRudiId = async (conceptRudiId) => {
  // const fun = `getConceptDbIdWithRudiId`
  // log.t(mod, fun, ``)
  return await this.getDbIdWithRudiId(OBJ_SKOS_CONCEPTS, conceptRudiId)
}

exports.getAllConcepts = async () => {
  // const fun = `getAllConcepts`
  // log.t(mod, fun, ``)

  const conceptList = await SkosConcept.find({})
  return conceptList
}

exports.getAllConceptsFromScheme = async (schemeCode) => {
  const fun = `getAllConceptsFromScheme`
  try {
    log.t(mod, fun, ``)

    const conceptList = await SkosConcept.find({
      [API_SKOS_SCHEME_CODE]: schemeCode,
    })
    return conceptList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getAllConceptsWithRole = async (conceptRole) => {
  const fun = `getAllConceptsWithRole`
  try {
    log.t(mod, fun, ``)
    const conceptList = await SkosConcept.find({
      [API_SKOS_CONCEPT_ROLE]: conceptRole,
    })
    return conceptList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ----------------------------------------
// - Filters
// ----------------------------------------
exports.findNotReferencedInMetadata = (objectType) => {
  // const fun = `findNotReferencedInMetadata`
  // log.t(mod, fun, ``)
}

exports.isReferencedInMetadata = async (objectType, rudiId) => {
  const fun = `isReferencedInMetadata`
  log.d(mod, fun, `${objectType}: ${rudiId}`)
  try {
    // const truc1 = await (await Contact.findOne({[API_CONTACT_ID]: rudiId}, '_id')).toObject()
    // const truc = await Contact.findOne({[API_CONTACT_ID]: rudiId}, '_id')
    // const truc2 = await truc.toObject()
    // log.d(mod, fun, `truc: ${utils.beautify(truc2)}`)
    let dbId
    try {
      dbId = (await this.getObjectPropertiesWithRudiId(objectType, rudiId, [DB_ID]))[DB_ID]
    } catch (err) {
      log.w(mod, fun, msg.objectNotFound(objectType, rudiId))
      throw new ObjectNotFoundError(objectType, rudiId)
    }

    // log.d(mod, fun, `dbId: ${utils.beautify(dbId)}`)

    let metadataFilter
    switch (objectType) {
      case OBJ_ORGANIZATIONS:
        metadataFilter = {
          $or: [
            { [API_DATA_PRODUCER_PROPERTY]: dbId },
            {
              [`${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`]: dbId,
            },
          ],
        }
        break
      case OBJ_CONTACTS:
        metadataFilter = {
          $or: [
            { [API_DATA_CONTACTS_PROPERTY]: dbId },
            {
              [`${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`]: dbId,
            },
          ],
        }
        break
      case OBJ_MEDIA:
        metadataFilter = {
          [`${API_MEDIA_PROPERTY}`]: dbId,
        }
        break
      default:
        throw new NotFoundError(msg.objectTypeNotFound(objectType))
    }
    const res = await Metadata.findOne(metadataFilter, API_METADATA_ID)
    log.d(mod, fun, `res: ${log.logMetadata(res)}`)
    return !!res
    // res = await Metadata.find(metadataFilter, API_METADATA_ID)
    // return !!utils.isEmptyArray(res)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// ensure the organization is not in metadata.producer
// ensure the organization is not in metadata.metainfo.provider
exports.isOrgUsedInMetadata = async (dbOrg) => {
  const fun = `isOrgUsedInMetadata`
  log.d(mod, fun, `dbOrg: ${utils.beautify(dbOrg)}`)

  // retrieving the DB id for the organization
  const orgDbId = dbOrg[DB_ID]
  log.d(mod, fun, `orgDbId: ${orgDbId}`)

  // checking if the organization is referenced by a metadata in field API_DATA_PRODUCER_PROPERTY
  const orgQuery = {}
  orgQuery[`${API_DATA_PRODUCER_PROPERTY}`] = mongoose.Types.ObjectId(orgDbId)
  // log.d(mod, fun, `orgQuery: ${utils.beautify(orgQuery)}`)
  const metadataWithProducer = await Metadata.findOne(orgQuery)

  log.d(mod, fun, `metadataWithProducer: ${utils.beautify(metadataWithProducer)}`)
  if (metadataWithProducer != null) return true

  // checking if the organization is referenced by a metadata in field API_METAINFO_PROPERTY.API_METAINFO_PROVIDER_PROPERTY
  const metaInfoOrgQuery = {}
  metaInfoOrgQuery[`${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`] =
    mongoose.Types.ObjectId(orgDbId)
  // log.d(mod, fun, `metaInfoOrgQuery: ${utils.beautify(metaInfoOrgQuery)}`)

  const metadataWithMetaInfoProvider = await Metadata.findOne(metaInfoOrgQuery)
  log.d(mod, fun, `metadataWithMetaInfoProvider: ${utils.beautify(metadataWithMetaInfoProvider)}`)
  // return (null != metadataWithMetaInfoProvider)
  return metadataWithMetaInfoProvider != null
}

// what? filtering nested array
// how-> https://www.devsbedevin.net/mongodb-find-findone-with-nested-array-filtering-finally/

// ensure the contact is not in metadata.contacts
// ensure the contact is not in metadata.metainfo.contacts
exports.isContactUsedInMetadata = async (dbContact) => {
  const fun = `isContactUsedInMetadata`
  log.d(mod, fun, `dbContact: ${utils.beautify(dbContact)}`)

  // retrieving the DB id for the organization
  const contactDbId = dbContact[DB_ID]
  log.d(mod, fun, `contactDbId: ${contactDbId}`)

  // checking if the contact is referenced by a metadata in field API_DATA_CONTACTS_PROPERTY
  const contactsQuery = {}
  contactsQuery[`${API_DATA_CONTACTS_PROPERTY}`] = mongoose.Types.ObjectId(contactDbId)
  log.d(mod, fun, `contactsQuery: ${utils.beautify(contactsQuery)}`)

  const metadataWithContact = await Metadata.findOne(contactsQuery)
  log.d(mod, fun, `metadataWithContact: ${utils.beautify(metadataWithContact)}`)
  if (metadataWithContact != null) return true

  // checking if the contact is referenced by a metadata in field API_METAINFO_PROPERTY.API_METAINFO_CONTACTS_PROPERTY
  const metaInfoContactsQuery = {}
  metaInfoContactsQuery[`${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`] =
    mongoose.Types.ObjectId(contactDbId)
  // log.d(mod, fun, `metaInfoContactsQuery: ${utils.beautify(metaInfoContactsQuery)}`)

  const metadataWithMetaInfoContact = await Metadata.findOne(metaInfoContactsQuery)
  log.d(mod, fun, `dbObjectWithMetaInfoContact: ${utils.beautify(metadataWithMetaInfoContact)}`)
  return metadataWithMetaInfoContact != null
}

// ----------------------------------------
// - Portal token
// ----------------------------------------

exports.getLatestStoredPortalToken = async () => {
  const fun = 'getLatestStoredPortalToken'
  try {
    const lastToken = await PortalToken.findOne()
      .sort({
        field: 'asc',
        [DB_ID]: -1,
      })
      .limit(1)
    // log.d(mod, fun, `lastToken: ${utils.beautify(lastToken)}`)
    return lastToken
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.cleanStoredToken = (dbToken) => {
  const fun = 'cleanStoredToken'
  try {
    const token = utils.deepClone(dbToken)
    delete token[JWT_EXP]
    log.d(mod, fun, `token: ${utils.beautify(token)}`)
    return token
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
exports.storePortalToken = async (token) => {
  const fun = 'storePortalToken'
  try {
    const dbToken = await new PortalToken(token)
    return await dbToken.save()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ----------------------------------------
// - Logs
// ----------------------------------------
exports.getLogEntries = async (options) => {
  const fun = 'getLogEntries'
  try {
    // log.d(mod, fun, `options: ${utils.beautify(options)}`)
    // Extract options
    const limit = options[QUERY_LIMIT] || DEFAULT_QUERY_LIMIT
    const offset = options[QUERY_OFFSET] || DEFAULT_QUERY_OFFSET
    const filter = options[QUERY_FILTER] || {}

    const aggregateOptions = [
      { $match: filter },
      { $sort: { time: -1, _id: 1 } },
      { $skip: offset },
      { $limit: limit },
    ]

    // log.d(mod, fun, `aggregateOptions: ${utils.beautify(aggregateOptions)}`)
    const logLines = await LogEntry.aggregate(aggregateOptions).exec()
    const readableLogs = logLines.map(logLineToString)
    // log.d(mod, fun, `logs: ${utils.beautify(readableLogs)}`)

    return readableLogs
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
