const mod = 'metaCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the metadata
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'
const { Types: MongooseTypes } = mongoose

import _ from 'lodash'
const { pick } = _
// const { mergeWith } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  DB_ID,
  API_METADATA_ID,
  API_ORGANIZATION_ID,
  API_CONTACT_ID,
  API_DATA_PRODUCER_PROPERTY,
  API_DATA_CONTACTS_PROPERTY,
  API_MEDIA_PROPERTY,
  API_METAINFO_PROPERTY,
  API_METAINFO_PROVIDER_PROPERTY,
  API_METAINFO_CONTACTS_PROPERTY,
  API_GEOGRAPHY,
  API_GEO_GEOJSON_PROPERTY,
  API_GEO_BBOX_PROPERTY,
  API_GEO_BBOX_WEST,
  API_GEO_BBOX_EAST,
  API_GEO_BBOX_NORTH,
  API_GEO_BBOX_SOUTH,
  API_MEDIA_ID,
  API_PURPOSE,
  API_LANGUAGES_PROPERTY,
  API_DATA_DESCRIPTION_PROPERTY,
  API_DATA_DETAILS_PROPERTY,
  DB_CREATED_AT,
  DB_UPDATED_AT,
  DICT_LANG,
  API_FILE_STATUS_UPDATE,
  API_FILE_STORAGE_STATUS,
  API_STORAGE_STATUS,
  API_METAINFO_VERSION_PROPERTY,
  API_MEDIA_TYPE,
  API_INTEGRATION_ERROR_ID,
  API_ACCESS_CONDITION,
  API_LICENCE,
  API_LICENCE_TYPE,
  LicenceTypes,
  API_LICENCE_CUSTOM_URI,
  API_LICENCE_CUSTOM_LABEL,
} from '../db/dbFields.js'

import {
  URL_PREFIX_PUBLIC,
  URL_PUB_METADATA,
  OBJ_METADATA,
  OBJ_MEDIA,
  PARAM_ID,
  ACT_INIT,
  MONGO_ERROR,
  QUERY_FIELDS,
  COUNT_LABEL,
  LIST_LABEL,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_SORT_BY,
  QUERY_FILTER,
  QUERY_SEARCH_TERMS,
  QUERY_COUNT_BY,
  STATUS_CODE,
  API_VERSION,
} from '../config/confApi.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { bboxToGeoJsonPolygon } from '../utils/geo.js'
import {
  beautify,
  deepClone,
  isNotEmptyArray,
  isEmptyArray,
  isNothing,
  nowISO,
} from '../utils/jsUtils.js'
import { logD, logE, logI, logT, logW } from '../utils/logging.js'
import {
  contactNotFound,
  missingObjectProperty,
  organizationNotFound,
  parameterExpected,
} from '../utils/msg.js'
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
  ParameterExpectedError,
  ObjectNotFoundError,
  RudiError,
} from '../utils/errors.js'
import { accessProperty, accessReqParam } from '../utils/jsonAccess.js'

// -------------------------------------------------------------------------------------------------
// Data models
// -------------------------------------------------------------------------------------------------
import { isEveryMediaAvailable, Metadata } from '../definitions/models/Metadata.js'
import { Media, MediaStorageStatus, MediaTypes } from '../definitions/models/Media.js'

// -------------------------------------------------------------------------------------------------
// Controllers
// -------------------------------------------------------------------------------------------------
import { newOrganization } from './organizationController.js'
import { newContact } from './contactController.js'
import { initializeLicences } from './licenceController.js'
import { sendMetadataToPortal } from './portalController.js'

import { CallContext } from '../definitions/constructors/callContext.js'
import Themes from '../definitions/thesaurus/Themes.js'

import {
  doesObjectExistWithRudiId,
  getContactDbIdWithJson,
  getEnsuredContactWithDbId,
  getEnsuredMediaWithDbId,
  getEnsuredMetadataWithRudiId,
  getEnsuredOrganizationWithDbId,
  getMediaDbIdWithJson,
  getDbObjectListAndCount,
  getOrganizationDbIdWithJson,
  listThemesInMetadata,
  overwriteDbObject,
  searchDbObjects,
  getObjectWithRudiId,
  getMetadataWithJson,
} from '../db/dbQueries.js'

import { parseQueryParameters } from '../utils/parseRequest.js'
import { readJsonFile } from '../utils/fileActions.js'
import Contact from '../definitions/models/Contact.js'
import Organization from '../definitions/models/Organization.js'
import { StorageStatus } from '../definitions/thesaurus/StorageStatus.js'

// -------------------------------------------------------------------------------------------------
// Atomic treatments of properties: RUDI -> DB
// -------------------------------------------------------------------------------------------------

export const organizationRudiToDbFormat = async (rudiProducer, path, shouldCreateIfNotFound) => {
  const fun = 'organizationRudiToDbFormat'
  try {
    logT(mod, fun, ``)
    if (!rudiProducer) throw new ParameterExpectedError('rudiProducer', mod, fun)
    let organizationDbId
    try {
      organizationDbId = await getOrganizationDbIdWithJson(rudiProducer)
    } catch (e) {
      if (e[STATUS_CODE] === 400) throw new BadRequestError(e.message, mod, 'org.get', path)
      throw e
    }
    // logD(mod, fun, `organizationDbId: -> ${organizationDbId} `)

    if (!organizationDbId) {
      if (!shouldCreateIfNotFound) {
        const err = new NotFoundError(organizationNotFound(rudiProducer[API_ORGANIZATION_ID]))
        throw RudiError.treatError(mod, fun, err)
      }
      const newOrg = new Organization(rudiProducer)
      try {
        await newOrg.save()
      } catch (e) {
        throw new BadRequestError(e.message, mod, 'org.save', path)
      }
      logD(mod, fun, `new Organization: ${beautify(rudiProducer)}`)

      organizationDbId = newOrg[DB_ID]
    }
    // logD(mod, fun, `${beautify(rudiProducer)} -> ${organizationDbId} `)
    return new MongooseTypes.ObjectId(organizationDbId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const contactListRudiToDbFormat = async (rudiContactList, path, shouldCreateIfNotFound) => {
  const fun = 'contactListRudiToDbFormat'
  try {
    logT(mod, fun, ``)
    if (!rudiContactList) throw new ParameterExpectedError('rudiContactList', mod, fun)

    const contactDbIds = []
    await Promise.all(
      rudiContactList.map(async (rudiContact, i) => {
        let contactDbId
        try {
          contactDbId = await getContactDbIdWithJson(rudiContact)
        } catch (e) {
          if (e[STATUS_CODE] === 400) {
            throw new BadRequestError(e.message, mod, 'contact.get', path.concat(i))
          }
          throw e
        }
        if (!contactDbId) {
          if (!shouldCreateIfNotFound) {
            const err = new NotFoundError(contactNotFound(rudiContact[API_CONTACT_ID]))
            throw RudiError.treatError(mod, fun, err)
          }

          const dbContact = new Contact(rudiContact)
          try {
            await dbContact.save()
          } catch (e) {
            throw new BadRequestError(e.message, mod, 'contact.save', path.concat(i))
          }
          logD(mod, fun, `new Contact: ${beautify(rudiContact)}`)

          contactDbId = dbContact[DB_ID]
        }
        contactDbIds.push(new MongooseTypes.ObjectId(contactDbId))
        // logD(mod, fun, `${beautify(rudiContact)} -> ${contactDbId}`)
      })
    )
    return contactDbIds
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const mediaListRudiToDbFormat = async (rudiMediaList, shouldCreateIfNotFound) => {
  const fun = 'mediaListRudiToDbFormat'
  try {
    logT(mod, fun, ``)
    // logD(mod, fun, `rudiMediaList: ${beautify(rudiMediaList)}`)
    if (!rudiMediaList) throw new ParameterExpectedError('rudiMediaList', mod, fun)

    const mediaDbIds = []
    await Promise.all(
      rudiMediaList.map(async (rudiMedia, i) => {
        // logD(mod, fun, `rudiMedia: ${beautify(rudiMedia)}`)
        if (!rudiMedia)
          throw new BadRequestError(`Parameter 'rudiMedia' should not be empty`, mod, fun, [
            API_MEDIA_PROPERTY,
            i,
          ])
        let mediaDbId
        try {
          mediaDbId = await getMediaDbIdWithJson(rudiMedia)
        } catch (e) {
          if (e[STATUS_CODE] === 400) {
            throw new BadRequestError(e.message, mod, 'media.get', [API_MEDIA_PROPERTY, i])
          }
          throw e
        }
        // Check if the media set as "media visual" already exists
        // const mediaVisual = rudiMedia[API_MEDIA_THUMBNAIL]
        // if (mediaVisual) {
        //   if (!mediaVisual[API_MEDIA_ID])
        //     throw new BadRequestError(
        //       `Parameter '${API_MEDIA_THUMBNAIL}' should be an identified media`,
        //       mod,
        //       'media.get',
        //       [API_MEDIA_PROPERTY, i]
        //     )
        //   const dbMediaVisual = getObjectWithRudiId(OBJ_MEDIA, mediaVisual[API_MEDIA_ID])
        // }
        if (rudiMedia[API_MEDIA_TYPE] !== MediaTypes.File) {
          // Set media storage_status to 'available'
          rudiMedia[API_FILE_STORAGE_STATUS] = MediaStorageStatus.Available
          // Set status_update date
          rudiMedia[API_FILE_STATUS_UPDATE] = rudiMedia[API_FILE_STATUS_UPDATE] || nowISO()
        }

        if (!mediaDbId) {
          if (!shouldCreateIfNotFound)
            throw new ObjectNotFoundError(OBJ_MEDIA, rudiMedia[API_MEDIA_ID])

          let media

          try {
            media = new Media(rudiMedia)
            await media.save()
          } catch (e) {
            logW(mod, fun, e.message)
            throw new BadRequestError(e.message, mod, 'media.save', [API_MEDIA_PROPERTY, i])
          }

          mediaDbId = media[DB_ID]
          // logD(mod, fun, `newly created mediaDbId: ${beautify(mediaDbId)}`)
        } else {
          try {
            await overwriteDbObject(OBJ_MEDIA, rudiMedia) // TODO: valider ! Doit-on vraiment mettre un jour un media, ou recréer cette métadonnée ?
          } catch (e) {
            logW(mod, fun, e.message)
            throw new BadRequestError(e.message, mod, 'media.overwrite', [API_MEDIA_PROPERTY, i])
          }
        }
        mediaDbIds.push(new MongooseTypes.ObjectId(mediaDbId))
        // logD(mod, fun, `${beautify(rudiMedia)} -> ${mediaDbId} `)
      })
    )
    return mediaDbIds
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// function customMerger(value, srcValue, key) {
//   const fun = 'customMerger'
//   logV(mod, fun, `'${key}': ${beautify(srcValue)} -> ${beautify(value)}`)
//   if (Array.isArray(srcValue)) return srcValue
//   return undefined
// }

// // Parameter 'dbMetadata' gets mutated!
// async function metadataCustomMerge(dbMetadata, dbReadyModMetadata) {
//   const fun = 'metadataCustomMerge'
//   logT(mod, fun, ``)
//   // logD(mod, fun, `dbMetadata: ${beautify(dbMetadata)}`)

//   //   const dataDates = dbMetadata[API_DATA_DATES_PROPERTY]
//   //   const metaDates = dbMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES_PROPERTY]
//   //  const modDataDates = dbReadyModMetadata[API_DATA_DATES_PROPERTY]
//   //   const modMetaDates = !dbReadyModMetadata[API_METAINFO_PROPERTY]
//   //     ? {}
//   //     : dbReadyModMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES_PROPERTY]

//   //   _.extend(dataDates, modDataDates)
//   //   _.extend(metaDates, modMetaDates)

//   await mergeWith(dbMetadata, dbReadyModMetadata, customMerger)

//   // dbMetadata[API_DATA_DATES_PROPERTY] = dataDates
//   // dbMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES_PROPERTY] = metaDates

//   // logD(mod, fun, `dbMetadata updated: ${beautify(dbMetadata)}`)
//   return dbMetadata
// }

// -------------------------------------------------------------------------------------------------
// Atomic treatments of properties: DB -> RUDI
// -------------------------------------------------------------------------------------------------

export const organizationDbToRudiFormat = async (producerDbId) => {
  const fun = 'organizationDbToRudiFormat'
  logT(mod, fun, ``)
  if (!producerDbId) throw new ParameterExpectedError('producerDbId', mod, fun)

  const dbOrganization = await getEnsuredOrganizationWithDbId(producerDbId)
  logD(mod, fun, `dbOrganization -> ${beautify(dbOrganization)}`)
  // const cleanedOrganization = dbRwk.unmongoosify(dbOrganization)
  // logD(mod, fun, `${producerDbId} -> ${beautify(cleanedOrganization)}`)
  return dbOrganization
}

export const contactListDbToRudiFormat = async (contactsDbIds) => {
  const fun = 'contactListDbToRudiFormat'
  logT(mod, fun, ``)
  logD(mod, fun, `contactsDbIds: ${beautify(contactsDbIds)}`)
  if (!contactsDbIds) throw new ParameterExpectedError('contactsDbIds', mod, fun)

  const contacts = []
  await Promise.all(
    contactsDbIds.map(async (contactDbId) => {
      // logD(mod, fun, `contactDbId: ${contactDbId}`)
      const contact = await getEnsuredContactWithDbId(contactDbId)
      // contacts.push(dbRwk.unmongoosify(contact))
      contacts.push(contact)
      logD(mod, fun, `${contactDbId} -> ${beautify(contact)}`)
    })
  )
  return contacts
}

export const mediaListDbToRudiFormat = async (mediaDbIds) => {
  const fun = 'mediaListDbToRudiFormat'
  logT(mod, fun, ``)
  logD(mod, fun, `mediaDbIds: ${beautify(mediaDbIds)}`)
  if (!mediaDbIds) throw new ParameterExpectedError('mediaDbIds', mod, fun)

  const mediaList = []
  await Promise.all(
    mediaDbIds.map(async (mediaDbId) => {
      // logD(mod, fun, `contactDbId: ${contactDbId}`)
      const dbMedia = await getEnsuredMediaWithDbId(mediaDbId)
      // contacts.push(dbRwk.unmongoosify(contact))
      mediaList.push(dbMedia)
      logD(mod, fun, `${mediaDbId} -> ${beautify(dbMedia)}`)
    })
  )
  return mediaList
}

// -------------------------------------------------------------------------------------------------
// Global treatments of properties: RUDI -> DB
// -------------------------------------------------------------------------------------------------

// Flag that sets if organizations, contacts and media should be created
// if they don't already exist in the DB
const SHOULD_CREATE_IF_NOT_FOUND = true

/**
 * Format a RUDI Metadata document (JSON):
 * @param rudiMetadata: the RUDI Metadata JSON object
 * @param shouldBeStrict: if required fields presence should be ensured (e.g. true for creation, false for update)
 * @param shouldClone: if original metadata should be cloned (=== no more a db object)
 */
export const rudiToDbFormat = async (rudiMetadata, shouldBeStrict, shouldClone) => {
  const fun = 'rudiToDbFormat'
  logT(mod, fun, ``)

  if (!rudiMetadata) throw new InternalServerError(parameterExpected(fun, 'rudiMetadata'))

  // let dbReadyMetadata = deepClone(rudiMetadata)
  let dbReadyMetadata
  if (shouldClone) {
    dbReadyMetadata = deepClone(rudiMetadata)
  } else {
    dbReadyMetadata = rudiMetadata
  }

  try {
    // ----- Updating producer field with db instead of incoming data
    // TODO[VALIDATE]: The organization info already in database is not updated with possible new data,
    //                 and only the organization RUDI id is really necessary in the request body
    let producer
    if (shouldBeStrict) {
      producer = accessProperty(dbReadyMetadata, API_DATA_PRODUCER_PROPERTY)
    } else {
      producer = dbReadyMetadata[API_DATA_PRODUCER_PROPERTY]
    }
    if (producer) {
      dbReadyMetadata[API_DATA_PRODUCER_PROPERTY] = await organizationRudiToDbFormat(
        producer,
        [API_DATA_PRODUCER_PROPERTY],
        SHOULD_CREATE_IF_NOT_FOUND
      )
    }

    // ----- Updating contacts field with db instead of incoming data
    // TODO[VALIDATE]: The contact info already in database is not updated with possible new data,
    //                 and only the contact RUDI id is really necessary in the request body
    let contacts
    if (shouldBeStrict) {
      contacts = accessProperty(dbReadyMetadata, API_DATA_CONTACTS_PROPERTY)
      if (!isNotEmptyArray(contacts))
        throw new BadRequestError(
          `${missingObjectProperty(dbReadyMetadata, API_DATA_CONTACTS_PROPERTY)}`,
          mod,
          fun,
          [API_DATA_CONTACTS_PROPERTY]
        )
    } else {
      contacts = dbReadyMetadata[API_DATA_CONTACTS_PROPERTY]
    }
    if (isNotEmptyArray(contacts)) {
      dbReadyMetadata[API_DATA_CONTACTS_PROPERTY] = await contactListRudiToDbFormat(
        contacts,
        [API_DATA_CONTACTS_PROPERTY],
        SHOULD_CREATE_IF_NOT_FOUND
      )
    }

    // ----- Updating media field with db instead of incoming data
    // TODO[VALIDATE]: The contact info already in database is not updated with possible new data,
    //                 and only the contact RUDI id is really necessary in the request body
    let mediaList
    if (shouldBeStrict) {
      mediaList = accessProperty(dbReadyMetadata, API_MEDIA_PROPERTY)
      if (!isNotEmptyArray(mediaList))
        throw new BadRequestError(
          `${missingObjectProperty(dbReadyMetadata, API_MEDIA_PROPERTY)}`,
          mod,
          fun,
          [API_MEDIA_PROPERTY]
        )
    } else {
      mediaList = dbReadyMetadata[API_MEDIA_PROPERTY]
    }
    // logD(mod, fun, `mediaList: ${beautify(mediaList)}`)
    if (isNotEmptyArray(mediaList)) {
      dbReadyMetadata[API_MEDIA_PROPERTY] = await mediaListRudiToDbFormat(
        mediaList,
        SHOULD_CREATE_IF_NOT_FOUND
      )
    }
    // logD(mod, fun, `media list: ${beautify(dbReadyMetadata[API_MEDIA_PROPERTY])}`)

    // ----- Updating metadataInfo.metadata_provider field (same as above producer organization) with db instead of incoming data
    // TODO[VALIDATE]: The organization info already in database is not updated with possible new data,
    //                 and only the contact RUDI id is really necessary in the request body
    let metaInfo
    if (shouldBeStrict) {
      metaInfo = accessProperty(dbReadyMetadata, API_METAINFO_PROPERTY)
    } else {
      metaInfo = dbReadyMetadata[API_METAINFO_PROPERTY]
    }
    if (metaInfo) {
      // following fields are not required, so 'shouldBeStrict is irrelevant
      const metaInfoProvider = metaInfo[API_METAINFO_PROVIDER_PROPERTY]
      if (metaInfoProvider) {
        dbReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_PROVIDER_PROPERTY] =
          await organizationRudiToDbFormat(
            metaInfoProvider,
            [API_METAINFO_PROPERTY, API_METAINFO_PROVIDER_PROPERTY],
            SHOULD_CREATE_IF_NOT_FOUND
          )
      }

      const metaInfoContacts = metaInfo[API_METAINFO_CONTACTS_PROPERTY]
      if (isNotEmptyArray(metaInfoContacts)) {
        dbReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_CONTACTS_PROPERTY] =
          await contactListRudiToDbFormat(
            metaInfoContacts,
            [API_METAINFO_PROPERTY, API_METAINFO_CONTACTS_PROPERTY],
            SHOULD_CREATE_IF_NOT_FOUND
          )
      }
    }

    if (isEmptyArray(dbReadyMetadata[API_PURPOSE])) {
      delete dbReadyMetadata[API_PURPOSE]
    }
    const langStr = beautify(dbReadyMetadata[API_LANGUAGES_PROPERTY])
    // logD(mod, fun, `langStr: ${langStr}`)
    if (langStr === '[]' || langStr === '[null]') {
      logD(mod, fun, `removing lang field: ${langStr}`)
      delete dbReadyMetadata[API_LANGUAGES_PROPERTY]
    }
    setGeography(dbReadyMetadata)

    // ----- Licence pre-checks
    checkLicence(dbReadyMetadata)

    // ----- Updating Dictionary entries (MongoDB doesn't accept all RUDI languages)
    toMDBLanguage(dbReadyMetadata, API_DATA_DETAILS_PROPERTY)
    toMDBLanguage(dbReadyMetadata, API_DATA_DESCRIPTION_PROPERTY)

    // Update API version
    dbReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_VERSION_PROPERTY] = API_VERSION

    // Avoid dates manipulation
    stripTimestamps(dbReadyMetadata)

    // logD(mod, fun, `dbReadyMetadata: ${beautify(dbReadyMetadata, 2)}`)
    return dbReadyMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
function checkLicence(metadata) {
  if (!metadata[API_ACCESS_CONDITION] || !metadata[API_ACCESS_CONDITION][API_LICENCE]) return
  if (!metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_TYPE]) return
  const licenceType = metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_TYPE]
  if (licenceType === LicenceTypes.Standard) {
    delete metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_URI]
    delete metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL]
  } else {
    if (typeof metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL] === 'string')
      metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL] = [
        { lang: 'fr', text: metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL] },
      ]
  }
}

function stripTimestamps(metadata) {
  const fun = 'stripTimestamps'
  try {
    logT(mod, fun, ``)
    metadata[DB_CREATED_AT] = undefined
    metadata[DB_UPDATED_AT] = undefined
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
function toMDBLanguage(metadata, field) {
  const fun = 'toMDBLanguage'
  try {
    logT(mod, fun, ``)
    const prop = metadata[field]
    if (!Array.isArray(prop)) {
      logW(mod, fun, `Field '${field}' should be an array: ${beautify(prop)}`)
      return
    }
    prop.map((entry) => {
      if (entry[DICT_LANG]) entry[DICT_LANG] = entry[DICT_LANG].substring(0, 2)
    })
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
/**
 * If both 'geography.geographic_distribution' and 'geography.bounding_box' are defined,
 * do nothing (TODO: check that they are coherent)
 *
 * If 'geography.geographic_distribution' is not set and 'geography.bounding_box' is defined,
 * sets the GeoJSON object for 'geographic_distribution' property
 * according to 'bounding_box' properties
 *
 * (TODO)
 * If 'geography.bounding_box' is not set and 'geography.geographic_distribution' is defined,
 * extracts the bounding box from the GeoJSON object and set 'geography.bounding_box' accordingly
 */
export const setGeography = (metadata) => {
  const fun = 'setGeography'
  // logT(mod, fun, ``)
  const geography = metadata[API_GEOGRAPHY]
  if (isNothing(geography)) {
    // No 'geography' property => exit
    // logD(mod, fun, `No '${API_GEOGRAPHY_PROPERTY}' property was set`)
    return
  }

  const bbox = geography[API_GEO_BBOX_PROPERTY]
  const geojson = geography[API_GEO_GEOJSON_PROPERTY]
  // logD(mod, fun, `bbox: ${beautify(bbox)}`)
  // logD(mod, fun, `geojson: ${beautify(geojson)}`)

  if (isNothing(bbox)) {
    // No 'bounding_box' property
    // logD(mod, fun, `No '${API_GEO_BBOX_PROPERTY}' property was set`)
    if (isNothing(geojson)) {
      // No 'bounding_box' property nor GeoJSON => problem
      // logD(mod, fun, `No '${API_GEO_GEOJSON_PROPERTY}' property was set`)
      // No geographic information
      // TODO: (If shouldBeStrict: error => bbox is mandatory if 'geography' is set!)
      return
    } else {
      // logD(mod, fun, `'${API_GEO_GEOJSON_PROPERTY}' property already set`)
      // No 'bounding_box' property but GeoJSON => extract bounding box from GeoJSON !
      // GeoJsonToBbox GeoJSON =
      //    1. extract 'geography.geographic_distribution.bbox'
      //    2. set 'geography.bounding_box' properties

      return
    }
  }
  if (!isNothing(geojson)) {
    // Both GeoJSON and 'bounding_box' properties are set => exit
    const msg =
      `Both '${API_GEO_BBOX_PROPERTY}' ` +
      `and '${API_GEO_GEOJSON_PROPERTY}' properties are already set`

    logD(mod, fun, msg)
    // logD(mod, fun, `'${API_GEO_BBOX_PROPERTY}' = ${beautify(bbox)}`)
    // logD(mod, fun, `'${API_GEO_GEOJSON_PROPERTY}' = ${beautify(geojson)}`)

    // TODO: check that 'geographic_distribution' property is a valid GeoJSON
    // TODO: set bbox property if not set
    // TODO: check that bbox subproperty is coherent with 'geography.bounding_box' coordinates
    return
  }

  // logD(mod, fun, `Extracting '${API_GEO_GEOJSON_PROPERTY}' from '${API_GEO_BBOX_PROPERTY}'`)

  // No GeoJSON but 'bounding_box' property is set => extract GeoJSON from bbox property

  // BboxToJson =
  //      1. extract 'geography.bounding_box' properties
  //      2. Create a GeoJSON Polygon with 'bbox' property
  //      3. set 'geography.geographic_distribution' property

  const west = bbox[API_GEO_BBOX_WEST]
  const south = bbox[API_GEO_BBOX_SOUTH]
  const east = bbox[API_GEO_BBOX_EAST]
  const north = bbox[API_GEO_BBOX_NORTH]

  metadata[API_GEOGRAPHY][API_GEO_GEOJSON_PROPERTY] = bboxToGeoJsonPolygon(west, south, east, north)
}

// -------------------------------------------------------------------------------------------------
// High level actions
// -------------------------------------------------------------------------------------------------
export const upsertMetadata = async (rudiMetadata) => {
  const fun = 'upsertMetadata'
  try {
    logT(mod, fun, ``)
    const rudiId = accessProperty(rudiMetadata, API_METADATA_ID)
    const existsMetadata = await doesObjectExistWithRudiId(OBJ_METADATA, rudiId)

    if (!existsMetadata) {
      return await newMetadata(rudiMetadata)
    } else {
      return await overwriteMetadata(rudiMetadata)
    }
  } catch (err) {
    const error = new Error(err.message + ` (metadata: ${rudiMetadata[API_METADATA_ID]})`)
    throw RudiError.treatError(mod, fun, error)
  }
}

export const newMetadata = async (rudiMetadata) => {
  const fun = 'newMetadata'
  try {
    logT(mod, fun, ``)
    // logD(mod, fun, `incoming object: ${beautify(rudiMetadata)}`)
    if (!rudiMetadata) throw new ParameterExpectedError('rudiMetadata', mod, fun)

    // Special treatment!
    const dbReadyObject = await rudiToDbFormat(rudiMetadata, true)
    // logI(mod, fun, `dbReadyObject: ${beautify(dbReadyObject)}`)
    const dbMetadata = new Metadata(dbReadyObject)
    await dbMetadata.save()

    const { metadata: finalMetadata, areAllMediaAvailable } = await updateMetadataState(dbMetadata)

    logI(mod, fun, `finalMetadata: ${beautify(finalMetadata)}`)
    if (areAllMediaAvailable) sendToPortal(finalMetadata)

    return finalMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// parameter incomingRudiMetadata can't be partial metadata!
export const overwriteMetadata = async (incomingRudiMetadata) => {
  const fun = 'overwriteMetadata'
  try {
    logT(mod, fun, ``)

    if (!incomingRudiMetadata) throw new ParameterExpectedError('incomingRudiMetadata', mod, fun)
    // logD(mod, fun, `edited metadata: ${beautify(incomingRudiMetadata)}\n`)

    const dbReadyEditedMetadata = await rudiToDbFormat(incomingRudiMetadata, true)
    const dbMetadata = await overwriteDbObject(OBJ_METADATA, dbReadyEditedMetadata)

    const { metadata: finalMetadata, areAllMediaAvailable } = await updateMetadataState(dbMetadata)
    if (areAllMediaAvailable) sendToPortal(finalMetadata)

    return finalMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Updates the state of a metadata by checking the state of every bound media.
 * If one media is Missing, NonExitant or Removed (see MediaStorageStatus)
 * the state of the metadata is set to Pending (see StorageStatus)
 * It is otherwise set to the state provided (Online if none was provided)
 * @param {Object} dbMetadata
 * @param {string?} newState
 * @return {Boolean} True if all media were commited and metadata can be sent to Portal
 */
const updateMetadataState = async (dbMetadata, newState = StorageStatus.Online) => {
  const fun = 'updateMetadataState'
  try {
    logT(mod, fun, ``)
    const metadata = await getMetadataWithJson(dbMetadata)

    const areAllMediaAvailable = await isEveryMediaAvailable(metadata)
    if (areAllMediaAvailable) {
      metadata[API_STORAGE_STATUS] = newState
    } else {
      metadata[API_STORAGE_STATUS] = StorageStatus.Pending
    }
    // console.log('T (updateMetadataState) API_STORAGE_STATUS:', metadata[API_STORAGE_STATUS])
    if (dbMetadata[API_STORAGE_STATUS] !== metadata[API_STORAGE_STATUS]) {
      dbMetadata[API_STORAGE_STATUS] = metadata[API_STORAGE_STATUS]
      if (!dbMetadata[API_INTEGRATION_ERROR_ID]) await dbMetadata.save()
    }
    if (metadata[API_INTEGRATION_ERROR_ID]) {
      delete metadata[API_INTEGRATION_ERROR_ID]
      dbMetadata[API_INTEGRATION_ERROR_ID] = null
      await dbMetadata.save()
      logD(mod, fun, 'Integration error flag removed')
    }
    logD(
      mod,
      fun,
      `Metadata is ${areAllMediaAvailable ? '' : 'not '}sendable: ${dbMetadata[API_METADATA_ID]}`
    )
    return { metadata, areAllMediaAvailable } // OK to send
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Commits a Media (meaning the Media was successfully stored on "RUDI Media" storage)
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const commitMedia = async (req, res) => {
  const fun = 'commitMedia'
  try {
    logT(mod, fun, ``)
    const mediaId = accessReqParam(req, PARAM_ID)
    const { metadataId, commitId } = req.body
    logD(mod, fun, `commitId: ${commitId}`)

    // --- Checks
    // Check mediaId exists
    const dbMedia = await getObjectWithRudiId(OBJ_MEDIA, mediaId)
    if (!dbMedia) throw new NotFoundError(`Media not found for id '${mediaId}'`)
    // Check metadataId exists
    const dbMetadata = await getObjectWithRudiId(OBJ_METADATA, metadataId)
    if (!dbMetadata) throw new NotFoundError(`Metadata not found for id '${metadataId}'`)
    // Check metadata is bound to media
    const metadataMediaList = dbMetadata[API_MEDIA_PROPERTY]
    const mediaIndex = metadataMediaList.findIndex((media) => mediaId === media[API_MEDIA_ID])
    if (mediaIndex === -1)
      throw new BadRequestError(`Media '${mediaId}' not linked to metadata '${metadataId}'`)

    // --- Updates
    // Set media storage_status to 'available'
    dbMedia[API_FILE_STORAGE_STATUS] = MediaStorageStatus.Available
    // Set status_update date
    dbMedia[API_FILE_STATUS_UPDATE] = nowISO()

    await dbMedia.save()

    const { metadata: finalMetadata, areAllMediaAvailable } = await updateMetadataState(dbMetadata)

    const result = {
      media: pick(dbMedia, [API_MEDIA_ID, API_FILE_STORAGE_STATUS, API_FILE_STATUS_UPDATE]),
    }

    // If other media are still waiting, we do not send the metadata
    if (!areAllMediaAvailable) {
      logD(mod, fun, `Media commit success: ${beautify(result)}`)
      return res.code(200).send(result)
    }

    // All media are available! Let's send the metadata
    logD(mod, fun, `Let's update the metadata`)

    result.metadata = pick(dbMetadata, [API_METADATA_ID, API_STORAGE_STATUS])
    logD(mod, fun, `Media commit success : ${beautify(result)}`)

    sendToPortal(finalMetadata)
    return res.code(200).send(result)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const sendManyMetadataToPortal = async (req) => {
  const fun = 'sendAllMetadataToPortal'
  try {
    logT(mod, fun, ``)
    const listIds = req.body

    if (!!listIds && !Array.isArray(listIds)) {
      throw new BadRequestError(
        'The body of the request should be empty (to send every metadata) or a list of ids',
        mod,
        fun
      )
    }

    if (!listIds || isEmptyArray(listIds)) {
      logD(mod, fun, 'Getting the list of metadata ids')
      let metadataListAndCount = await getDbObjectListAndCount(OBJ_METADATA, {
        [QUERY_FIELDS]: [API_METADATA_ID],
      })
      const metadataCount = metadataListAndCount[COUNT_LABEL]
      let metadataList = metadataListAndCount[LIST_LABEL]
      const currentCount = metadataList ? metadataList.length : 0

      if (currentCount < metadataCount) {
        logD(mod, fun, 'Getting the whole list of metadata ids')
        metadataListAndCount = await getDbObjectListAndCount(OBJ_METADATA, {
          [QUERY_FIELDS]: [API_METADATA_ID],
          [QUERY_LIMIT]: metadataCount,
        })
        metadataList = metadataListAndCount[LIST_LABEL]
      }
      metadataList.map((meta) => sendToPortal(meta))
    } else {
      listIds.map((id) =>
        sendMetadataToPortal(id).then((res) => {
          if (res) logI(mod, fun, `'Update request received by the portal for metadata '${id}'`)
        })
      )
    }
    return 'Sending metadata to portal'
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const sendToPortal = (metadata) => {
  const fun = 'sendToPortal'
  try {
    const metaId = metadata[API_METADATA_ID]
    logT(mod, fun, `${metaId}`)
    return sendMetadataToPortal(metaId)
      .then((res) => {
        if (res) logI(mod, fun, `'Update request received by the portal for metadata '${metaId}'`)
      })
      .catch((err) => logE(mod, fun, `Sending to portal failed for metadata '${metaId}': ${err}`))
    // logV(mod, fun, `Sent request to portal: ${metaId}`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const searchMetadata = async (req, reply) => {
  const fun = 'searchMetadata'
  try {
    logT(mod, fun, ``)

    let parsedParameters
    try {
      parsedParameters = await parseQueryParameters(OBJ_METADATA, req.url)
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
      QUERY_LIMIT,
      QUERY_OFFSET,
      QUERY_SORT_BY,
      QUERY_FILTER,
      QUERY_FIELDS,
      QUERY_SEARCH_TERMS,
      QUERY_COUNT_BY,
    ])
    const objectList = await searchDbObjects(OBJ_METADATA, options)

    // return the object

    // const context = CallContext.getCallContextFromReq(req)
    // if (context) context.addObjId(objectType, objectId)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const initWithODR = async (req, reply) => {
  const fun = 'massInit'
  try {
    logT(mod, fun, `> ${URL_PREFIX_PUBLIC}/${OBJ_METADATA}/${ACT_INIT}`)

    // await dropDB()

    const initProd = readJsonFile('./data/datarennes_prod.json')
    const initCont = readJsonFile(`./data/datarennes_cont.json`)
    const initData = readJsonFile(`./data/datarennes_meta.json`)

    await initializeLicences()
    // Themes.init('reset')
    // Keywords.init('reset')

    await Promise.all(initProd.map(async (prod) => newOrganization(prod)))
    await Promise.all(initCont.map(async (cont) => newContact(cont)))

    Promise.all(
      initData.map(async (metadata) => {
        logD(mod, fun, metadata[API_METADATA_ID])
        return upsertMetadata(metadata)
      })
    )
      .then(() => logD(mod, fun, '--- Mass initialization done ---'))
      .catch((err) => {
        logE(mod, fun, err)
        const context = CallContext.getCallContextFromReq(req)
        context.logErr(mod, fun, err)
      })
    return 'Initialization initiated'
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -----------------------------------------------------------------------  -------------------------
// Portal accessible controllers
// -------------------------------------------------------------------------------------------------

/**
 * Get single metadata by ID
 * => GET /resources/{id}
 */
export const getSingleMetadata = async (req, reply) => {
  const fun = 'getSingleMetadata'
  logT(mod, fun, `< GET ${URL_PUB_METADATA}/:${PARAM_ID}`)
  try {
    // retrieve url parameters: object id
    const objectId = accessReqParam(req, PARAM_ID)
    // ensure the object exists
    const dbObject = await getEnsuredMetadataWithRudiId(objectId)
    // return the object
    return dbObject
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

/**
 * Reinit themes with stored data values for this field
 */
export const initThemes = async (req, reply) => {
  const fun = 'initThemes'
  try {
    logT(mod, fun, ``)
    const valuesInStoredData = await listThemesInMetadata()
    logD(mod, fun, beautify(valuesInStoredData))
    await Promise.all(
      valuesInStoredData.map((val) => {
        logD(mod, fun, val)
        Themes.isValid(val, true)
      })
    )
    return valuesInStoredData
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(error)
    throw RudiError.treatError(mod, fun, error)
  }
}

export const setFlagIntegrationKO = async (metadata, reportId) => {
  metadata[API_INTEGRATION_ERROR_ID] = reportId
  await metadata.save()
  // metadata = await getObjectWithJson(OBJ_METADATA, metadata)
  // return metadata
}
