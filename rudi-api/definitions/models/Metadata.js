const mod = 'metaSch'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import _ from 'lodash'
import mongoose from 'mongoose'
import GeoJSON from 'mongoose-geojson-schema'
import mongooseInt32 from 'mongoose-int32'
import objectPath from 'object-path'
const { omit } = _
const Int32 = mongooseInt32.loadType(mongoose)

// -------------------------------------------------------------------------------------------------
// Fields
// -------------------------------------------------------------------------------------------------
import {
  DEFAULT_LANG,
  OBJ_METADATA,
  PORTAL_API_VERSION,
  URL_PREFIX_PUBLIC,
} from '../../config/constApi.js'

import {
  API_ACCESS_CONDITION,
  API_COLLECTION_TAG,
  API_CONFIDENTIALITY,
  API_DATA_CONTACTS_PROPERTY,
  API_DATA_DATES_PROPERTY,
  API_DATA_DESCRIPTION_PROPERTY,
  API_DATA_DETAILS_PROPERTY,
  API_DATA_NAME_PROPERTY,
  API_DATA_PRODUCER_PROPERTY,
  API_DATES_CREATED,
  API_DATES_DELETED,
  API_DATES_EDITED,
  API_DATES_EXPIRES,
  API_DATES_PUBLISHED,
  API_DATES_VALIDATED,
  API_END_DATE_PROPERTY,
  API_FILE_MIME,
  API_FILE_STATUS_UPDATE,
  API_FILE_STORAGE_STATUS,
  API_GEO_BBOX_EAST,
  API_GEO_BBOX_NORTH,
  API_GEO_BBOX_PROPERTY,
  API_GEO_BBOX_SOUTH,
  API_GEO_BBOX_WEST,
  API_GEO_GEOJSON_PROPERTY,
  API_GEO_PROJECTION_PROPERTY,
  API_GEOGRAPHY,
  API_INTEGRATION_ERROR_ID,
  API_KEYWORDS_PROPERTY,
  API_LANGUAGES_PROPERTY,
  API_LICENCE,
  API_LICENCE_CUSTOM_LABEL,
  API_LICENCE_CUSTOM_URI,
  API_LICENCE_LABEL,
  API_LICENCE_TYPE,
  API_MEDIA_ID,
  API_MEDIA_PROPERTY,
  API_MEDIA_TYPE,
  API_METADATA_ID,
  API_METADATA_LOCAL_ID,
  API_METAINFO_CONTACTS_PROPERTY,
  API_METAINFO_DATES,
  API_METAINFO_PROPERTY,
  API_METAINFO_PROVIDER_PROPERTY,
  API_METAINFO_SOURCE_PROPERTY,
  API_METAINFO_VERSION_PROPERTY,
  API_PERIOD_PROPERTY,
  API_RESTRICTED_ACCESS,
  API_START_DATE_PROPERTY,
  API_STATUS_PROPERTY,
  API_STORAGE_STATUS,
  API_THEME_PROPERTY,
  DB_CREATED_AT,
  DB_PUBLISHED_AT,
  DB_UPDATED_AT,
  DICT_TEXT,
  FIELDS_TO_SKIP,
  LicenceTypes,
  MetadataStatus,
} from '../../db/dbFields.js'

import { Latitude, Longitude } from '../schemas/GpsCoordinates.js'
import { get as getFileTypes, MIME_YAML, MIME_YAML_ALT } from '../thesaurus/FileTypes.js'

// -------------------------------------------------------------------------------------------------
// Validators
// -------------------------------------------------------------------------------------------------

const validArrayNotNull = {
  validator: isNotEmptyArray,
  message: `'{PATH}' property should not be empty`,
}

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify, isNotEmptyArray, isNothing, multiSplit } from '../../utils/jsUtils.js'

import { logD, logE, logT, logV } from '../../utils/logging.js'

import { makeSearchable } from '../../db/dbActions.js'
import { BadRequestError, NotFoundError, RudiError } from '../../utils/errors.js'
import { accessProperty, requireSubProperty } from '../../utils/jsonAccess.js'
import { incorrectVal, incorrectValueForEnum } from '../../utils/msg.js'

// -------------------------------------------------------------------------------------------------
// Thesaurus definitions
// -------------------------------------------------------------------------------------------------
// logD(mod, 'init', 'Schemas, Models and definitions')
import Keywords from '../thesaurus/Keywords.js'
import Themes from '../thesaurus/Themes.js'

import { isValid as isLanguageValid } from '../thesaurus/Languages.js'
import { get as getLicenceCodes } from '../thesaurus/LicenceCodes.js'
import { isValid as isProjectionValid } from '../thesaurus/Projections.js'
import { isValid as isStorageStatusValid, StorageStatus } from '../thesaurus/StorageStatus.js'

// -------------------------------------------------------------------------------------------------
// Schema definitions
// -------------------------------------------------------------------------------------------------
import { DoiSchema, UuidSchema, UuidV4Schema } from '../schemas/Identifiers.js'

import { AccessConditionSchema } from '../schemas/AccessConditions.js'
import { DictionaryEntrySchema } from '../schemas/DictionaryEntry.js'
import { checkDates, ReferenceDatesSchema } from '../schemas/ReferenceDates.js'

// -------------------------------------------------------------------------------------------------
// Model definitions
// -------------------------------------------------------------------------------------------------
import { isPortalConnectionDisabled } from '../../config/confPortal.js'
import { getApiUrl } from '../../config/confSystem.js'
import { VALID_API_VERSION, VALID_URI } from '../schemaValidators.js'
import { isMediaMissing, MediaTypes } from './Media.js'

// -------------------------------------------------------------------------------------------------
// Fields with specific treatments
// -------------------------------------------------------------------------------------------------
export const METADATA_FIELDS_TO_POPULATE = [
  API_DATA_PRODUCER_PROPERTY,
  API_DATA_CONTACTS_PROPERTY,
  `${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`,
  `${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`,
  API_MEDIA_PROPERTY,
].join(' ')

// const POPULATE_OPTS = {
//   path: METADATA_FIELDS_TO_POPULATE,
//   select: `-${FIELDS_TO_SKIP.concat(API_RESTRICTED_ACCESS).join(' -')}`,
// }

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------
/**
 * For a given Metadata object, Lists the ids of the Media that are not yet stored
 * @param {Object} rudiMetadata JSON that represents a Rudi Metadata
 * @return {Array} The list of media that are still not available
 */
export const listMissingMedia = (rudiMetadata) => {
  const metadataMediaList = rudiMetadata[API_MEDIA_PROPERTY]
  const missingMediaList = []
  metadataMediaList.map((media) => {
    if (media[API_MEDIA_TYPE] === MediaTypes.File && isMediaMissing(media))
      missingMediaList.push(media[API_MEDIA_ID])
  })
  return missingMediaList.length > 0 ? missingMediaList : null
}

export const isEveryMediaAvailable = (rudiMetadata) => {
  const fun = 'isEveryMediaAvailable'
  try {
    logT(mod, fun)

    const metadataMediaList = rudiMetadata[API_MEDIA_PROPERTY]
    let isOneMediaMissing = false
    for (const media of metadataMediaList) {
      if (isMediaMissing(media)) {
        isOneMediaMissing = true
        break
      }
    }
    return !isOneMediaMissing
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Custom schema definitions
// -------------------------------------------------------------------------------------------------
const MetadataSchema = new mongoose.Schema(
  {
    // ---------------------------
    // Resource identifiers
    // ---------------------------

    /** Unique and permanent identifier for the resource in RUDI system (required) */
    [API_METADATA_ID]: UuidV4Schema,

    /** Identifier for the resource in the producer system (optional) */
    [API_METADATA_LOCAL_ID]: {
      type: String,
      trim: true,
      index: {
        unique: true,
        // accept empty values as non-duplicates
        partialFilterExpression: {
          [API_METADATA_LOCAL_ID]: {
            $exists: true,
            $gt: '',
          },
        },
      },
    },

    // Digital Object Identifier for the resource (optional)
    doi: DoiSchema,

    // ---------------------------
    // Dataset description
    // ---------------------------

    /** 'global_id': simple name for the resource */
    [API_DATA_NAME_PROPERTY]: {
      type: String,
      maxlength: 150,
      required: true,
    },

    /** 'synopsis': short description for the whole dataset */
    [API_DATA_DETAILS_PROPERTY]: {
      type: [DictionaryEntrySchema],
      required: true,
      validate: validArrayNotNull,
      _id: false,
    },

    /** 'summary': more precise description for the whole dataset */
    [API_DATA_DESCRIPTION_PROPERTY]: {
      type: [DictionaryEntrySchema],
      required: true,
      validate: validArrayNotNull,
      _id: false,
    },

    /** Context, objectives and final use of the data */
    purpose: {
      type: [DictionaryEntrySchema],
      default: undefined,
      _id: false,
    },

    // ---------------------------
    // Dataset classification
    // ---------------------------

    /** 'theme': Category for thematic classification of the data */
    [API_THEME_PROPERTY]: {
      type: String,
      required: true,
    },

    /** 'keywords': List of tags that can be used to retrieve the data */
    [API_KEYWORDS_PROPERTY]: {
      type: [String],
      required: true,
      validate: validArrayNotNull,
    },

    /** 'collection_tag': Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: {
      type: String,
    },

    /** 'integration_error_id': id of the last integration error report from the portal */
    [API_INTEGRATION_ERROR_ID]: UuidSchema,

    // ---------------------------
    // Involved parties
    // ---------------------------

    /** Entity that produced the resource */
    [API_DATA_PRODUCER_PROPERTY]: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    /** Persons in charge of maintaining the resource */
    [API_DATA_CONTACTS_PROPERTY]: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Contact',
        },
      ],
      required: true,
      validate: validArrayNotNull,
    },

    // ---------------------------
    // Container description
    // ---------------------------

    /** List of files containing the data */
    [API_MEDIA_PROPERTY]: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Media',
        },
      ],
      required: true,
      validate: validArrayNotNull,
    },

    // ---------------------------
    // Dataset info
    // ---------------------------

    /** Language used in the dataset, if relevant */
    [API_LANGUAGES_PROPERTY]: {
      type: [
        {
          type: String,
          // ,enum: Object.values(Languages)
        },
      ],
      default: undefined,
    },

    /** 'temporal_spread': period of time described by the data */
    [API_PERIOD_PROPERTY]: {
      // 'start_date'
      [API_START_DATE_PROPERTY]: {
        type: Date,
        // Custom validation in pre-save hook: required if 'temporal_spread' is defined !
      },
      // 'end_date'
      [API_END_DATE_PROPERTY]: {
        type: Date,
      },
    },

    /**
     * 'geography': Geographic distribution of the data.
     * Particularly relevant in the case of located sensors.
     */
    [API_GEOGRAPHY]: {
      /**
       * 'bounding_box': Geographic distribution of the data as a rectangle.
       * The 4 parameters are given as decimal as described in the norm ISO 6709
       */
      [API_GEO_BBOX_PROPERTY]: {
        type: {
          // Custom validation in pre-save hook: required if 'geography' is defined !

          /** 'west_longitude': Westernmost longitude given as a decimal number */
          [API_GEO_BBOX_WEST]: Longitude,
          /* 'east_longitude': Easternmost longitude given as a decimal number */
          [API_GEO_BBOX_EAST]: Longitude,
          /** 'south_latitude': Southernmost latitude given as a decimal number */
          [API_GEO_BBOX_SOUTH]: Latitude,
          /** 'north_latitude': Northernmost latitude given as a decimal number */
          [API_GEO_BBOX_NORTH]: Latitude,
        },
        _id: false,
        default: undefined,
      },

      /**
       * 'geographic_distribution': Precise geographic distribution of the data
       *
       * Precisions: GeoJSON uses a geographic coordinate reference system,
       * World Geodetic System 1984, and units of decimal degrees.
       * The first two elements are longitude and latitude, or easting and
       * northing, precisely in that order and using decimal numbers.
       * Altitude or elevation MAY be included as an optional third element.
       *
       * Source: https://tools.ietf.org/html/rfc7946#section-3.1.1
       */
      [API_GEO_GEOJSON_PROPERTY]: GeoJSON,

      /**
       * 'projection': Cartographic projection used to describe the data
       */
      [API_GEO_PROJECTION_PROPERTY]: {
        type: String,
        // default: 'WGS 84 (EPSG:4326)',
        // ,enum: Object.values(Projections)
      },

      /**
       * Data topology
       */
      spatial_representation: String,
    },

    /**
     * Indicative total size of the data
     */
    dataset_size: {
      numbers_of_records: {
        type: Int32,
        min: 0,
      },
      number_of_fields: {
        type: Int32,
        min: 0,
      },
    },

    /**
     * 'dataset_dates': Dates of the actions performed on the data (creation, publishing, update, deletion...)
     */
    [API_DATA_DATES_PROPERTY]: ReferenceDatesSchema,

    // Status of the storage of the dataset
    // Metadata can exist without the data
    //   - online = data are published and available
    //   - archived = data are not immediately available, access is not automatic
    //   - unavailable = data were deleted
    [API_STORAGE_STATUS]: {
      type: String,
      enum: Object.values(StorageStatus),
      required: true,
    },

    /**
     * 'access_condition': Access restrictions for the use of data in the form of
     * licence, confidentiality, terms of service, habilitation or required rights,
     * economical model. Default is open licence.
     */
    [API_ACCESS_CONDITION]: AccessConditionSchema,

    /** 'metadata_info': Metadata on the metadata */
    [API_METAINFO_PROPERTY]: {
      /** 'api_version': API version number (used for retro-compatibility) */
      [API_METAINFO_VERSION_PROPERTY]: {
        type: String,
        required: true,
        match: VALID_API_VERSION,
      },

      /** 'metadata_dates': Dates of the actions performed on the metadata (creation, publishing, update...) */
      [API_METAINFO_DATES]: {
        [API_DATES_VALIDATED]: Date,
        [API_DATES_DELETED]: Date,
        [API_DATES_EXPIRES]: Date,
      },

      /** 'metadata_provider': Description of the organization that produced the metadata */
      [API_METAINFO_PROVIDER_PROPERTY]: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
      },

      /** 'metadata_contacts': Addresses to get further information on the metadata */
      [API_METAINFO_CONTACTS_PROPERTY]: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contact',
          },
        ],
        default: undefined,
      },

      /** 'metadata_source': Places where the metadata was created */
      [API_METAINFO_SOURCE_PROPERTY]: {
        type: String,
        match: VALID_URI,
      },
    },

    /** 'publishedAt': Date when the resource has been successfully integrated on Rudi Portal for the first time */
    [DB_PUBLISHED_AT]: Date,

    /** Creation date, made immutable  */
    [DB_CREATED_AT]: {
      type: Date,
      immutable: true,
    },

    /** Metadata status  */
    [API_STATUS_PROPERTY]: {
      type: String,
      enum: Object.values(MetadataStatus),
    },
  },
  {
    id: false,
    strict: true,
    timestamps: true,
    optimisticConcurrency: true,
    useNestedStrict: true,
    toObject: {
      getters: true,
      setters: true,
      virtuals: true,
    },
    toJSON: {
      getters: true,
      setters: true,
      virtuals: true,
    },
  }
)

// -------------------------------------------------------------------------------------------------
// Validation
// -------------------------------------------------------------------------------------------------
// eslint-disable-next-line unused-imports/no-unused-vars
async function checkMetadataSource(metadata) {
  const fun = 'checkMetadataSource'
  try {
    if (!metadata[API_METAINFO_PROPERTY][API_METAINFO_SOURCE_PROPERTY])
      metadata[API_METAINFO_PROPERTY][API_METAINFO_SOURCE_PROPERTY] = getApiUrl(
        `${URL_PREFIX_PUBLIC}/${OBJ_METADATA}/${metadata[API_METADATA_ID]}`
      )
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

MetadataSchema.virtual(API_RESTRICTED_ACCESS).get(function () {
  return this[API_ACCESS_CONDITION]?.[API_CONFIDENTIALITY]?.[API_RESTRICTED_ACCESS]
})

async function checkLicence(metadata) {
  const fun = 'checkLicence'
  try {
    logT(mod, fun)
    const accessCondition = accessProperty(metadata, API_ACCESS_CONDITION)
    const licence = requireSubProperty(metadata, API_ACCESS_CONDITION, API_LICENCE)
    const licenceType = requireSubProperty(accessCondition, API_LICENCE, API_LICENCE_TYPE)

    switch (licenceType) {
      case LicenceTypes.Standard: {
        // logD(mod, fun, `licenceType: ${beautify(licenceType)}`)
        const licenceLabel = requireSubProperty(
          accessCondition,
          API_LICENCE,
          API_LICENCE_LABEL,
          API_LICENCE_TYPE,
          LicenceTypes.Standard
        )
        const listLicenceCode = getLicenceCodes()
        // logD(mod, fun, ` [T] licence list: ${beautify(listLicenceCode)}`)
        if (listLicenceCode.indexOf(licenceLabel) === -1) {
          throw new NotFoundError(
            `Licence label '${licenceLabel}' was not found in licence list '${listLicenceCode}'`
          )
        }

        metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL] = undefined
        // delete metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL]
        return licenceLabel
      }
      case LicenceTypes.Custom: {
        // logD(mod, fun, `licenceType: ${beautify(licenceType)}`)
        requireSubProperty(
          accessCondition,
          API_LICENCE,
          API_LICENCE_CUSTOM_LABEL,
          API_LICENCE_TYPE,
          LicenceTypes.Custom
        )
        requireSubProperty(
          accessCondition,
          API_LICENCE,
          API_LICENCE_CUSTOM_URI,
          API_LICENCE_TYPE,
          LicenceTypes.Custom
        )
        if (typeof customLicenceLabel === 'string') {
          throw new BadRequestError(
            `La propriété '${API_LICENCE_CUSTOM_LABEL}' doit être multilingue`,
            mod,
            fun,
            [API_ACCESS_CONDITION, API_LICENCE, API_LICENCE_CUSTOM_LABEL]
          )
        }
        return licence[API_LICENCE_CUSTOM_LABEL]
      }
      default: {
        const errMsg = incorrectValueForEnum(
          `${API_ACCESS_CONDITION}.${API_LICENCE}.${API_LICENCE_TYPE}`,
          licenceType
        )
        logE(mod, fun, errMsg)
        throw new BadRequestError(errMsg, mod, fun, [
          API_ACCESS_CONDITION,
          API_LICENCE,
          API_LICENCE_TYPE,
        ])
      }
    }
  } catch (err) {
    logD(mod, fun, `metadata: ${beautify(metadata)}`)
    throw RudiError.treatError(mod, fun, err)
  }
}
async function checkFileTypes(metadata) {
  const fun = 'checkFileTypes'
  try {
    logT(mod, fun)
    const medias = metadata[API_MEDIA_PROPERTY]
    medias.map((media, i) => {
      if (media[API_MEDIA_TYPE] !== MediaTypes.File) return

      const [mimeType, encrypted] = /^(.*?)(\+crypt)?$/.exec(media[API_FILE_MIME])
      // Backward compatibility for harvesters
      if (mimeType === MIME_YAML_ALT) {
        media[API_FILE_MIME] = MIME_YAML + encrypted
        return true
      }
      const fileTypes = getFileTypes()
      // logT(mod, fun + ' fileTypes', beautify(fileTypes))
      if (fileTypes.indexOf(mimeType) == -1)
        throw new BadRequestError(`Unrecognized MIME type: '${mimeType}'`, mod, fun, [
          API_MEDIA_PROPERTY,
          i,
          API_FILE_MIME,
        ])
    })
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
async function checkThesaurus(metadata) {
  const fun = 'checkThesaurus'
  try {
    logT(mod, fun)
    if (metadata.init) logD(mod, fun, `init`)
    const shouldInit = metadata[API_COLLECTION_TAG] === 'init'
    const dataTheme = metadata[API_THEME_PROPERTY]
    // const themes = Themes.get()
    const themeLabels = Themes.getLabels(DEFAULT_LANG)
    // logT(mod, fun + ' themeLabels [T]', beautify(themeLabels))
    const themeKeyIndex =
      Object.keys(themeLabels).indexOf(dataTheme) ||
      Object.keys(themeLabels).find((key) => themeLabels[key]?.fr === dataTheme)

    // logT(mod, fun + ' themeLabels [T]', beautify(themeLabels))
    if (themeKeyIndex === -1) {
      // logT(mod, fun + ' themeLabelsVals [T]', beautify(Object.values(themeLabels)))
      const themeValIndex = Object.values(themeLabels).indexOf(dataTheme)
      if (themeValIndex > -1) {
        const allowedDataTheme = Object.keys(themeLabels)[themeValIndex]
        // logD(mod, fun, `Changing Theme value: ${dataTheme} -> ${allowedDataTheme}`)
        metadata[API_THEME_PROPERTY] = allowedDataTheme
      } else if (!(await Themes.isValid(dataTheme, shouldInit))) {
        throw new BadRequestError(
          `${incorrectVal(API_THEME_PROPERTY, dataTheme)}. ` +
            `Allowed: ${beautify(Themes.get())} ` +
            `(metadata ${metadata[API_METADATA_ID]}) `,
          mod,
          fun,
          [API_THEME_PROPERTY]
        )
      }
    }

    const origKeywords = metadata[API_KEYWORDS_PROPERTY]
    const keywords = origKeywords.length === 1 ? multiSplit(origKeywords, [',', ';']) : origKeywords

    logT(mod, fun, `keywords: ${beautify(keywords)}`)

    await Promise.all(
      keywords.map((keyword, index) => {
        keyword = `${keyword}`.trim()
        // logT(mod, fun, `keyword: ${keyword}`)
        Keywords.isValid(keyword, true)
          .then((isKnown) => {
            if (isKnown) {
              metadata[API_KEYWORDS_PROPERTY][index] = keyword
              return true
            } else {
              throw new BadRequestError(
                incorrectVal(API_KEYWORDS_PROPERTY, keyword),
                mod,
                fun[API_KEYWORDS_PROPERTY]
              )
            }
          })
          .catch((err) => {
            // logW(mod, fun, err)
            throw RudiError.treatError(mod, fun, err)
          })
      })
    )

    logT(mod, fun, `languages`)
    const languages = metadata[API_LANGUAGES_PROPERTY]
    if (languages) {
      const langStr = beautify(languages)
      if (langStr === '[]' || langStr === '[null]') {
        delete metadata[API_LANGUAGES_PROPERTY]
      } else {
        await Promise.all(
          languages.map((lang) => {
            if (!isLanguageValid(lang, shouldInit))
              throw new BadRequestError(
                incorrectVal(API_LANGUAGES_PROPERTY, lang) +
                  ` (metadata ${metadata[API_METADATA_ID]})`,
                mod,
                fun,
                [API_LANGUAGES_PROPERTY]
              )
            return true
          })
        )
      }
    }

    logT(mod, fun, `geography`)
    const geography = metadata[API_GEOGRAPHY]
    // logI(mod, fun, `geography: ${beautify(geography)}`)
    if (geography) {
      const projection = geography[API_GEO_PROJECTION_PROPERTY]
      if (projection) {
        if (projection === 'WGS 84') geography[API_GEO_PROJECTION_PROPERTY] = 'WGS 84 (EPSG:4326)'
        else if (!isProjectionValid(projection, shouldInit))
          throw new BadRequestError(
            incorrectVal(`${API_GEOGRAPHY}.${API_GEO_PROJECTION_PROPERTY}`, projection),
            mod,
            fun,
            [API_GEOGRAPHY, API_GEO_PROJECTION_PROPERTY]
          )
      }
    }

    logT(mod, fun, `is storage status valid`)
    if (!isStorageStatusValid(metadata[API_STORAGE_STATUS], shouldInit)) {
      throw new BadRequestError(
        incorrectVal(API_STORAGE_STATUS, metadata[API_STORAGE_STATUS]),
        mod,
        fun,
        [API_STORAGE_STATUS]
      )
    }
    return true
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const reckonMetadataStatus = (metadata) => {
  const fun = 'reckonMetadataStatus'
  logT(mod, fun)
  try {
    if (metadata[API_METAINFO_PROPERTY]?.[API_METAINFO_DATES]?.[API_DATES_DELETED])
      return MetadataStatus.Deleted
    if (metadata[API_STORAGE_STATUS] === StorageStatus.Pending) return MetadataStatus.Incomplete
    if (metadata[API_COLLECTION_TAG] || isPortalConnectionDisabled()) return MetadataStatus.Local
    if (metadata[API_INTEGRATION_ERROR_ID]) return MetadataStatus.Refused
    if (metadata[DB_PUBLISHED_AT]) return MetadataStatus.Published
    if (!isPortalConnectionDisabled()) return MetadataStatus.Sent
    return MetadataStatus.Unset
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const updateMetadataStatus = (metadata) => {
  metadata[API_STATUS_PROPERTY] = reckonMetadataStatus(metadata)
}

export const toRudiPortalJSON = (metadata) => {
  const fun = 'toRudiPortalJSON'
  try {
    const portalReadyMetadata = metadata.toJSON()

    //--- Latest API version
    portalReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_VERSION_PROPERTY] = PORTAL_API_VERSION

    //--- Removing media fields that are node specific
    portalReadyMetadata[API_MEDIA_PROPERTY].forEach((media) => {
      delete media[API_FILE_STORAGE_STATUS]
      delete media[API_FILE_STATUS_UPDATE]

      // delete media[API_MEDIA_THUMBNAIL]
      // delete media[API_MEDIA_SATELLITES]
    })

    //--- Removing metadata fields that are node specific (e.g. virtual properties)
    delete portalReadyMetadata[API_INTEGRATION_ERROR_ID]
    delete portalReadyMetadata[API_STATUS_PROPERTY]
    delete portalReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_SOURCE_PROPERTY]

    return portalReadyMetadata
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const setMetadataStatusToSent = (metadata) => {
  const fun = 'setMetadataStatusToSent'
  try {
    metadata[DB_PUBLISHED_AT] = null // `delete mongooseDocument.field` doesn't work!!!!
    metadata[API_INTEGRATION_ERROR_ID] = null
    metadata[API_STATUS_PROPERTY] = MetadataStatus.Sent
    return MetadataStatus.Sent
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

/**
 * toJSON cleanup
 * @returns the metadata information as a JSON object
 */
MetadataSchema.methods.toJSON = function () {
  logT(mod, 'MetadataSchema.toJSON')
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

/**
 * @returns a RUDI portal compatible metadata as a JSON
 */
MetadataSchema.methods.toRudiPortalJSON = function () {
  logT(mod, 'MetadataSchema.toRudiPortalJSON')
  return toRudiPortalJSON(this)
}

/**
 *
 */
MetadataSchema.methods.setStatusToSent = function () {
  logT(mod, 'MetadataSchema.setStatusToSent')
  return setMetadataStatusToSent(this)
}

// ----- Virtuals
MetadataSchema.virtual(`${API_METAINFO_PROPERTY}.${API_METAINFO_DATES}.${API_DATES_CREATED}`).get(
  function () {
    return this[DB_CREATED_AT]
  }
)
MetadataSchema.virtual(`${API_METAINFO_PROPERTY}.${API_METAINFO_DATES}.${API_DATES_EDITED}`).get(
  function () {
    return this[DB_UPDATED_AT]
  }
)
MetadataSchema.virtual(`${API_METAINFO_PROPERTY}.${API_METAINFO_DATES}.${API_DATES_PUBLISHED}`).get(
  function () {
    return this[DB_PUBLISHED_AT]
  }
)
MetadataSchema.virtual(API_RESTRICTED_ACCESS).set(function (isRestricted) {
  objectPath.set(
    this,
    [API_ACCESS_CONDITION, API_CONFIDENTIALITY, API_RESTRICTED_ACCESS],
    !!isRestricted
  )
})

// -------------------------------------------------------------------------------------------------
// Hooks
// -------------------------------------------------------------------------------------------------
MetadataSchema.pre('save', async function (next) {
  const fun = 'pre save hook'

  try {
    logT(mod, fun)
    const metadata = this
    // logD(mod, fun, metadata[API_GEOGRAPHY])
    // If 'geography' field is defined, the field 'geography.bbox' is required
    if (requireSubProperty(metadata, API_GEOGRAPHY, API_GEO_BBOX_PROPERTY)) {
      if (isNothing(metadata[API_GEOGRAPHY][API_GEO_PROJECTION_PROPERTY])) {
        // If 'geography' field is defined, but 'geography.projection' is not, it is initialized to the default value.
        metadata[API_GEOGRAPHY][API_GEO_PROJECTION_PROPERTY] = 'WGS 84 (EPSG:4326)'
      }
    }

    // If 'temporal_spread' is defined, the field 'start_date' should be defined
    requireSubProperty(metadata, API_PERIOD_PROPERTY, API_START_DATE_PROPERTY)

    try {
      checkDates(metadata[API_PERIOD_PROPERTY], API_START_DATE_PROPERTY, API_END_DATE_PROPERTY)
    } catch (e) {
      throw new BadRequestError(e.message, mod, fun, [API_PERIOD_PROPERTY, API_END_DATE_PROPERTY])
    }
    checkDates(
      metadata[API_DATA_DATES_PROPERTY],
      API_DATES_CREATED,
      API_DATES_EDITED,
      true // If 'dataset_dates.updated' is not defined, it is initialized with 'dataset_dates.created'
    )

    try {
      checkDates(metadata[API_DATA_DATES_PROPERTY], API_DATES_CREATED, API_DATES_PUBLISHED)
    } catch (e) {
      throw new BadRequestError(e.message, mod, fun, [API_DATA_DATES_PROPERTY, API_DATES_PUBLISHED])
    }
    try {
      checkDates(metadata[API_DATA_DATES_PROPERTY], API_DATES_CREATED, API_DATES_VALIDATED)
    } catch (e) {
      throw new BadRequestError(e.message, mod, fun, [API_DATA_DATES_PROPERTY, API_DATES_VALIDATED])
    }
    try {
      checkDates(metadata[API_DATA_DATES_PROPERTY], API_DATES_CREATED, API_DATES_EXPIRES)
    } catch (e) {
      throw new BadRequestError(e.message, mod, fun, [API_DATA_DATES_PROPERTY, API_DATES_EXPIRES])
    }
    try {
      checkDates(
        metadata[API_METAINFO_PROPERTY][API_METAINFO_DATES],
        API_DATES_CREATED,
        API_DATES_EXPIRES
      )
    } catch (e) {
      throw new BadRequestError(e.message, mod, fun, [API_METAINFO_DATES, API_DATES_EXPIRES])
    }

    // Checking 'licence' field
    await checkLicence(metadata)
    await checkThesaurus(metadata)
    await checkFileTypes(metadata)

    // await checkMetadataSource(metadata)
    // await checkMedia(metadata)

    updateMetadataStatus(metadata)

    logT(mod, fun, `pre save checks OK`)
  } catch (err) {
    logV(mod, fun, `pre save checks KO: ${err}`)
    err.message = `${err.message} (metadata ${this[API_METADATA_ID]})`
    // next(err)
    throw RudiError.treatError(mod, fun, err)
  }
  // next()
})

// MetadataSchema.post('save', async function (metadata, next) {
//   const fun = 'post save hook'
//   logT(mod, fun)

//   try {
//     // logI(mod, fun, metadata)
//     // await metadata.populate(POPULATE_OPTS) //.execPopulate()
//     logV(mod, fun, metadata.producer)
//     next()
//   } catch (err) {
//     // next(err)
//     throw RudiError.treatError(mod, fun, err)
//   }
//   // next()
// })

// MetadataSchema.post('find', async function (metadata_list, next) {
//   const fun = 'post find hook'
//   // logT(mod, fun)

//   for (const metadata of metadata_list) {
//     if (!metadata[API_STATUS_PROPERTY]) {
//       // updateMetadataStatus(metadata) // Done in metadata.save()
//       metadata.save().catch((err) => {
//         logE(mod, `${fun}.updateMetadataStatus`, beautify(err))
//         next(err)
//       })
//     }
//   }
//   next()
// })

// -------------------------------------------------------------------------------------------------
// Models definition
// -------------------------------------------------------------------------------------------------
export const Metadata = mongoose.model('Metadata', MetadataSchema)

// Making fields searchable

Metadata.getSearchableFields = () => [
  API_METADATA_ID,
  API_METADATA_LOCAL_ID,
  API_DATA_NAME_PROPERTY,
  `${API_DATA_DETAILS_PROPERTY}.${DICT_TEXT}`,
  `${API_DATA_DESCRIPTION_PROPERTY}.${DICT_TEXT}`,
  API_STATUS_PROPERTY,
]

Metadata.initialize = async () => {
  const fun = 'initMetadata'
  try {
    await makeSearchable(Metadata)
    return `Metadata indexes created`
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * @returns a RUDI portal compatible metadata as a JSON
 */
Metadata.toRudiPortalJSON = function () {
  logT(mod, 'Metadata.toRudiPortalJSON')
  return toRudiPortalJSON(this)
}

/**
 *
 */
Metadata.setStatusToSent = function () {
  logT(mod, 'Metadata.setStatusToSent')
  return setMetadataStatusToSent(this)
}
