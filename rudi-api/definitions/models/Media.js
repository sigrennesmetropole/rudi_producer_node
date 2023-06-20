const mod = 'mediaSch'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

import mongooseInt32 from 'mongoose-int32'
const Int32 = mongooseInt32.loadType(mongoose)

import sanitize from 'sanitize-filename'

import _ from 'lodash'
const { omit } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  FIELDS_TO_SKIP,
  API_COLLECTION_TAG,
  API_MEDIA_ID,
  API_MEDIA_TYPE,
  API_MEDIA_NAME,
  API_MEDIA_CONNECTOR,
  API_MEDIA_INTERFACE_CONTRACT,
  API_FILE_MIME,
  API_FILE_SIZE,
  API_FILE_CHECKSUM,
  API_FILE_STRUCTURE,
  API_FILE_ENCODING,
  API_FILE_STORAGE_STATUS,
  API_MEDIA_CONNECTOR_PARAMS,
  API_MEDIA_CAPTION,
  API_MEDIA_DATES,
  API_DATES_CREATED,
  API_DATES_EDITED,
  API_FILE_STATUS_UPDATE,
  API_MEDIA_VISUAL,
} from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import ReferenceDatesSchema, { checkDates } from '../schemas/ReferenceDates.js'
import { ConnectorParameter } from '../schemas/ConnectorParameters.js'

import { VALID_URI } from '../schemaValidators.js'
import { UuidV4Schema } from '../schemas/Identifiers.js'
import { isNotEmptyObject, nowISO } from '../../utils/jsUtils.js'
import { logD, logV, logW } from '../../utils/logging.js'
import { missingField } from '../../utils/msg.js'
import { BadRequestError, RudiError } from '../../utils/errors.js'
import { makeSearchable } from '../../db/dbActions.js'

import { get as getEncodings } from '../thesaurus/Encodings.js'
import { getFileTypesWithCrypt } from '../thesaurus/FileTypes.js'
import { get as getHashAlgorithms } from '../thesaurus/HashAlgorithms.js'

// -------------------------------------------------------------------------------------------------
// Media constants
// -------------------------------------------------------------------------------------------------
export const MediaTypes = {
  File: 'FILE',
  Series: 'SERIES',
  Service: 'SERVICE',
}

export const MediaStorageStatus = {
  Nonexistant: 'nonexistant', // the file has not been uploaded yet to the "Media" storage module
  Available: 'available', // the file has been successfully uploaded to "Media" storage module
  Missing: 'missing', // the file had been successfully uploaded but is temporarily unavailable
  Historical: 'historical', // ancient data that has been updated
  Obsolete: 'obsolete', // dataset that is too old but cannot be updated or replaced with another
  Archived: 'archived', // data are not immediately available, access is not automatic
  Removed: 'removed', // the file has been deleted and is no longer available
}

export const InterfaceContract = {
  Dwnld: 'dwnl',
}

const commonSchemaOptions = {
  discriminatorKey: 'media_type',
  timestamps: true,
  id: false,
}

// export const MEDIA_FIELDS_TO_POPULATE = [API_MEDIA_THUMBNAIL, API_MEDIA_SATELLITES].join(' ')

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------
export const isMediaMissing = (rudiMedia) => {
  if (rudiMedia[API_MEDIA_TYPE] !== MediaTypes.File) return false
  const mediaStatus = rudiMedia[API_FILE_STORAGE_STATUS]
  return (
    !mediaStatus ||
    mediaStatus === MediaStorageStatus.Missing ||
    mediaStatus === MediaStorageStatus.Nonexistant ||
    mediaStatus === MediaStorageStatus.Removed
  )
}
// -------------------------------------------------------------------------------------------------
// Media schema definition
// -------------------------------------------------------------------------------------------------

const MediaSchema = new mongoose.Schema(
  {
    /**
     * Unique and permanent identifier for the organization in RUDI
     * system (required)
     */
    [API_MEDIA_ID]: UuidV4Schema,

    /** Updated offical name of the organization */
    [API_MEDIA_TYPE]: {
      type: String,
      enum: Object.values(MediaTypes),
      required: true,
    },

    /** Original name of the file */
    [API_MEDIA_NAME]: String,

    /** Short description of the media */
    [API_MEDIA_CAPTION]: String,

    /** Time of the creation / last update of the Media */
    [API_MEDIA_DATES]: ReferenceDatesSchema,

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
        default: InterfaceContract.Dwnld,
      },

      // Optional connector parameters
      [API_MEDIA_CONNECTOR_PARAMS]: {
        type: [ConnectorParameter],
        default: undefined,
        _id: false,
      },
    },
    /** Link towards a (low-fidelity) visualization of the media */
    [API_MEDIA_VISUAL]: {
      type: String,
      validate: VALID_URI,
      default: undefined,
      _id: false,
    },
    // /** Media visualization of the media */
    // [API_MEDIA_THUMBNAIL]: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Media',
    //   default: undefined,
    // },

    // /* *
    //  * Array of media that may be used to have a previsualization or an excerpt
    //  * of the data
    //  */
    // [API_MEDIA_SATELLITES]: {
    //   type: [
    //     {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: 'Media',
    //     },
    //   ],
    //   default: undefined,
    // },
    /** Tag for identifying a collection of resources */
    [API_COLLECTION_TAG]: String,
  },
  commonSchemaOptions
)

// MediaSchema.add({})

MediaSchema.pre('save', function (next) {
  const mod = 'MediaSchema'
  const fun = 'pre save hook'
  // logT(mod, fun, ``)
  try {
    const connector = this[API_MEDIA_CONNECTOR]
    if (!connector?.url)
      throw new BadRequestError(missingField(API_MEDIA_CONNECTOR), mod, fun, [API_MEDIA_CONNECTOR])
    if (this[API_MEDIA_TYPE] === MediaTypes.File) {
      if (!isNotEmptyObject(this[API_FILE_CHECKSUM]))
        throw new BadRequestError(missingField(API_FILE_CHECKSUM), mod, fun, [API_FILE_CHECKSUM])
    } else {
      // Set media storage_status to 'available'
      this[API_FILE_STORAGE_STATUS] = this[API_FILE_STORAGE_STATUS] || MediaStorageStatus.Available
      // Set status_update date
      this[API_FILE_STATUS_UPDATE] = this[API_FILE_STATUS_UPDATE] || nowISO()
      // Set connector interface_contract to 'external'
      this[API_MEDIA_CONNECTOR][API_MEDIA_INTERFACE_CONTRACT] = 'external'
    }
    if (!!this[API_MEDIA_NAME]) {
      const nameBefore = this[API_MEDIA_NAME]
      const nameAfter = sanitize(this[API_MEDIA_NAME])
      if (nameBefore !== nameAfter) {
        this[API_MEDIA_NAME] = nameAfter
        logD(mod, fun, `sanitized: '${nameBefore}' -> '${nameAfter}'`)
      }
    } else this[API_MEDIA_NAME] = this[API_MEDIA_ID]

    const mediaDates = this[API_MEDIA_DATES]
    if (!mediaDates)
      throw new BadRequestError(
        `Incoming Media must have creation and update dates in field ${API_MEDIA_DATES}`
      )
    if (!mediaDates[API_DATES_CREATED])
      mediaDates[API_DATES_CREATED] = mediaDates[API_DATES_EDITED]
        ? mediaDates[API_DATES_EDITED]
        : nowISO()
    if (!mediaDates[API_DATES_EDITED]) mediaDates[API_DATES_EDITED] = mediaDates[API_DATES_CREATED]

    next()
  } catch (err) {
    logW(mod, fun, err)
    next(err)
  }
})

// -------------------------------------------------------------------------------------------------
// File schema definition
// -------------------------------------------------------------------------------------------------
const FileSchema = new mongoose.Schema(
  {
    // Native format of the resource
    [API_FILE_MIME]: {
      type: String,
      enum: Object.values(getFileTypesWithCrypt()),
      required: true,
    },

    // Size of the file, in bytes
    [API_FILE_SIZE]: {
      type: Int32,
      required: true,
    },

    // Makes it possible to check data integrity
    [API_FILE_CHECKSUM]: {
      algo: {
        type: String,
        enum: Object.values(getHashAlgorithms()),
        required: true,
      },
      hash: {
        type: String,
        required: true,
      },
    },

    // Link towards the resource that describes the structure of the data
    // (language, norm, data structure, JSON schema, OpenAPI, etc.)
    [API_FILE_STRUCTURE]: {
      type: String,
      match: VALID_URI,
    },

    // Source encoding of the data
    [API_FILE_ENCODING]: {
      type: String,
      enum: Object.values(getEncodings()),
      default: getEncodings().Unicode,
    },

    /**
     * Storage/relevance status of the data
     * - nonexistant: the file has not been uploaded yet to the "Media" storage module
     * - available: the file has been successfully uploaded to "Media" storage module
     * - missing: the file had been successfully uploaded but is temporarily unavailable
     * - historical: ancient data that has been updated
     * - obsolete: dataset that is too old but cannot be updated or replaced with another
     * - archived: data are not immediately available, access is not automatic
     * - removed: the file has been deleted and is no longer available
     */
    [API_FILE_STORAGE_STATUS]: {
      type: String,
      enum: Object.values(MediaStorageStatus),
      default: MediaStorageStatus.Missing,
    },

    /** Date of the last status update */
    [API_FILE_STATUS_UPDATE]: {
      type: Date,
      default: nowISO(),
    },
  },
  commonSchemaOptions
)

FileSchema.pre('save', function (next) {
  const mod = 'FileSchema'
  const fun = 'pre save hook'
  // logD('FileSchema', fun, ``)
  try {
    if (!isNotEmptyObject(this[API_FILE_CHECKSUM]))
      throw new BadRequestError(missingField(API_FILE_CHECKSUM), mod, fun, [API_FILE_CHECKSUM])

    logD(mod, fun, 'checking MEDIA_DATES')
    checkDates(
      this[API_MEDIA_DATES],
      API_DATES_CREATED,
      API_DATES_EDITED,
      true // If 'media_dates.updated' is not defined, it is initialized with 'media_dates.created'
    )

    next()
  } catch (err) {
    logW(mod, fun, err)
    next(err)
  }
})

const PositiveInt = {
  type: Int32,
  minimum: 0,
}
// -------------------------------------------------------------------------------------------------
// Series schema definition
// -------------------------------------------------------------------------------------------------
const SeriesSchema = new mongoose.Schema(
  {
    // Theorical delay between the production of the record and its availability,
    // in milliseconds.
    latency: PositiveInt,

    // Theorical delay between the production of two records, in milliseconds.
    period: PositiveInt,

    // Actual number of records
    current_number_of_records: PositiveInt,

    // Actual size of the data, in bytes (refreshed automatically)
    current_size: PositiveInt,

    // Estimated total number of records
    total_number_of_records: PositiveInt,

    // Estimated total size of the data, in bytes
    total_size: PositiveInt,
  },
  commonSchemaOptions
)

// -------------------------------------------------------------------------------------------------
// MediaService schema definition
// -------------------------------------------------------------------------------------------------
const ServiceSchema = new mongoose.Schema({}, commonSchemaOptions)

// -------------------------------------------------------------------------------------------------
// Schema refinements
// -------------------------------------------------------------------------------------------------

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
ServiceSchema.methods.toJSON = function () {
  return omit(this.toObject(), FIELDS_TO_SKIP)
}

// -------------------------------------------------------------------------------------------------
// Hooks
// -------------------------------------------------------------------------------------------------
MediaSchema.pre('save', async function (next) {
  const fun = 'pre save hook'

  const media = this
  try {
    // logT(mod, fun, ``)
    if (!media[API_MEDIA_NAME]) media[API_MEDIA_NAME] = media[API_MEDIA_ID]
  } catch (err) {
    logV(mod, fun, `pre save checks KO: ${err}`)
    err.message = err.message + ` (media ${media[API_MEDIA_ID]})`
    next(err)
  }

  // next()
})

// -------------------------------------------------------------------------------------------------
// Models definition
// -------------------------------------------------------------------------------------------------
export const Media = mongoose.model('Media', MediaSchema)
export const MediaFile = Media.discriminator(MediaTypes.File, FileSchema, { clone: false })
export const MediaSeries = Media.discriminator(MediaTypes.Series, SeriesSchema, { clone: false })
export const MediaService = Media.discriminator(MediaTypes.Service, ServiceSchema, { clone: false })

Media.getSearchableFields = () => [
  API_MEDIA_ID,
  API_MEDIA_TYPE,
  API_MEDIA_NAME,
  API_FILE_MIME,
  API_FILE_STORAGE_STATUS,
  // API_MEDIA_THUMBNAIL,
]

Media.initialize = async () => {
  const fun = 'initMedia'
  try {
    await makeSearchable(Media)
    return `Media indexes created`
  } catch (err) {
    RudiError.treatError(mod, fun, err)
  }
}
