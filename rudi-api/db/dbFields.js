/*
 * In this file are defined the attributes of the JSON API
 * (= mongoose db documents properties)
 */

import { dateToIso } from '../utils/jsUtils.js'

// -------------------------------------------------------------------------------------------------
// DB fields
// -------------------------------------------------------------------------------------------------
export const DB_ID = '_id'
export const DB_V = '__v'
export const DB_CREATED_AT = 'createdAt'
export const DB_UPDATED_AT = 'updatedAt'
export const DB_PUBLISHED_AT = 'publishedAt'

export const FIELDS_TO_SKIP = [DB_ID, DB_V, DB_CREATED_AT, DB_UPDATED_AT, DB_PUBLISHED_AT]

// -------------------------------------------------------------------------------------------------
// ID properties
// -------------------------------------------------------------------------------------------------
export const API_METADATA_ID = 'global_id'
export const API_ORGANIZATION_ID = 'organization_id'
export const API_CONTACT_ID = 'contact_id'
export const API_MEDIA_ID = 'media_id'

// -------------------------------------------------------------------------------------------------
// Metadata properties
// -------------------------------------------------------------------------------------------------
export const API_METADATA_LOCAL_ID = 'local_id'
export const API_DATA_NAME_PROPERTY = 'resource_title'
export const API_DATA_DETAILS_PROPERTY = 'synopsis'
export const API_DATA_DESCRIPTION_PROPERTY = 'summary'
export const API_DATA_PRODUCER_PROPERTY = 'producer'
export const API_DATA_CONTACTS_PROPERTY = 'contacts'
export const API_DATA_DATES_PROPERTY = 'dataset_dates'

// -------------------------------------------------------------------------------------------------
// Metadata properties: media
// -------------------------------------------------------------------------------------------------
export const API_MEDIA_PROPERTY = 'available_formats'

// -------------------------------------------------------------------------------------------------
// Metadata properties: metadata info
// -------------------------------------------------------------------------------------------------
export const API_METAINFO_PROPERTY = 'metadata_info'
export const API_METAINFO_PROVIDER_PROPERTY = 'metadata_provider'
export const API_METAINFO_CONTACTS_PROPERTY = 'metadata_contacts'
export const API_METAINFO_DATES = 'metadata_dates'
export const API_METAINFO_SOURCE_PROPERTY = 'metadata_source'
export const API_STATUS_PROPERTY = 'metadata_status'
export const API_METAINFO_VERSION_PROPERTY = 'api_version'

// -------------------------------------------------------------------------------------------------
// Metadata properties: status
// -------------------------------------------------------------------------------------------------
export const MetadataStatus = {
  Local: 'local',
  Incomplete: 'incomplete',
  Refused: 'refused',
  Sent: 'sent',
  Published: 'published',
  Deleted: 'deleted',
  Unset: 'unset',
}
// -------------------------------------------------------------------------------------------------
// Metadata properties: geospatial
// -------------------------------------------------------------------------------------------------
export const API_GEOGRAPHY = 'geography'

export const API_GEO_BBOX_PROPERTY = 'bounding_box'
export const API_GEO_BBOX_WEST = 'west_longitude'
export const API_GEO_BBOX_EAST = 'east_longitude'
export const API_GEO_BBOX_SOUTH = 'south_latitude'
export const API_GEO_BBOX_NORTH = 'north_latitude'

export const API_GEO_GEOJSON_PROPERTY = 'geographic_distribution'
export const API_GEO_PROJECTION_PROPERTY = 'projection'

export const API_STORAGE_STATUS = 'storage_status'

export const API_PERIOD_PROPERTY = 'temporal_spread'
export const API_START_DATE_PROPERTY = 'start_date'
export const API_END_DATE_PROPERTY = 'end_date'

// -------------------------------------------------------------------------------------------------
// Metadata properties: access condition / licence
// -------------------------------------------------------------------------------------------------
export const API_ACCESS_CONDITION = 'access_condition'
export const API_CONFIDENTIALITY = 'confidentiality'
export const API_RESTRICTED_ACCESS = 'restricted_access'

export const API_LICENCE = 'licence'
export const API_LICENCE_TYPE = 'licence_type'
export const API_LICENCE_LABEL = 'licence_label'
export const API_LICENCE_CUSTOM_LABEL = 'custom_licence_label'
export const API_LICENCE_CUSTOM_URI = 'custom_licence_uri'

// -------------------------------------------------------------------------------------------------
// Dates
// -------------------------------------------------------------------------------------------------
export const API_DATES_CREATED = 'created'
export const API_DATES_EDITED = 'updated'
export const API_DATES_PUBLISHED = 'published'
export const API_DATES_VALIDATED = 'validated'
export const API_DATES_DELETED = 'deleted'
export const API_DATES_EXPIRES = 'expires'

export const getCreatedDate = (metadata) => {
  if (metadata?.[DB_CREATED_AT]) return dateToIso(metadata[DB_CREATED_AT])
  if (metadata?.[API_METAINFO_PROPERTY]?.[API_METAINFO_DATES])
    return dateToIso(metadata[API_METAINFO_PROPERTY][API_METAINFO_DATES][API_DATES_CREATED])
  throw new Error(`Property not found: '${API_DATES_CREATED}'`)
}

export const getUpdatedDate = (metadata) => {
  if (metadata?.[DB_UPDATED_AT]) return dateToIso(metadata[DB_UPDATED_AT])
  if (metadata?.[API_METAINFO_PROPERTY]?.[API_METAINFO_DATES])
    return dateToIso(metadata[API_METAINFO_PROPERTY][API_METAINFO_DATES][API_DATES_EDITED])
  throw new Error(`Property not found: '${API_DATES_EDITED}'`)
}

export const getPublishedDate = (metadata) => {
  if (metadata?.[DB_PUBLISHED_AT]) return dateToIso(metadata[DB_PUBLISHED_AT])
  if (metadata?.[API_METAINFO_PROPERTY]?.[API_METAINFO_DATES])
    return dateToIso(metadata[API_METAINFO_PROPERTY][API_METAINFO_DATES][API_DATES_PUBLISHED])
  throw new Error(`Property not found: '${API_DATES_PUBLISHED}'`)
}

export const setPublishedDate = (metadata, datePublished) => {
  if (metadata?.[DB_PUBLISHED_AT]) metadata[DB_PUBLISHED_AT] = dateToIso(datePublished)
  if (metadata?.[API_METAINFO_PROPERTY]?.[API_METAINFO_DATES]) {
    metadata[API_METAINFO_PROPERTY][API_METAINFO_DATES][API_DATES_PUBLISHED] =
      dateToIso(datePublished)
    return metadata
  } else throw new Error(`Property not found: '${API_DATES_PUBLISHED}'`)
}

export const delPublishedDate = (metadata) => {
  if (metadata?.[DB_PUBLISHED_AT]) delete metadata[DB_PUBLISHED_AT]
  if (metadata?.[API_METAINFO_PROPERTY]?.[API_METAINFO_DATES]?.[API_DATES_PUBLISHED]) {
    delete metadata[API_METAINFO_PROPERTY][API_METAINFO_DATES][API_DATES_PUBLISHED]
  }
  return metadata
}

// -------------------------------------------------------------------------------------------------
// Specific fields
// -------------------------------------------------------------------------------------------------
export const API_PURPOSE = 'purpose'
export const API_COLLECTION_TAG = 'collection_tag'
export const API_INTEGRATION_ERROR_ID = 'integration_error_id'

// -------------------------------------------------------------------------------------------------
// Properties with restricted values
// -------------------------------------------------------------------------------------------------
export const API_THEME_PROPERTY = 'theme'
export const API_KEYWORDS_PROPERTY = 'keywords'
export const API_LANGUAGES_PROPERTY = 'resource_languages'

//=================================================================================================

// -------------------------------------------------------------------------------------------------
// Organization properties
// -------------------------------------------------------------------------------------------------
export const API_ORGANIZATION_NAME = 'organization_name'
export const API_ORGANIZATION_ADDRESS = 'organization_address'
export const API_ORGANIZATION_COORDINATES = 'organization_coordinates'
export const API_ORGANIZATION_CAPTION = 'organization_caption'
export const API_ORGANIZATION_SUMMARY = 'organization_summary'

// -------------------------------------------------------------------------------------------------
// Contact properties
// -------------------------------------------------------------------------------------------------
export const API_CONTACT_NAME = 'contact_name'
export const API_CONTACT_ROLE = 'role'
export const API_CONTACT_SUMMARY = 'contact_summary'
export const API_CONTACT_MAIL = 'email'

// -------------------------------------------------------------------------------------------------
// Media properties
// -------------------------------------------------------------------------------------------------
export const API_MEDIA_TYPE = 'media_type'
export const API_MEDIA_NAME = 'media_name'
export const API_MEDIA_CAPTION = 'media_caption'
export const API_MEDIA_DATES = 'media_dates'
export const API_MEDIA_CONNECTOR = 'connector'
export const API_MEDIA_INTERFACE_CONTRACT = 'interface_contract'
export const API_MEDIA_CONNECTOR_PARAMS = 'connector_parameters'
export const API_MEDIA_VISUAL = 'media_visual'
// export const API_MEDIA_THUMBNAIL = 'media_thumbnail'
// export const API_MEDIA_SATELLITES = 'descriptive_medias'

export const API_FILE_MIME = 'file_type'
export const API_FILE_SIZE = 'file_size'
export const API_FILE_CHECKSUM = 'checksum'
export const API_FILE_STRUCTURE = 'file_structure'
export const API_FILE_ENCODING = 'file_encoding'
export const API_FILE_STORAGE_STATUS = 'file_storage_status'
export const API_FILE_STATUS_UPDATE = 'file_status_update'

// -------------------------------------------------------------------------------------------------
// Public key properties
// -------------------------------------------------------------------------------------------------
export const API_PUB_ID = 'name'
export const API_PUB_NAME = 'name'
export const API_PUB_URL = 'url'
export const API_PUB_PROP = 'prop'
export const API_PUB_PEM = 'pem'
export const API_PUB_KEY = 'key'
export const API_PUB_TYPE = 'type'

//=================================================================================================

// -------------------------------------------------------------------------------------------------
// Integration reports
// -------------------------------------------------------------------------------------------------
export const API_REPORT_ID = 'report_id'
export const API_REPORT_RESOURCE_ID = 'resource_id'
export const API_REPORT_STATUS = 'integration_status'
export const API_REPORT_ERRORS = 'integration_errors'
export const API_REPORT_VERSION = 'version'
export const API_REPORT_SUBMISSION_DATE = 'submission_date'
export const API_REPORT_TREATMENT_DATE = 'treatment_date'
export const API_REPORT_METHOD = 'method'
export const API_REPORT_COMMENT = 'comment'
export const API_REPORT_FIELD = 'field_name'
export const API_REPORT_ERROR_MSG = 'error_message'
export const API_REPORT_ERROR_CODE = 'error_code'
export const LOCAL_REPORT_ERROR = 'report_treatment_error'
export const LOCAL_REPORT_ERROR_TYPE = 'error_type'
export const LOCAL_REPORT_ERROR_MSG = 'error_message'

// -------------------------------------------------------------------------------------------------
// Log entries
// -------------------------------------------------------------------------------------------------
export const LOG_ID = 'entry_id'
export const LOG_TIME = 'time'
export const LOG_MSG = 'message'
export const LOG_LVL = 'log_level'
export const LOG_MOD = 'location_module'
export const LOG_FUN = 'location_function'
export const LOG_USR = 'user_address'

// -------------------------------------------------------------------------------------------------
// SKOS
// -------------------------------------------------------------------------------------------------
// ID properties
export const API_SKOS_SCHEME_ID = 'scheme_id'
export const API_SKOS_SCHEME_CODE = 'scheme_code'

export const API_SKOS_CONCEPT_ID = 'concept_id'
export const API_SKOS_CONCEPT_CODE = 'concept_code'
export const API_SKOS_CONCEPT_ROLE = 'concept_role'

// Scheme fields referencing Concepts
export const API_SCHEME_TOPS_PROPERTY = 'top_concepts'

// Concept fields referencing a Scheme
export const API_CONCEPT_CLASS_PROPERTY = 'of_scheme'

// Concept fields referencing other Concepts
export const API_CONCEPT_PARENTS_PROPERTY = 'broader_concepts'
export const API_CONCEPT_CHILDREN_PROPERTY = 'narrower_concepts'
export const API_CONCEPT_SIBLINGS_PROPERTY = 'siblings_concepts'
export const API_CONCEPT_RELATIVE_PROPERTY = 'relative_concepts'

// Thesaurus: dictionary entries
export const DICT_LANG = 'lang'
export const DICT_TEXT = 'text'

// Licences types
export const LicenceTypes = {
  Standard: 'STANDARD',
  Custom: 'CUSTOM',
}
export const LICENCE_SCHEME_CODE = 'software_licences'
export const LICENCE_CONCEPT_ROLE = 'licence'
