'use strict'

const mod = 'routes'

// ------------------------------------------------------------------------------------------------
// External dependencies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')

// ------------------------------------------------------------------------------------------------
// Swagger documentation
// ------------------------------------------------------------------------------------------------
// const documentation = require('./documentation/metadataApi')

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------
const genericController = require('../controllers/genericController')
const metadataController = require('../controllers/metadataController')
const reportController = require('../controllers/reportController')

const dbController = require('../controllers/dbController')
const sysController = require('../controllers/sysController')
const { getLogs, searchLogs } = require('../controllers/logController')
const skosController = require('../controllers/skosController')
const licenceController = require('../controllers/licenceController')

// const devController = require('../controllers/testController')
const portalController = require('../controllers/portalController')

// ------------------------------------------------------------------------------------------------
// API request constants
// ------------------------------------------------------------------------------------------------
const {
  URL_PUB_API_VERSION,
  URL_PREFIX_PUBLIC,
  URL_PUB_METADATA,
  URL_PREFIX_PRIVATE,
  URL_PV_DB_ACCESS,
  URL_PV_LOGS_ACCESS,
  URL_PV_GIT_HASH_ACCESS,
  URL_PV_APP_HASH_ACCESS,
  URL_PV_APP_ENV_ACCESS,
  URL_PV_THESAURUS_ACCESS,
  URL_PV_NODE_VERSION_ACCESS,
  URL_PV_LICENCE_ACCESS,
  URL_PV_LICENCE_CODES_ACCESS,
  URL_PV_PORTAL_PREFIX,
  URL_PV_OBJECT_GENERIC,
  URL_SUFFIX_TOKEN_GET,
  URL_SUFFIX_TOKEN_CHECK,
  PARAM_ID,
  PARAM_OBJECT,
  PARAM_REPORT_ID,
  PARAM_THESAURUS_CODE,
  PARAM_THESAURUS_LANG,
  OBJ_METADATA,
  OBJ_REPORTS,
  ACT_INIT,
  ACT_REPORT,
  ACT_DELETION,
  ACT_UUID_GEN,
  ACT_SEARCH,
  ROUTE_NAME,
  HTTP_METHODS,
  ACT_SEND,
} = require('../config/confApi')

// ------------------------------------------------------------------------------------------------
// Route names
// ------------------------------------------------------------------------------------------------

const REDIRECT_GET_DATA = 'redir_pub_metadata'
const REDIRECT_GET_PLUS = 'redir_pub_metadata'
const REDIRECT_PUT_PLUS = 'redir_pub_metadata'

const PUB_GET_FAVICON = 'pub_get_favicon'
const PUB_GET_API_VERSION = 'pub_get_api_version'
const PUB_GET_ALL_METADATA = 'pub_get_all_metadata'
const PUB_GET_ONE_METADATA = 'pub_get_one_metadata'
const PUB_RCH_OBJ = 'pub_rch_obj'

const PORTAL_UPSERT_ONE_REPORT = 'portal_upsert_one_report'
const PORTAL_GET_ALL_OBJ_REPORT = 'portal_get_all_obj_report'
const PORTAL_GET_ONE_OBJ_REPORT = 'portal_get_one_obj_report'

const PRV_ADD_ONE = 'prv_add_one'
const PRV_UPSERT_ONE = 'prv_upsert_one'
const PRV_GET_ALL = 'prv_get_all'
const PRV_GET_ONE = 'prv_get_one'
const PRV_DEL_ONE = 'prv_del_one'
const PRV_DEL_MANY = 'prv_del_many'
const PRV_DEL_LIST = 'prv_del_list'

const PRV_RCH_OBJ = 'prv_rch_obj'

const PRV_ADD_OBJ_REPORT = 'prv_add_obj_report'
const PRV_UPSERT_OBJ_REPORT = 'prv_upsert_obj_report'
const PRV_GET_OBJ_REPORT_LIST = 'prv_get_obj_report_list'
const PRV_GET_ONE_OBJ_REPORT = 'prv_get_one_obj_report'
const PRV_GET_ALL_OBJ_REPORT = 'prv_get_all_obj_report'
const PRV_DEL_OBJ_REPORT = 'prv_del_obj_report'
const PRV_DEL_ALL_OBJ_REPORT = 'prv_del_all_obj_report'
const PRV_DEL_LIST_OBJ_REPORT = 'prv_del_list_obj_report'

const DEV_GET_EVERY_THESAURUS = 'dev_get_every_thesaurus'
const DEV_GET_SINGLE_THESAURUS = 'dev_get_single_thesaurus'
const DEV_GET_ALL_LICENCES = 'dev_get_all_licences'
const DEV_GET_ALL_LICENCE_CODES = 'dev_get_all_licence_codes'
const DEV_INIT_LICENCES = 'dev_init_licences'
const DEV_INIT_WITH_ODR = 'dev_init_with_odr'
const DEV_GENERATE_UUID = 'dev_generate_uuid'
const DEV_GET_PORTAL_TOKEN = 'dev_get_portal_token'
const DEV_CHECK_STORED_TOKEN = 'dev_check_stored_token'
const DEV_GET_PORTAL_METADATA = 'dev_get_portal_metadata'
const DEV_SEND_METADATA_TO_PORTAL = 'dev_send_metadata_to_portal'
const DEV_SEND_MANY_METADATA_TO_PORTAL = 'dev_send_many_metadata_to_portal'
const DEV_DEL_PORTAL_METADATA = 'dev_del_portal_metadata'
const DEV_GET_GIT_HASH = 'dev_get_git_hash'
const DEV_GET_APP_HASH = 'dev_get_app_hash'
const DEV_GET_NODE_VERSION = 'dev_get_node_version'
const DEV_GET_APP_ENV = 'dev_get_app_env'
const DEV_GET_LOGS = 'dev_get_logs'
const DEV_SEARCH_LOGS = 'dev_search_logs'
const DEV_GET_COLLECTIONS = 'dev_get_collections'
const DEV_DROP_COLLECTION = 'dev_drop_collection'
const DEV_DROP_DB = 'dev_drop_db'

// ------------------------------------------------------------------------------------------------
// Free routes (no authentification required)
// ------------------------------------------------------------------------------------------------
exports.publicRoutes = [
  // ------------------------------------------------------------------------------------------------
  // Accessing app info
  // ------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `/favicon.png`,
    handler: sysController.serveFavicon,
    config: { [ROUTE_NAME]: PUB_GET_FAVICON },
  },

  // ------------------------------------------------------------------------------------------------
  // Generic routes for accessing metadata
  // ------------------------------------------------------------------------------------------------
  /*
   * @oas [get] /api/v1/resources
   * description: 'Access all metadata on the RUDI producer node'
   * parameters:
   *   - (query) limit {Integer:int32} The number of resources to return
   */
  {
    method: HTTP_METHODS.GET,
    url: URL_PUB_METADATA,
    handler: genericController.getMetadataListAndCount,
    config: { [ROUTE_NAME]: PUB_GET_ALL_METADATA },
  },
  /*
   * @oas [get] /api/v1/resources/{metaId}
   * description: 'Access one identified metadata'
   * parameters:
   *   - (path) metaId=bf4895c4-bf41-4f59-a4c7-14e1cb315d04 {String:UUIDv4} The metadata UUID
   *   - (query) limit {Integer:int32} The maximum number of metadata in the result set
   *      (default = 100, max = 500)
   *   - (query) offset {Integer:int32} The number of metadata to skip before starting to collect
   *      the result set (default = 0)
   *   - (query) fields {String} Comma-separated properties that are kept for displaying the
   *      elements of the result set
   *   - (query) sort_by {String} Comma-separated properties tused to order the metadata in the
   *      result set, ordered by decreasing priority. A minus sign before the field name means
   *      metadata will be sorted by decreasing values over this particular field
   *   - (query) updated_after {String:date} The date after which the listed metadata were updated
   *   - (query) updated_before {String:date} The date before which the listed metadata were updated
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}`,
    handler: metadataController.getSingleMetadata,
    config: { [ROUTE_NAME]: PUB_GET_ONE_METADATA },
  },

  /**
   * Search objects
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/${ACT_SEARCH}`,
    handler: metadataController.searchMetadata,
    config: { [ROUTE_NAME]: PUB_RCH_OBJ },
  },
  /*
   * @oas [get] /api/version
   * tags:
   * - free
   * security:
   * - authRudi: [portal]
   * description: 'Get current API version'
   * responses:
   *   '200':
   *     description: 'The API version'
   *     content:
   *       'text/plain; charset=utf-8':
   *         schema:
   *           type: 'string'
   *         examples:
   *            ' ':
   *              value: '1.2.3'
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_API_VERSION}`,
    handler: sysController.getApiVersion,
    config: { [ROUTE_NAME]: PUB_GET_API_VERSION },
  },

  // redirection: GET /api -> GET /api/v1/resources
  {
    method: HTTP_METHODS.GET,
    url: `/api`,
    config: { [ROUTE_NAME]: REDIRECT_GET_DATA },
    handler: function (req, reply) {
      log.d(mod, `redirect`, `${req.method} ${URL_PUB_METADATA}`)
      reply.redirect(URL_PUB_METADATA)
    },
  },
  // redirection: GET /api/v1 -> GET /api/v1/resources
  {
    method: HTTP_METHODS.GET,
    url: '/api/v1',
    config: { [ROUTE_NAME]: REDIRECT_GET_DATA },
    handler: function (req, reply) {
      log.d(mod, `redirect`, `${req.method} ${URL_PUB_METADATA}`)
      reply.redirect(URL_PUB_METADATA)
    },
  },
  // redirection: GET /resources -> GET /api/v1/resources
  {
    method: HTTP_METHODS.GET,
    url: `/${OBJ_METADATA}`,
    config: { [ROUTE_NAME]: REDIRECT_GET_DATA },
    handler: function (req, reply) {
      const newRoute = `${URL_PREFIX_PUBLIC}${req.url}`
      log.d(mod, `redirect`, `${req.method} ${newRoute}`)
      reply.redirect(308, newRoute)
    },
  },
  // redirection: GET /resources/:id -> GET /api/v1/resources/:id
  {
    method: HTTP_METHODS.GET,
    url: `/${OBJ_METADATA}/:${PARAM_ID}`,
    config: { [ROUTE_NAME]: REDIRECT_GET_DATA },
    handler: function (req, reply) {
      const newRoute = `${URL_PREFIX_PUBLIC}${req.url}`
      log.d(mod, `redirect`, `${req.method} ${newRoute}`)
      reply.redirect(308, newRoute)
    },
  },
]
// ------------------------------------------------------------------------------------------------
// 'Public' routes (Portal authentification required)
// ------------------------------------------------------------------------------------------------
exports.portalRoutes = [
  // Routes accessed by RUDI Portal:
  // /resources GET
  // /resources/{id} GET
  // /resources/{id}/report PUT

  // ------------------------------------------------------------------------------------------------
  // Integration reports for one particular object
  // ------------------------------------------------------------------------------------------------

  // Add/edit 1 report for one object integration
  {
    method: HTTP_METHODS.PUT,
    url: `/${OBJ_METADATA}/:${PARAM_ID}/${ACT_REPORT}`,
    handler: reportController.addOrEditSingleReportForMetadata,
    config: { [ROUTE_NAME]: PORTAL_UPSERT_ONE_REPORT },
  },

  // Add/edit 1 report for one object integration
  {
    method: HTTP_METHODS.PUT,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`,
    handler: reportController.addOrEditSingleReportForMetadata,
    config: { [ROUTE_NAME]: PORTAL_UPSERT_ONE_REPORT },
  },

  // Get all reports for one object integration
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`,
    handler: reportController.getReportListForMetadata,
    config: { [ROUTE_NAME]: PORTAL_GET_ALL_OBJ_REPORT },
  },
  // Get 1 report for one object integration
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`,
    handler: reportController.getSingleReportForMetadata,
    config: { [ROUTE_NAME]: PORTAL_GET_ONE_OBJ_REPORT },
  },

  // Redirection for getting integration reports
  {
    method: HTTP_METHODS.GET,
    url: `/${OBJ_METADATA}/:${PARAM_ID}/*`,
    config: { [ROUTE_NAME]: REDIRECT_GET_PLUS },
    handler: function (req, reply) {
      const newRoute = `${URL_PREFIX_PUBLIC}${req.url}`
      log.d(mod, `redirect`, `${req.method} ${newRoute}`)
      reply.redirect(308, newRoute)
    },
  },
  // Redirection for adding an integration report
  {
    method: HTTP_METHODS.PUT,
    url: `/${OBJ_METADATA}/*`,
    config: { [ROUTE_NAME]: REDIRECT_PUT_PLUS },
    handler: function (req, reply) {
      const newRoute = `${URL_PREFIX_PUBLIC}${req.url}`
      log.d(mod, `redirect`, `${req.method} ${newRoute}`)
      reply.redirect(308, newRoute)
    },
  },
]

// ------------------------------------------------------------------------------------------------
// Private routes
// ------------------------------------------------------------------------------------------------
/**
 * Routes that don't need a JWT check (to be accessed by internal programs)
 */
exports.unrestrictedPrivateRoutes = [
  /*
   * @oas [get] /api/admin/hash
   * scope: public
   * description: 'Get current git hash'
   * responses:
   *   '200':
   *     description: 'The API version'
   *     content:
   *       'text/plain; charset=utf-8':
   *         schema:
   *           type: 'string'
   *         examples:
   *           'gitHash':
   *              value: '0e636d4'
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_GIT_HASH_ACCESS}`,
    handler: sysController.getGitHash,
    config: { [ROUTE_NAME]: DEV_GET_GIT_HASH },
  },
  /*
   * @oas [get] /api/admin/apphash
   * scope: public
   * description: 'Get current git hash from the running application'
   * responses:
   *   '200':
   *     description: 'The API version'
   *     content:
   *       'text/plain; charset=utf-8':
   *         schema:
   *           type: 'string'
   *         examples:
   *           'appHash':
   *              value: '0e636d4'
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_APP_HASH_ACCESS}`,
    handler: sysController.getAppHash,
    config: { [ROUTE_NAME]: DEV_GET_APP_HASH },
  },
  /*
   * @oas [get] /api/admin/env
   * scope: public
   * description: 'Get environment version of the running application'
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_APP_ENV_ACCESS}`,
    handler: sysController.getEnvironment,
    config: { [ROUTE_NAME]: DEV_GET_APP_ENV },
  },
]
exports.backOfficeRoutes = [
  // ------------------------------------------------------------------------------------------------
  // Generic routes for accessing any object
  // ('Metadata', 'Organizations' and 'Contacts')
  // ------------------------------------------------------------------------------------------------

  // Add 1
  {
    method: HTTP_METHODS.POST,
    url: URL_PV_OBJECT_GENERIC,
    handler: genericController.addSingleObject,
    config: { [ROUTE_NAME]: PRV_ADD_ONE },

    // schema: documentation.addMetadataSchema
  },
  // Edit 1
  {
    method: HTTP_METHODS.PUT,
    url: URL_PV_OBJECT_GENERIC,
    handler: genericController.upsertSingleObject,
    config: { [ROUTE_NAME]: PRV_UPSERT_ONE },
  },
  // Get all
  {
    method: HTTP_METHODS.GET,
    url: URL_PV_OBJECT_GENERIC,
    handler: genericController.getObjectList,
    config: { [ROUTE_NAME]: PRV_GET_ALL },
  },
  // Get 1
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`,
    handler: genericController.getSingleObject,
    config: { [ROUTE_NAME]: PRV_GET_ONE },
  },

  // Delete 1
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`,
    handler: genericController.deleteSingleObject,
    config: { [ROUTE_NAME]: PRV_DEL_ONE },
  },
  // Delete all
  {
    method: HTTP_METHODS.DELETE,
    url: URL_PV_OBJECT_GENERIC,
    handler: genericController.deleteManyObjects,
    config: { [ROUTE_NAME]: PRV_DEL_MANY },
  },
  // Delete many
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_OBJECT_GENERIC}/${ACT_DELETION}`,
    handler: genericController.deleteObjectList,
    config: { [ROUTE_NAME]: PRV_DEL_LIST },
  },

  // Access unlinked data
  // {
  //   method: HTTP_METHODS.GET,
  //   url: `${URL_PV_OBJECT_GENERIC}/${ACT_UNLINKED}`,
  //   handler: genericController.getOrphans,
  //   config: { [ROUTE_NAME]: PRV_GET_ORPHANS },
  // },
  // Search object
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/${ACT_SEARCH}`,
    handler: genericController.searchObjects,
    config: { [ROUTE_NAME]: PRV_RCH_OBJ },
  },
  // Get searchable fields for an object type
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PRIVATE}/${ACT_SEARCH}`,
    handler: genericController.getSearchableProperties,
    config: { [ROUTE_NAME]: PRV_RCH_OBJ },
  },
  // ------------------------------------------------------------------------------------------------
  // Integration reports
  // ------------------------------------------------------------------------------------------------

  // Add 1 integration report for an identified object
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: reportController.addSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_ADD_OBJ_REPORT },
  },

  // Add/edit 1 integration report for an identified object
  {
    method: HTTP_METHODS.PUT,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: reportController.addOrEditSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_UPSERT_OBJ_REPORT },
  },

  // Get all integration reports for an identified object
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: reportController.getReportListForObject,
    config: { [ROUTE_NAME]: PRV_GET_OBJ_REPORT_LIST },
  },
  // Get 1 report for one object integration
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}/:${PARAM_REPORT_ID}`,
    handler: reportController.getSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_GET_ONE_OBJ_REPORT },
  },
  // Get all integration reports for one object type
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/${OBJ_REPORTS}`,
    handler: reportController.getReportListForObjectType,
    config: { [ROUTE_NAME]: PRV_GET_ALL_OBJ_REPORT },
  },

  // Delete 1 identified integration report for one object
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}/:${PARAM_REPORT_ID}`,
    handler: reportController.deleteSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_DEL_OBJ_REPORT },
  },
  // Delete all integration reports for one object
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: reportController.deleteEveryReportForObject,
    config: { [ROUTE_NAME]: PRV_DEL_ALL_OBJ_REPORT },
  },
  // Delete many integration reports for an identified object
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}/${ACT_DELETION}`,
    handler: reportController.deleteManyReportForObject,
    config: { [ROUTE_NAME]: PRV_DEL_LIST_OBJ_REPORT },
  },
]

// ------------------------------------------------------------------------------------------------
// External application/module routes
// ------------------------------------------------------------------------------------------------
exports.devRoutes = [
  // ------------------------------------------------------------------------------------------------
  // Accessing app info
  // ------------------------------------------------------------------------------------------------
  /**
   * Get node and npm versions
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_NODE_VERSION_ACCESS}`,
    handler: sysController.getNodeVersion,
    config: { [ROUTE_NAME]: DEV_GET_NODE_VERSION },
  },

  // ------------------------------------------------------------------------------------------------
  // Accessing thesaurus
  // ------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}`,
    handler: skosController.getEveryThesaurus,
    config: { [ROUTE_NAME]: DEV_GET_EVERY_THESAURUS },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}`,
    handler: skosController.getSingleThesaurus,
    config: { [ROUTE_NAME]: DEV_GET_SINGLE_THESAURUS },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}/:${PARAM_THESAURUS_LANG}`,
    handler: skosController.getSingleThesaurusLabels,
    config: { [ROUTE_NAME]: DEV_GET_SINGLE_THESAURUS },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_LICENCE_ACCESS}`,
    handler: licenceController.getAllLicences,
    config: { [ROUTE_NAME]: DEV_GET_ALL_LICENCES },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_LICENCE_CODES_ACCESS}`,
    handler: licenceController.getAllLicenceCodes,
    config: { [ROUTE_NAME]: DEV_GET_ALL_LICENCE_CODES },
  },
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_LICENCE_ACCESS}/${ACT_INIT}`,
    handler: licenceController.initLicences,
    config: { [ROUTE_NAME]: DEV_INIT_LICENCES },
  },

  // ------------------------------------------------------------------------------------------------
  // Init Open Data Rennes
  // ------------------------------------------------------------------------------------------------
  // Mass init with ODS data
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PREFIX_PRIVATE}/${OBJ_METADATA}/${ACT_INIT}`,
    handler: metadataController.initWithODR,
    config: { [ROUTE_NAME]: DEV_INIT_WITH_ODR },
  },

  // ------------------------------------------------------------------------------------------------
  // UUID v4 generation
  // ------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PRIVATE}/${ACT_UUID_GEN}`,
    handler: genericController.generateUUID,
    config: { [ROUTE_NAME]: DEV_GENERATE_UUID },
  },
  // ------------------------------------------------------------------------------------------------
  // Portal token
  // ------------------------------------------------------------------------------------------------
  // Get a new token from the Portal
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${URL_SUFFIX_TOKEN_GET}`,
    handler: portalController.exposedGetPortalToken,
    config: { [ROUTE_NAME]: DEV_GET_PORTAL_TOKEN },
  },
  // Get a token checked by the Portal
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${URL_SUFFIX_TOKEN_GET}/${URL_SUFFIX_TOKEN_CHECK}`,
    handler: portalController.checkStoredToken,
    config: { [ROUTE_NAME]: DEV_CHECK_STORED_TOKEN },
  },

  // ------------------------------------------------------------------------------------------------
  // Get/post resources from/to Portal
  // ------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/${ACT_SEND}`,
    handler: metadataController.sendManyMetadataToPortal,
    config: { [ROUTE_NAME]: DEV_SEND_MANY_METADATA_TO_PORTAL },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/:${PARAM_ID}`,
    handler: portalController.getMetadata,
    config: { [ROUTE_NAME]: DEV_GET_PORTAL_METADATA },
  },
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/:${PARAM_ID}`,
    handler: portalController.sendMetadata,
    config: { [ROUTE_NAME]: DEV_SEND_METADATA_TO_PORTAL },
  },
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/:${PARAM_ID}`,
    handler: portalController.deleteMetadata,
    config: { [ROUTE_NAME]: DEV_DEL_PORTAL_METADATA },
  },

  // ------------------------------------------------------------------------------------------------
  // Accessing logs
  // ------------------------------------------------------------------------------------------------
  // Get logs
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_LOGS_ACCESS}`,
    handler: getLogs,
    config: { [ROUTE_NAME]: DEV_GET_LOGS },
  },
  // {
  //   method: HTTP_METHODS.GET,
  //   url: `${URL_PV_LOGS_ACCESS}/:${PARAM_LOGS_LINES}`,
  //   handler: getLastLogLines,
  //   config: { [ROUTE_NAME]: DEV_GET_LAST_LOG_LINES },
  // },
  // Search logs
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_LOGS_ACCESS}/${ACT_SEARCH}`,
    handler: searchLogs,
    config: { [ROUTE_NAME]: DEV_SEARCH_LOGS },
  },
  // ------------------------------------------------------------------------------------------------
  // Actions on DB
  // ------------------------------------------------------------------------------------------------
  // Get all collections
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_DB_ACCESS}`,
    handler: dbController.getCollections,
    config: { [ROUTE_NAME]: DEV_GET_COLLECTIONS },
  },
  // Drop Collection
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_DB_ACCESS}/:${PARAM_OBJECT}`,
    handler: dbController.dropCollection,
    config: { [ROUTE_NAME]: DEV_DROP_COLLECTION },
  },
  // Drop DB
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_DB_ACCESS}`,
    handler: dbController.dropDB,
    config: { [ROUTE_NAME]: DEV_DROP_DB },
  },
  // ------------------------------------------------------------------------------------------------
  // Tests entry
  // ------------------------------------------------------------------------------------------------
  /*  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PRIVATE}/test`,
    handler: devController.test,
    config: { [ROUTE_NAME]: DEV_TEST },
  }, */
]
