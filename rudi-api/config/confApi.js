// -------------------------------------------------------------------------------------------------
// API version
// -------------------------------------------------------------------------------------------------
export const API_VERSION = '1.3.2'
export const USER_AGENT = `Rudi-Producer ${API_VERSION}`
export const PORTAL_API_VERSION = '1.3.0'

// -------------------------------------------------------------------------------------------------
// REQ methods
// -------------------------------------------------------------------------------------------------
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
}

// -------------------------------------------------------------------------------------------------
// REQ parameters
// -------------------------------------------------------------------------------------------------
export const DEFAULT_LANG = 'fr'

// --- "In path" parameters
export const PARAM_OBJECT = 'object'
export const PARAM_ID = 'id'
export const PARAM_PROP = 'prop'
export const PARAM_REPORT_ID = 'irid'

// --- "Objects" parameters
export const OBJ_METADATA = 'resources'
export const OBJ_ORGANIZATIONS = 'organizations'
export const OBJ_CONTACTS = 'contacts'
export const OBJ_MEDIA = 'media'
export const OBJ_SKOS_SCHEMES = 'skos_schemes'
export const OBJ_SKOS_SCHEMES_CAML = 'skosSchemes'
export const OBJ_SKOS_CONCEPTS = 'skos_concepts'
export const OBJ_SKOS_CONCEPTS_CAML = 'skosConcepts'
export const OBJ_REPORTS = 'reports'
export const OBJ_LOGS = 'logs'
export const OBJ_LICENCES = 'licences'
export const OBJ_PUB_KEYS = 'pub_keys'
export const OBJ_PUB_KEYS_CAML = 'pubKeys'

// --- "In query" parameters
export const QUERY_LANG = 'lang'
export const QUERY_LIMIT = 'limit'
export const QUERY_OFFSET = 'offset'
export const QUERY_FILTER = 'filter'
export const QUERY_FIELDS = 'fields'
export const QUERY_SORT_BY = 'sort_by'
export const QUERY_SORT_BY_CAML = 'sortBy'
export const QUERY_COUNT_BY = 'count_by'
export const QUERY_COUNT_BY_CAML = 'countBy'
export const QUERY_GROUP_BY = 'group_by'
export const QUERY_GROUP_BY_CAML = 'groupBy'
export const QUERY_GROUP_LIMIT = 'group_limit'
export const QUERY_GROUP_LIMIT_CAML = 'groupLimit'
export const QUERY_GROUP_OFFSET = 'group_offset'
export const QUERY_GROUP_OFFSET_CAML = 'groupOffset'
export const QUERY_UPDATED_AFTER = 'updated_after'
export const QUERY_UPDATED_AFTER_CAML = 'updatedAfter'
export const QUERY_UPDATED_BEFORE = 'updated_before'
export const QUERY_UPDATED_BEFORE_CAML = 'updatedBefore'
export const QUERY_TREATED_BEFORE = 'treated_before'
export const QUERY_TREATED_BEFORE_CAML = 'treatedBefore'
export const QUERY_SUBMITTED_BEFORE = 'submitted_before'
export const QUERY_SUBMITTED_BEFORE_CAML = 'submittedBefore'
export const QUERY_CONFIRM = 'confirm'

export const QUERY_SEARCH_TERMS = 'searchTerms'

export const COUNT_LABEL = 'total'
export const LIST_LABEL = 'items'
export const TIME_LABEL = 'time'

export const DEFAULT_QUERY_LIMIT = 100
export const DEFAULT_QUERY_OFFSET = 0

export const MAX_QUERY_LIMIT = 500

// -------------------------------------------------------------------------------------------------
// REQ URL
// -------------------------------------------------------------------------------------------------
export const URL_PREFIX_PUBLIC = '/api/v1'
export const URL_PREFIX_PRIVATE = '/api/admin'

// This generic URL will be used to factorize the treatments on resources, organizations, contacts, etc.
export const URL_PUB_METADATA = `${URL_PREFIX_PUBLIC}/${OBJ_METADATA}`

export const ACT_UUID_GEN = 'id_generation'
export const ACT_INIT = 'init'
export const ACT_SIGN = 'sign'
export const ACT_DELETION = 'deletion'
export const ACT_UNLINKED = 'unlinked'
export const ACT_REPORT = 'report'
export const ACT_SEARCH = 'search'
export const ACT_EXT_SEARCH = 'ext_search'
export const ACT_SEND = 'send'
export const ACT_COMMIT = 'commit'

export const ACT_CHECK = 'check'

// -------------------------------------------------------------------------------------------------
// Body parameters
// -------------------------------------------------------------------------------------------------
export const BODY_PUB_KEY_URL = 'url'
export const BODY_PUB_KEY_NAME = 'name'
export const BODY_PUB_KEY_PROP = 'prop'

// -------------------------------------------------------------------------------------------------
// DB actions
// -------------------------------------------------------------------------------------------------
export const URL_OBJECTS = [
  OBJ_METADATA,
  OBJ_ORGANIZATIONS,
  OBJ_CONTACTS,
  OBJ_MEDIA,
  OBJ_SKOS_CONCEPTS,
  OBJ_SKOS_CONCEPTS_CAML,
  OBJ_SKOS_SCHEMES,
  OBJ_SKOS_SCHEMES_CAML,
  OBJ_PUB_KEYS,
  OBJ_PUB_KEYS_CAML,
  OBJ_REPORTS,
  OBJ_LOGS,
]

export const URL_SUFFIX_PORTAL = 'portal'
export const URL_SUFFIX_NODE = 'node'
export const URL_SUFFIX_DB = 'db'
export const URL_SUFFIX_THESAURUS = 'enum'
export const URL_SUFFIX_LICENCE_CODES = 'licence_codes'

export const URL_SUFFIX_AUTH = 'auth'
export const URL_SUFFIX_PUB_KEY = 'pub'
export const URL_SUFFIX_TOKEN_GET = 'token'
export const URL_SUFFIX_TOKEN_CHECK = 'check'
export const URL_SUFFIX_GIT_HASH = 'hash'
export const URL_SUFFIX_APP_HASH = 'apphash'
export const URL_SUFFIX_APP_ENV = 'env'
export const URL_SUFFIX_NODE_VERSION = 'nv'
export const URL_LICENCE_SUFFIX = OBJ_LICENCES

export const PARAM_THESAURUS_CODE = 'code'
export const PARAM_THESAURUS_LANG = 'lang'
export const PARAM_LOGS_LINES = 'lines'

export const URL_PV_PORTAL_PREFIX = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_PORTAL}`
export const URL_PV_TOKEN_ACCESS = `${URL_PV_PORTAL_PREFIX}/${URL_SUFFIX_TOKEN_GET}`
export const URL_PV_TOKEN_CHECK_ACCESS = `${URL_PV_TOKEN_ACCESS}/${URL_SUFFIX_TOKEN_CHECK}`

export const URL_PV_LOGS_ACCESS = `${URL_PREFIX_PRIVATE}/${OBJ_LOGS}`
export const URL_PV_GIT_HASH_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_GIT_HASH}`
export const URL_PV_APP_HASH_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_APP_HASH}`
export const URL_PUB_API_VERSION = '/api/version'
export const URL_PV_APP_ENV_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_APP_ENV}`
export const URL_PV_NODE_VERSION_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_NODE_VERSION}`

export const URL_PV_DB_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_DB}`
export const URL_PV_OBJECT_GENERIC = `${URL_PREFIX_PRIVATE}/:${PARAM_OBJECT}`

export const URL_PV_THESAURUS_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_THESAURUS}`
export const URL_PV_LICENCE_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_LICENCE_SUFFIX}`
export const URL_PV_LICENCE_CODES_ACCESS = `${URL_PREFIX_PRIVATE}/${URL_SUFFIX_LICENCE_CODES}`

export const URL_PREFIX_CHECK = `${URL_PREFIX_PRIVATE}/${ACT_CHECK}`

// -------------------------------------------------------------------------------------------------
// Syslog places
// -------------------------------------------------------------------------------------------------
export const ROUTE_NAME = 'routeName'
export const ROUTE_OPT = 'routeOpt'

// -------------------------------------------------------------------------------------------------
// Errors trace
// -------------------------------------------------------------------------------------------------
export const STATUS_CODE = 'statusCode'

export const TRACE = 'errTrace'
export const TRACE_MOD = 'mod'
export const TRACE_FUN = 'fun'
export const TRACE_ERR = 'err'

export const ERR_PATH = 'path'

export const MONGO_ERROR = 'MongoServerError'
