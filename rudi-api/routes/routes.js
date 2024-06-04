const mod = 'routes'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// API request constants
// -------------------------------------------------------------------------------------------------
import {
  ACT_COMMIT,
  ACT_DELETION,
  ACT_EXT_SEARCH,
  ACT_INIT,
  ACT_REPORT,
  ACT_SEARCH,
  ACT_SEND,
  ACT_UUID_GEN,
  HTTP_METHODS,
  OBJ_MEDIA,
  OBJ_METADATA,
  OBJ_PUB_KEYS,
  OBJ_REPORTS,
  PARAM_ID,
  PARAM_OBJECT,
  PARAM_PROP,
  PARAM_REPORT_ID,
  PARAM_THESAURUS_CODE,
  PARAM_THESAURUS_LANG,
  ROUTE_NAME,
  ROUTE_OPT,
  URL_PREFIX_CHECK,
  URL_PREFIX_PRIVATE,
  URL_PREFIX_PUBLIC,
  URL_PUB_API_VERSION,
  URL_PUB_METADATA,
  URL_PV_APP_ENV_ACCESS,
  URL_PV_APP_HASH_ACCESS,
  URL_PV_DB_ACCESS,
  URL_PV_GIT_HASH_ACCESS,
  URL_PV_LICENCE_ACCESS,
  URL_PV_LICENCE_CODES_ACCESS,
  URL_PV_LOGS_ACCESS,
  URL_PV_NODE_VERSION_ACCESS,
  URL_PV_OBJECT_GENERIC,
  URL_PV_PORTAL_PREFIX,
  URL_PV_THESAURUS_ACCESS,
  URL_SUFFIX_NODE,
  URL_SUFFIX_PORTAL,
  URL_SUFFIX_TOKEN_CHECK,
  URL_SUFFIX_TOKEN_GET,
} from '../config/constApi.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logD } from '../utils/logging.js'

// -------------------------------------------------------------------------------------------------
// Swagger documentation
// -------------------------------------------------------------------------------------------------
// import documentation from './documentation/metadataApi'

// -------------------------------------------------------------------------------------------------
// Controllers
// -------------------------------------------------------------------------------------------------
import {
  addSingleObject,
  countObjects,
  deleteManyObjects,
  deleteObjectList,
  deleteSingleObject,
  generateUUID,
  getManyPubKeys,
  getMetadataListAndCount,
  getObjectList,
  getSearchableProperties,
  getSingleObject,
  searchObjects,
  upsertSingleObject,
} from '../controllers/genericController.js'
import {
  commitMedia,
  getSingleMetadata,
  initThemes,
  initWithODR,
  searchMetadata,
  sendManyMetadataToPortal,
  updateAllMetadataStatus,
} from '../controllers/metadataController.js'
import {
  addOrEditSingleReportForMetadata,
  addOrEditSingleReportForObject,
  addSingleReportForObject,
  deleteEveryReportForObject,
  deleteManyReportForObject,
  deleteReportsBefore,
  deleteSingleReportForObject,
  getReportListForMetadata,
  getReportListForObject,
  getReportListForObjectType,
  getSingleReportForMetadata,
  getSingleReportForObject,
} from '../controllers/reportController.js'

import { dropCollection, dropDB, getCollections } from '../controllers/dbController.js'
import { getLogs, searchLogs } from '../controllers/logController.js'
import {
  getApiVersion,
  getAppHash,
  getEnvironment,
  getGitHash,
  getNodeVersion,
  serveFavicon,
} from '../controllers/sysController.js'

import {
  getAllLicenceCodes,
  getAllLicences,
  initLicences,
} from '../controllers/licenceController.js'
import {
  getEveryThesaurus,
  getSingleThesaurus,
  getSingleThesaurusLabels,
} from '../controllers/skosController.js'

import { getPortalBaseUrl } from '../config/confPortal.js'
import { getApiUrl } from '../config/confSystem.js'
import {
  checkStoredToken,
  deleteMetadata,
  exposedGetPortalToken,
  getMetadata,
  sendMetadata,
} from '../controllers/portalController.js'
import { getSinglePubKey } from '../controllers/publicKeyController.js'
import {
  getPortalCachedMetadataList,
  getPortalMetadataFields,
} from '../controllers/stateController.js'
import { test } from '../controllers/testController.js'

// -------------------------------------------------------------------------------------------------
// Route names
// -------------------------------------------------------------------------------------------------

const REDIRECT_GET_DATA = 'redir_pub_metadata'
const REDIRECT_GET_PLUS = 'redir_pub_metadata'
const REDIRECT_PUT_PLUS = 'redir_pub_metadata'

const PUB_GET_FAVICON = 'pub_get_favicon'
const PUB_GET_API_VERSION = 'pub_get_api_version'
const PUB_GET_ALL_METADATA = 'pub_get_all_metadata'
const PUB_GET_ONE_METADATA = 'pub_get_one_metadata'
const PUB_RCH_OBJ = 'pub_rch_obj'

const PUB_GET_ALL_PUB_KEYS = 'pub_get_all_pub_keys'
const PUB_GET_ONE_PUB_KEY = 'pub_get_one_pub_key'
const PUB_GET_ONE_PUB_KEY_PROP = 'pub_get_one_pub_key_prop'

const PORTAL_UPSERT_ONE_REPORT = 'portal_upsert_one_report'
const PORTAL_GET_ALL_OBJ_REPORT = 'portal_get_all_obj_report'
const PORTAL_GET_ONE_OBJ_REPORT = 'portal_get_one_obj_report'

const PRV_ADD_ONE = 'prv_add_one'
const PRV_UPSERT_ONE = 'prv_upsert_one'
const PRV_SAVE_ALL = 'prv_save_all'
const PRV_GET_ALL = 'prv_get_all'
const PRV_GET_ONE = 'prv_get_one'
const PRV_DEL_ONE = 'prv_del_one'
const PRV_DEL_MANY = 'prv_del_many'
const PRV_DEL_LIST = 'prv_del_list'
const PRV_MEDIA_COMMIT = 'prv_media_commit'

const PRV_OBJ_SEARCH = 'prv_obj_search'
const PRV_OBJ_COUNT = 'prv_obj_count'

const PRV_ADD_OBJ_REPORT = 'prv_add_obj_report'
const PRV_UPSERT_OBJ_REPORT = 'prv_upsert_obj_report'
const PRV_GET_OBJ_REPORT_LIST = 'prv_get_obj_report_list'
const PRV_GET_ONE_OBJ_REPORT = 'prv_get_one_obj_report'
const PRV_GET_ALL_OBJ_REPORT = 'prv_get_all_obj_report'
const PRV_DEL_OBJ_REPORT = 'prv_del_obj_report'
const PRV_DEL_ALL_OBJ_REPORT = 'prv_del_all_obj_report'
const PRV_DEL_LIST_OBJ_REPORT = 'prv_del_list_obj_report'
const PRV_DEL_OLD_REPORTS = 'prv_del_old_reports'

const PRV_CHECK_PORTAL_METADATA = 'prv_check_portal_metadata'
const PRV_CHECK_PORTAL_METADATA_IDS = 'prv_check_portal_metadata_ids'

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
const DEV_INIT_THEMES = 'dev_init_themes'

const DEV_CHECK_NODE_URL = 'dev_check_node_url'
const DEV_CHECK_PORTAL_URL = 'dev_check_portal_url'

// -------------------------------------------------------------------------------------------------
// Free routes (no authentification required)
// -------------------------------------------------------------------------------------------------
export const publicRoutes = [
  // -------------------------------------------------------------------------------------------------
  // Accessing app info
  // -------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `/favicon.png`,
    handler: serveFavicon,
    config: { [ROUTE_NAME]: PUB_GET_FAVICON },
  },

  // -------------------------------------------------------------------------------------------------
  // Generic routes for accessing metadata
  // -------------------------------------------------------------------------------------------------
  /*
   * @oas [get] /api/v1/resources
   * description: 'Access all metadata on the RUDI producer node'
   * parameters:
   *   - (query) limit {Integer:int32} The number of resources to return
   */
  {
    method: HTTP_METHODS.GET,
    url: URL_PUB_METADATA,
    handler: getMetadataListAndCount,
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
    handler: getSingleMetadata,
    config: { [ROUTE_NAME]: PUB_GET_ONE_METADATA },
  },

  /**
   * Search objects
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/${ACT_SEARCH}`,
    handler: searchMetadata,
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
    url: URL_PUB_API_VERSION,
    handler: getApiVersion,
    config: { [ROUTE_NAME]: PUB_GET_API_VERSION },
  },

  // redirection: GET /api -> GET /api/v1/resources
  {
    method: HTTP_METHODS.GET,
    url: `/api`,
    config: { [ROUTE_NAME]: REDIRECT_GET_DATA },
    handler: function (req, reply) {
      logD(mod, `redirect`, `${req.method} ${URL_PUB_METADATA}`)
      reply.redirect(URL_PUB_METADATA)
    },
  },
  // redirection: GET /api/v1 -> GET /api/v1/resources
  {
    method: HTTP_METHODS.GET,
    url: '/api/v1',
    config: { [ROUTE_NAME]: REDIRECT_GET_DATA },
    handler: function (req, reply) {
      logD(mod, `redirect`, `${req.method} ${URL_PUB_METADATA}`)
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
      logD(mod, `redirect`, `${req.method} ${newRoute}`)
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
      logD(mod, `redirect`, `${req.method} ${newRoute}`)
      reply.redirect(308, newRoute)
    },
  },

  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PUBLIC}/${OBJ_PUB_KEYS}`,
    handler: getManyPubKeys,
    config: { [ROUTE_NAME]: PUB_GET_ALL_PUB_KEYS },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PUBLIC}/${OBJ_PUB_KEYS}/:${PARAM_ID}`,
    handler: getSinglePubKey,
    config: { [ROUTE_NAME]: PUB_GET_ONE_PUB_KEY },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PUBLIC}/${OBJ_PUB_KEYS}/:${PARAM_ID}/:${PARAM_PROP}`,
    handler: getSinglePubKey,
    config: { [ROUTE_NAME]: PUB_GET_ONE_PUB_KEY_PROP },
  },
]
// -------------------------------------------------------------------------------------------------
// 'Public' routes (Portal authentification required)
// -------------------------------------------------------------------------------------------------
export const portalRoutes = [
  // Routes accessed by RUDI Portal:
  // /resources GET
  // /resources/{id} GET
  // /resources/{id}/report PUT

  // -------------------------------------------------------------------------------------------------
  // Integration reports for one particular object
  // -------------------------------------------------------------------------------------------------

  // Add/edit 1 report for one object integration
  {
    method: HTTP_METHODS.PUT,
    url: `/${OBJ_METADATA}/:${PARAM_ID}/${ACT_REPORT}`,
    handler: addOrEditSingleReportForMetadata,
    config: { [ROUTE_NAME]: PORTAL_UPSERT_ONE_REPORT },
  },

  // Add/edit 1 report for one object integration
  {
    method: HTTP_METHODS.PUT,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`,
    handler: addOrEditSingleReportForMetadata,
    config: { [ROUTE_NAME]: PORTAL_UPSERT_ONE_REPORT },
  },

  // Get all reports for one object integration
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}`,
    handler: getReportListForMetadata,
    config: { [ROUTE_NAME]: PORTAL_GET_ALL_OBJ_REPORT },
  },
  // Get 1 report for one object integration
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PUB_METADATA}/:${PARAM_ID}/${ACT_REPORT}/:${PARAM_REPORT_ID}`,
    handler: getSingleReportForMetadata,
    config: { [ROUTE_NAME]: PORTAL_GET_ONE_OBJ_REPORT },
  },

  // Redirection for getting integration reports
  {
    method: HTTP_METHODS.GET,
    url: `/${OBJ_METADATA}/:${PARAM_ID}/*`,
    config: { [ROUTE_NAME]: REDIRECT_GET_PLUS },
    handler: function (req, reply) {
      const newRoute = `${URL_PREFIX_PUBLIC}${req.url}`
      logD(mod, `redirect`, `${req.method} ${newRoute}`)
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
      logD(mod, `redirect`, `${req.method} ${newRoute}`)
      reply.redirect(308, newRoute)
    },
  },
]

// -------------------------------------------------------------------------------------------------
// Private routes
// -------------------------------------------------------------------------------------------------
/**
 * Routes that don't need a JWT check (to be accessed by internal programs)
 */
export const unrestrictedPrivateRoutes = [
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
    handler: getGitHash,
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
    handler: getAppHash,
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
    handler: getEnvironment,
    config: { [ROUTE_NAME]: DEV_GET_APP_ENV },
  },
]
export const backOfficeRoutes = [
  // -------------------------------------------------------------------------------------------------
  // Generic routes for accessing any object
  // ('Metadata', 'Organizations' and 'Contacts')
  // -------------------------------------------------------------------------------------------------

  // Add 1
  {
    method: HTTP_METHODS.POST,
    url: URL_PV_OBJECT_GENERIC,
    handler: addSingleObject,
    config: { [ROUTE_NAME]: PRV_ADD_ONE },

    // schema: documentation.addMetadataSchema
  },
  // Edit 1
  {
    method: HTTP_METHODS.PUT,
    url: URL_PV_OBJECT_GENERIC,
    handler: upsertSingleObject,
    config: { [ROUTE_NAME]: PRV_UPSERT_ONE },
  },
  // Get all
  {
    method: HTTP_METHODS.GET,
    url: URL_PV_OBJECT_GENERIC,
    handler: getObjectList,
    config: { [ROUTE_NAME]: PRV_GET_ALL },
  },
  // Get 1
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`,
    handler: getSingleObject,
    config: { [ROUTE_NAME]: PRV_GET_ONE },
  },
  // Get 1
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/:${PARAM_PROP}`,
    handler: getSingleObject,
    config: { [ROUTE_NAME]: PRV_GET_ONE },
  },

  // Delete 1
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}`,
    handler: deleteSingleObject,
    config: { [ROUTE_NAME]: PRV_DEL_ONE },
  },
  // Delete all
  {
    method: HTTP_METHODS.DELETE,
    url: URL_PV_OBJECT_GENERIC,
    handler: deleteManyObjects,
    config: { [ROUTE_NAME]: PRV_DEL_MANY },
  },
  // Delete many
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_OBJECT_GENERIC}/${ACT_DELETION}`,
    handler: deleteObjectList,
    config: { [ROUTE_NAME]: PRV_DEL_LIST },
  },

  // Access unlinked data
  // {
  //   method: HTTP_METHODS.GET,
  //   url: `${URL_PV_OBJECT_GENERIC}/${ACT_UNLINKED}`,
  //   handler: getOrphans,
  //   config: { [ROUTE_NAME]: PRV_GET_ORPHANS },
  // },
  // Search object
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/${ACT_SEARCH}`,
    handler: searchObjects,
    config: { [ROUTE_NAME]: PRV_OBJ_SEARCH },
  },
  // Extended search on object
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/${ACT_EXT_SEARCH}`,
    handler: searchObjects,
    config: { [ROUTE_NAME]: PRV_OBJ_SEARCH, [ROUTE_OPT]: ACT_EXT_SEARCH },
  },
  // Get searchable fields for an object type
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PRIVATE}/${ACT_SEARCH}`,
    handler: getSearchableProperties,
    config: { [ROUTE_NAME]: PRV_OBJ_SEARCH },
  },
  // Count the number of objects
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/count`,
    handler: countObjects,
    config: { [ROUTE_NAME]: PRV_OBJ_COUNT },
  },

  // -------------------------------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.PUT,
    url: `${URL_PREFIX_PRIVATE}/${OBJ_METADATA}/save`,
    handler: updateAllMetadataStatus,
    config: { [ROUTE_NAME]: PRV_SAVE_ALL },
  },
  // -------------------------------------------------------------------------------------------------
  // Media
  // -------------------------------------------------------------------------------------------------
  // Commit a media
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PREFIX_PRIVATE}/${OBJ_MEDIA}/:${PARAM_ID}/${ACT_COMMIT}`,
    handler: commitMedia,
    config: { [ROUTE_NAME]: PRV_MEDIA_COMMIT },
  },
  // -------------------------------------------------------------------------------------------------
  // Integration reports
  // -------------------------------------------------------------------------------------------------

  // Add 1 integration report for an identified object
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: addSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_ADD_OBJ_REPORT },
  },

  // Add/edit 1 integration report for an identified object
  {
    method: HTTP_METHODS.PUT,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: addOrEditSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_UPSERT_OBJ_REPORT },
  },

  // Get all integration reports for an identified object
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: getReportListForObject,
    config: { [ROUTE_NAME]: PRV_GET_OBJ_REPORT_LIST },
  },
  // Get 1 report for one object integration
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}/:${PARAM_REPORT_ID}`,
    handler: getSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_GET_ONE_OBJ_REPORT },
  },
  // Get all integration reports for one object type
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_OBJECT_GENERIC}/${OBJ_REPORTS}`,
    handler: getReportListForObjectType,
    config: { [ROUTE_NAME]: PRV_GET_ALL_OBJ_REPORT },
  },

  // Delete 1 identified integration report for one object
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}/:${PARAM_REPORT_ID}`,
    handler: deleteSingleReportForObject,
    config: { [ROUTE_NAME]: PRV_DEL_OBJ_REPORT },
  },
  // Delete all integration reports for one object
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}`,
    handler: deleteEveryReportForObject,
    config: { [ROUTE_NAME]: PRV_DEL_ALL_OBJ_REPORT },
  },
  // Delete many integration reports for an identified object
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_OBJECT_GENERIC}/:${PARAM_ID}/${OBJ_REPORTS}/${ACT_DELETION}`,
    handler: deleteManyReportForObject,
    config: { [ROUTE_NAME]: PRV_DEL_LIST_OBJ_REPORT },
  },
  // Purge old reports
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PREFIX_PRIVATE}/${OBJ_REPORTS}`,
    handler: deleteReportsBefore,
    config: { [ROUTE_NAME]: PRV_DEL_OLD_REPORTS },
  },
]

// -------------------------------------------------------------------------------------------------
// External application/module routes
// -------------------------------------------------------------------------------------------------
export const devRoutes = [
  // -------------------------------------------------------------------------------------------------
  // Accessing app info
  // -------------------------------------------------------------------------------------------------
  /**
   * Get node and npm versions
   */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_NODE_VERSION_ACCESS}`,
    handler: getNodeVersion,
    config: { [ROUTE_NAME]: DEV_GET_NODE_VERSION },
  },

  // -------------------------------------------------------------------------------------------------
  // Accessing thesaurus
  // -------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}`,
    handler: getEveryThesaurus,
    config: { [ROUTE_NAME]: DEV_GET_EVERY_THESAURUS },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}`,
    handler: getSingleThesaurus,
    config: { [ROUTE_NAME]: DEV_GET_SINGLE_THESAURUS },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}/:${PARAM_THESAURUS_LANG}`,
    handler: getSingleThesaurusLabels,
    config: { [ROUTE_NAME]: DEV_GET_SINGLE_THESAURUS },
  },
  /** Init themes with values in stored data */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}/${ACT_INIT}`,
    handler: initThemes,
    config: { [ROUTE_NAME]: DEV_INIT_THEMES },
  },

  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_LICENCE_ACCESS}`,
    handler: getAllLicences,
    config: { [ROUTE_NAME]: DEV_GET_ALL_LICENCES },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_LICENCE_CODES_ACCESS}`,
    handler: getAllLicenceCodes,
    config: { [ROUTE_NAME]: DEV_GET_ALL_LICENCE_CODES },
  },
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_LICENCE_ACCESS}/${ACT_INIT}`,
    handler: initLicences,
    config: { [ROUTE_NAME]: DEV_INIT_LICENCES },
  },

  // -------------------------------------------------------------------------------------------------
  // Init Open Data Rennes
  // -------------------------------------------------------------------------------------------------
  // Mass init with ODS data
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PREFIX_PRIVATE}/${OBJ_METADATA}/${ACT_INIT}`,
    handler: initWithODR,
    config: { [ROUTE_NAME]: DEV_INIT_WITH_ODR },
  },

  // -------------------------------------------------------------------------------------------------
  // UUID v4 generation
  // -------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PRIVATE}/${ACT_UUID_GEN}`,
    handler: generateUUID,
    config: { [ROUTE_NAME]: DEV_GENERATE_UUID },
  },
  // -------------------------------------------------------------------------------------------------
  // Portal token
  // -------------------------------------------------------------------------------------------------
  // Get a new token from the Portal
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${URL_SUFFIX_TOKEN_GET}`,
    handler: exposedGetPortalToken,
    config: { [ROUTE_NAME]: DEV_GET_PORTAL_TOKEN },
  },
  // Get a token checked by the Portal
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${URL_SUFFIX_TOKEN_GET}/${URL_SUFFIX_TOKEN_CHECK}`,
    handler: checkStoredToken,
    config: { [ROUTE_NAME]: DEV_CHECK_STORED_TOKEN },
  },

  // -------------------------------------------------------------------------------------------------
  // Get/post resources from/to Portal
  // -------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/${ACT_SEND}`,
    handler: sendManyMetadataToPortal,
    config: { [ROUTE_NAME]: DEV_SEND_MANY_METADATA_TO_PORTAL },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/:${PARAM_ID}`,
    handler: getMetadata,
    config: { [ROUTE_NAME]: DEV_GET_PORTAL_METADATA },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}`,
    handler: getMetadata,
    config: { [ROUTE_NAME]: DEV_GET_PORTAL_METADATA },
  },
  {
    method: HTTP_METHODS.POST,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/:${PARAM_ID}`,
    handler: sendMetadata,
    config: { [ROUTE_NAME]: DEV_SEND_METADATA_TO_PORTAL },
  },
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_PORTAL_PREFIX}/${OBJ_METADATA}/:${PARAM_ID}`,
    handler: deleteMetadata,
    config: { [ROUTE_NAME]: DEV_DEL_PORTAL_METADATA },
  },

  // -------------------------------------------------------------------------------------------------
  //  Monitoring/control checks on metadata/data
  // -------------------------------------------------------------------------------------------------
  // Get the portal URL associated with this node
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_CHECK}/${URL_SUFFIX_NODE}/url`,
    handler: () => getApiUrl(),
    config: { [ROUTE_NAME]: DEV_CHECK_NODE_URL },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_CHECK}/${URL_SUFFIX_PORTAL}/url`,
    handler: getPortalBaseUrl,
    config: { [ROUTE_NAME]: DEV_CHECK_PORTAL_URL },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_CHECK}/${URL_SUFFIX_PORTAL}/${OBJ_METADATA}`,
    handler: getPortalCachedMetadataList,
    config: { [ROUTE_NAME]: PRV_CHECK_PORTAL_METADATA },
  },
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_CHECK}/${URL_SUFFIX_PORTAL}/ids`,
    handler: getPortalMetadataFields,
    config: { [ROUTE_NAME]: PRV_CHECK_PORTAL_METADATA_IDS },
  },
  // -------------------------------------------------------------------------------------------------
  // Accessing logs
  // -------------------------------------------------------------------------------------------------
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
  // -------------------------------------------------------------------------------------------------
  // Actions on DB
  // -------------------------------------------------------------------------------------------------
  /** Get all collections */
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PV_DB_ACCESS}`,
    handler: getCollections,
    config: { [ROUTE_NAME]: DEV_GET_COLLECTIONS },
  },
  /** Drop Collection */
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_DB_ACCESS}/:${PARAM_OBJECT}`,
    handler: dropCollection,
    config: { [ROUTE_NAME]: DEV_DROP_COLLECTION },
  },
  /** Drop DB */
  {
    method: HTTP_METHODS.DELETE,
    url: `${URL_PV_DB_ACCESS}`,
    handler: dropDB,
    config: { [ROUTE_NAME]: DEV_DROP_DB },
  },
  // -------------------------------------------------------------------------------------------------
  // Tests entry
  // -------------------------------------------------------------------------------------------------
  {
    method: HTTP_METHODS.GET,
    url: `${URL_PREFIX_PRIVATE}/test`,
    handler: test,
    config: { [ROUTE_NAME]: 'dev_test' },
  },
]
