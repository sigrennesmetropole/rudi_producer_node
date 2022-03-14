// ------------------------------------------------------------------------------------------------
// API version
// ------------------------------------------------------------------------------------------------
exports.API_VERSION = '1.2.0'

// ------------------------------------------------------------------------------------------------
// REQ methods
// ------------------------------------------------------------------------------------------------
exports.HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
}

// ------------------------------------------------------------------------------------------------
// REQ parameters
// ------------------------------------------------------------------------------------------------
exports.DEFAULT_LANG = 'fr'

// --- "In path" parameters
exports.PARAM_OBJECT = 'object'
exports.PARAM_ID = 'id'
exports.PARAM_REPORT_ID = 'irid'

// --- "Objects" parameters
exports.OBJ_METADATA = 'resources'
exports.OBJ_ORGANIZATIONS = 'organizations'
exports.OBJ_CONTACTS = 'contacts'
exports.OBJ_MEDIA = 'media'
exports.OBJ_SKOS_SCHEMES = 'skos_schemes'
exports.OBJ_SKOS_SCHEMES_CAML = 'skosSchemes'
exports.OBJ_SKOS_CONCEPTS = 'skos_concepts'
exports.OBJ_SKOS_CONCEPTS_CAML = 'skosConcepts'
exports.OBJ_REPORTS = 'reports'
exports.OBJ_LOGS = 'logs'
exports.OBJ_LICENCES = 'licences'

// --- "In query" parameters
exports.QUERY_LIMIT = 'limit'
exports.QUERY_OFFSET = 'offset'
exports.QUERY_FILTER = 'filter'
exports.QUERY_FIELDS = 'fields'
exports.QUERY_SORT_BY = 'sort_by'
exports.QUERY_SORT_BY_CAML = 'sortBy'
exports.QUERY_COUNT_BY = 'count_by'
exports.QUERY_COUNT_BY_CAML = 'countBy'
exports.QUERY_GROUP_BY = 'group_by'
exports.QUERY_GROUP_BY_CAML = 'groupBy'
exports.QUERY_GROUP_LIMIT = 'group_limit'
exports.QUERY_GROUP_LIMIT_CAML = 'groupLimit'
exports.QUERY_GROUP_OFFSET = 'group_offset'
exports.QUERY_GROUP_OFFSET_CAML = 'groupOffset'
exports.QUERY_UPDATED_AFTER = 'updated_after'
exports.QUERY_UPDATED_AFTER_CAML = 'updatedAfter'
exports.QUERY_UPDATED_BEFORE = 'updated_before'
exports.QUERY_UPDATED_BEFORE_CAML = 'updatedBefore'
exports.QUERY_CONFIRM = 'confirm'

exports.QUERY_SEARCH_TERMS = 'searchTerms'

exports.COUNT_LABEL = 'total'
exports.LIST_LABEL = 'items'

exports.DEFAULT_QUERY_LIMIT = 100
exports.DEFAULT_QUERY_OFFSET = 0

exports.MAX_QUERY_LIMIT = 500

// ------------------------------------------------------------------------------------------------
// REQ URL
// ------------------------------------------------------------------------------------------------
exports.URL_PREFIX_PUBLIC = '/api/v1'

// This generic URL will be used to factorize the treatments on resources, organizations, contacts, etc.
exports.URL_PUB_METADATA = `${this.URL_PREFIX_PUBLIC}/${this.OBJ_METADATA}`

exports.ACT_UUID_GEN = 'id_generation'
exports.ACT_INIT = 'init'
exports.ACT_SIGN = 'sign'
exports.ACT_DELETION = 'deletion'
exports.ACT_UNLINKED = 'unlinked'
exports.ACT_REPORT = 'report'
exports.ACT_SEARCH = 'search'
exports.ACT_SEND = 'send'

// ------------------------------------------------------------------------------------------------
// DB actions
// ------------------------------------------------------------------------------------------------

exports.URL_OBJECTS = [
  this.OBJ_METADATA,
  this.OBJ_ORGANIZATIONS,
  this.OBJ_CONTACTS,
  this.OBJ_MEDIA,
  this.OBJ_SKOS_CONCEPTS,
  this.OBJ_SKOS_SCHEMES,
  this.OBJ_REPORTS,
  this.OBJ_LOGS,
]

exports.URL_PREFIX_PRIVATE = '/api/admin'

const URL_SUFFIX_PORTAL = 'portal'
const URL_SUFFIX_DB = 'db'
const URL_SUFFIX_THESAURUS = 'enum'
const URL_SUFFIX_LICENCE_CODES = 'licence_codes'

exports.URL_SUFFIX_TOKEN_GET = 'token'
exports.URL_SUFFIX_TOKEN_CHECK = 'check'
exports.URL_SUFFIX_GIT_HASH = 'hash'
exports.URL_SUFFIX_APP_HASH = 'apphash'
exports.URL_SUFFIX_APP_ENV = 'env'
exports.URL_SUFFIX_NODE_VERSION = 'nv'
exports.URL_LICENCE_SUFFIX = this.OBJ_LICENCES

exports.PARAM_THESAURUS_CODE = 'code'
exports.PARAM_THESAURUS_LANG = 'lang'
exports.PARAM_LOGS_LINES = 'lines'

exports.URL_PV_PORTAL_PREFIX = `${this.URL_PREFIX_PRIVATE}/${URL_SUFFIX_PORTAL}`
exports.URL_PV_TOKEN_ACCESS = `${this.URL_PV_PORTAL_PREFIX}/${this.URL_SUFFIX_TOKEN_GET}`
exports.URL_PV_TOKEN_CHECK_ACCESS = `${this.URL_PV_TOKEN_ACCESS}/${this.URL_SUFFIX_TOKEN_CHECK}`

exports.URL_PV_LOGS_ACCESS = `${this.URL_PREFIX_PRIVATE}/${this.OBJ_LOGS}`
exports.URL_PV_GIT_HASH_ACCESS = `${this.URL_PREFIX_PRIVATE}/${this.URL_SUFFIX_GIT_HASH}`
exports.URL_PV_APP_HASH_ACCESS = `${this.URL_PREFIX_PRIVATE}/${this.URL_SUFFIX_APP_HASH}`
exports.URL_PUB_API_VERSION = `/api/version`
exports.URL_PV_APP_ENV_ACCESS = `${this.URL_PREFIX_PRIVATE}/${this.URL_SUFFIX_APP_ENV}`
exports.URL_PV_NODE_VERSION_ACCESS = `${this.URL_PREFIX_PRIVATE}/${this.URL_SUFFIX_NODE_VERSION}`

exports.URL_PV_DB_ACCESS = `${this.URL_PREFIX_PRIVATE}/${URL_SUFFIX_DB}`
exports.URL_PV_OBJECT_GENERIC = `${this.URL_PREFIX_PRIVATE}/:${this.PARAM_OBJECT}`

exports.URL_PV_THESAURUS_ACCESS = `${this.URL_PREFIX_PRIVATE}/${URL_SUFFIX_THESAURUS}`
exports.URL_PV_LICENCE_ACCESS = `${this.URL_PREFIX_PRIVATE}/${this.URL_LICENCE_SUFFIX}`
exports.URL_PV_LICENCE_CODES_ACCESS = `${this.URL_PREFIX_PRIVATE}/${URL_SUFFIX_LICENCE_CODES}`

// ------------------------------------------------------------------------------------------------
// Syslog places
// ------------------------------------------------------------------------------------------------
exports.ROUTE_NAME = 'routeName'

// ------------------------------------------------------------------------------------------------
// Errors trace
// ------------------------------------------------------------------------------------------------
exports.STATUS_CODE = 'statusCode'

exports.TRACE = 'errTrace'
exports.TRACE_MOD = 'mod'
exports.TRACE_FUN = 'fun'
exports.TRACE_ERR = 'err'

exports.MONGO_ERROR = 'MongoServerError'
