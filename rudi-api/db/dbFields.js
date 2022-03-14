'use strict'

/*
 * In this file are defined the attributes of the JSON API
 * (= mongoose db documents properties)
 */

// ------------------------------------------------------------------------------------------------
// DB fields
// ------------------------------------------------------------------------------------------------
exports.DB_ID = '_id'
exports.DB_V = '__v'
exports.DB_CREATED_AT = 'createdAt'
exports.DB_UPDATED_AT = 'updatedAt'
exports.DB_PUBLISHED_AT = 'publishedAt'

exports.FIELDS_TO_SKIP = [
  this.DB_ID,
  this.DB_V,
  this.DB_CREATED_AT,
  this.DB_UPDATED_AT,
  this.DB_PUBLISHED_AT,
]

// ------------------------------------------------------------------------------------------------
// ID properties
// ------------------------------------------------------------------------------------------------
exports.API_METADATA_ID = 'global_id'
exports.API_ORGANIZATION_ID = 'organization_id'
exports.API_CONTACT_ID = 'contact_id'
exports.API_MEDIA_ID = 'media_id'

// ------------------------------------------------------------------------------------------------
// Metadata properties
// ------------------------------------------------------------------------------------------------
exports.API_METADATA_LOCAL_ID = 'local_id'
exports.API_DATA_NAME_PROPERTY = 'resource_title'
exports.API_DATA_DETAILS_PROPERTY = 'synopsis'
exports.API_DATA_DESCRIPTION_PROPERTY = 'summary'
exports.API_DATA_PRODUCER_PROPERTY = 'producer'
exports.API_DATA_CONTACTS_PROPERTY = 'contacts'
exports.API_DATA_DATES_PROPERTY = 'dataset_dates'

// ------------------------------------------------------------------------------------------------
// Metadata properties: media
// ------------------------------------------------------------------------------------------------
exports.API_MEDIA_PROPERTY = 'available_formats'

// ------------------------------------------------------------------------------------------------
// Metadata properties: metadata info
// ------------------------------------------------------------------------------------------------
exports.API_METAINFO_PROPERTY = 'metadata_info'
exports.API_METAINFO_PROVIDER_PROPERTY = 'metadata_provider'
exports.API_METAINFO_CONTACTS_PROPERTY = 'metadata_contacts'
exports.API_METAINFO_DATES_PROPERTY = 'metadata_dates'
exports.API_METAINFO_VERSION_PROPERTY = 'api_version'

// ------------------------------------------------------------------------------------------------
// Metadata properties: geospatial
// ------------------------------------------------------------------------------------------------
exports.API_GEOGRAPHY_PROPERTY = 'geography'

exports.API_GEO_BBOX_PROPERTY = 'bounding_box'
exports.API_GEO_BBOX_WEST = 'west_longitude'
exports.API_GEO_BBOX_EAST = 'east_longitude'
exports.API_GEO_BBOX_SOUTH = 'south_latitude'
exports.API_GEO_BBOX_NORTH = 'north_latitude'

exports.API_GEO_GEOJSON_PROPERTY = 'geographic_distribution'
exports.API_GEO_PROJECTION_PROPERTY = 'projection'

exports.API_PERIOD_PROPERTY = 'temporal_spread'
exports.API_START_DATE_PROPERTY = 'start_date'
exports.API_END_DATE_PROPERTY = 'end_date'

// ------------------------------------------------------------------------------------------------
// Metadata properties: access condition / licence
// ------------------------------------------------------------------------------------------------
exports.API_ACCESS_CONDITION = 'access_condition'
exports.API_LICENCE = 'licence'
exports.API_LICENCE_TYPE = 'licence_type'
exports.API_LICENCE_LABEL = 'licence_label'
exports.API_LICENCE_CUSTOM_LABEL = 'custom_licence_label'
exports.API_LICENCE_CUSTOM_URI = 'custom_licence_uri'

// ------------------------------------------------------------------------------------------------
// Dates
// ------------------------------------------------------------------------------------------------
exports.API_DATES_CREATED_PROPERTY = 'created'
exports.API_DATES_EDITED_PROPERTY = 'updated'
exports.API_DATES_PUBLISHED_PROPERTY = 'published'
exports.API_DATES_VALIDATED_PROPERTY = 'validated'
exports.API_DATES_DELETED_PROPERTY = 'deleted'

exports.getCreatedDate = (metadata) => {
  if (metadata[this.DB_CREATED_AT]) return metadata[this.DB_CREATED_AT]
  if (
    metadata[this.API_METAINFO_PROPERTY] &&
    metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY]
  )
    return metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY][
      this.API_DATES_CREATED_PROPERTY
    ]
  throw new Error(`Not found: '${this.API_DATES_CREATED_PROPERTY}`)
}

exports.getUpdatedDate = (metadata) => {
  if (metadata[this.DB_UPDATED_AT]) return metadata[this.DB_UPDATED_AT]
  if (
    metadata[this.API_METAINFO_PROPERTY] &&
    metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY]
  )
    return metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY][
      this.API_DATES_EDITED_PROPERTY
    ]
  throw new Error(`Not found: '${this.API_DATES_EDITED_PROPERTY}`)
}

exports.getPublishedDate = (metadata) => {
  if (metadata[this.DB_PUBLISHED_AT]) return metadata[this.DB_PUBLISHED_AT]
  if (
    metadata[this.API_METAINFO_PROPERTY] &&
    metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY]
  )
    return metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY][
      this.API_DATES_PUBLISHED_PROPERTY
    ]
  throw new Error(`Not found: '${this.API_DATES_PUBLISHED_PROPERTY}`)
}

exports.setPublishedDate = (metadata, datePublished) => {
  if (metadata[this.DB_PUBLISHED_AT]) metadata[this.DB_PUBLISHED_AT] = datePublished
  if (
    metadata[this.API_METAINFO_PROPERTY] &&
    metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY]
  ) {
    metadata[this.API_METAINFO_PROPERTY][this.API_METAINFO_DATES_PROPERTY][
      this.API_DATES_PUBLISHED_PROPERTY
    ] = datePublished
    return metadata
  } else throw new Error(`Not found: '${this.API_DATES_PUBLISHED_PROPERTY}`)
}

// ------------------------------------------------------------------------------------------------
// Specific fields
// ------------------------------------------------------------------------------------------------
exports.API_COLLECTION_TAG = 'collection_tag'
exports.API_PURPOSE = 'purpose'

// ------------------------------------------------------------------------------------------------
// Properties with restricted values
// ------------------------------------------------------------------------------------------------
exports.API_THEME_PROPERTY = 'theme'
exports.API_KEYWORDS_PROPERTY = 'keywords'
exports.API_LANGUAGES_PROPERTY = 'resource_languages'

//=================================================================================================

// ------------------------------------------------------------------------------------------------
// Organization properties
// ------------------------------------------------------------------------------------------------
exports.API_ORGANIZATION_NAME = 'organization_name'
exports.API_ORGANIZATION_ADDRESS = 'organization_address'

// ------------------------------------------------------------------------------------------------
// Contact properties
// ------------------------------------------------------------------------------------------------
exports.API_CONTACT_NAME = 'contact_name'
exports.API_CONTACT_ROLE = 'role'
exports.API_CONTACT_MAIL = 'email'

// ------------------------------------------------------------------------------------------------
// Media properties
// ------------------------------------------------------------------------------------------------
exports.API_MEDIA_TYPE = 'media_type'
exports.API_MEDIA_NAME = 'media_name'
exports.API_MEDIA_TITLE = 'media_title'
exports.API_MEDIA_CONNECTOR = 'connector'
exports.API_MEDIA_INTERFACE_CONTRACT = 'interface_contract'

exports.API_FILE_TYPE = 'file_type'
exports.API_FILE_SIZE = 'file_size'
exports.API_FILE_CHECKSUM = 'checksum'
exports.API_FILE_STRUCTURE = 'file_structure'
exports.API_FILE_ENCODING = 'file_encoding'
exports.API_FILE_UPDATE_STATUS = 'update_status'

//=================================================================================================

// ------------------------------------------------------------------------------------------------
// Integration reports
// ------------------------------------------------------------------------------------------------
exports.API_REPORT_ID = 'report_id'
exports.API_REPORT_RESOURCE_ID = 'resource_id'
exports.API_REPORT_STATUS = 'integration_status'
exports.API_REPORT_ERRORS = 'integration_errors'
exports.API_REPORT_VERSION = 'version'
exports.API_REPORT_SUBMISSION_DATE = 'submission_date'
exports.API_REPORT_TREATMENT_DATE = 'treatment_date'
exports.API_REPORT_METHOD = 'method'
exports.API_REPORT_COMMENT = 'comment'
exports.API_REPORT_FIELD = 'field_name'
exports.API_REPORT_ERROR_MSG = 'error_message'
exports.API_REPORT_ERROR_CODE = 'error_code'
exports.LOCAL_REPORT_ERROR = 'report_treatment_error'
exports.LOCAL_REPORT_ERROR_TYPE = 'error_type'
exports.LOCAL_REPORT_ERROR_MSG = 'error_message'

// ------------------------------------------------------------------------------------------------
// Log entries
// ------------------------------------------------------------------------------------------------
exports.LOG_ID = 'entry_id'
exports.LOG_TIME = 'time'
exports.LOG_MSG = 'message'
exports.LOG_LVL = 'log_level'
exports.LOG_MOD = 'location_module'
exports.LOG_FUN = 'location_function'
exports.LOG_USR = 'user_address'

// ------------------------------------------------------------------------------------------------
// SKOS
// ------------------------------------------------------------------------------------------------
// ID properties
exports.API_SKOS_SCHEME_ID = 'scheme_id'
exports.API_SKOS_SCHEME_CODE = 'scheme_code'

exports.API_SKOS_CONCEPT_ID = 'concept_id'
exports.API_SKOS_CONCEPT_CODE = 'concept_code'
exports.API_SKOS_CONCEPT_ROLE = 'concept_role'

// Scheme fields referencing Concepts
exports.API_SCHEME_TOPS_PROPERTY = 'top_concepts'

// Concept fields referencing a Scheme
exports.API_CONCEPT_CLASS_PROPERTY = 'of_scheme'

// Concept fields referencing other Concepts
exports.API_CONCEPT_PARENTS_PROPERTY = 'broader_concepts'
exports.API_CONCEPT_CHILDREN_PROPERTY = 'narrower_concepts'
exports.API_CONCEPT_SIBLINGS_PROPERTY = 'siblings_concepts'
exports.API_CONCEPT_RELATIVE_PROPERTY = 'relative_concepts'

// Licences types
exports.LicenceTypes = {
  Standard: 'STANDARD',
  Custom: 'CUSTOM',
}
exports.LICENCE_SCHEME_CODE = 'software_licences'
exports.LICENCE_CONCEPT_ROLE = 'licence'
