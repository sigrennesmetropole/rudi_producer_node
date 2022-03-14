'use strict'

const mod = 'mediaSch'
// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const mongoose = require('mongoose')
const Int32 = require('mongoose-int32')
const { omit } = require('lodash')
const sanitize = require('sanitize-filename')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const { isNotEmptyObject } = require('../../utils/jsUtils')
const { missingField } = require('../../utils/msg')

const { BadRequestError, RudiError } = require('../../utils/errors')
const { makeSearchable } = require('../../db/dbActions')

const Ids = require('../schemas/Identifiers')
const Validation = require('../schemaValidators')

const Encodings = require('../thesaurus/Encodings')
const FileTypes = require('../thesaurus/FileTypes').get()
const HashAlgorithms = require('../thesaurus/HashAlgorithms').get()

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  FIELDS_TO_SKIP,
  API_COLLECTION_TAG,
  API_MEDIA_ID,
  API_MEDIA_TYPE,
  API_MEDIA_NAME,
  API_MEDIA_CONNECTOR,
  API_MEDIA_INTERFACE_CONTRACT,
  API_FILE_TYPE,
  API_FILE_SIZE,
  API_FILE_CHECKSUM,
  API_FILE_STRUCTURE,
  API_FILE_ENCODING,
  API_FILE_UPDATE_STATUS,
  API_MEDIA_TITLE,
} = require('../../db/dbFields')

const MediaTypes = {
  File: 'FILE',
  Series: 'SERIES',
}

const UpdateStatus = [
  'modified', // the data is in the process of being created but still incomplete
  'updated', // the data is up to date
  'historical', // ancient data that has been updated
  'obsolete', // dataset that is too old but cannot be updated or replaced with another
]

const InterfaceContract = {
  DWNLD: 'dwnl',
}

const commonSchemaOptions = {
  discriminatorKey: 'media_type',
  timestamps: true,
  id: false,
}

// ------------------------------------------------------------------------------------------------
// Media schema definition
// ------------------------------------------------------------------------------------------------

const MediaSchema = new mongoose.Schema(
  {
    /**
     * Unique and permanent identifier for the organization in RUDI
     * system (required)
     */
    [API_MEDIA_ID]: Ids.UUIDv4,

    /** Updated offical name of the organization */
    [API_MEDIA_TYPE]: {
      type: String,
      enum: Object.values(MediaTypes),
      required: true,
    },

    /** Original name of the file */
    [API_MEDIA_NAME]: {
      type: String,
      // required: true,
    },

    /** Short description of the media */
    [API_MEDIA_TITLE]: {
      type: String,
      // required: true,
    },

    /** Updated name of the service, or possibly the person */
    [API_MEDIA_CONNECTOR]: {
      url: {
        type: String,
        required: true,
      },
      // TODO: define this properly.
      // Most likely an enum defined in Rudi that can be handled in
      // a known manner
      [API_MEDIA_INTERFACE_CONTRACT]: {
        type: String,
        required: true,
        default: InterfaceContract.DWNLD,
      },
    },

    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: {
      type: String,
    },
  },
  commonSchemaOptions
)

MediaSchema.pre('save', function (next) {
  const mod = 'MediaSchema'
  const fun = 'pre save hook'
  // log.t(mod, fun, ``)
  try {
    if (this[API_MEDIA_TYPE] === MediaTypes.File && !isNotEmptyObject(this[API_FILE_CHECKSUM]))
      throw new BadRequestError(missingField(API_FILE_CHECKSUM))

    if (!!this[API_MEDIA_NAME]) {
      const nameBefore = this[API_MEDIA_NAME]
      const nameAfter = sanitize(this[API_MEDIA_NAME])
      if (nameBefore !== nameAfter) {
        this[API_MEDIA_NAME] = nameAfter
        log.d(mod, fun, `sanitized: '${nameBefore}' -> '${nameAfter}'`)
      }
    }
    next()
  } catch (err) {
    log.w(mod, fun, err)
    next(err)
  }
})

// ------------------------------------------------------------------------------------------------
// File schema definition
// ------------------------------------------------------------------------------------------------
const FileSchema = new mongoose.Schema(
  {
    // Native format of the resource
    [API_FILE_TYPE]: {
      type: String,
      enum: Object.values(FileTypes),
      required: true,
    },

    // Size of the file, in bytes
    [API_FILE_SIZE]: {
      type: Int32,
      required: true,
    },

    // Makes it possible to check data integrity
    [API_FILE_CHECKSUM]: {
      type: {
        algo: {
          type: String,
          enum: Object.values(HashAlgorithms),
          required: true,
        },
        hash: {
          type: String,
          required: true,
        },
      },
      required: true,
      _id: false,
    },

    // Link towards the resource that describes the structure of the data
    // (language, norm, data structure, JSON schema, OpenAPI, etc.)
    [API_FILE_STRUCTURE]: {
      type: String,
      match: Validation.VALID_URI,
    },

    // Source encoding of the data
    [API_FILE_ENCODING]: {
      type: String,
      enum: Object.values(Encodings.get()),
      default: Encodings.Unicode,
    },

    // Relevance status of the data
    //   - 'modified'   = the data is in the process of being created
    //                    but still incomplete
    //   - 'updated'    = the data is up to date
    //   - 'historical' = ancient data that has been updated
    //   - 'obsolete'   = dataset that is too old but cannot be updated
    //                    or replaced with another
    [API_FILE_UPDATE_STATUS]: {
      type: String,
      enum: Object.values(UpdateStatus),
    },
  },
  commonSchemaOptions
)

FileSchema.pre('save', function (next) {
  const fun = 'pre save hook'
  // log.d('FileSchema', fun, ``)
  try {
    if (!isNotEmptyObject(this[API_FILE_CHECKSUM])) {
      throw new BadRequestError(missingField(API_FILE_CHECKSUM))
    }
    next()
  } catch (err) {
    log.w('FileSchema', fun, err)
    next(err)
  }
})

// ------------------------------------------------------------------------------------------------
// Series schema definition
// ------------------------------------------------------------------------------------------------
const SeriesSchema = new mongoose.Schema(
  {
    // Theorical delay between the production of the record and its availability,
    // in milliseconds.
    latency: {
      type: Int32,
      minimum: 0,
    },

    // Theorical delay between the production of two records, in milliseconds.
    period: {
      type: Int32,
      minimum: 0,
    },

    // Actual number of records
    current_number_of_records: {
      type: Int32,
      minimum: 0,
    },

    // Actual size of the data, in bytes (refreshed automatically)
    current_size: {
      type: Int32,
      minimum: 0,
    },

    // Estimated total number of records
    total_number_of_records: {
      type: Int32,
      minimum: 0,
    },

    // Estimated total size of the data, in bytes
    total_size: {
      type: Int32,
      minimum: 0,
    },
  },
  commonSchemaOptions
)

// ------------------------------------------------------------------------------------------------
// Schema refinements
// ------------------------------------------------------------------------------------------------

// ----- toJSON cleanup
MediaSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}
FileSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}
SeriesSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// ------------------------------------------------------------------------------------------------
// Models definition
// ------------------------------------------------------------------------------------------------
const Media = mongoose.model('Media', MediaSchema)
const MediaFile = Media.discriminator(MediaTypes.File, FileSchema, { clone: false })
const MediaSeries = Media.discriminator(MediaTypes.Series, SeriesSchema, { clone: false })

Media.getSearchableFields = () => [
  API_MEDIA_ID,
  API_MEDIA_TYPE,
  API_MEDIA_NAME,
  API_FILE_TYPE,
  API_FILE_UPDATE_STATUS,
]

const fun = 'createSearchIndexes'
Media.createSearchIndexes = async () => {
  try {
    await makeSearchable(Media)
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
Media.createSearchIndexes()
  .catch((err) => {
    throw RudiError.treatError(mod, fun, `Failed to create search indexes: ${err}`)
  })
  .then(log.t(mod, fun, 'done'))

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = {
  Media,
  MediaFile,
  MediaSeries,
  MediaTypes,
  InterfaceContract,
}
