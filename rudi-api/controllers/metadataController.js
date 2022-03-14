'use strict'

const mod = 'metaCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the metadata
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { mergeWith, pick } = require('lodash')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const msg = require('../utils/msg')
const {
  beautify,
  deepClone,
  isNotEmptyArray,
  isEmptyArray,
  isNothing,
  isArray,
} = require('../utils/jsUtils')

const db = require('../db/dbQueries')
const json = require('../utils/jsonAccess')
const geo = require('../utils/geo')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
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

  API_GEOGRAPHY_PROPERTY,
  API_GEO_GEOJSON_PROPERTY,
  API_GEO_BBOX_PROPERTY,
  API_GEO_BBOX_WEST,
  API_GEO_BBOX_EAST,
  API_GEO_BBOX_NORTH,
  API_GEO_BBOX_SOUTH,
  API_MEDIA_ID,
  API_COLLECTION_TAG,
  API_PURPOSE,
  API_LANGUAGES_PROPERTY,
  API_DATA_DESCRIPTION_PROPERTY,
  API_DATA_DETAILS_PROPERTY,
  DB_CREATED_AT,
  DB_UPDATED_AT,
} = require('../db/dbFields')

const {
  URL_PREFIX_PUBLIC,
  URL_PUB_METADATA,
  OBJ_METADATA,
  OBJ_MEDIA,
  PARAM_ID,
  ACT_INIT,
  PARAM_THESAURUS_LANG,
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
} = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Data models
// ------------------------------------------------------------------------------------------------

const { Metadata } = require('../definitions/models/Metadata')
const { Media } = require('../definitions/models/Media')

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------
const genericController = require('./genericController')
const organisationController = require('./organizationController')
const contactController = require('./contactController')
const licenceController = require('./licenceController')
const portalController = require('./portalController')
const {
  NotFoundError,
  BadRequestError,
  InternalServerError,
  ParameterExpectedError,
  ObjectNotFoundError,
  RudiError,
} = require('../utils/errors')
const { CallContext } = require('../definitions/constructors/callContext')
const { isPortalConnectionDisabled } = require('../config/confPortal')

// ------------------------------------------------------------------------------------------------
// Atomic treatments of properties: RUDI -> DB
// ------------------------------------------------------------------------------------------------

exports.organizationRudiToDbFormat = async (rudiProducer, shouldCreateIfNotFound) => {
  const fun = 'organizationRudiToDbFormat'
  try {
    log.t(mod, fun, ``)
    if (!rudiProducer) throw new ParameterExpectedError('rudiProducer', mod, fun)

    let organizationDbId = await db.getOrganizationDbIdWithJson(rudiProducer)
    // log.d(mod, fun, `organizationDbId: -> ${organizationDbId} `)

    if (!organizationDbId) {
      if (!shouldCreateIfNotFound) {
        const err = new NotFoundError(msg.organizationNotFound(rudiProducer[API_ORGANIZATION_ID]))
        throw RudiError.treatError(mod, fun, err)
      }
      const newOrg = await organisationController.newOrganization(rudiProducer)
      await newOrg.save()
      log.d(mod, fun, `new Organization: ${beautify(rudiProducer)}`)

      organizationDbId = newOrg[DB_ID]
    }
    // log.d(mod, fun, `${beautify(rudiProducer)} -> ${organizationDbId} `)
    return new mongoose.Types.ObjectId(organizationDbId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.contactListRudiToDbFormat = async (rudiContactList, shouldCreateIfNotFound) => {
  const fun = 'contactListRudiToDbFormat'
  try {
    log.t(mod, fun, ``)
    if (!rudiContactList) throw new ParameterExpectedError('rudiContactList', mod, fun)

    const contactDbIds = []
    await Promise.all(
      rudiContactList.map(async (rudiContact) => {
        let contactDbId
        contactDbId = await db.getContactDbIdWithJson(rudiContact)
        if (!contactDbId) {
          if (!shouldCreateIfNotFound) {
            const err = new NotFoundError(msg.contactNotFound(rudiContact[API_CONTACT_ID]))
            throw RudiError.treatError(mod, fun, err)
          }

          const dbContact = await contactController.newContact(rudiContact)
          dbContact.save()
          log.d(mod, fun, `new Contact: ${beautify(rudiContact)}`)

          contactDbId = dbContact[DB_ID]
        }
        contactDbIds.push(new mongoose.Types.ObjectId(contactDbId))
        // log.d(mod, fun, `${beautify(rudiContact)} -> ${contactDbId}`)
      })
    )
    return contactDbIds
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.mediaListRudiToDbFormat = async (rudiMediaList, shouldCreateIfNotFound) => {
  const fun = 'mediaListRudiToDbFormat'
  try {
    log.t(mod, fun, ``)
    // log.d(mod, fun, `rudiMediaList: ${beautify(rudiMediaList)}`)
    if (!rudiMediaList) throw new ParameterExpectedError('rudiMediaList', mod, fun)

    const mediaDbIds = []
    await Promise.all(
      rudiMediaList.map(async (rudiMedia) => {
        // log.d(mod, fun, `rudiMedia: ${beautify(rudiMedia)}`)
        if (!rudiMedia) throw new BadRequestError(`Parameter 'rudiMedia' should not be null`)
        let mediaDbId = await db.getMediaDbIdWithJson(rudiMedia)

        if (!mediaDbId) {
          if (!shouldCreateIfNotFound)
            throw new ObjectNotFoundError(OBJ_MEDIA, rudiMedia[API_MEDIA_ID])

          // log.d(mod, fun, `rudiMedia[API_MEDIA_TYPE_PROPERTY]: ${beautify(rudiMedia[API_MEDIA_TYPE_PROPERTY])}`)
          const media = new Media(rudiMedia)
          // log.d(mod, fun, `new Media: ${beautify(media)}`)

          // log.d(mod, fun, media)
          // const dbActionResult = await media.save()
          // log.d(mod, fun, `dbActionResult: ${beautify(dbActionResult)}`)
          await media.save()

          mediaDbId = media[DB_ID]
          // log.d(mod, fun, `newly created mediaDbId: ${beautify(mediaDbId)}`)
        } else {
          await db.overwriteObject(OBJ_MEDIA, rudiMedia) // TODO: valider ! Doit-on vraiment mettre un jour un media, ou recréer cette métadonnée ?
        }
        mediaDbIds.push(new mongoose.Types.ObjectId(mediaDbId))
        // log.d(mod, fun, `${beautify(rudiMedia)} -> ${mediaDbId} `)
      })
    )
    return mediaDbIds
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function customMerger(value, srcValue, key) {
  const fun = 'customMerger'
  log.v(mod, fun, `'${key}': ${beautify(srcValue)} -> ${beautify(value)}`)
  if (Array.isArray(srcValue)) return srcValue
  return undefined
}

// Parameter 'dbMetadata' gets mutated!
async function metadataCustomMerge(dbMetadata, dbReadyModMetadata) {
  const fun = 'metadataCustomMerge'
  log.t(mod, fun, ``)
  // log.d(mod, fun, `dbMetadata: ${beautify(dbMetadata)}`)

  //   const dataDates = dbMetadata[API_DATA_DATES_PROPERTY]
  //   const metaDates = dbMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES_PROPERTY]
  //  const modDataDates = dbReadyModMetadata[API_DATA_DATES_PROPERTY]
  //   const modMetaDates = !dbReadyModMetadata[API_METAINFO_PROPERTY]
  //     ? {}
  //     : dbReadyModMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES_PROPERTY]

  //   _.extend(dataDates, modDataDates)
  //   _.extend(metaDates, modMetaDates)

  await mergeWith(dbMetadata, dbReadyModMetadata, customMerger)

  // dbMetadata[API_DATA_DATES_PROPERTY] = dataDates
  // dbMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES_PROPERTY] = metaDates

  // log.d(mod, fun, `dbMetadata updated: ${beautify(dbMetadata)}`)
  return dbMetadata
}

// ------------------------------------------------------------------------------------------------
// Atomic treatments of properties: DB -> RUDI
// ------------------------------------------------------------------------------------------------

exports.organizationDbToRudiFormat = async (producerDbId) => {
  const fun = 'organizationDbToRudiFormat'
  log.t(mod, fun, ``)
  if (!producerDbId) throw new ParameterExpectedError('producerDbId', mod, fun)

  const dbOrganization = await db.getEnsuredOrganizationWithDbId(producerDbId)
  log.d(mod, fun, `dbOrganization -> ${beautify(dbOrganization)}`)
  // const cleanedOrganization = dbRwk.unmongoosify(dbOrganization)
  // log.d(mod, fun, `${producerDbId} -> ${beautify(cleanedOrganization)}`)
  return dbOrganization
}

exports.contactListDbToRudiFormat = async (contactsDbIds) => {
  const fun = 'contactListDbToRudiFormat'
  log.t(mod, fun, ``)
  log.d(mod, fun, `contactsDbIds: ${beautify(contactsDbIds)}`)
  if (!contactsDbIds) throw new ParameterExpectedError('contactsDbIds', mod, fun)

  const contacts = []
  await Promise.all(
    contactsDbIds.map(async (contactDbId) => {
      // log.d(mod, fun, `contactDbId: ${contactDbId}`)
      const contact = await db.getEnsuredContactWithDbId(contactDbId)
      // contacts.push(dbRwk.unmongoosify(contact))
      contacts.push(contact)
      log.d(mod, fun, `${contactDbId} -> ${beautify(contact)}`)
    })
  )
  return contacts
}

exports.mediaListDbToRudiFormat = async (mediaDbIds) => {
  const fun = 'mediaListDbToRudiFormat'
  log.t(mod, fun, ``)
  log.d(mod, fun, `mediaDbIds: ${beautify(mediaDbIds)}`)
  if (!mediaDbIds) throw new ParameterExpectedError('mediaDbIds', mod, fun)

  const mediaList = []
  await Promise.all(
    mediaDbIds.map(async (mediaDbId) => {
      // log.d(mod, fun, `contactDbId: ${contactDbId}`)
      const dbMedia = await db.getEnsuredMediaWithDbId(mediaDbId)
      // contacts.push(dbRwk.unmongoosify(contact))
      mediaList.push(dbMedia)
      log.d(mod, fun, `${mediaDbId} -> ${beautify(dbMedia)}`)
    })
  )
  return mediaList
}

// ------------------------------------------------------------------------------------------------
// Global treatments of properties: RUDI -> DB
// ------------------------------------------------------------------------------------------------

// Flag that sets if organizations, contacts and media should be created
// if they don't already exist in the DB
const SHOULD_CREATE_IF_NOT_FOUND = true

/**
 * Format a RUDI Metadata document (JSON):
 * @param rudiMetadata: the RUDI Metadata JSON object
 * @param shouldBeStrict: if required fields presence should be ensured (e.g. true for creation, false for update)
 * @param shouldClone: if original metadata should be cloned (=== no more a db object)
 */
exports.rudiToDbFormat = async (rudiMetadata, shouldBeStrict, shouldClone) => {
  const fun = 'rudiToDbFormat'
  log.t(mod, fun, ``)

  if (!rudiMetadata) throw new InternalServerError(msg.parameterExpected(fun, 'rudiMetadata'))

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
      producer = json.accessProperty(dbReadyMetadata, API_DATA_PRODUCER_PROPERTY)
    } else {
      producer = dbReadyMetadata[API_DATA_PRODUCER_PROPERTY]
    }
    if (producer) {
      dbReadyMetadata[API_DATA_PRODUCER_PROPERTY] = await this.organizationRudiToDbFormat(
        producer,
        SHOULD_CREATE_IF_NOT_FOUND
      )
    }

    // ----- Updating contacts field with db instead of incoming data
    // TODO[VALIDATE]: The contact info already in database is not updated with possible new data,
    //                 and only the contact RUDI id is really necessary in the request body
    let contacts
    if (shouldBeStrict) {
      contacts = json.accessProperty(dbReadyMetadata, API_DATA_CONTACTS_PROPERTY)
      if (!isNotEmptyArray(contacts))
        throw new BadRequestError(
          `${msg.missingObjectProperty(dbReadyMetadata, API_DATA_CONTACTS_PROPERTY)}`
        )
    } else {
      contacts = dbReadyMetadata[API_DATA_CONTACTS_PROPERTY]
    }
    if (isNotEmptyArray(contacts)) {
      dbReadyMetadata[API_DATA_CONTACTS_PROPERTY] = await this.contactListRudiToDbFormat(
        contacts,
        SHOULD_CREATE_IF_NOT_FOUND
      )
    }

    // ----- Updating media field with db instead of incoming data
    // TODO[VALIDATE]: The contact info already in database is not updated with possible new data,
    //                 and only the contact RUDI id is really necessary in the request body
    let mediaList
    if (shouldBeStrict) {
      mediaList = json.accessProperty(dbReadyMetadata, API_MEDIA_PROPERTY)
      if (!isNotEmptyArray(mediaList))
        throw new BadRequestError(
          `${msg.missingObjectProperty(dbReadyMetadata, API_MEDIA_PROPERTY)}`
        )
    } else {
      mediaList = dbReadyMetadata[API_MEDIA_PROPERTY]
    }
    // log.d(mod, fun, `mediaList: ${beautify(mediaList)}`)
    if (isNotEmptyArray(mediaList)) {
      dbReadyMetadata[API_MEDIA_PROPERTY] = await this.mediaListRudiToDbFormat(
        mediaList,
        SHOULD_CREATE_IF_NOT_FOUND
      )
    }
    // log.d(mod, fun, `media list: ${beautify(dbReadyMetadata[API_MEDIA_PROPERTY])}`)

    // ----- Updating metadataInfo.metadata_provider field (same as above producer organization) with db instead of incoming data
    // TODO[VALIDATE]: The organization info already in database is not updated with possible new data,
    //                 and only the contact RUDI id is really necessary in the request body
    let metaInfo
    if (shouldBeStrict) {
      metaInfo = json.accessProperty(dbReadyMetadata, API_METAINFO_PROPERTY)
    } else {
      metaInfo = dbReadyMetadata[API_METAINFO_PROPERTY]
    }
    if (metaInfo) {
      // following fields are not required, so 'shouldBeStrict is irrelevant
      const metaInfoProvider = metaInfo[API_METAINFO_PROVIDER_PROPERTY]
      if (metaInfoProvider) {
        dbReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_PROVIDER_PROPERTY] =
          await this.organizationRudiToDbFormat(metaInfoProvider, SHOULD_CREATE_IF_NOT_FOUND)
      }

      const metaInfoContacts = metaInfo[API_METAINFO_CONTACTS_PROPERTY]
      if (isNotEmptyArray(metaInfoContacts)) {
        dbReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_CONTACTS_PROPERTY] =
          await this.contactListRudiToDbFormat(metaInfoContacts, SHOULD_CREATE_IF_NOT_FOUND)
      }
    }

    if (isEmptyArray(dbReadyMetadata[API_PURPOSE])) {
      delete dbReadyMetadata[API_PURPOSE]
    }
    const langStr = beautify(dbReadyMetadata[API_LANGUAGES_PROPERTY])
    // log.d(mod, fun, `langStr: ${langStr}`)
    if (langStr === '[]' || langStr === '[null]') {
      log.d(mod, fun, `removing lang field: ${langStr}`)
      delete dbReadyMetadata[API_LANGUAGES_PROPERTY]
    }
    this.setGeography(dbReadyMetadata)

    // ----- Updating Dictionary entries (MongoDB doesn't accept all RUDI languages)
    toMDBLanguage(dbReadyMetadata, API_DATA_DETAILS_PROPERTY)
    toMDBLanguage(dbReadyMetadata, API_DATA_DESCRIPTION_PROPERTY)

    stripTimestamps(dbReadyMetadata)
    // log.d(mod, fun, `dbReadyMetadata: ${beautify(dbReadyMetadata, 2)}`)
    return dbReadyMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
function stripTimestamps(metadata) {
  const fun = 'stripTimestamps'
  try {
    log.t(mod, fun, ``)
    metadata[DB_CREATED_AT] = undefined
    metadata[DB_UPDATED_AT] = undefined
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
function toMDBLanguage(metadata, field) {
  const fun = 'toMDBLanguage'
  try {
    log.t(mod, fun, ``)
    const prop = metadata[field]
    if (!isArray(prop)) {
      log.w(mod, fun, `Field '${field}' should be an array: ${beautify(prop)}`)
      return
    }
    prop.map((entry) => {
      if (entry[PARAM_THESAURUS_LANG])
        entry[PARAM_THESAURUS_LANG] = entry[PARAM_THESAURUS_LANG].substring(0, 2)
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
exports.setGeography = (metadata) => {
  const fun = 'setGeography'
  // log.t(mod, fun, ``)
  const geography = metadata[API_GEOGRAPHY_PROPERTY]
  if (isNothing(geography)) {
    // No 'geography' property => exit
    // log.d(mod, fun, `No '${API_GEOGRAPHY_PROPERTY}' property was set`)
    return
  }

  const bbox = geography[API_GEO_BBOX_PROPERTY]
  const geojson = geography[API_GEO_GEOJSON_PROPERTY]
  // log.d(mod, fun, `bbox: ${beautify(bbox)}`)
  // log.d(mod, fun, `geojson: ${beautify(geojson)}`)

  if (isNothing(bbox)) {
    // No 'bounding_box' property
    // log.d(mod, fun, `No '${API_GEO_BBOX_PROPERTY}' property was set`)
    if (isNothing(geojson)) {
      // No 'bounding_box' property nor GeoJSON => problem
      // log.d(mod, fun, `No '${API_GEO_GEOJSON_PROPERTY}' property was set`)
      // No geographic information
      // TODO: (If shouldBeStrict: error => bbox is mandatory if 'geography' is set!)
      return
    } else {
      // log.d(mod, fun, `'${API_GEO_GEOJSON_PROPERTY}' property already set`)
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

    log.d(mod, fun, msg)
    // log.d(mod, fun, `'${API_GEO_BBOX_PROPERTY}' = ${beautify(bbox)}`)
    // log.d(mod, fun, `'${API_GEO_GEOJSON_PROPERTY}' = ${beautify(geojson)}`)

    // TODO: check that 'geographic_distribution' property is a valid GeoJSON
    // TODO: set bbox property if not set
    // TODO: check that bbox subproperty is coherent with 'geography.bounding_box' coordinates
    return
  }

  // log.d(mod, fun, `Extracting '${API_GEO_GEOJSON_PROPERTY}' from '${API_GEO_BBOX_PROPERTY}'`)

  // No GeoJSON but 'bounding_box' property is set => extract GeoJSON from bbox property

  // BboxToJson =
  //      1. extract 'geography.bounding_box' properties
  //      2. Create a GeoJSON Polygon with 'bbox' property
  //      3. set 'geography.geographic_distribution' property

  const west = bbox[API_GEO_BBOX_WEST]
  const south = bbox[API_GEO_BBOX_SOUTH]
  const east = bbox[API_GEO_BBOX_EAST]
  const north = bbox[API_GEO_BBOX_NORTH]

  metadata[API_GEOGRAPHY_PROPERTY][API_GEO_GEOJSON_PROPERTY] = geo.bboxToGeoJsonPolygon(
    west,
    south,
    east,
    north
  )
}

// ------------------------------------------------------------------------------------------------
// High level actions
// ------------------------------------------------------------------------------------------------
exports.upsertMetadata = async (rudiMetadata) => {
  const fun = 'upsertMetadata'
  log.t(mod, fun, ``)
  try {
    const rudiId = json.accessProperty(rudiMetadata, API_METADATA_ID)
    const existsMetadata = await db.doesObjectExistWithRudiId(OBJ_METADATA, rudiId)

    if (!existsMetadata) {
      return await this.newMetadata(rudiMetadata)
    } else {
      return await this.overwriteMetadata(rudiMetadata)
    }
  } catch (err) {
    const error = new Error(err.message + ` (metadata: ${rudiMetadata[API_METADATA_ID]})`)
    throw RudiError.treatError(mod, fun, error)
  }
}
exports.newMetadata = async (rudiMetadata) => {
  const fun = 'newMetadata'
  try {
    log.t(mod, fun, ``)
    // log.d(mod, fun, `incoming object: ${beautify(rudiMetadata)}`)
    if (!rudiMetadata) throw new ParameterExpectedError('rudiMetadata', mod, fun)

    // Special treatment!
    const dbReadyObject = await this.rudiToDbFormat(rudiMetadata, true)
    // log.d(mod, fun, `dbReadyObject: ${beautify(dbReadyObject)}`)

    // Special update for metadataInfo.referenceDates: update 'createdDate'
    const rudiId = dbReadyObject[API_METADATA_ID]
    log.i(mod, fun, `dbReadyObject: ${beautify(dbReadyObject[API_METADATA_ID])}`)
    let dbMetadata
    try {
      dbMetadata = await new Metadata(dbReadyObject)
      log.v(mod, fun, `dbMetadata: ${beautify(dbMetadata[API_METADATA_ID])}`)
      await dbMetadata.save()
    } catch (err) {
      // const errMsg = `New object '${OBJ_METADATA}': ${rudiId} | Error: ${err}`
      // const error = new Error(errMsg)
      // log.d(mod, fun, beautify(err))
      throw RudiError.treatError(mod, fun, err)
    }
    // try {
    //   await dbMetadata.save()
    // } catch (err) {
    //   // const errMsg = `Error while saving object '${OBJ_METADATA}' (${rudiId}): ${err}`
    //   log.d(mod, fun, beautify(err))
    //   log.d(mod, fun, beautify(err.name))
    //   throw RudiError.treatError(mod, fun + ' save', err)
    // if (err.name === 'ValidationError') throw new BadRequestError(err, mod, fun)
    //   else throw RudiError.treatError(mod, fun + ' save', err)
    // }
    // log.d(mod, fun, `dbMetadata: ${beautify(dbMetadata)}`)

    this.sendToPortal(dbMetadata)
      .catch((err) => log.e(mod, fun, `Sending to portal failed for metadata '${rudiId}': ${err}`))
      .then((reply) =>
        reply
          ? log.i(mod, fun, `Creation request received by the portal for metadata '${rudiId}'`)
          : log.d(mod, fun, `Not sending to portal: ${rudiId} (${dbMetadata[API_COLLECTION_TAG]})`)
      )

    return dbMetadata
    // return this.dbMetadataToRudi(dbMetadata)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// parameter incomingRudiMetadata can't be partial metadata!
exports.overwriteMetadata = async (incomingRudiMetadata) => {
  const fun = 'overwriteMetadata'
  try {
    log.t(mod, fun, ``)

    if (!incomingRudiMetadata) throw new ParameterExpectedError('incomingRudiMetadata', mod, fun)
    // log.d(mod, fun, `edited metadata: ${beautify(incomingRudiMetadata)}\n`)

    // ensure the metadata already exist
    const rudiId = json.accessProperty(incomingRudiMetadata, API_METADATA_ID)
    // log.d(mod, fun, `incomingRudiMetadata: ${beautify(incomingRudiMetadata)}`)

    const dbReadyEditedMetadata = await this.rudiToDbFormat(incomingRudiMetadata, true)
    // log.d(mod, fun, `dbReadyEditedMetadata: ${beautify(dbReadyEditedMetadata)}`)
    const dbMetadata = await db.overwriteObject(OBJ_METADATA, dbReadyEditedMetadata)
    // log.d(mod, fun, `dbMetadata: ${beautify(dbMetadata)}`)
    // const reply = await dbMetadata.save()
    // log.d(mod, fun, `reply: ${beautify(reply)}`)
    // log.d(mod, fun, `reply: ${beautify(reply.contacts[0])}`)

    this.sendToPortal(dbMetadata)
      .catch((err) => log.e(mod, fun, `Sending to portal failed for metadata '${rudiId}': ${err}`))
      .then((res) => {
        if (res) log.i(mod, fun, `'Update request received by the portal for metadata '${rudiId}'`)
      })

    return dbMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// parameter incomingRudiMetadata can be partial metadata
// (obsolete)
exports.updateMetadata = async (incomingRudiMetadata) => {
  const fun = 'updateMetadata'
  try {
    log.t(mod, fun, ``)

    if (!incomingRudiMetadata) throw new ParameterExpectedError('incomingRudiMetadata', mod, fun)
    // log.d(mod, fun, `edited metadata: ${beautify(incomingRudiMetadata)}\n`)

    // ensure the metadata already exist
    const rudiId = json.accessProperty(incomingRudiMetadata, API_METADATA_ID)
    // // let dbMetadata = await db.getEnsuredMetadataWithRudiId(rudiId) // No => no populate please !
    const dbMetadata = await db.getEnsuredObjectWithRudiId(OBJ_METADATA, rudiId)
    // log.v(mod, fun, `corresponding db object: ${beautify(dbMetadata)}\n`)

    const dbReadyEditedMetadata = await this.rudiToDbFormat(incomingRudiMetadata)
    // log.v(mod, fun, `dbReadyEditedMetadata: ${beautify(dbReadyEditedMetadata)}\n`)

    // Backing up existing dates ('dataset_dates' and 'metadata_info.meadatada_dates' properties)

    await metadataCustomMerge(dbMetadata, dbReadyEditedMetadata)
    // log.d(mod, fun, `modified metadata: ${beautify(dbMetadata)}`)

    const reply = await dbMetadata.save()
    // log.d(mod, fun, `metadata saved: ${beautify(reply)}`)
    this.sendToPortal(dbMetadata)
      .catch((err) => log.e(mod, fun, `Sending to portal failed for metadata '${rudiId}': ${err}`))
      .then(() =>
        log.i(mod, fun, `'Update request received by the portal for metadata '${rudiId}'`)
      )

    return reply
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.sendManyMetadataToPortal = async (req) => {
  const fun = 'sendAllMetadataToPortal'
  try {
    log.t(mod, fun, ``)
    const listIds = req.body

    if (!!listIds && !isArray(listIds)) {
      throw new BadRequestError(
        'The body of the request should be empty (to send every metadata) or a list of ids',
        mod,
        fun
      )
    }

    if (!listIds || isEmptyArray(listIds)) {
      log.d(mod, fun, 'Getting the list of metadata ids')
      let metadataListAndCount = await db.getObjectListAndCount(OBJ_METADATA, {
        [QUERY_FIELDS]: [API_METADATA_ID],
      })
      const metadataCount = metadataListAndCount[COUNT_LABEL]
      let metadataList = metadataListAndCount[LIST_LABEL]
      const currentCount = metadataList ? metadataList.length : 0

      if (currentCount < metadataCount) {
        log.d(mod, fun, 'Getting the whole list of metadata ids')
        metadataListAndCount = await db.getObjectListAndCount(OBJ_METADATA, {
          [QUERY_FIELDS]: [API_METADATA_ID],
          [QUERY_LIMIT]: metadataCount,
        })
        metadataList = metadataListAndCount[LIST_LABEL]
      }
      for (const meta of metadataList) {
        const id = meta[API_METADATA_ID]
        portalController.sendMetadataToPortal(id)
      }
    } else {
      // We have a list of ids
      for (const id of listIds) {
        portalController.sendMetadataToPortal(id)
      }
    }
    return 'Sending metadata to portal'
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.sendToPortal = async (metadata) => {
  const fun = 'sendToPortal'
  try {
    if (isPortalConnectionDisabled()) return

    // If 'collection_tag' property is set, we don't send the metadata to the Portal
    const metadataId = metadata[API_METADATA_ID]
    const collectionTag = metadata[API_COLLECTION_TAG]
    if (collectionTag) {
      log.d(mod, fun, `Not sending to portal: ${metadataId} (${collectionTag})`)
      // log.d(mod, fun, beautify(metadata))
      return
    }

    return await portalController.sendMetadataToPortal(metadataId)
    log.v(mod, fun, `Sent to portal: ${metadataId}`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.searchMetadata = async (req, reply) => {
  const fun = 'searchMetadata'
  try {
    let parsedParameters
    try {
      parsedParameters = await genericController.parseQueryParameters(OBJ_METADATA, req.url)
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
    const objectList = await db.searchObjects(OBJ_METADATA, options)

    // return the object

    // const context = CallContext.getCallContextFromReq(req)
    // if (context) context.addObjId(objectType, objectId)

    return objectList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.initWithODR = async (req, reply) => {
  const fun = 'massInit'
  try {
    log.v(mod, fun, `> ${URL_PREFIX_PUBLIC}/${OBJ_METADATA}/${ACT_INIT}`)

    // await db.dropDB()

    const initProd = require(`../data/datarennes_prod.json`)
    const initCont = require(`../data/datarennes_cont.json`)
    const initData = require(`../data/datarennes_meta.json`)

    await licenceController.initLicences()
    // Themes.init('reset')
    // Keywords.init('reset')

    await Promise.all(
      initProd.map(async (prod) => {
        if (!(await db.getOrganizationWithJson(prod)))
          await organisationController.newOrganization(prod)
      })
    )

    await Promise.all(
      initCont.map(async (cont) => {
        if (!(await db.getContactWithJson(cont))) await contactController.newContact(cont)
      })
    )

    Promise.all(
      initData.map(async (metadata) => {
        log.d(mod, fun, metadata[API_METADATA_ID])
        return this.upsertMetadata(metadata)
      })
    )
      .catch((err) => {
        log.e(mod, fun, err)
        const context = CallContext.getCallContextFromReq(req)
        context.logErr(mod, fun, err)
      })
      .then(() => log.d(mod, fun, '--- Mass initialization done ---'))
    return 'Initialization initiated'
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -----------------------------------------------------------------------  -------------------------
// Portal accessible controllers
// ------------------------------------------------------------------------------------------------

/**
 * Get single metadata by ID
 * => GET /resources/{id}
 */
exports.getSingleMetadata = async (req, reply) => {
  const fun = 'getSingleMetadata'
  log.t(mod, fun, `< GET ${URL_PUB_METADATA}/:${PARAM_ID}`)
  try {
    // retrieve url parameters: object id
    const objectId = json.accessReqParam(req, PARAM_ID)
    // ensure the object exists
    const dbObject = await db.getEnsuredMetadataWithRudiId(objectId)
    // return the object
    return dbObject
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

/**
 * Get several metadata
 * => GET /resources
 */
exports.getMetadataList = async (req, reply) => {
  const fun = 'getMetadataList'
  log.t(mod, fun, `< GET ${URL_PUB_METADATA}`)
  try {
    return await genericController.getManyObjects(OBJ_METADATA, req, reply)
  } catch (err) {
    const error = err.name === MONGO_ERROR ? new BadRequestError(err) : new NotFoundError(error)
    throw RudiError.treatError(mod, fun, error)
  }
}
