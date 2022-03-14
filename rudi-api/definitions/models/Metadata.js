'use strict'

const mod = 'metaSch'
// ------------------------------------------------------------------------------------------------
// External dependencies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const { omit } = require('lodash')

// eslint-disable-next-line no-unused-vars
const GeoJSON = require('mongoose-geojson-schema')
const Int32 = require('mongoose-int32')

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const msg = require('../../utils/msg')
const json = require('../../utils/jsonAccess')
const utils = require('../../utils/jsUtils')

const Validation = require('../schemaValidators')
const { NotFoundError, BadRequestError, RudiError } = require('../../utils/errors')
const { makeSearchable } = require('../../db/dbActions')

// ------------------------------------------------------------------------------------------------
// Thesaurus definiitons
// ------------------------------------------------------------------------------------------------
// log.d(mod, 'init', 'Schemas, Models and definitions')
const Keywords = require('../thesaurus/Keywords')
const Themes = require('../thesaurus/Themes')

const Languages = require('../thesaurus/Languages')
const Projections = require('../thesaurus/Projections')
const StorageStatus = require('../thesaurus/StorageStatus')
// ------------------------------------------------------------------------------------------------
// Schema definitions
// ------------------------------------------------------------------------------------------------
const { DOI, UUIDv4 } = require('../schemas/Identifiers')

const DictionaryEntry = require('../schemas/DictionaryEntry')
const ReferenceDates = require('../schemas/ReferenceDates')

// ------------------------------------------------------------------------------------------------
// Model definitions
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Other controllers
// ------------------------------------------------------------------------------------------------
const licenceController = require('../../controllers/licenceController')

// ------------------------------------------------------------------------------------------------
// Validators
// ------------------------------------------------------------------------------------------------
const validArrayNotNull = {
  validator: utils.isNotEmptyArray,
  message: `'{PATH}' property should not be empty`,
}
const validObjectNotEmpty = {
  validator: utils.isNotEmptyObject,
  message: `'{PATH}' property should not be empty`,
}

// ------------------------------------------------------------------------------------------------
// Fields
// ------------------------------------------------------------------------------------------------
const { DEFAULT_LANG } = require('../../config/confApi')

const {
  API_DATA_PRODUCER_PROPERTY,
  API_DATA_CONTACTS_PROPERTY,

  API_ACCESS_CONDITION,
  API_LICENCE,
  API_LICENCE_TYPE,
  API_LICENCE_LABEL,
  API_LICENCE_CUSTOM_LABEL,
  API_LICENCE_CUSTOM_URI,

  API_GEOGRAPHY_PROPERTY,
  API_GEO_BBOX_PROPERTY,
  API_GEO_PROJECTION_PROPERTY,
  API_PERIOD_PROPERTY,
  API_START_DATE_PROPERTY,

  API_METAINFO_PROPERTY,
  API_METAINFO_CONTACTS_PROPERTY,
  API_METAINFO_PROVIDER_PROPERTY,
  API_METAINFO_DATES_PROPERTY,

  API_DATES_CREATED_PROPERTY,
  API_DATES_EDITED_PROPERTY,
  API_DATES_PUBLISHED_PROPERTY,

  API_MEDIA_PROPERTY,

  FIELDS_TO_SKIP,
  API_DATA_DATES_PROPERTY,
  API_THEME_PROPERTY,
  API_KEYWORDS_PROPERTY,
  API_LANGUAGES_PROPERTY,
  API_COLLECTION_TAG,
  API_END_DATE_PROPERTY,
  API_METADATA_ID,
  API_DATA_NAME_PROPERTY,
  API_METADATA_LOCAL_ID,
  DB_CREATED_AT,
  DB_UPDATED_AT,
  DB_PUBLISHED_AT,
  API_DATA_DETAILS_PROPERTY,
  API_DATA_DESCRIPTION_PROPERTY,
  API_GEO_BBOX_WEST,
  API_GEO_BBOX_EAST,
  API_GEO_BBOX_SOUTH,
  API_GEO_BBOX_NORTH,
  API_GEO_GEOJSON_PROPERTY,
  API_METAINFO_VERSION_PROPERTY,
  LicenceTypes,
} = require('../../db/dbFields')

// ------------------------------------------------------------------------------------------------
// Fields with specific treatments
// ------------------------------------------------------------------------------------------------
const METADATA_FIELDS_TO_POPULATE = [
  API_DATA_PRODUCER_PROPERTY,
  API_DATA_CONTACTS_PROPERTY,
  `${API_METAINFO_PROPERTY}.${API_METAINFO_PROVIDER_PROPERTY}`,
  `${API_METAINFO_PROPERTY}.${API_METAINFO_CONTACTS_PROPERTY}`,
  API_MEDIA_PROPERTY,
].join(' ')

const SKIP_FIELDS = `-${FIELDS_TO_SKIP.join(' -')}`

const POPULATE_OPTS = {
  path: METADATA_FIELDS_TO_POPULATE,
  select: SKIP_FIELDS,
}

// ------------------------------------------------------------------------------------------------
// Custom schema definitions
// ------------------------------------------------------------------------------------------------
const MetadataSchema = new mongoose.Schema(
  {
    // ---------------------------
    // Resource identifiers
    // ---------------------------

    /** Unique and permanent identifier for the ressource in RUDI system (required) */
    [API_METADATA_ID]: UUIDv4,

    /** Identifier for the ressource in the producer system (optional) */
    [API_METADATA_LOCAL_ID]: {
      type: String,
      trim: true,
      index: {
        unique: true,
        // accept empty values as non-duplicates
        partialFilterExpression: {
          [API_METADATA_LOCAL_ID]: {
            $type: 'string',
          },
        },
      },
    },

    // Digital Object Identifier for the ressource (optional)
    doi: DOI,

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
      type: [DictionaryEntry],
      required: true,
      validate: validArrayNotNull,
    },

    /** 'summary': more precise description for the whole dataset */
    [API_DATA_DESCRIPTION_PROPERTY]: {
      type: [DictionaryEntry],
      required: true,
      validate: validArrayNotNull,
    },

    /** Context, objectives and final use of the data */
    purpose: {
      type: [DictionaryEntry],
      default: undefined,
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
    [API_GEOGRAPHY_PROPERTY]: {
      /**
       * 'bounding_box': Geographic distribution of the data as a rectangle.
       * The 4 parameters are given as decimal as described in the norm ISO 6709
       */
      [API_GEO_BBOX_PROPERTY]: {
        type: Object,
        // Custom validation in pre-save hook: required if 'geography' is defined !

        /** 'west_longitude': Westernmost latitude given as a decimal number */
        [API_GEO_BBOX_WEST]: {
          type: Number,
          min: -180,
          max: 180,
        },
        /* 'east_longitude': Easternmost latitude given as a decimal number */
        [API_GEO_BBOX_EAST]: {
          type: Number,
          min: -180,
          max: 180,
        },
        /** 'south_latitude': Southernmost latitude given as a decimal number */
        [API_GEO_BBOX_SOUTH]: {
          type: Number,
          min: -90,
          max: 90,
        },
        /** 'north_latitude': Northernmost latitude given as a decimal number */
        [API_GEO_BBOX_NORTH]: {
          type: Number,
          min: -90,
          max: 90,
        },
      },

      /**
       * 'geographic_distribution': Precise geographic distribution of the data
       *
       * Précisions: GeoJSON uses a geographic coordinate reference system,
       * World Geodetic System 1984, and units of decimal degrees.
       * The first two elements are longitude and latitude, or easting and
       * northing, precisely in that order and using decimal numbers.
       * Altitude or elevation MAY be included as an optional third element.
       *
       * Source: https://tools.ietf.org/html/rfc7946#section-3.1.1
       */
      [API_GEO_GEOJSON_PROPERTY]: {
        type: GeoJSON,
      },

      /**
       * 'projection': Cartographic projection used to describe the data
       */
      [API_GEO_PROJECTION_PROPERTY]: {
        type: String,
        // ,enum: Object.values(Projections)
        // default: 'WGS 84'
      },

      /**
       * Data topology
       */
      spatial_representation: {
        type: String,
      },
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
    [API_DATA_DATES_PROPERTY]: {
      type: ReferenceDates,
      required: true,
    },

    // Status of the storage of the dataset
    // Metadata can exist without the data
    //   - online = data are published and available
    //   - archived = data are not immediately available, access is not automatic
    //   - unavailable = data were deleted
    storage_status: {
      type: String,
      // enum: Object.values(StorageStatus),
      required: true,
    },

    /**
     * 'access_condition': Access restrictions for the use of data in the form of
     * licence, confidentiality, terms of service, habilitation or required rights,
     * economical model. Default is open licence.
     */
    [API_ACCESS_CONDITION]: {
      _id: false,
      required: true,
      validate: validObjectNotEmpty,
      type: {
        /** Restriction level for the resource */
        confidentiality: {
          /**
           * True if the dataset has a restricted access.
           * False for open data
           * */
          restricted_access: {
            type: Boolean,
            default: false,
          },

          /** True if the dataset embeds personal data */
          gdpr_sensitive: {
            type: Boolean,
            default: false,
          },
        },

        /**
         * 'licence': Standard licence (recognized by RUDI system)
         */
        [API_LICENCE]: {
          required: true,
          _id: false,
          type: {
            /** Enum to differenciate standard from custom licence */
            [API_LICENCE_TYPE]: {
              type: String,
              enum: Object.values(LicenceTypes),
              required: true,
            },

            /** Standard licence (recognized by RUDI system): label of the licence = concept code */
            [API_LICENCE_LABEL]: {
              type: String,
              default: undefined,
            },

            /** Custom licence: Title of the custom licence */
            [API_LICENCE_CUSTOM_LABEL]: {
              type: [DictionaryEntry],
              default: undefined,
            },

            /** Custom licence: Informative URL towards the custom licence */
            [API_LICENCE_CUSTOM_URI]: {
              type: String,
              match: Validation.VALID_URI,
              index: {
                unique: true,
                // accept empty values as non-duplicates
                partialFilterExpression: {
                  [API_LICENCE_CUSTOM_URI]: {
                    $type: 'string',
                  },
                },
              },
            },
          },
        },

        /** Describes how constrained is the use of the resource */
        usage_constraint: {
          type: [DictionaryEntry],
          default: undefined,
        },

        /** Information that MUST be cited every time the data is used */
        bibliographical_reference: {
          type: [DictionaryEntry],
          default: undefined,
        },

        /**
         * Mention that must be cited verbatim in every publication that
         * makes use of the data
         */
        mandatory_mention: {
          type: [DictionaryEntry],
          default: undefined,
        },

        access_constraint: {
          type: [DictionaryEntry],
          default: undefined,
        },

        other_constraints: {
          type: [DictionaryEntry],
          default: undefined,
        },
      },
    },

    /** 'metadata_info': Metadata on the metadata */
    [API_METAINFO_PROPERTY]: {
      /** 'api_version': API version number (used for retro-compatibility) */
      [API_METAINFO_VERSION_PROPERTY]: {
        type: String,
        required: true,
        match: Validation.VALID_API_VERSION,
      },

      /** 'metadata_dates': Dates of the actions performed on the metadata (creation, publishing, update...) */
      [API_METAINFO_DATES_PROPERTY]: {
        validated: {
          type: Date,
        },
        deleted: {
          type: Date,
        },
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
    },

    /** 'publishedAt': Date when the resource has been successfully integrated on Rudi Portal for the first time */
    [DB_PUBLISHED_AT]: {
      type: Date,
    },
    /** Creation date, made immutable  */
    [DB_CREATED_AT]: {
      type: Date,
      immutable: true,
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

// ------------------------------------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------------------------------------
async function checkLicence(metadata) {
  const fun = 'checkLicence'
  try {
    log.t(mod, fun, ``)
    const accessCondition = json.accessProperty(metadata, API_ACCESS_CONDITION)
    const licence = json.requireSubProperty(metadata, API_ACCESS_CONDITION, API_LICENCE)
    const licenceType = json.requireSubProperty(accessCondition, API_LICENCE, API_LICENCE_TYPE)

    switch (licenceType) {
      case LicenceTypes.Standard: {
        // log.d(mod, fun, `licenceType: ${utils.beautify(licenceType)}`)
        const licenceLabel = json.requireSubProperty(
          accessCondition,
          API_LICENCE,
          API_LICENCE_LABEL,
          API_LICENCE_TYPE,
          LicenceTypes.Standard
        )
        const listLicenceCode = await licenceController.getLicenceCodes()
        // log.d(mod, fun, `licence list: ${utils.beautify(listLicenceCode)}`)
        if (listLicenceCode.indexOf(licenceLabel) === -1) {
          throw new NotFoundError(
            `Licence label '${licenceLabel}' was not found in licence list '${listLicenceCode}'`
          )
        } else {
          metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL] = undefined
          // delete metadata[API_ACCESS_CONDITION][API_LICENCE][API_LICENCE_CUSTOM_LABEL]
          return licenceLabel
        }
      }
      case LicenceTypes.Custom: {
        // log.d(mod, fun, `licenceType: ${utils.beautify(licenceType)}`)
        json.requireSubProperty(
          accessCondition,
          API_LICENCE,
          API_LICENCE_CUSTOM_LABEL,
          API_LICENCE_TYPE,
          LicenceTypes.Custom
        )
        json.requireSubProperty(
          accessCondition,
          API_LICENCE,
          API_LICENCE_CUSTOM_URI,
          API_LICENCE_TYPE,
          LicenceTypes.Custom
        )
        return licence[API_LICENCE_CUSTOM_LABEL]
      }
      default: {
        const errMsg = msg.incorrectValueForEnum(
          `${API_ACCESS_CONDITION}.${API_LICENCE}.${API_LICENCE_TYPE}`,
          licenceType
        )
        log.e(mod, fun, errMsg)
        throw new BadRequestError(errMsg)
      }
    }
  } catch (err) {
    log.d(mod, fun, `metadata: ${utils.beautify(metadata)}`)
    throw RudiError.treatError(mod, fun, err)
  }
}

async function checkThesaurus(metadata) {
  const fun = 'checkThesaurus'
  // if (metadata.init) log.d(mod, fun, `init`)
  try {
    const shouldInit = metadata[API_COLLECTION_TAG] === 'init'
    const dataTheme = metadata[API_THEME_PROPERTY]
    // const themes = Themes.get()
    const themeLabels = Themes.getLabels(DEFAULT_LANG)

    const themeKeyIndex = Object.keys(themeLabels).indexOf(dataTheme)
    if (themeKeyIndex === -1) {
      const themeValIndex = Object.values(themeLabels).indexOf(dataTheme)
      if (themeValIndex > -1) {
        const allowedDataTheme = Object.keys(themeLabels)[themeValIndex]
        log.d(mod, fun, `Changing Theme value: ${dataTheme} -> ${allowedDataTheme}`)
        metadata[API_THEME_PROPERTY] = allowedDataTheme
      } else if (!(await Themes.isValid(dataTheme, shouldInit))) {
        throw new BadRequestError(
          `${msg.incorrectVal(API_THEME_PROPERTY, dataTheme)}. ` +
            `Allowed: ${utils.beautify(Themes.get())} ` +
            `(metadata ${metadata[API_METADATA_ID]}) `
        )
      }
    }

    const keywords = metadata[API_KEYWORDS_PROPERTY]
    // log.d(mod, fun, `keywords: ${utils.beautify(keywords)}`)

    await Promise.all(
      keywords.map((keyword, index) => {
        // log.d(mod, fun, `keyword: ${keyword}`)
        Keywords.isValid(keyword, true)
          .then((resolve) => {
            if (resolve) {
              if (keyword !== keyword.trim()) {
                metadata[API_KEYWORDS_PROPERTY][index] = keyword.trim()
              }
              return true
            } else {
              throw new BadRequestError(msg.incorrectVal(API_KEYWORDS_PROPERTY, keyword))
            }
          })
          .catch((err) => {
            // log.w(mod, fun, err)
            throw RudiError.treatError(mod, fun, err)
          })
      })
    )

    const languages = metadata[API_LANGUAGES_PROPERTY]
    if (languages) {
      const langStr = utils.beautify(languages)
      if (langStr === '[]' || langStr === '[null]') {
        delete metadata[API_LANGUAGES_PROPERTY]
      } else {
        await Promise.all(
          languages.map((lang) => {
            if (!Languages.isValid(lang, shouldInit))
              throw new BadRequestError(
                msg.incorrectVal(API_LANGUAGES_PROPERTY, lang) +
                  ` (metadata ${metadata[API_METADATA_ID]})`
              )
            return true
          })
        )
      }
    }

    const geography = metadata[API_GEOGRAPHY_PROPERTY]
    if (geography) {
      const projection = geography[API_GEO_PROJECTION_PROPERTY]
      if (projection) {
        if (!Projections.isValid(projection, shouldInit))
          throw new BadRequestError(
            msg.incorrectVal(`${API_GEOGRAPHY_PROPERTY}.${API_GEO_PROJECTION_PROPERTY}`, projection)
          )
      }
    }

    if (!StorageStatus.isValid(metadata.storage_status, shouldInit)) {
      throw new BadRequestError(msg.incorrectVal('storage_status', metadata.storage_status))
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
/* 
  function checkMedia(metadata) {
    const fun = 'checkMedia'
    log.d(mod, fun, `metadata: ${utils.beautify(metadata)}`)
    try {
      const media = metadata[API_MEDIA_PROPERTY]
      if (!media) throw new BadRequestError(msg.missingField(API_MEDIA_PROPERTY)+` (metadata ${this[API_METADATA_ID]})`)
      if (media[API_MEDIA_TYPE_PROPERTY] === MediaTypes.File) {
        if (!utils.isNotEmptyObject(media[API_FILE_CHECKSUM])) {
          throw new BadRequestError(msg.missingObjectProperty(this, API_FILE_CHECKSUM)+` (metadata ${this[API_METADATA_ID]})`)
        }
      } else {
        log.d(mod, fun, `media: ${utils.beautify(metadata[API_MEDIA_PROPERTY])}`)
        log.d(mod, fun, `type: ${media[API_MEDIA_TYPE_PROPERTY]}`)
      }
    } catch (err) {
          throw RudiError.treatError(mod, fun, err)

    }
  }
*/

function toDate(dateStr) {
  try {
    return new Date(dateStr)
  } catch (err) {
    throw new BadRequestError(
      `This is not a date: '${dateStr}' (metadata ${this[API_METADATA_ID]})`
    )
  }
}

function checkDates(datesObj, firstDateProp, secondDateProp, shouldInitialize) {
  const fun = 'checkDates'
  // log.t(mod, fun, ``)
  try {
    if (!datesObj) return

    if (!datesObj[secondDateProp]) {
      if (datesObj[firstDateProp] && shouldInitialize)
        datesObj[secondDateProp] = datesObj[firstDateProp]
      return
    }

    const date1 = toDate(datesObj[firstDateProp])
    const date2 = toDate(datesObj[secondDateProp])

    if (date1 <= date2) return true

    throw new BadRequestError(
      `Date '${secondDateProp}' = '${date2.toISOString()}' should be subsequent ` +
        `to '${firstDateProp}' = '${date1.toISOString()}' `
    )
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Schema refinements
// ------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
MetadataSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// ----- Virtuals
MetadataSchema.virtual(
  `${API_METAINFO_PROPERTY}.${API_METAINFO_DATES_PROPERTY}.${API_DATES_CREATED_PROPERTY}`
).get(function () {
  return this[DB_CREATED_AT]
})
MetadataSchema.virtual(
  `${API_METAINFO_PROPERTY}.${API_METAINFO_DATES_PROPERTY}.${API_DATES_EDITED_PROPERTY}`
).get(function () {
  return this[DB_UPDATED_AT]
})
MetadataSchema.virtual(
  `${API_METAINFO_PROPERTY}.${API_METAINFO_DATES_PROPERTY}.${API_DATES_PUBLISHED_PROPERTY}`
).get(function () {
  return this[DB_PUBLISHED_AT]
})

MetadataSchema.pre('save', async function (next) {
  // const fun = 'pre save hook'
  // log.t(mod, fun, ``)
  const metadata = this

  try {
    // If 'geography' field is defined, the field 'geography.bbox' is required
    if (json.requireSubProperty(metadata, API_GEOGRAPHY_PROPERTY, API_GEO_BBOX_PROPERTY)) {
      if (utils.isNothing(metadata[API_GEOGRAPHY_PROPERTY][API_GEO_PROJECTION_PROPERTY])) {
        // If 'geography' field is defined, but 'geography.projection' is not, it is initialized to the defaul value.
        metadata[API_GEOGRAPHY_PROPERTY][API_GEO_PROJECTION_PROPERTY] = 'WGS 84'
      }
    }

    // If 'temporal_spread' is defined, the field 'start_date' should be defined
    json.requireSubProperty(metadata, API_PERIOD_PROPERTY, API_START_DATE_PROPERTY)

    try {
      checkDates(metadata[API_PERIOD_PROPERTY], API_START_DATE_PROPERTY, API_END_DATE_PROPERTY)
    } catch (err) {
      metadata[API_PERIOD_PROPERTY][API_START_DATE_PROPERTY] =
        metadata[API_PERIOD_PROPERTY][API_END_DATE_PROPERTY]
    }
    try {
      checkDates(
        metadata[API_DATA_DATES_PROPERTY],
        API_DATES_CREATED_PROPERTY,
        API_DATES_EDITED_PROPERTY,
        true // If 'dataset_dates.updated' is not defined, it is initialized with 'dataset_dates.created'
      )
    } catch (err) {
      metadata[API_DATA_DATES_PROPERTY][API_DATES_CREATED_PROPERTY] =
        metadata[API_DATA_DATES_PROPERTY][API_DATES_EDITED_PROPERTY]
    }
    try {
      checkDates(
        metadata[API_DATA_DATES_PROPERTY],
        API_DATES_CREATED_PROPERTY,
        API_DATES_PUBLISHED_PROPERTY
      )
    } catch (err) {
      metadata[API_DATA_DATES_PROPERTY][API_DATES_PUBLISHED_PROPERTY] =
        metadata[API_DATA_DATES_PROPERTY][API_DATES_CREATED_PROPERTY]
    }
    // Checking 'licence' field
    await checkLicence(metadata)

    await checkThesaurus(metadata)

    // await checkMedia(metadata)
  } catch (err) {
    err.message = err.message + ` (metadata ${this[API_METADATA_ID]})`
    next(err)
  }

  // next()
})

MetadataSchema.post('save', async function (doc, next) {
  const fun = 'post save hook'
  log.t(mod, fun, ``)

  try {
    await this.populate(POPULATE_OPTS) //.execPopulate()
    next()
  } catch (err) {
    next(err)
  }
  // next()
})

/*
MetadataSchema.post('find', async function (docs, next) {
  const fun = 'post find hook'
  log.t(mod, fun, ``)

  try {
    for (let doc of docs) {
      // if (doc.isPublic)
      await doc.populate(POPULATE_OPTS) //.execPopulate()
    }
  } catch (err) {
    next(err)
  }
  next()
})
 */

// ------------------------------------------------------------------------------------------------
// Models definition
// ------------------------------------------------------------------------------------------------
const Metadata = mongoose.model('Metadata', MetadataSchema)

// Making fields searchable

Metadata.getSearchableFields = () => [
  API_METADATA_ID,
  API_METADATA_LOCAL_ID,
  API_DATA_NAME_PROPERTY,
  `${API_DATA_DETAILS_PROPERTY}.text`,
  `${API_DATA_DESCRIPTION_PROPERTY}.text`,
]

const fun = 'createSearchIndexes'
Metadata.createSearchIndexes = async () => {
  try {
    await makeSearchable(Metadata)
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
Metadata.createSearchIndexes()
  .catch((err) => {
    throw RudiError.treatError(mod, fun, `Failed to create search indexes: ${err}`)
  })
  .then(log.t(mod, fun, 'done'))

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = {
  Metadata,
  METADATA_FIELDS_TO_POPULATE,
}
