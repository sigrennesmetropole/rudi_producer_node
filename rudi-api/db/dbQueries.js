const mod = 'db'
/*
 * In this file are made the different calls to the database
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

import _ from 'lodash'
const { omit, pick } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  COUNT_LABEL,
  DEFAULT_QUERY_LIMIT,
  DEFAULT_QUERY_OFFSET,
  LIST_LABEL,
  MAX_QUERY_LIMIT,
  MONGO_ERROR,
  OBJ_CONTACTS,
  OBJ_LICENCES,
  OBJ_LOGS,
  OBJ_MEDIA,
  OBJ_METADATA,
  OBJ_ORGANIZATIONS,
  OBJ_PUB_KEYS,
  OBJ_PUB_KEYS_CAML,
  OBJ_REPORTS,
  OBJ_SKOS_CONCEPTS,
  OBJ_SKOS_CONCEPTS_CAML,
  OBJ_SKOS_SCHEMES,
  OBJ_SKOS_SCHEMES_CAML,
  PARAM_ID,
  QUERY_COUNT_BY,
  QUERY_FIELDS,
  QUERY_FILTER,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_OFFSET,
  QUERY_LANG,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_SEARCH_TERMS,
  QUERY_SORT_BY,
} from '../config/constApi.js'
import { JWT_EXP } from '../config/constJwt.js'
// Fields from the JSON as defined in the API
import {
  API_CONTACT_ID,
  API_DATA_CONTACTS_PROPERTY,
  API_DATA_PRODUCER_PROPERTY,
  API_MEDIA_ID,
  API_MEDIA_PROPERTY,
  API_METADATA_ID,
  API_METAINFO_CONTACTS_PROPERTY,
  API_METAINFO_PROPERTY,
  API_METAINFO_PROVIDER_PROPERTY,
  API_ORGANIZATION_ID,
  API_PUB_NAME,
  API_REPORT_ID,
  API_SKOS_CONCEPT_ID,
  API_SKOS_CONCEPT_ROLE,
  API_SKOS_SCHEME_CODE,
  API_SKOS_SCHEME_ID,
  API_THEME_PROPERTY,
  DB_CREATED_AT,
  DB_ID,
  FIELDS_TO_SKIP,
  LOG_ID,
} from './dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify, deepClone, isEmptyArray, listPick } from '../utils/jsUtils.js'
import { logD, logE, logI, logMetadata, logT, logV, logW } from '../utils/logging.js'
import {
  contactDeleted,
  contactUpdated,
  metadataNotFound,
  missingObjectProperty,
  objectNotFound,
  objectTypeNotFound,
  organizationDeleted,
  organizationNotFound,
  organizationUpdated,
  parameterExpected,
  parameterTypeExpected,
} from '../utils/msg.js'

import { accessProperty } from '../utils/jsonAccess.js'

import {
  BadRequestError,
  NotFoundError,
  NotImplementedError,
  ObjectNotFoundError,
  ParameterExpectedError,
  RudiError,
} from '../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Data models
// -------------------------------------------------------------------------------------------------
import PortalToken from '../definitions/models/PortalToken.js'
import SkosConcept from '../definitions/models/SkosConcept.js'
import SkosScheme from '../definitions/models/SkosScheme.js'

import { Contact } from '../definitions/models/Contact.js'
import { LogEntry, logLineToString } from '../definitions/models/LogEntry.js'
import { Media } from '../definitions/models/Media.js'
import { Organization } from '../definitions/models/Organization.js'

import { Metadata, METADATA_FIELDS_TO_POPULATE } from '../definitions/models/Metadata.js'

import { PublicKey } from '../definitions/models/PublicKey.js'
import { Report } from '../definitions/models/Report.js'

// -------------------------------------------------------------------------------------------------
// Other internal dependencies
// -------------------------------------------------------------------------------------------------
import { daDropCollection, makeSearchable } from './dbActions.js'

// -------------------------------------------------------------------------------------------------
// Properties with special treatments
// -------------------------------------------------------------------------------------------------
/** Fields to skip while populating */
const SKIP_FIELDS = `-${FIELDS_TO_SKIP.join(' -')}`

// -------------------------------------------------------------------------------------------------
// Specific object accesses
// -------------------------------------------------------------------------------------------------
const OBJ_MODEL = 'ObjModel'
const OBJ_ID = 'idField'

const RUDI_OBJECTS = {
  [OBJ_ORGANIZATIONS]: { [OBJ_MODEL]: Organization, [OBJ_ID]: API_ORGANIZATION_ID },
  [OBJ_CONTACTS]: { [OBJ_MODEL]: Contact, [OBJ_ID]: API_CONTACT_ID },
  [OBJ_MEDIA]: { [OBJ_MODEL]: Media, [OBJ_ID]: API_MEDIA_ID },
  [OBJ_SKOS_SCHEMES]: { [OBJ_MODEL]: SkosScheme, [OBJ_ID]: API_SKOS_SCHEME_ID },
  [OBJ_SKOS_SCHEMES_CAML]: { [OBJ_MODEL]: SkosScheme, [OBJ_ID]: API_SKOS_SCHEME_ID },
  [OBJ_SKOS_CONCEPTS]: { [OBJ_MODEL]: SkosConcept, [OBJ_ID]: API_SKOS_CONCEPT_ID },
  [OBJ_SKOS_CONCEPTS_CAML]: { [OBJ_MODEL]: SkosConcept, [OBJ_ID]: API_SKOS_CONCEPT_ID },
  [OBJ_PUB_KEYS]: { [OBJ_MODEL]: PublicKey, [OBJ_ID]: API_PUB_NAME },
  [OBJ_PUB_KEYS_CAML]: { [OBJ_MODEL]: PublicKey, [OBJ_ID]: API_PUB_NAME },
  [OBJ_REPORTS]: { [OBJ_MODEL]: Report, [OBJ_ID]: API_REPORT_ID },
  [OBJ_LOGS]: { [OBJ_MODEL]: LogEntry, [OBJ_ID]: LOG_ID },
  [OBJ_LICENCES]: { [OBJ_MODEL]: SkosConcept, [OBJ_ID]: API_SKOS_CONCEPT_ID },
  [OBJ_METADATA]: { [OBJ_MODEL]: Metadata, [OBJ_ID]: API_METADATA_ID },
}

export const getRudiObjectList = () => RUDI_OBJECTS

function assertIsString(fun, param) {
  if (typeof param !== 'string') {
    const err = new BadRequestError(parameterTypeExpected(fun, 'string', param))
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getObjectAccesses = (objectType) => {
  const fun = 'getObjectAccesses'
  try {
    // logT(mod, fun)
    // assertIsString(fun, objectType)
    if (!RUDI_OBJECTS[objectType]) throw new NotFoundError(objectTypeNotFound(objectType))
    return RUDI_OBJECTS[objectType]
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 *
 * @param {string} objectType
 * @returns {Model}
 */
export const getObjectModel = (objectType) => getObjectAccesses(objectType)[OBJ_MODEL]

export const getObjectIdField = (objectType) => getObjectAccesses(objectType)[OBJ_ID]

export const getSearchableFields = (objectType) => {
  const fun = 'getSearchableFields'
  try {
    const ObjModel = getObjectModel(objectType)

    try {
      return ObjModel.getSearchableFields()
    } catch (err) {
      throw new NotImplementedError(`Object '${objectType}' is not searchable yet.`)
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
export const getRootRef = (objectType, field) => {
  const FieldModel = getFieldModel(objectType, field)
  if (!FieldModel) return [false, false]
  const rootProp = field.split('.')[0]
  return [FieldModel, rootProp]
}

export const getFieldModel = (objectType, field) => {
  const fun = 'getFieldModel'
  // logD(mod, fun, `field: ${beautify(field)}`)

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

export const getMetadataFieldsWithObjectType = (objectType) => {
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

const getPopulateOptions = (objectType) =>
  objectType === OBJ_METADATA
    ? [
        {
          path: METADATA_FIELDS_TO_POPULATE,
          select: SKIP_FIELDS,
        },
      ]
    : // : objectType === OBJ_MEDIA
      // ? [
      //     {
      //       path: MEDIA_FIELDS_TO_POPULATE,
      //       select: SKIP_FIELDS,
      //     },
      //   ]
      []

const getPopulateFields = (objectType) =>
  objectType === OBJ_METADATA
    ? METADATA_FIELDS_TO_POPULATE
    : // : objectType === OBJ_MEDIA
      // ? MEDIA_FIELDS_TO_POPULATE
      []

export const listThemesInMetadata = () =>
  Metadata.distinct(API_THEME_PROPERTY).catch((err) => {
    throw RudiError.treatError(mod, 'listThemesInMetadata', err)
  })

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------
export const getModelPropertyNames = (ObjModel) => Object.keys(ObjModel.schema.paths) // paths|tree

export const isProperty = (ObjModel, prop) => getModelPropertyNames(ObjModel).includes(prop)

// -------------------------------------------------------------------------------------------------
// Actions on DB tables
// -------------------------------------------------------------------------------------------------

export const cleanLicences = async () => {
  const fun = `cleanLicences`

  try {
    // TODO: target only licences hierarchy!
    await daDropCollection(SkosConcept.collection.name)
    await daDropCollection(SkosScheme.collection.name)
  } catch (err) {
    // logW(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Generic functions: get single object
// -------------------------------------------------------------------------------------------------
/**
 * Retrieve an object in the DB
 * @param {string} objectType
 * @param {object} filter
 * @param {boolean} shouldSkipPopulate if false, an attempt will be made to populate the dependecies
 * in the resulting object
 * @returns {Promise}
 */
export const getObject = (objectType, filter, shouldSkipPopulate) => {
  const fun = `getObject`
  const ObjModel = getObjectModel(objectType)
  const populateOpts = shouldSkipPopulate ? [] : getPopulateOptions(objectType)
  return new Promise((resolve, reject) =>
    (isEmptyArray(populateOpts)
      ? ObjModel.findOne(filter)
      : ObjModel.findOne(filter).populate(populateOpts)
    )
      .then((res) => resolve(res))
      .catch((err) => reject(RudiError.treatError(mod, fun, err)))
  )
}

/**
 * @param {String} objectType The RUDI object type
 * @param {String} dbId The MongoDB id of the object
 * @param {Boolean} shouldSkipPopulate True if the populating action should be skipped
 * @returns {Object} the RUDI object that is looked for
 */
export const getObjectWithDbId = (objectType, dbId, shouldSkipPopulate) =>
  getObject(objectType, { [DB_ID]: dbId }, shouldSkipPopulate).catch((err) => {
    throw RudiError.treatError(mod, 'getObjectWithDbId', err)
  })

/**
 * @param {String} objectType The RUDI object type
 * @param {String} rudiId The RUDI id of the object (most likely a UUID v4)
 * @param {Boolean} shouldSkipPopulate True if the populating action should be skipped
 * @returns {Object} the RUDI object that is looked for
 */
export const getObjectWithRudiId = (objectType, rudiId, shouldSkipPopulate) => {
  const fun = `getObjectWithRudiId`
  // // logT(mod, fun)
  if (!rudiId) throw new ParameterExpectedError(PARAM_ID, mod, fun)
  return getObject(objectType, { [getObjectIdField(objectType)]: rudiId }, shouldSkipPopulate)
}

export const getEnsuredObjectWithRudiId = async (objectType, rudiId) => {
  const fun = `getEnsuredObjectWithRudiId`
  // logT(mod, fun)
  try {
    if (!rudiId) throw new ParameterExpectedError(PARAM_ID, mod, fun)
    const dbObject = await getObjectWithRudiId(objectType, rudiId)
    if (!dbObject) throw new ObjectNotFoundError(objectType, rudiId)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getObjectWithJson = async (objectType, rudiObject, shouldSkipPopulate) =>
  getObjectWithRudiId(
    objectType,
    accessProperty(rudiObject, getObjectIdField(objectType)),
    shouldSkipPopulate
  )

export const searchDbIdWithJson = async (objectType, rudiObject) =>
  getObjectModel(objectType).findOne(rudiObject).exec()

export const getEnsuredObjectWithJson = async (objectType, rudiObject) => {
  const fun = `getEnsuredObjectWithJson`
  // logT(mod, fun)
  try {
    const idField = getObjectIdField(objectType)
    const rudiId = accessProperty(rudiObject, idField)
    const dbObject = await getObjectWithRudiId(objectType, rudiId)
    if (!dbObject) throw new ObjectNotFoundError(objectType, rudiId)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getEnsuredObjectWithDbId = async (objectType, dbId) => {
  const fun = `getEnsuredObjectWithDbId`
  // logT(mod, fun)
  try {
    const dbObject = await getObjectWithDbId(objectType, dbId)
    if (!dbObject) throw new ObjectNotFoundError(objectType, dbId)
    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const doesObjectExistWithRudiId = async (objectType, rudiId) => {
  const fun = `doesObjectExistWithRudiId`
  // logT(mod, fun)
  try {
    return !!(await getObjectWithRudiId(objectType, rudiId, true))
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const doesObjectExistWithJson = async (objectType, rudiObject) => {
  const fun = `doesObjectExistWithJson`
  // // logT(mod, fun)
  try {
    return !!(await getObjectWithJson(objectType, rudiObject, true))
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getNestedObject = async (objectType, nestedObjectProperty, filter, fieldSelection) => {
  const fun = `getNestedObject`
  try {
    logT(
      mod,
      fun,
      `objectType: ${objectType}, nestedObjectProperty: ${beautify(nestedObjectProperty)}, ` +
        `filter : ${beautify(filter)}, fieldSelection: ${beautify(fieldSelection)} `
    )
    if (Array.isArray(fieldSelection)) fieldSelection = fieldSelection.join(' ')

    const FieldModel = getFieldModel(objectType, nestedObjectProperty)
    if (!fieldSelection) {
      return await FieldModel.find(filter)
    } else {
      const dbObjects = await FieldModel.find(filter, fieldSelection)
      // logD(mod, fun, `dbObjects: ${dbObjects}`)
      if (isEmptyArray(dbObjects))
        throw new NotFoundError(
          `Object not found! Type: '${nestedObjectProperty}', filter: ${beautify(filter)}`
        )

      return dbObjects // .map((obj) => new mongoose.Types.ObjectId(obj._id))
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Generic functions: get single object / partial access
// -------------------------------------------------------------------------------------------------
export const getObjectPropertiesWithDbId = async (objectType, dbId, propertyList) => {
  const fun = `getObjectPropertiesWithDbId`
  // logT(mod, fun)
  const ObjModel = getObjectModel(objectType)
  const populateFields = getPopulateFields(objectType)
  const fields = propertyList.join(' ')
  const filter = { [DB_ID]: dbId }

  return (
    isEmptyArray(populateFields)
      ? ObjModel.findOne(filter, fields)
      : ObjModel.findOne(filter, fields).populate(populateFields)
  )
    .exec()
    .catch((err) => {
      throw RudiError.treatError(mod, fun, err)
    })
}

export const getObjectPropertiesWithRudiId = async (objectType, rudiId, propertyList) => {
  const fun = `getObjectPropertiesWithRudiId`
  // logD(mod, fun, `type '${objectType}': ${rudiId}`)
  try {
    const { ObjModel, idField } = getObjectAccesses(objectType)
    const filter = { [idField]: rudiId }
    const fields = propertyList.join(' ')
    const populateFields = getPopulateFields(objectType)

    return await (isEmptyArray(populateFields)
      ? ObjModel.findOne(filter)
      : ObjModel.findOne(filter, fields).populate(populateFields))
  } catch (err) {
    logE(mod, fun, beautify(err))
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getDbIdWithRudiId = async (objectType, rudiId) =>
  (await getObjectPropertiesWithRudiId(objectType, rudiId, [DB_ID]))?.[DB_ID]

export const getEnsuredDbIdWithRudiId = async (objectType, rudiId) => {
  const fun = `getEnsuredDbIdWithRudiId`
  // logT(mod, fun)
  try {
    const dbId = await getDbIdWithRudiId(objectType, rudiId)
    if (!dbId) throw new ObjectNotFoundError(objectType, rudiId)
    return dbId
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getDbIdWithJson = async (objectType, rudiObject) =>
  getDbIdWithRudiId(objectType, accessProperty(rudiObject, getObjectIdField(objectType)))

export const getEnsuredDbIdWithJson = async (objectType, rudiObject) => {
  const fun = `getEnsuredDbIdWithJson`
  // logT(mod, fun)
  // logD(mod, fun, `objectType: ${objectType}`)
  // logD(mod, fun, `idField: ${idField}`)
  // logD(mod, fun, `jsonObject: ${beautify(jsonObject)}`)
  try {
    const idField = getObjectIdField(objectType)
    const rudiId = accessProperty(rudiObject, idField)
    return getEnsuredDbIdWithRudiId(objectType, rudiId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Generic functions: get object list
// -------------------------------------------------------------------------------------------------

function getParamValue(options, param, defaultVal, maxVal) {
  const val = options ? options[param] : null
  if (!val) return defaultVal
  if (!maxVal || val < maxVal) return val
  return maxVal
}

export const getDbObjectList = async (objectType, options) => {
  const fun = `getDbObjectList`
  try {
    logT(mod, fun)
    //--- Parameters
    // Identify object type characteristics
    const ObjModel = getObjectModel(objectType)

    // Extract options
    const limit = getParamValue(options, QUERY_LIMIT, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT)
    const offset = getParamValue(options, QUERY_OFFSET, DEFAULT_QUERY_OFFSET)
    const filter = getParamValue(options, QUERY_FILTER)
    const fields = getParamValue(options, QUERY_FIELDS)
    const sortByFields = getParamValue(options, QUERY_SORT_BY)

    const populateFields = getPopulateFields(objectType)

    // logD(mod, fun, `options: ${beautify(options)}`)

    // logD(mod, fun, `filter: ${beautify(filter)}`)

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

    // logD(mod, fun, `sortOptions: ${beautify(sortOptions)}`)

    //--- Find
    if (isEmptyArray(populateFields)) {
      const fieldsToKeep = fields ? fields.join(' ') : ``
      return await ObjModel.find(filter, fieldsToKeep)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset)
        .exec()
    } else {
      // Populate
      const objectList = await ObjModel.find(filter)
        .sort(sortOptions)
        .skip(offset)
        .limit(limit)
        .populate(getPopulateOptions(objectType))
        .exec()

      if (!fields) return objectList

      return listPick(objectList, fields)
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
export const getDbObjectListAndCount = async (objectType, options) => {
  const fun = `getDbObjectListAndCount`
  try {
    logT(mod, fun)
    // logT(mod, fun, `objectType: '${objectType}', options: ${beautify(options)}`)

    //--- Parameters
    // Identify object type characteristics
    const ObjModel = getObjectModel(objectType)

    // Extract options
    const limit = getParamValue(options, QUERY_LIMIT, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT)
    const offset = getParamValue(options, QUERY_OFFSET, DEFAULT_QUERY_OFFSET)
    const filter = getParamValue(options, QUERY_FILTER, {})
    const fieldsToKeep = getParamValue(options, QUERY_FIELDS)
    const sortByFields = getParamValue(options, QUERY_SORT_BY)

    logD(mod, fun, `options: ${beautify(options)}`)

    // logD(mod, fun, `filter: ${beautify(filter)}`)

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

    // logD(mod, fun, `sortOptions: ${beautify(sortOptions)}`)

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
    logD(mod, fun, `aggregateOptions: ${beautify(aggregateOptions)}`)

    const result = await ObjModel.aggregate(aggregateOptions).exec()

    const globalCount = result[0][COUNT_LABEL][0] ? result[0][COUNT_LABEL][0].count : 0
    const objectList = result[0][LIST_LABEL]

    // logD(mod, fun, `total: ${globalCount}`)

    let populateOptions = getPopulateOptions(objectType)
    const objListPopulated = await ObjModel.populate(objectList, populateOptions)

    // logD(mod, fun, `objListPopulated: ${objListPopulated}`)

    // Reshaping: selecting fields
    let finalObjList
    if (!fieldsToKeep) {
      finalObjList = objListPopulated.map((obj) => omit(obj, FIELDS_TO_SKIP))
    } else {
      finalObjList = objListPopulated.map((obj) => pick(obj, fieldsToKeep))
    }
    // logD(mod, fun, `finalObjList: ${finalObjList}`)

    const reshapedResult = {
      [COUNT_LABEL]: globalCount,
      [LIST_LABEL]: finalObjList,
    }
    // logD(mod, fun, `reshapedResult: ${beautify(reshapedResult)}`)
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
export const getDbMetadataListAndCount = async (options) => {
  const fun = `getDbMetadataListAndCount`
  try {
    logT(mod, fun)
    return await getDbObjectListAndCount(OBJ_METADATA, options)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const MDB_ERR_NO_INDEX = `Error 500 (${MONGO_ERROR}): text index required for $text query`
const MDB_ERR_MSG_NO_INDEX = `text index required for $text query`
export const searchDbObjects = async (objectType, options) => {
  const fun = 'searchDbObjects'
  try {
    logT(mod, fun)
    // logD(mod, fun, `options: ${beautify(options)}`)

    // Setting the filter as a research of terms
    const searchTermsList = getParamValue(options, QUERY_SEARCH_TERMS)
    if (!Array.isArray(searchTermsList))
      throw new RudiError('Input option search terms should be an array')

    logD(mod, fun, `searching: ${searchTermsList}`)

    const lang = options[QUERY_LANG]?.substring(0, 2) || 'fr'
    options[QUERY_FILTER].$text = {
      $search: searchTermsList.join(' '),
      $language: lang,
    }
    const countBy = options[QUERY_COUNT_BY]
    // const groupBy = options[QUERY_GROUP_BY]

    // Case objectType is a metadata
    try {
      if (countBy) {
        return await countDbObjectList(objectType, countBy, options)
        // } else if (groupBy) {
        //   return await groupObjectList(objectType, groupBy, options)
      } else if (objectType === OBJ_METADATA) {
        return await getDbMetadataListAndCount(options)
      } else {
        return await getDbObjectListAndCount(objectType, options)
      }
    } catch (err) {
      // logV(mod, fun, beautify(err.message.substring(0, MDB_ERR_MSG_NO_INDEX.length)))
      if (err.message?.substring(0, MDB_ERR_MSG_NO_INDEX.length) === MDB_ERR_MSG_NO_INDEX) {
        logV(mod, fun, `No search index: let's recreate them`)
        const ObjModel = getObjectModel(objectType)
        try {
          await makeSearchable(ObjModel)
        } catch (er) {
          logV(mod, fun, beautify(er.message))
          if (er == `TypeError: Model can't be made searchable`)
            throw new NotImplementedError(`Searching '${objectType}' is not yet implemented`)

          logW(
            mod,
            fun,
            `Couldn't create indexes for collection '${ObjModel.collection.name}': ${er}`
          )
          throw new RudiError(`Couldn't create indexes`)
        }
        return await searchDbObjects(objectType, options)
      } else if (`${err}`.startsWith(MDB_ERR_NO_INDEX)) {
        logW(mod, fun, err)
        return { total: 0, items: [] }
      } else {
        logW(mod, fun, `${err}`.substring(0, MDB_ERR_NO_INDEX.length))
        throw err
      }
    }
  } catch (err) {
    logV(mod, fun, err)
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
export const groupDbObjectList = async (objectType, unionField, options) => {
  const fun = `groupDbObjectList`

  try {
    // logT(mod, fun, `options: ${options}`)
    //--- Parameters
    // Identify object type characteristics
    const ObjModel = getObjectModel(objectType)

    // Check if the given unionField is a subproperty of a different Model
    const [FieldModel, rootProp] = getRootRef(objectType, unionField)
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

    logD(mod, fun, `listOptions: ${beautify(listOptions)}`)
    logD(mod, fun, `sortOptions: ${beautify(sortOptions)}`)

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
    // logD(mod, fun, `aggregateOptions: ${beautify(aggregateOptions)}`)

    let objectList = await ObjModel.aggregate(aggregateOptions).exec()

    // logD(mod, fun, `objectList: ${beautify(objectList)}`)

    //--- Reshaping
    let populateOptions = getPopulateOptions(objectType)

    const finalGroupList = await Promise.all(
      objectList.map(async (group) => {
        const objList = group[groupList]

        // Reshaping: sort + limit / offset
        const objShortList = objList.slice(groupOffset, groupOffset + groupLimit)
        // Reshaping: populating results
        const objListPopulated = await ObjModel.populate(objShortList, {
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
        // logD(mod, fun, `reshapedResult: ${beautify(reshapedResult)}`)
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

export const countDbObjects = async (objectType) => {
  const fun = 'countDbObjects'
  try {
    logT(mod, fun)
    const ObjModel = getObjectModel(objectType)
    const count = await ObjModel.countDocuments()
    return count
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const countDbObjectList = async (objectType, unionField, options) => {
  const fun = `countDbObjectList`

  try {
    logT(mod, fun, `unionField: ${unionField}, options: ${beautify(options)}`)
    //--- Parameters
    // Identify object type characteristics
    const ObjModel = getObjectModel(objectType)

    // Check if the given unionField is a subproperty of a different Model
    const [FieldModel, rootProp] = getRootRef(objectType, unionField)
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
    // logD(mod, fun, `aggregateOptions: ${beautify(aggregateOptions)}`)
    let objectList = await ObjModel.aggregate(aggregateOptions).exec()
    // logD(mod, fun, `objectList: ${beautify(objectList)}`)

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

export const updateDbObject = async (objectType, updateData) => {
  const fun = `updateDbObject`
  // logT(mod, fun)
  try {
    assertIsString(fun, objectType)

    logD(mod, fun, `objectType: ${objectType}`)

    const { ObjModel, idField } = getObjectAccesses(objectType)
    const rudiId = accessProperty(updateData, idField)
    const filter = { [idField]: rudiId }
    const updateOpts = { new: true }

    const populateOptions = getPopulateOptions(objectType)
    return isEmptyArray(populateOptions)
      ? await ObjModel.findOneAndUpdate(filter, updateData, updateOpts)
      : await ObjModel.findOneAndUpdate(filter, updateData, updateOpts).populate(populateOptions)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
  // logD(mod, fun, `updatedObject: ${beautify(updatedObject)}`)
}

export const overwriteDbObject = async (objectType, updateData) => {
  const fun = `overwriteDbObject`
  // logT(mod, fun)
  logT(mod, fun, `objectType: ${objectType}`)
  try {
    assertIsString(fun, objectType)

    const { ObjModel, idField } = getObjectAccesses(objectType)
    const rudiId = accessProperty(updateData, idField)
    const filter = { [idField]: rudiId }

    const existingObject = await ObjModel.findOne(filter).exec()
    // logD(mod, fun, beautify(existingObject))
    if (existingObject) {
      // document exists in DB, we preserve the creation date
      updateData[DB_CREATED_AT] = existingObject[DB_CREATED_AT]
    }
    const updateOpts = {
      new: true, // returns the updated document
      // overwrite: true,
      upsert: true, // creates the document if it wasn't found
    }
    const dbObject = await ObjModel.findOneAndUpdate(filter, updateData, updateOpts)
    // logD(mod, fun, `dbObject: ${beautify(dbObject)}`)

    await dbObject.save()
    return dbObject
  } catch (err) {
    // logV(mod, fun, beautify(err))
    const path = Object.keys(err.errors || err.error)[0]?.split('.')
    throw RudiError.treatError(mod, fun, err, path)
  }
}

/**
 *
 * @param {String} objectType Object type ('organizations', 'contacts' or 'media')
 * @returns
 */
export const getOrphans = async (objectType) => {
  const fun = `getOrphans`
  // logT(mod, fun)
  if (objectType === OBJ_METADATA) {
    const errMsg = 'Not implemented'
    logD(mod, fun, errMsg)
    throw new NotImplementedError(errMsg)
  }
  // const [Model, listMetadataFields] = getMetadataFieldsWithObjectType(objectType)
  const ObjModel = getObjectModel(objectType)
  // const idField = getObjectIdField(objectType)
  //
  // for (const field in listMetadataFields)
  let aggregateOptions = [
    // accumule Metadata.field1 et Metadata.field2 dans un set => tableau
    // cherche les valeurs de Model._id qui ne sont pas dans le tableau
  ]
  await ObjModel.aggregate()

  //unwindOpts.concat([{ $set: { $add: [] } }])
  //aggregateOptions.unshift(unwindOpts)

  let objectList = await ObjModel.aggregate(aggregateOptions).exec()
  return objectList
}

export const deleteDbObject = async (objectType, rudiId) => {
  const fun = `deleteDbObject`
  logT(mod, fun)
  try {
    const { ObjModel, idField } = getObjectAccesses(objectType)
    const filter = { [idField]: rudiId }

    const populateFields = getPopulateFields(objectType)
    return isEmptyArray(populateFields)
      ? ObjModel.findOneAndDelete(filter)
      : ObjModel.findOneAndDelete(filter).populate(populateFields)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deleteAllDbObjectsWithType = async (objectType) => {
  const fun = `deleteAllDbObjectsWithType`
  const ObjModel = getObjectModel(objectType)
  try {
    return await ObjModel.deleteMany()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deleteManyDbObjectsWithRudiIds = async (objectType, rudiIdList) => {
  const fun = `deleteManyWithRudiIds`
  // logD(mod, fun, `conditions: ${conditions}`)

  // TODO: to be consolidated!
  // if (typeof (conditions) === 'string')

  if (!Array.isArray(rudiIdList)) {
    logI(mod, fun, parameterExpected(fun, 'rudiIdList'))
    return {
      deletedCount: 0,
    }
  }

  const { ObjModel, idField } = getObjectAccesses(objectType)
  const filter = { [idField]: { $in: rudiIdList } }

  logD(mod, fun, beautify(filter))

  try {
    const deletionInfo = await ObjModel.deleteMany(filter)
    return deletionInfo
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deleteManyDbObjectsWithFilter = async (objectType, conditions) => {
  const fun = `deleteManyWithFilter`
  logD(mod, fun, `conditions: ${beautify(conditions)}`)
  const ObjModel = getObjectModel(objectType)

  // const regexConditions = {
  //   $and: Object.keys(conditions).map((key) => {
  //     const rx = new RegExp(conditions[key])
  //     logD(mod, fun, `rx: ${rx}`)
  //     return { [key]: { $regex: rx } }
  //   }),
  // }
  // logD(mod, fun, `regexConditions: ${beautify(regexConditions)}`)

  try {
    const deletionInfo = await ObjModel.deleteMany(conditions)
    return deletionInfo
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
/*
function changeConditionsIntoRegex(conditions) {
  const fun = `changeConditionsIntoRegex`

  const regexConditions = []
  Object.keys(conditions).forEach((key) => {
    // const regexp = new RegExp(conditions[key])
    // logD(mod, fun, regexp)
    // const regexp = new RegExp(`^${conditions[key]}$`)
    // logD(mod, fun, regexp)
    regexConditions.push({ [key]: { $regex: /^${conditions[key]}$/ } })
    logD(mod, fun, `${key}: ${regexConditions[key]}`)
  })
  logD(mod, fun, `regexConditions: ${beautify(regexConditions)}`)

  return { $match: { $and: regexConditions } }
}
 */
// -------------------------------------------------------------------------------------------------
// Specific functions
// -------------------------------------------------------------------------------------------------

// ----------------------------------------
// - Metadata
// ----------------------------------------
export const getMetadataWithJson = async (metadataJson) => {
  // const fun = `getMetadataFromJson`
  // logT(mod, fun)
  return await getObjectWithJson(OBJ_METADATA, metadataJson)
}

export const getEnsuredMetadataWithJson = async (metadataJson) => {
  // const fun = `getEnsuredMetadataFromJson`
  // logT(mod, fun)
  return await getEnsuredObjectWithJson(OBJ_METADATA, metadataJson)
}

export const getMetadataWithRudiId = async (rudiId) => {
  // const fun = `getMetadataWithRudiId`
  // logT(mod, fun)
  return await getObjectWithRudiId(OBJ_METADATA, rudiId)
}

export const getEnsuredMetadataWithRudiId = async (rudiId) => {
  // const fun = `getEnsuredMetadataWithRudiId`
  // logT(mod, fun)
  return await getEnsuredObjectWithRudiId(OBJ_METADATA, rudiId)
}

export const updateMetadata = async (jsonMetadata) => {
  const fun = `updateMetadata`
  // logT(mod, fun)
  try {
    // Checking incoming data for an id
    const id = jsonMetadata[API_METADATA_ID]
    if (!id) throw new BadRequestError(`${missingObjectProperty(jsonMetadata, API_METADATA_ID)}`)

    // Checking that the metadata already exists
    const existingMetadata = await getMetadataWithRudiId(id)
    if (!existingMetadata) throw new NotFoundError(`${metadataNotFound(id)}`)

    // Updating the metadata
    const updatedMetadata = await overwriteDbObject(OBJ_METADATA, jsonMetadata)

    return updatedMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deleteMetadata = async (metadataRudiId) => {
  const fun = `deleteOrganization`
  // logT(mod, fun)

  // Checking the id parameter
  if (!metadataRudiId) throw new ParameterExpectedError(API_METADATA_ID, mod, fun)

  // Checking that the metadata already exists
  if (!(await doesObjectExistWithRudiId(OBJ_METADATA, metadataRudiId)))
    throw new NotFoundError(`${metadataNotFound(metadataRudiId)}`)

  // Deleting the metadata
  const deletedMetadata = await deleteDbObject(OBJ_METADATA, metadataRudiId)

  return deletedMetadata
}

// ----------------------------------------
// - Organization
// ----------------------------------------
export const getOrganizationWithJson = async (organizationJson) => {
  // const fun = `getOrganizationWithJson`
  // logT(mod, fun)
  return await getObjectWithJson(OBJ_ORGANIZATIONS, organizationJson)
}

export const getEnsuredOrganizationWithJson = async (organizationJson) => {
  // const fun = `getEnsuredOrganizationWithJson`
  // logT(mod, fun)
  const rudiId = accessProperty(organizationJson, API_ORGANIZATION_ID)
  return await getEnsuredOrganizationWithRudiId(rudiId)
}

export const getOrganizationWithRudiId = async (rudiId) => {
  // const fun = `getOrganizationWithRudiId`
  // logT(mod, fun)
  return await getObjectWithRudiId(OBJ_ORGANIZATIONS, rudiId)
}

export const getEnsuredOrganizationWithRudiId = async (rudiId) => {
  // const fun = `getEnsuredOrganizationWithRudiId`
  // logT(mod, fun)
  return await getEnsuredObjectWithRudiId(OBJ_ORGANIZATIONS, rudiId)
}

export const getOrganizationWithDbId = async (id) => {
  // const fun = `getOrganizationWithDbId`
  // logT(mod, fun)
  return await getObjectWithDbId(OBJ_ORGANIZATIONS, id)
}

export const getEnsuredOrganizationWithDbId = (dbId) =>
  getEnsuredObjectWithDbId(OBJ_ORGANIZATIONS, dbId)

export const getEnsuredOrganizationDbIdWithJson = (organizationJson) =>
  getEnsuredDbIdWithJson(OBJ_ORGANIZATIONS, organizationJson)

export const getOrganizationDbIdWithJson = (organizationJson) =>
  getDbIdWithJson(OBJ_ORGANIZATIONS, organizationJson)

export const getAllOrganizations = () => Organization.find({})

export const updateOrganization = async (jsonOrganization) => {
  const fun = `updateOrganization`
  // logT(mod, fun)

  // Checking incoming data for an id
  const id = jsonOrganization[API_ORGANIZATION_ID]
  if (!id) {
    throw new BadRequestError(`${missingObjectProperty(jsonOrganization, API_ORGANIZATION_ID)}`)
  }

  // Checking that the organization already exists
  const existingOrganization = await getOrganizationWithRudiId(id)
  if (!existingOrganization) {
    throw new NotFoundError(`${organizationNotFound(id)}`)
  }

  // Updating the organization
  const updatedOrganization = await overwriteDbObject(OBJ_ORGANIZATIONS, jsonOrganization)
  logD(mod, fun, `${organizationUpdated(id)}`)

  return updatedOrganization
}

export const deleteOrganization = async (organizationRudiId) => {
  const fun = `deleteOrganization`
  // logT(mod, fun)

  // Checking the id parameter
  if (!organizationRudiId) {
    throw new ParameterExpectedError(API_ORGANIZATION_ID, mod, fun)
  }

  // Checking that the organization already exists
  await getEnsuredOrganizationWithRudiId(organizationRudiId)

  // Deleting the organization
  const deletedOrganization = await deleteDbObject(OBJ_ORGANIZATIONS, organizationRudiId)
  logD(mod, fun, `${organizationDeleted(organizationRudiId)}`)

  return deletedOrganization
}

// ----------------------------------------
// - Contacts
// ----------------------------------------

export const getContactWithRudiId = (contactRudiId) =>
  getObjectWithRudiId(OBJ_CONTACTS, contactRudiId)

export const getEnsuredContactWithRudiId = (contactRudiId) =>
  getEnsuredObjectWithRudiId(OBJ_CONTACTS, contactRudiId)

export const getContactWithJson = (contactJson) => getObjectWithJson(OBJ_CONTACTS, contactJson)

export const getEnsuredContactWithJson = (contactJson) =>
  getEnsuredObjectWithJson(OBJ_CONTACTS, contactJson)

export const getContactWithDbId = (contactDbId) => getObjectWithDbId(OBJ_CONTACTS, contactDbId)

export const getEnsuredContactWithDbId = (contactDbId) =>
  getEnsuredObjectWithDbId(OBJ_CONTACTS, contactDbId)

export const getContactDbIdWithJson = (contactJson) => getDbIdWithJson(OBJ_CONTACTS, contactJson)

export const getEnsuredContactDbIdWithJson = (contactJson) =>
  getEnsuredDbIdWithJson(OBJ_CONTACTS, contactJson)

export const getAllContacts = () => Contact.find({})

export const updateContact = async (jsonContact) => {
  const fun = `updateContact`
  // logT(mod, fun)

  // Checking incoming data for an id
  const rudiId = accessProperty(jsonContact, API_CONTACT_ID)

  // Checking that the contact already exists
  await getEnsuredContactWithRudiId(rudiId)

  // Updating the contact
  const updatedContact = await overwriteDbObject(OBJ_CONTACTS, jsonContact)
  logD(mod, fun, `${contactUpdated(rudiId)}`)

  return updatedContact
}

export const deleteContact = async (contactRudiId) => {
  const fun = `deleteContact`
  // logT(mod, fun)

  // Checking the id parameter
  if (!contactRudiId) throw new ParameterExpectedError(API_CONTACT_ID, mod, fun)

  // Checking that the contact already exists
  await getEnsuredContactWithRudiId(contactRudiId)

  // Deleting the contact
  const deletedContact = await deleteDbObject(OBJ_CONTACTS, contactRudiId)
  logD(mod, fun, `${contactDeleted(contactRudiId)}`)

  return deletedContact
}

// ----------------------------------------
// - Media
// ----------------------------------------
export const getMediaDbIdWithJson = (mediaJson) => getDbIdWithJson(OBJ_MEDIA, mediaJson)

export const getEnsuredMediaDbIdWithJson = (mediaJson) =>
  getEnsuredDbIdWithJson(OBJ_MEDIA, mediaJson)

export const getMediaWithDbId = (mediaDbId) => getObjectWithDbId(OBJ_MEDIA, mediaDbId)

export const getEnsuredMediaWithDbId = (mediaDbId) => getEnsuredObjectWithDbId(OBJ_MEDIA, mediaDbId)

// ----------------------------------------
// - SKOS: Scheme
// ----------------------------------------
export const getSchemeDbIdWithJson = (schemeJson) => getDbIdWithJson(OBJ_SKOS_SCHEMES, schemeJson)

export const getSchemeDbIdWithRudiId = (schemeRudiId) =>
  getDbIdWithRudiId(OBJ_SKOS_SCHEMES, schemeRudiId)

export const getEnsuredSchemeDbIdWithRudiId = (schemeRudiId) =>
  getEnsuredDbIdWithRudiId(OBJ_SKOS_SCHEMES, schemeRudiId)

export const getSchemeRudiIdWithDbId = (schemeDbId) =>
  getObjectPropertiesWithDbId(OBJ_SKOS_SCHEMES, schemeDbId, [API_SKOS_SCHEME_ID])

export const getSchemeWithDbId = (schemeDbId) => getObjectWithDbId(OBJ_SKOS_SCHEMES, schemeDbId)

export const getEnsuredSchemeWithDbId = (schemeDbId) =>
  getEnsuredObjectWithDbId(OBJ_SKOS_SCHEMES, schemeDbId)

// ----------------------------------------
// - SKOS: Concept
// ----------------------------------------

export const getConceptWithDbId = (conceptDbId) => getObjectWithDbId(SkosConcept, conceptDbId)

export const getConceptRudiIdWithDbId = (conceptDbId) =>
  getObjectPropertiesWithDbId(OBJ_SKOS_CONCEPTS, conceptDbId)

export const getConceptWithJson = (conceptJson) => getObjectWithJson(OBJ_SKOS_CONCEPTS, conceptJson)

export const getConceptDbIdWithJson = (conceptJson) =>
  getDbIdWithJson(OBJ_SKOS_CONCEPTS, conceptJson)

export const getConceptDbIdWithRudiId = (conceptRudiId) =>
  getDbIdWithRudiId(OBJ_SKOS_CONCEPTS, conceptRudiId)

export const getAllConcepts = () => SkosConcept.find({}).exec()

export const getAllConceptsFromScheme = (schemeCode) =>
  SkosConcept.find({ [API_SKOS_SCHEME_CODE]: schemeCode }).exec()

export const getAllConceptsWithRole = async (conceptRole) =>
  SkosConcept.find({ [API_SKOS_CONCEPT_ROLE]: conceptRole }).exec()

// ----------------------------------------
// - Filters
// ----------------------------------------
export const isReferencedInMetadata = async (objectType, rudiId) => {
  const fun = `isReferencedInMetadata`
  logD(mod, fun, `${objectType}: ${rudiId}`)
  try {
    // const truc1 = await (await Contact.findOne({[API_CONTACT_ID]: rudiId}, '_id')).toObject()
    // const truc = await Contact.findOne({[API_CONTACT_ID]: rudiId}, '_id')
    // const truc2 = await truc.toObject()
    // logD(mod, fun, `truc: ${beautify(truc2)}`)
    let dbId
    try {
      dbId = (await getObjectPropertiesWithRudiId(objectType, rudiId, [DB_ID]))[DB_ID]
    } catch (err) {
      logW(mod, fun, objectNotFound(objectType, rudiId))
      throw new ObjectNotFoundError(objectType, rudiId)
    }

    // logD(mod, fun, `dbId: ${beautify(dbId)}`)

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
        throw new NotFoundError(objectTypeNotFound(objectType))
    }
    const res = await Metadata.findOne(metadataFilter, API_METADATA_ID)
    logD(mod, fun, `res: ${logMetadata(res)}`)
    return !!res
    // res = await Metadata.find(metadataFilter, API_METADATA_ID)
    // return !!isEmptyArray(res)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// ensure the organization is not in metadata.producer
// ensure the organization is not in metadata.metainfo.provider
export const isOrgUsedInMetadata = async (dbOrg) => {
  const fun = `isOrgUsedInMetadata`
  logD(mod, fun, `dbOrg: ${beautify(dbOrg)}`)

  // retrieving the DB id for the organization
  const orgDbId = dbOrg[DB_ID]
  logD(mod, fun, `orgDbId: ${orgDbId}`)

  // checking if the organization is referenced by a metadata in field API_DATA_PRODUCER_PROPERTY
  const orgQuery = {}
  orgQuery[`${API_DATA_PRODUCER_PROPERTY}`] = mongoose.Types.ObjectId(orgDbId)
  // logD(mod, fun, `orgQuery: ${beautify(orgQuery)}`)
  const metadataWithProducer = await Metadata.findOne(orgQuery).exec()

  logD(mod, fun, `metadataWithProducer: ${beautify(metadataWithProducer)}`)
  if (metadataWithProducer != null) return true

  // checking if the organization is referenced by a metadata in field API_METAINFO_PROPERTY.API_METAINFO_PROVIDER_PROPERTY
  const metaInfoOrgQuery = {}
  metaInfoOrgQuery[`${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`] =
    mongoose.Types.ObjectId(orgDbId)
  // logD(mod, fun, `metaInfoOrgQuery: ${beautify(metaInfoOrgQuery)}`)

  const metadataWithMetaInfoProvider = await Metadata.findOne(metaInfoOrgQuery).exec()
  logD(mod, fun, `metadataWithMetaInfoProvider: ${beautify(metadataWithMetaInfoProvider)}`)
  // return (null != metadataWithMetaInfoProvider)
  return metadataWithMetaInfoProvider != null
}

// what? filtering nested array
// how-> https://www.devsbedevin.net/mongodb-find-findone-with-nested-array-filtering-finally/

// ensure the contact is not in metadata.contacts
// ensure the contact is not in metadata.metainfo.contacts
export const isContactUsedInMetadata = async (dbContact) => {
  const fun = `isContactUsedInMetadata`
  logD(mod, fun, `dbContact: ${beautify(dbContact)}`)

  // retrieving the DB id for the organization
  const contactDbId = dbContact[DB_ID]
  logD(mod, fun, `contactDbId: ${contactDbId}`)

  // checking if the contact is referenced by a metadata in field API_DATA_CONTACTS_PROPERTY
  const contactsQuery = {}
  contactsQuery[`${API_DATA_CONTACTS_PROPERTY}`] = mongoose.Types.ObjectId(contactDbId)
  logD(mod, fun, `contactsQuery: ${beautify(contactsQuery)}`)

  const metadataWithContact = await Metadata.findOne(contactsQuery).exec()
  logD(mod, fun, `metadataWithContact: ${beautify(metadataWithContact)}`)
  if (metadataWithContact != null) return true

  // checking if the contact is referenced by a metadata in field API_METAINFO_PROPERTY.API_METAINFO_CONTACTS_PROPERTY
  const metaInfoContactsQuery = {}
  metaInfoContactsQuery[`${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`] =
    mongoose.Types.ObjectId(contactDbId)
  // logD(mod, fun, `metaInfoContactsQuery: ${beautify(metaInfoContactsQuery)}`)

  const metadataWithMetaInfoContact = await Metadata.findOne(metaInfoContactsQuery).exec()
  logD(mod, fun, `dbObjectWithMetaInfoContact: ${beautify(metadataWithMetaInfoContact)}`)
  return metadataWithMetaInfoContact != null
}

// ----------------------------------------
// - Portal token
// ----------------------------------------

export const getLatestStoredPortalToken = () =>
  PortalToken.findOne()
    .sort({ field: 'asc', [DB_ID]: -1 })
    .limit(1)
    .exec()
    .catch((err) => {
      throw RudiError.treatError(mod, 'getLatestStoredPortalToken', err)
    })

export const cleanStoredToken = (dbToken) => {
  const fun = 'cleanStoredToken'
  try {
    const token = deepClone(dbToken)
    delete token[JWT_EXP]
    logD(mod, fun, `token: ${beautify(token)}`)
    return token
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
export const storePortalToken = (token) =>
  new PortalToken(token).save().catch((err) => {
    throw RudiError.treatError(mod, 'storePortalToken', err)
  })

// ----------------------------------------
// - Logs
// ----------------------------------------
export const getLogEntries = async (options) => {
  const fun = 'getLogEntries'
  try {
    // logD(mod, fun, `options: ${beautify(options)}`)
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

    // logD(mod, fun, `aggregateOptions: ${beautify(aggregateOptions)}`)
    const logLines = await LogEntry.aggregate(aggregateOptions).exec()
    const readableLogs = logLines.map(logLineToString)
    // logD(mod, fun, `logs: ${beautify(readableLogs)}`)

    return readableLogs
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
