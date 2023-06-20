const mod = 'genCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the objects (producer or publisher)
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { v4 as UUIDv4 } from 'uuid'

import _ from 'lodash'
const { pick } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  ACT_DELETION,
  ACT_SEARCH,
  ACT_UNLINKED,
  MONGO_ERROR,
  OBJ_CONTACTS,
  OBJ_MEDIA,
  OBJ_METADATA,
  OBJ_ORGANIZATIONS,
  OBJ_SKOS_CONCEPTS,
  OBJ_SKOS_SCHEMES,
  PARAM_ID,
  PARAM_OBJECT,
  QUERY_CONFIRM,
  QUERY_COUNT_BY,
  QUERY_FIELDS,
  QUERY_FILTER,
  QUERY_GROUP_BY,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_OFFSET,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_SEARCH_TERMS,
  QUERY_SORT_BY,
  URL_OBJECTS,
  URL_PUB_METADATA,
  URL_PV_OBJECT_GENERIC,
  OBJ_SKOS_CONCEPTS_CAML,
  OBJ_SKOS_SCHEMES_CAML,
  OBJ_PUB_KEYS,
  OBJ_PUB_KEYS_CAML,
  PARAM_PROP,
  ACT_EXT_SEARCH,
  ROUTE_OPT,
  QUERY_LANG,
  STATUS_CODE,
} from '../config/confApi.js'

import {
  countDbObjectList,
  deleteAllDbObjectsWithType,
  deleteManyDbObjectsWithFilter,
  deleteManyDbObjectsWithRudiIds,
  deleteDbObject,
  doesObjectExistWithJson,
  doesObjectExistWithRudiId,
  getEnsuredObjectWithRudiId,
  getObjectIdField,
  getDbObjectList,
  getDbMetadataListAndCount,
  getRudiObjectList,
  groupDbObjectList,
  isReferencedInMetadata,
  overwriteDbObject,
  searchDbObjects,
  countDbObjects,
} from '../db/dbQueries.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logD, logE, logI, logT, logV, logW } from '../utils/logging.js'
import {
  objectAdded,
  objectAlreadyExists,
  objectNotDeletedBecauseUsed,
  objectTypeNotFound,
} from '../utils/msg.js'

import { accessProperty, accessReqParam } from '../utils/jsonAccess.js'

import { beautify, isEmptyObject, isEmptyArray } from '../utils/jsUtils.js'

import { NotFoundError, ForbiddenError, BadRequestError, RudiError } from '../utils/errors.js'

import { parseQueryParameters } from '../utils/parseRequest.js'
import { CallContext } from '../definitions/constructors/callContext.js'

// -------------------------------------------------------------------------------------------------
// Specific controllers
// -------------------------------------------------------------------------------------------------
import { newMetadata, overwriteMetadata } from './metadataController.js'
import { newOrganization } from './organizationController.js'
import { newContact } from './contactController.js'
import { newSkosConcept, newSkosScheme, widenSearch } from './skosController.js'
import { newPublicKey, overwritePubKey } from './publicKeyController.js'

import { deletePortalMetadata } from './portalController.js'
import {
  API_ACCESS_CONDITION,
  API_COLLECTION_TAG,
  API_CONFIDENTIALITY,
  API_RESTRICTED_ACCESS,
} from '../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Specific object type helper functions
// -------------------------------------------------------------------------------------------------

function getObjectParam(req) {
  const fun = 'getObjectParam'
  try {
    const objectType = accessReqParam(req, PARAM_OBJECT)
    try {
      checkIsUrlObject(objectType)
    } catch (err) {
      const error = new NotFoundError(`Route '${req.method} ${req.url}' not found `)
      throw RudiError.treatError(mod, fun, error)
    }
    return objectType
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function checkIsUrlObject(objectType) {
  // const fun = 'checkIsUrlObject'
  // logT(mod, fun, beautify(URL_OBJECTS))
  if (URL_OBJECTS.indexOf(objectType) === -1)
    throw new NotFoundError(objectTypeNotFound(objectType))
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
      case OBJ_SKOS_CONCEPTS_CAML:
        return await newSkosConcept(objectData)
      case OBJ_SKOS_SCHEMES:
      case OBJ_SKOS_SCHEMES_CAML:
        // Custom creation to create the children scheme concepts
        return await newSkosScheme(objectData)
      case OBJ_PUB_KEYS:
      case OBJ_PUB_KEYS_CAML:
        return await newPublicKey(objectData)
      default:
        throw new NotFoundError(objectTypeNotFound(objectType))
    }
  } catch (err) {
    if (err[STATUS_CODE] === 400) {
      throw new BadRequestError(err.message, mod, `${fun}.${objectType}`, err.path)
    }
    throw RudiError.treatError(mod, fun, err)
  }
}

async function isObjectReferenced(objectType, rudiId) {
  const fun = 'isObjectReferenced'
  try {
    switch (objectType) {
      case OBJ_ORGANIZATIONS:
      case OBJ_CONTACTS:
      case OBJ_MEDIA: {
        logD(mod, fun, `objectType: ${objectType}, id: ${rudiId}`)
        return await isReferencedInMetadata(objectType, rudiId)
      }
      default:
        return false
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function overrideFilter(filterList, field, value) {
  const fun = 'overrideFilter'
  const newFilter = { [field]: value }

  if (!filterList || filterList[field]) return { $and: [newFilter] }
  if (!filterList?.$and) {
    // Simple filter
    return { $and: [filterList, newFilter] }
  }

  filterList.$and.findIndex((val, i, ara) => {
    if (Object.keys(val).indexOf(field) !== -1) ara.splice(i, 1)
  })
  logD(mod, fun, beautify(filterList))
  filterList.$and.push(newFilter)
  logD(mod, fun, beautify(filterList))
  return filterList
}

// -------------------------------------------------------------------------------------------------
// Controllers
// -------------------------------------------------------------------------------------------------

/**
 * Add a new object
 * => POST /{object}/{id}
 */
export const addSingleObject = async (req, reply) => {
  const fun = 'addSingleObject'
  try {
    logT(mod, fun, `< POST ${URL_PV_OBJECT_GENERIC}`)
    // retrieve url parameters: object type
    const objectType = getObjectParam(req, PARAM_OBJECT)

    // get the rudiId field for this object type
    const idField = getObjectIdField(objectType)
    // accessing the request body
    const rudiObject = req.body

    // retrieving the id
    // logD(mod, fun, `objectType: '${objectType}', incomingData: '${beautify(rudiObject)}' `)
    const rudiId = accessProperty(rudiObject, idField)

    // First: we make sure object doesn't exist already
    const existsObject = await doesObjectExistWithJson(objectType, rudiObject)
    if (existsObject) throw new ForbiddenError(`${objectAlreadyExists(objectType, rudiId)}`)

    // Creating new object + specific treatments
    const createdObject = await newObject(objectType, rudiObject)
    // logV(mod, fun, beautify(createdObject, 2))
    logI(mod, fun, `${objectAdded(objectType, rudiId)}`)

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
export const getSingleObject = async (req, reply) => {
  const fun = 'getSingleObject'
  try {
    logT(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`)
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const objectId = accessReqParam(req, PARAM_ID)
    const objectProp = req.params[PARAM_PROP] // Could be null

    // ensure the object exists
    const dbObject = await getEnsuredObjectWithRudiId(objectType, objectId)
    // return the object

    const context = CallContext.getCallContextFromReq(req)
    if (context) context.addObjId(objectType, objectId)

    return objectProp ? dbObject[objectProp] : dbObject
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Get several objects
 * => GET /{object}
 */
export const getObjectList = async (req, reply) => {
  const fun = 'getObjectList'
  try {
    logT(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}`)
    // retrieve url parameter: object type
    // logD(mod, fun, beautify(req))
    const objectType = getObjectParam(req)

    return await getManyObjects(objectType, req, reply)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Search objects
 * => GET /{object}/search
 */
export const searchObjects = async (req, reply) => {
  const fun = 'searchObjects'
  try {
    logT(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/${ACT_SEARCH}`)
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    logV(mod, fun, req.routeConfig)
    logV(mod, fun, req.routeSchema)
    const opt = req.routeConfig ? req.routeConfig[ROUTE_OPT] : undefined
    logD(mod, fun, `opt: ${beautify(opt)}`)

    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(objectType, req.url)
    } catch (err) {
      logW(mod, fun, err)
      return []
    }

    // If there w
    if (isEmptyArray(parsedParameters)) {
      logW(mod, fun, 'No search parameters given')
      return []
    } else {
      logI(mod, fun, `Parsed parameters: ${beautify(parsedParameters)}`)
    }

    const options = pick(parsedParameters, [
      QUERY_LANG,
      QUERY_LIMIT,
      QUERY_OFFSET,
      QUERY_SORT_BY,
      QUERY_FILTER,
      QUERY_FIELDS,
      QUERY_SEARCH_TERMS,
      QUERY_COUNT_BY,
    ])

    if (opt === ACT_EXT_SEARCH) {
      try {
        const extendedSearchTerms = await widenSearch(
          options[QUERY_SEARCH_TERMS],
          options[QUERY_LANG]
        )
        logD(mod, fun, `extendedSearchTerms: ${extendedSearchTerms}`)
        options[QUERY_SEARCH_TERMS].push(extendedSearchTerms)
      } catch (e) {
        // logE(mod, fun, `SKOSMOS down!: ERR ${e}`)
      }
    }
    const objectList = await searchDbObjects(objectType, options)

    // return the object

    // const context = CallContext.getCallContextFromReq(req)
    // if (context) context.addObjId(objectType, objectId)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getSearchableProperties = (req, reply) => {
  const fun = 'getSearchableProperties'
  try {
    logT(mod, fun, ``)
    const rudiObjectList = getRudiObjectList()
    const getSearchableFields = {}
    // logD(mod, fun, `rudiObjectList: ${beautify(rudiObjectList)}`)
    Object.keys(rudiObjectList).map((objectType) => {
      try {
        getSearchableFields[objectType] = rudiObjectList[objectType].Model.getSearchableFields()
      } catch (err) {
        logD(mod, fun, `${objectType}: not searchable`)
      }
    })
    return getSearchableFields
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Get several objects for a particular object type
 */
export const getManyObjects = async (objectType, req) => {
  const fun = 'getManyObjects'
  try {
    logT(mod, fun, ``)
    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(objectType, req.url)
    } catch (err) {
      logW(mod, fun, err)
      return []
    }
    // logD(mod, fun, beautify(parsedParameters))

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
      objectList = await getDbObjectList(objectType, options)
    } else if (groupBy) {
      if (countBy) {
        const msg = `'${QUERY_GROUP_BY}' parameter found, '${QUERY_COUNT_BY}' is redondant and ignored`
        logW(mod, fun, msg)
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
      objectList = await groupDbObjectList(objectType, groupBy, options)
    } else {
      // if( !!countBy)
      const options = pick(parsedParameters, [
        QUERY_LIMIT,
        QUERY_OFFSET,
        QUERY_FILTER,
        QUERY_FIELDS,
      ])

      objectList = await countDbObjectList(objectType, countBy, options)
    }
    // logD(mod, fun, `objectList: ${beautify(objectList)}`)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const countObjects = async (req, reply) => {
  const fun = 'countObjects'
  try {
    logT(mod, fun, ``)
    const objectType = getObjectParam(req)
    const count = await countDbObjects(objectType)
    return count
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
export const getMetadataListAndCount = async (req, reply) => {
  const fun = 'getMetadataListAndCount'
  try {
    logT(mod, fun, `< GET ${URL_PUB_METADATA}`)

    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(OBJ_METADATA, req.url)
    } catch (err) {
      logW(mod, fun, err)
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
    logD(mod, fun, beautify(options[QUERY_FILTER]))
    options[QUERY_FILTER] = overrideFilter(
      options[QUERY_FILTER],
      `${API_ACCESS_CONDITION}.${API_CONFIDENTIALITY}.${API_RESTRICTED_ACCESS}`,
      false
    )
    logD(mod, fun, beautify(options[QUERY_FILTER]))

    objectList = await getDbMetadataListAndCount(options)
    logD(mod, fun, objectList.total)
    return objectList
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

export const getManyPubKeys = async (req, reply) => {
  const fun = 'getPubKeys'
  try {
    logT(mod, fun, ``)
    return await getManyObjects(OBJ_PUB_KEYS, req)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Update an existing object or creates it if it doesn't exist
 * => PUT /{object}
 */
export const upsertSingleObject = async (req, reply) => {
  const fun = 'upsertSingleObject'
  try {
    logT(mod, fun, `< PUT ${URL_PV_OBJECT_GENERIC}`)
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const idField = getObjectIdField(objectType)

    const updateData = req.body

    // retrieve url parameters: object type, object id
    const rudiId = accessProperty(updateData, idField)

    const existsObject = await doesObjectExistWithRudiId(objectType, rudiId)

    const context = CallContext.getCallContextFromReq(req)
    if (context) context.addObjId(objectType, rudiId)

    if (!existsObject) {
      return await newObject(objectType, updateData)
    } else {
      if (objectType === OBJ_METADATA) {
        return await overwriteMetadata(updateData)
      } else if (objectType === OBJ_PUB_KEYS) {
        return await overwritePubKey(updateData)
      } else {
        return await overwriteDbObject(objectType, updateData)
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
export const deleteSingleObject = async (req, reply) => {
  const fun = 'deleteSingleObject'
  try {
    logT(mod, fun, `< DELETE ${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`)
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)
    const rudiId = accessReqParam(req, PARAM_ID)

    // ensure the object exists
    const rudiObj = await getEnsuredObjectWithRudiId(objectType, rudiId)

    if (await isObjectReferenced(objectType, rudiId))
      throw new ForbiddenError(objectNotDeletedBecauseUsed(objectType, rudiId))

    // TODO: if SkosScheme: delete all SkosConcepts that reference it
    // TODO: if SkosConcept: update all other SkosConcepts that reference it (parents/children/siblings/relatives)
    const answer = await deleteDbObject(objectType, rudiId)

    if (objectType === OBJ_METADATA && !rudiObj[API_COLLECTION_TAG]) {
      deletePortalMetadata(rudiId)
        .then(() => logI(mod, fun, `Portal accepted the deletion request for metadata '${rudiId}'`))
        .catch((err) => logE(mod, fun, `Portal couldn't delete metadata '${rudiId}': ${err}`))
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
export const deleteObjectList = async (req, reply) => {
  const fun = 'deleteObjectList'
  try {
    logT(mod, fun, `< POST ${URL_PV_OBJECT_GENERIC}/${ACT_DELETION}`)
    // retrieve url parameters: object type, object id
    const objectType = getObjectParam(req)

    // identify object model
    // const { Model, idField } = getObjectAccesses(objectType)

    // TODO: retrieve the metadata ids, DELETE on portal side with
    // deletePortalMetadata(id)

    // retrieve incoming data
    const filter = req.body
    logD(mod, fun, beautify(filter))
    let deletionResult
    if (Array.isArray(filter)) {
      deletionResult = await deleteManyDbObjectsWithRudiIds(objectType, filter)
    } else {
      deletionResult = await deleteManyDbObjectsWithFilter(objectType, filter)
    }
    return deletionResult
  } catch (err) {
    // logW(mod, fun, err)
    // logE(mod, fun, `method: ${beautify(req.method)}`)
    // logE(mod, fun, `url: ${beautify(req.url)}`)
    // logE(mod, fun, `params: ${beautify(req.params)}`)
    // logE(mod, fun, `body: ${beautify(req.body)}`)
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Delete every object
 * => DELETE /{object}
 */
export const deleteManyObjects = async (req, reply) => {
  const fun = 'deleteManyObjects'
  try {
    logT(mod, fun, `< DELETE ${URL_PV_OBJECT_GENERIC}`)
    const objectType = getObjectParam(req)
    let parsedParameters = await parseQueryParameters(objectType, req.url)
    logD(mod, fun, `parsedParameters: ${beautify(parsedParameters)}`)
    const filter = parsedParameters[QUERY_FILTER]
    // const fields = parsedParameters[QUERY_FIELDS]
    const confirmation = parsedParameters[QUERY_CONFIRM] || false

    // if (objectType === OBJ_REPORTS) return await deleteReportsBefore(req, reply)

    if (isEmptyObject(filter)) {
      if (confirmation) return await deleteAllDbObjectsWithType(objectType)
      else {
        const msg = `Use confirm=true as a parameter to confirm the deletion of all ${objectType}`
        logW(mod, fun, msg)
        throw new BadRequestError(msg, mod, fun)
      }
    }
    // TODO: retrieve the metadata ids, DELETE on portal side with
    // deletePortalMetadata(id)

    return await deleteManyDbObjectsWithFilter(objectType, filter)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Generate an UUID v4
 */
export const getOrphans = async (objectType) => {
  const fun = 'getUnlinkdedObjects'
  logT(mod, fun, `< GET ${URL_PV_OBJECT_GENERIC}/${ACT_UNLINKED}`)

  return await getOrphans(objectType)
}

/**
 * Generate an UUID v4
 */
export const generateUUID = async (req, reply) => {
  const fun = 'generateUUID'
  try {
    logT(mod, fun, ``)
    return UUIDv4()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
