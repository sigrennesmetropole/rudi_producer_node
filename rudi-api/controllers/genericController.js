'use strict'

const mod = 'genCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the objects (producer or publisher)
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { v4: UUIDv4 } = require('uuid')
const { pick } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const msg = require('../utils/msg')

const db = require('../db/dbQueries')
const json = require('../utils/jsonAccess')

const {
  beautify,
  nowISO,
  isNotEmptyArray,
  isEmptyObject,
  isEmptyArray,
} = require('../utils/jsUtils')

const {
  NotFoundError,
  ForbiddenError,
  ObjectNotFoundError,
  BadRequestError,
  ParameterExpectedError,
  RudiError,
} = require('../utils/errors')

const { CallContext } = require('../definitions/constructors/callContext')

// ------------------------------------------------------------------------------------------------
// Specific controllers
// ------------------------------------------------------------------------------------------------
const { newMetadata, overwriteMetadata } = require('../controllers/metadataController')
const { newOrganization } = require('../controllers/organizationController')
const { newContact } = require('../controllers/contactController')
const { newSkosConcept, newSkosScheme } = require('./skosController')
const { deletePortalMetadata } = require('./portalController')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

const {
  URL_PUB_METADATA,

  OBJ_METADATA,
  OBJ_ORGANIZATIONS,
  OBJ_CONTACTS,
  OBJ_MEDIA,
  OBJ_SKOS_CONCEPTS,
  OBJ_SKOS_SCHEMES,
  ACT_DELETION,
  ACT_SEARCH,
  PARAM_ID,
  PARAM_OBJECT,

  QUERY_FIELDS,
  QUERY_LIMIT,
  QUERY_OFFSET,

  QUERY_FILTER,
  QUERY_SORT_BY,
  QUERY_COUNT_BY,
  QUERY_GROUP_BY,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_OFFSET,
  DEFAULT_QUERY_LIMIT,
  DEFAULT_QUERY_OFFSET,

  URL_OBJECTS,
  QUERY_CONFIRM,
  URL_PV_OBJECT_GENERIC,
  QUERY_UPDATED_AFTER,
  QUERY_UPDATED_AFTER_CAML,
  QUERY_UPDATED_BEFORE,
  QUERY_UPDATED_BEFORE_CAML,
  ACT_UNLINKED,
  QUERY_SEARCH_TERMS,
  MONGO_ERROR,
  QUERY_COUNT_BY_CAML,
  QUERY_GROUP_BY_CAML,
  QUERY_SORT_BY_CAML,
  QUERY_GROUP_LIMIT_CAML,
  QUERY_GROUP_OFFSET_CAML,
} = require('../config/confApi')

const {
  DB_PUBLISHED_AT,
  DB_ID,
  API_METAINFO_PROPERTY,
  API_METAINFO_DATES_PROPERTY,
  API_DATES_CREATED_PROPERTY,
  API_DATES_EDITED_PROPERTY,
  DB_UPDATED_AT,
  API_DATES_PUBLISHED_PROPERTY,
  DB_CREATED_AT,
  API_DATA_DATES_PROPERTY,
  API_DATES_VALIDATED_PROPERTY,
  API_DATES_DELETED_PROPERTY,
  API_PERIOD_PROPERTY,
  API_END_DATE_PROPERTY,
  API_START_DATE_PROPERTY,
  API_KEYWORDS_PROPERTY,
} = require('../db/dbFields')

const QUERY_RESERVED_WORDS = [
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_FIELDS,
  QUERY_SORT_BY,
  QUERY_COUNT_BY,
  QUERY_GROUP_BY,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_OFFSET,
  QUERY_UPDATED_AFTER,
  QUERY_UPDATED_AFTER_CAML,
  QUERY_UPDATED_BEFORE,
  QUERY_UPDATED_BEFORE_CAML,
  QUERY_CONFIRM,
]

const EXT_REFS = 'external_references' // External references needing aggregation
const EXT_OBJ = 'refObj'
const EXT_OBJ_PROP = 'refObjProp'
const EXT_OBJ_VAL = 'refObjVal'

// ------------------------------------------------------------------------------------------------
// Specific object type helper functions
// ------------------------------------------------------------------------------------------------

function cleanDate(inputDate) {
  const fun = 'cleanDate'
  const cleanValue = inputDate.replace(/[\'\"\`]/g, '')
  if (cleanValue.match(new RegExp(/^[0-9]{10}$/))) return new Date(parseInt(cleanValue * 1000))
  if (cleanValue.match(new RegExp(/^[0-9]{13}$/))) return new Date(parseInt(cleanValue))
  try {
    const cleanDate = new Date(cleanValue)
    if (cleanDate === 'Invalid Date')
      throw new BadRequestError(`Invalid date: '${inputDate} / ${cleanValue}'`)
    log.d(mod, fun, `clean date: ${cleanDate.toISOString()}`)
    return cleanDate
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function cleanDateOperations(inputDateOperations) {
  const fun = 'cleanDateOperation'
  log.d(mod, fun, `inputDateOperations: ${beautify(inputDateOperations)}`)

  const operations = {}
  for (const [operator, value] of Object.entries(inputDateOperations)) {
    // if (isObject(value)) { // case with
    //   for (const [op, val] of Object.entries(value)) {
    //     if (op === '$and' || op === '$or') {
    //       operations[op] = val.map(expr => )
    //     } else {
    //       log.w(mod, fun, `Operator '${op}' not recognized for dates comparisons`)
    //     }
    //   }
    // } else {
    operations[operator] = cleanDate(value)
    // }
  }
  return operations
}
const DATA_DATES = `${API_DATA_DATES_PROPERTY}.`
const META_DATES = `${API_METAINFO_PROPERTY}.${API_METAINFO_DATES_PROPERTY}.`

// eslint-disable-next-line complexity
exports.parseQueryParameters = async (objectType, fullUrl) => {
  const fun = 'parseQueryParameters'
  try {
    log.t(mod, fun, ``)
    // identify object model
    const Model = db.getObjectModel(objectType)
    const modelProperties = db.getModelPropertyNames(Model)

    const returnedFilter = {
      [QUERY_LIMIT]: DEFAULT_QUERY_LIMIT,
      [QUERY_GROUP_LIMIT]: DEFAULT_QUERY_LIMIT,
      [QUERY_OFFSET]: DEFAULT_QUERY_OFFSET,
      [QUERY_GROUP_OFFSET]: DEFAULT_QUERY_OFFSET,
      [QUERY_FILTER]: {},
      [QUERY_CONFIRM]: false,
      [EXT_REFS]: [],
      [QUERY_SEARCH_TERMS]: [],
    }
    const filters = []

    // extract request parameters
    if (fullUrl.indexOf('?') === -1) {
      // log.d(mod, fun, `No question mark in url: ${reqUrl}`)
      return returnedFilter
    }
    // const reqArgs = reqUrl.substring(reqUrl.indexOf('?'))
    const splitUrl = fullUrl.split('?')
    const reqUrl = splitUrl[0]
    const reqArgs = splitUrl[1]
    const urlSegments = reqUrl.split('/')
    const searching = urlSegments[urlSegments.length - 1] === ACT_SEARCH
    const urlParams = new URLSearchParams(reqArgs)

    // Check if parameters were actually found by URLSearchParams
    if (urlParams.keys().length < 1) {
      log.d(mod, fun, `No parameters found after the question mark: ${urlParams}`)
      return returnedFilter
    }
    //  log.d(mod, fun, `urlSearchParams: ${urlSearchParams}`)

    for (const [key, value] of urlParams) {
      if (QUERY_RESERVED_WORDS.includes(key)) {
        // log.d(mod, fun, `Key is a reserved word: ${beautify(key)} => ${beautify(queryParameters[key])}`)
        switch (key) {
          case QUERY_LIMIT:
          case QUERY_OFFSET:
          case QUERY_GROUP_LIMIT:
          case QUERY_GROUP_LIMIT_CAML:
          case QUERY_GROUP_OFFSET:
          case QUERY_GROUP_OFFSET_CAML:
            returnedFilter[key] = parseInt(value)
            break
          case QUERY_GROUP_BY:
          case QUERY_GROUP_BY_CAML:
          case QUERY_COUNT_BY:
          case QUERY_COUNT_BY_CAML:
            returnedFilter[key] = value
            break
          case QUERY_UPDATED_AFTER:
          case QUERY_UPDATED_AFTER_CAML:
            filters.push({ [DB_UPDATED_AT]: mongoose.trusted({ $gte: cleanDate(value) }) })
            break
          case QUERY_UPDATED_BEFORE:
          case QUERY_UPDATED_BEFORE_CAML:
            filters.push({ [DB_UPDATED_AT]: mongoose.trusted({ $lte: cleanDate(value) }) })
            break
          case QUERY_CONFIRM:
            if (['false', '0', 'null', 'no'].includes(value)) break
            returnedFilter[key] = !!value
            break
          case QUERY_FIELDS:
            returnedFilter[key] = value.split(',').map((field) => field.trim())
            break
          case QUERY_SORT_BY:
          case QUERY_SORT_BY_CAML:
            returnedFilter[key] = value.split(',').map((field) => {
              let trimmedField = field.trim()
              let minus = ''
              let absoluteField = trimmedField
              if (trimmedField[0] === '-') {
                minus = '-'
                absoluteField = trimmedField.substring(1)
              }
              // Dealing with virtual fields
              switch (absoluteField) {
                case `${META_DATES}${API_DATES_CREATED_PROPERTY}`:
                  return `${minus}${DB_CREATED_AT}`
                case `${META_DATES}${API_DATES_EDITED_PROPERTY}`:
                  return `${minus}${DB_UPDATED_AT}`
                case `${META_DATES}${API_DATES_PUBLISHED_PROPERTY}`:
                  return `${minus}${DB_PUBLISHED_AT}`
                default:
                  return trimmedField
              }
            })
            break
          default:
            log.w(mod, fun, `Query keyword not recognized: '${key}'`)
        }
      } else if (modelProperties.includes(key)) {
        // log.d(mod, fun, `Key is a ${objectType} property: ${beautify(key)}`)
        // log.d(mod, fun, `Corresponding value: ${value}`)
        const val = value
        if (!value) {
          // log.d(mod, fun, 'searching this term')
          returnedFilter[QUERY_SEARCH_TERMS].push(key)
        } else {
          try {
            const obj = JSON.parse(val)
            log.d(mod, fun, `parsed String: ${beautify(obj)}`)

            switch (key) {
              case `${DB_CREATED_AT}`:
              case `${DB_UPDATED_AT}`:
              case `${DB_PUBLISHED_AT}`:

              case `${DATA_DATES}${API_DATES_CREATED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_EDITED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_PUBLISHED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_VALIDATED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_DELETED_PROPERTY}`:

              case `${META_DATES}${API_DATES_CREATED_PROPERTY}`:
              case `${META_DATES}${API_DATES_EDITED_PROPERTY}`:
              case `${META_DATES}${API_DATES_PUBLISHED_PROPERTY}`:
              case `${META_DATES}${API_DATES_VALIDATED_PROPERTY}`:
              case `${META_DATES}${API_DATES_DELETED_PROPERTY}`:

              case `${API_PERIOD_PROPERTY}.${API_START_DATE_PROPERTY}`:
              case `${API_PERIOD_PROPERTY}.${API_END_DATE_PROPERTY}`:
                filters.push({ [key]: cleanDateOperations(obj) })
                break
              default:
                filters.push({ [key]: obj })
            }
          } catch (err) {
            // log.d(mod, fun, `Error while parsing: '${beautify(val)}': ${err}}`)
            switch (key) {
              case `${DB_CREATED_AT}`:
              case `${DB_UPDATED_AT}`:
              case `${DB_PUBLISHED_AT}`:

              case `${DATA_DATES}${API_DATES_CREATED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_EDITED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_PUBLISHED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_VALIDATED_PROPERTY}`:
              case `${DATA_DATES}${API_DATES_DELETED_PROPERTY}`:

              case `${META_DATES}${API_DATES_CREATED_PROPERTY}`:
              case `${META_DATES}${API_DATES_EDITED_PROPERTY}`:
              case `${META_DATES}${API_DATES_PUBLISHED_PROPERTY}`:
              case `${META_DATES}${API_DATES_VALIDATED_PROPERTY}`:
              case `${META_DATES}${API_DATES_DELETED_PROPERTY}`:

              case `${API_PERIOD_PROPERTY}.${API_START_DATE_PROPERTY}`:
              case `${API_PERIOD_PROPERTY}.${API_END_DATE_PROPERTY}`:
                filters.push({ [key]: cleanDate(val) })
                break
              case `${API_KEYWORDS_PROPERTY}`:
                filters.push({ [key]: { $in: val.split(',') } })
                break
              default:
                filters.push({ [key]: val })
            }
          }
        }
      } else {
        const indexSeparator = key.indexOf('.')
        const nestedField = key.substring(0, indexSeparator)
        const nestedFieldProp = key.substring(indexSeparator + 1)

        if (modelProperties.includes(nestedField)) {
          try {
            const obj = JSON.parse(value) // TODO: remove !!!
            const msg = `nestedField: ${nestedField} / nestedFieldProp: ${nestedFieldProp} / value: ${obj}`
            log.d(mod, fun, msg)

            returnedFilter[EXT_REFS].push({
              [EXT_OBJ]: nestedField,
              [EXT_OBJ_PROP]: nestedFieldProp,
              [EXT_OBJ_VAL]: obj,
            })
          } catch (err) {
            // const errMsg = `Couldn't parse: '${beautify(value)}': ${err}}`
            // log.w(mod, fun, errMsg)
            if (!value) returnedFilter[QUERY_SEARCH_TERMS].push(nestedField)
            else
              returnedFilter[EXT_REFS].push({
                [EXT_OBJ]: nestedField,
                [EXT_OBJ_PROP]: nestedFieldProp,
                [EXT_OBJ_VAL]: value,
              })
          }
        } else {
          if (searching) {
            log.d(mod, fun, `Search term found: ${beautify(key)}`)
            key.split(',').map((term) => returnedFilter[QUERY_SEARCH_TERMS].push(term))
          } else {
            log.w(mod, fun, `Key is not a property of ${objectType}: ${beautify(key)}`)
          }
          // log.w(mod, fun, `Model properties: ${beautify(modelProperties)}`)
        }
      }
    }
    // log.d(mod, fun, `filterReturn: ${beautify(filterReturn)}`)

    const extRefs = returnedFilter[EXT_REFS]
    if (isNotEmptyArray(extRefs)) {
      await Promise.all(
        extRefs.map(async (extRef) => {
          const extObj = extRef[EXT_OBJ]
          const extObjProp = extRef[EXT_OBJ_PROP]
          const extObjVal = extRef[EXT_OBJ_VAL]

          const objFilter = { [extObjProp]: extObjVal }

          // log.d(mod, fun, `objFilter: ${beautify(objFilter)}`)
          let nestedFieldIds
          try {
            nestedFieldIds = await db.getNestedObject(objectType, extObj, objFilter, DB_ID)
          } catch (err) {
            // returnedFilter[QUERY_FILTER][extObj] = 0
            throw RudiError.treatError(mod, fun, err)
          }
          // log.d(mod, fun, `nestedFieldIds: ${beautify(nestedFieldIds)}`)

          const ids = await Promise.all(
            nestedFieldIds.map(async (foundObj) => {
              // log.d(mod, fun, `nestedFieldId: ${beautify(foundObj[DB_ID])}`)
              return new mongoose.Types.ObjectId(foundObj[DB_ID])
            })
          )

          filters.push({ [extObj]: mongoose.trusted({ $in: ids }) })

          // log.d(mod, fun, `filterReturn: ${beautify(returnedFilter)}`)
        })
      )
    }
    if (isNotEmptyArray(filters)) returnedFilter[QUERY_FILTER] = { $and: filters }
    // log.d(mod, fun, `filter: ${beautify(returnedFilter[QUERY_FILTER])}`)
    return returnedFilter
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function getObjectParam(req) {
  const fun = 'getObjectParam'
  const objectType = json.accessReqParam(req, PARAM_OBJECT)
  try {
    checkIsUrlObject(objectType)
  } catch (err) {
    const error = new NotFoundError(`Route '${req.method} ${req.url}' not found `)
    throw RudiError.treatError(mod, fun, error)
  }
  return objectType
}

function checkIsUrlObject(objectType) {
  // const fun = 'checkIsUrlObject'
  // log.d(mod, fun, beautify(URL_OBJECTS))
  if (URL_OBJECTS.indexOf(objectType) === -1)
    throw new NotFoundError(msg.objectTypeNotFound(objectType))
}

async function newObject(objectType, objectData) {
  const fun = 'newObject'

  try {
    // checkIsUrlObject(objectType)

    switch (objectType) {
      case OBJ_METADATA:
        return await newMetadata(objectData)
      case OBJ_ORGANIZATIONS:
        return await newOrganization(objectData)
      case OBJ_CONTACTS:
        return await newContact(objectData)
      case OBJ_SKOS_CONCEPTS:
        return await newSkosConcept(objectData)
      case OBJ_SKOS_SCHEMES:
        // Custom creation to create the children scheme concepts
        return await newSkosScheme(objectData)
      default:
        throw new NotFoundError(msg.objectTypeNotFound(objectType))
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

async function isObjectReferenced(objectType, rudiId) {
  const fun = 'isObjectReferenced'

  switch (objectType) {
    case OBJ_ORGANIZATIONS:
    case OBJ_CONTACTS:
    case OBJ_MEDIA: {
      log.d(mod, fun, `objectType: ${objectType}, id: ${rudiId}`)
      return await db.isReferencedInMetadata(objectType, rudiId)
    }
    default:
      return false
  }
}

exports.setPublishedFlag = async (dbObject, rudiId) => {
  const fun = 'setPublishedFlag'
  log.d(mod, fun, '')
  try {
    if (!dbObject) throw new ParameterExpectedError('dbObject', mod, fun)
    if (!dbObject[DB_PUBLISHED_AT]) {
      dbObject[DB_PUBLISHED_AT] = nowISO()
      await dbObject.save()
      log.d(mod, fun, `dbObject published: ${log.logMetadata(dbObject)}`)
    } else {
      log.i(mod, fun, `Data had already been published for id '${rudiId}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------

/**
 * Add a new object
 * => POST /{object}/{id}
 */
exports.addSingleObject = async (req, reply) => {
  const fun = 'addSingleObject'
  log.t(mod, fun, `< POST ${URL_PV_OBJECT_GENERIC}`)
  try {
    // retrieve url parameters: object type
    const objectType = getObjectParam(req, PARAM_OBJECT)

    // get the rudiId field for this object type
    const idField = db.getObjectIdField(objectType)
    // accessing the request body
    const rudiObject = req.body

    // retrieving the id
    // log.d(mod, fun, `objectType: '${objectType}', incomingData: '${beautify(rudiObject)}' `)
    const rudiId = json.accessProperty(rudiObject, idField)

    // First: we make sure object doesn't exist already
    const existsObject = await db.doesObjectExistWithJson(objectType, rudiObject)
    if (existsObject) throw new ForbiddenError(`${msg.objectAlreadyExists(objectType, rudiId)}`)

    // Creating new object + specific treatments
    const createdObject = await newObject(objectType, rudiObject)
    // log.v(mod, fun, beautify(createdObject, 2))
    log.i(mod, fun, `${msg.objectAdded(objectType, rudiId)}`)

    const context = CallContext.getCallContextFromReq(req)
    if (context) context.addObjId(objectType, rudiId)

    return createdObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Get single object by ID
 * => GET /{object}/{id}
 */
exports.getSingleObject = async (req, reply) => {
  const fun = 'getSingleObject'
  log.t(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const objectId = json.accessReqParam(req, PARAM_ID)

    // ensure the object exists
    const dbObject = await db.getEnsuredObjectWithRudiId(objectType, objectId)
    // return the object

    const context = CallContext.getCallContextFromReq(req)
    if (context) context.addObjId(objectType, objectId)

    return dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Get several objects
 * => GET /{object}
 */
exports.getObjectList = async (req, reply) => {
  const fun = 'getObjectList'
  log.t(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}`)
  try {
    // retrieve url parameter: object type
    const objectType = getObjectParam(req)

    return await this.getManyObjects(objectType, req, reply)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Search objects
 * => GET /{object}/search
 */
exports.searchObjects = async (req, reply) => {
  const fun = 'searchObjects'
  log.t(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/${ACT_SEARCH}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)

    let parsedParameters
    try {
      parsedParameters = await this.parseQueryParameters(objectType, req.url)
    } catch (err) {
      log.w(mod, fun, err)
      return []
    }

    // If there w
    if (isEmptyArray(parsedParameters)) {
      log.w(mod, fun, 'No search parameters given')
      return []
    } else {
      log.i(mod, fun, `Parsed parameters: ${beautify(parsedParameters)}`)
    }

    const options = pick(parsedParameters, [
      QUERY_LIMIT,
      QUERY_OFFSET,
      QUERY_SORT_BY,
      QUERY_FILTER,
      QUERY_FIELDS,
      QUERY_SEARCH_TERMS,
      QUERY_COUNT_BY,
    ])
    const objectList = await db.searchObjects(objectType, options)

    // return the object

    // const context = CallContext.getCallContextFromReq(req)
    // if (context) context.addObjId(objectType, objectId)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getSearchableProperties = (req, reply) => {
  const fun = 'getSearchableProperties'
  log.t(mod, fun, ``)

  const rudiObjectList = db.getRudiObjectList()
  const getSearchableFields = {}
  // log.d(mod, fun, `rudiObjectList: ${beautify(rudiObjectList)}`)
  Object.keys(rudiObjectList).map((objectType) => {
    try {
      getSearchableFields[objectType] = rudiObjectList[objectType].Model.getSearchableFields()
    } catch (err) {
      log.d(mod, fun, `${objectType}: not searchable`)
    }
  })
  return getSearchableFields
}

/**
 * Get several objects for a particular object type
 */
exports.getManyObjects = async (objectType, req) => {
  const fun = 'getManyObjects'
  try {
    log.t(mod, fun, ``)
    let parsedParameters
    try {
      parsedParameters = await this.parseQueryParameters(objectType, req.url)
    } catch (err) {
      log.w(mod, fun, err)
      return []
    }
    // log.d(mod, fun, beautify(parsedParameters))

    const countBy = parsedParameters[QUERY_COUNT_BY]
    const groupBy = parsedParameters[QUERY_GROUP_BY]

    // accessing the objects
    let objectList
    if (!countBy && !groupBy) {
      const options = pick(parsedParameters, [
        QUERY_LIMIT,
        QUERY_OFFSET,
        QUERY_SORT_BY,
        QUERY_FILTER,
        QUERY_FIELDS,
      ])
      objectList = await db.getObjectList(objectType, options)
    } else if (groupBy) {
      if (countBy) {
        const msg = `'${QUERY_GROUP_BY}' parameter found, '${QUERY_COUNT_BY}' is redondant and ignored`
        log.w(mod, fun, msg)
      }
      const options = pick(parsedParameters, [
        QUERY_LIMIT,
        QUERY_OFFSET,
        QUERY_FILTER,
        QUERY_FIELDS,
        QUERY_SORT_BY,
        QUERY_GROUP_LIMIT,
        QUERY_GROUP_OFFSET,
      ])
      objectList = await db.groupObjectList(objectType, groupBy, options)
    } else {
      // if( !!countBy)
      const options = pick(parsedParameters, [
        QUERY_LIMIT,
        QUERY_OFFSET,
        QUERY_FILTER,
        QUERY_FIELDS,
      ])

      objectList = await db.countObjectList(objectType, countBy, options)
    }
    // log.d(mod, fun, `objectList: ${beautify(objectList)}`)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Get many metadata and a count of all that match the filter
 * @param {*} req
 * @param {*} reply
 * @returns
 */
exports.getMetadataListAndCount = async (req, reply) => {
  const fun = 'getMetadataListAndCount'
  try {
    log.t(mod, fun, `< GET ${URL_PUB_METADATA}`)

    let parsedParameters
    try {
      parsedParameters = await this.parseQueryParameters(OBJ_METADATA, req.url)
    } catch (err) {
      log.w(mod, fun, err)
      return []
    }
    let objectList
    const options = pick(parsedParameters, [
      QUERY_LIMIT,
      QUERY_OFFSET,
      QUERY_SORT_BY,
      QUERY_FILTER,
      QUERY_FIELDS,
    ])
    objectList = await db.getMetadataListAndCount(options)
    return objectList
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

/**
 * Update an existing object (obsolete)
 * => PUT /{object}
 */
exports.updateSingleObject = async (req, reply) => {
  const fun = 'updateSingleObject'
  log.t(mod, fun, `< PUT ${URL_PV_OBJECT_GENERIC}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const idField = db.getObjectIdField(objectType)

    const updateData = req.body

    // retrieve url parameters: object type, object id
    const rudiId = json.accessProperty(updateData, idField)

    const existsObject = await db.doesObjectExistWithRudiId(objectType, rudiId)
    if (!existsObject) throw new ObjectNotFoundError(objectType, rudiId)

    const context = CallContext.getCallContextFromReq(req)

    if (objectType === OBJ_METADATA) {
      if (context) context.addMetaId(rudiId)
      return await overwriteMetadata(updateData)
    } else {
      if (context) context.addObjId(objectType, rudiId)
      return await db.overwriteObject(objectType, updateData)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Update an existing object or creates it if it doesn't exist
 * => PUT /{object}
 */
exports.upsertSingleObject = async (req, reply) => {
  const fun = 'upsertSingleObject'
  log.t(mod, fun, `< PUT ${URL_PV_OBJECT_GENERIC}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const idField = db.getObjectIdField(objectType)

    const updateData = req.body

    // retrieve url parameters: object type, object id
    const rudiId = json.accessProperty(updateData, idField)

    const existsObject = await db.doesObjectExistWithRudiId(objectType, rudiId)

    const context = CallContext.getCallContextFromReq(req)
    if (!existsObject) {
      if (context) context.addObjId(objectType, rudiId)

      return await newObject(objectType, updateData)
    } else {
      if (objectType === OBJ_METADATA) {
        if (context) context.addMetaId(rudiId)
        return await overwriteMetadata(updateData)
      } else {
        if (context) context.addObjId(objectType, rudiId)
        return await db.overwriteObject(objectType, updateData)
      }
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Delete a single object
 * => DELETE /{object}/{id}
 */
exports.deleteSingleObject = async (req, reply) => {
  const fun = 'deleteSingleObject'
  log.t(mod, fun, `< DELETE ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const rudiId = json.accessReqParam(req, PARAM_ID)

    // ensure the object exists
    await db.getEnsuredObjectWithRudiId(objectType, rudiId)

    if (await isObjectReferenced(objectType, rudiId))
      throw new ForbiddenError(msg.objectNotDeletedBecauseUsed(objectType, rudiId))

    // TODO: if SkosScheme: delete all SkosConcepts that reference it
    // TODO: if SkosConcept: update all other SkosConcepts that reference it (parents/children/siblings/relatives)
    const answer = await db.deleteObject(objectType, rudiId)

    if (objectType === OBJ_METADATA) {
      deletePortalMetadata(rudiId)
        .then(() =>
          log.i(mod, fun, `Portal accepted the deletion request for metadata '${rudiId}'`)
        )
        .catch((err) => log.e(mod, fun, `Portal couldn't delete metadata '${rudiId}': ${err}`))
    }

    const context = CallContext.getCallContextFromReq(req)
    if (context) context.addObjId(objectType, rudiId)

    return answer
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Delete several objects
 * => POST /{object}/deletion
 */
exports.deleteObjectList = async (req, reply) => {
  const fun = 'deleteObjectList'
  log.t(mod, fun, `< POST ${URL_PV_OBJECT_GENERIC}/${ACT_DELETION}`)
  try {
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)

    // identify object model
    // const { Model, idField } = db.getObjectAccesses(objectType)

    // TODO: retrieve the metadata ids, DELETE on portal side with
    // deletePortalMetadata(id)

    // retrieve incoming data
    const filter = req.body
    log.d(mod, fun, beautify(filter))
    let deletionResult
    if (Array.isArray(filter)) {
      deletionResult = await db.deleteManyWithRudiIds(objectType, filter)
    } else {
      deletionResult = await db.deleteManyWithFilter(objectType, filter)
    }
    return deletionResult
  } catch (err) {
    // log.w(mod, fun, err)
    // log.e(mod, fun, `method: ${beautify(req.method)}`)
    // log.e(mod, fun, `url: ${beautify(req.url)}`)
    // log.e(mod, fun, `params: ${beautify(req.params)}`)
    // log.e(mod, fun, `body: ${beautify(req.body)}`)
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Delete every object
 * => DELETE /{object}
 */
exports.deleteManyObjects = async (req, reply) => {
  const fun = 'deleteManyObjects'
  log.t(mod, fun, `< DELETE ${URL_PV_OBJECT_GENERIC}`)
  try {
    const objectType = getObjectParam(req)
    let parsedParameters = await this.parseQueryParameters(objectType, req.url)
    log.d(mod, fun, `parsedParameters: ${beautify(parsedParameters)}`)
    const filter = parsedParameters[QUERY_FILTER]
    // const fields = parsedParameters[QUERY_FIELDS]
    const confirmation = parsedParameters[QUERY_CONFIRM] || false

    if (isEmptyObject(filter)) {
      if (confirmation) return await db.deleteAll(objectType)
      else {
        const msg = `use confirm=true as a parameter to confirm the deletion of all ${objectType}`
        log.w(mod, fun, msg)
        return msg
      }
    }
    // TODO: retrieve the metadata ids, DELETE on portal side with
    // deletePortalMetadata(id)

    return await db.deleteManyWithFilter(objectType, filter)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Generate an UUID v4
 */
exports.getOrphans = async (objectType) => {
  const fun = 'getUnlinkdedObjects'
  log.t(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/${ACT_UNLINKED}`)

  return await db.getOrphans(objectType)
}

/**
 * Generate an UUID v4
 */
exports.generateUUID = async (req, reply) => {
  const fun = 'generateUUID'
  log.t(mod, fun, ``)
  try {
    return UUIDv4()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
