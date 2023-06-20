const mod = 'genCtrl'

const axios = require('axios')
const { getRudiApi, getAdminApi } = require('../config/config')
const errorHandler = require('./errorHandler')
const {
  CONSOLE_TOKEN_NAME,
  createRudiApiToken,
  PM_FRONT_TOKEN_NAME,
  refreshTokens,
} = require('../utils/secu')
const { sysWarn } = require('../utils/logger')

const OBJECT_TYPES = {
  resources: { url: 'resources', id: 'global_id' },
  organizations: { url: 'organizations', id: 'organization_id' },
  contacts: { url: 'contacts', id: 'contact_id' },
  media: { url: 'media', id: 'media_id' },
  pub_keys: { url: 'pub_keys', id: 'name' },
  reports: { url: 'reports', id: 'report_id' },
}

/**
 *
 * @param {String} req The initial request
 * @param {String} res The response for the request
 * @param {String} initialError The initial error
 * @param {Number} errCode The error code
 * @param {String} fun Describes operation type
 * @param {String} objectType The type of the object
 * @param {String} id The UUID of the object
 */
function handleError(req, res, initialError, errCode, fun, objectType, id) {
  try {
    console.log('req params:', req.params)
    console.log('req url:', req.originalUrl)
    try {
      console.log('res:' + JSON.stringify(res))
    } catch (e) {
      console.log('res:' + res)
    }
    console.log('initialError:', initialError?.response?.data)
    console.log(
      `errCode: ${initialError.statusCode || initialError.response?.data?.statusCode || errCode}`
    )
    console.log('fun: ' + fun)
    console.log('objectType: ' + objectType)
    console.log('id: ' + id)
    const errPayload = {}
    if (fun) errPayload.opType = fun
    if (id) errPayload.id = `${objectType}+${id}`
    const error = errorHandler.error(initialError, req, errPayload)
    res.status(initialError.statusCode || errCode).json(error.moreInfo || error)
  } catch (err) {
    console.error(mod, 'handleError.initialError', initialError)
    console.error(mod, 'handleError failed', err)
  }
}
exports.handleError = handleError

const checkObjectType = (req, res, fun, objectType) => {
  if (!OBJECT_TYPES[objectType]) {
    handleError(req, res, new Error('Object type unkown: ' + objectType), 400, fun, objectType)
    return false
  }
  return true
}

exports.getObjectList = async (req, res, next) => {
  const opType = 'get_objects'
  const { objectType } = req.params
  try {
    // console.log('url:', req.url, ' | params:', req.params, ' | query:', req.query);

    // const urlParts = `${req.url}`.split('?');
    // const urlSuffix = urlParts.length > 1 ? `?${urlParts[1]}` : '';

    if (!checkObjectType(req, res, opType, objectType) || objectType === 'media') return

    const url = getAdminApi(objectType)
    // console.log('T (getObjectList) url', getRudiApi(url));
    const token = createRudiApiToken(url, req)
    const resRudiApi = await axios.get(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    const { consoleToken, pmFrontToken } = refreshTokens(req)
    res
      .status(200)
      .cookie(CONSOLE_TOKEN_NAME, consoleToken.jwt, consoleToken.opts)
      .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken.jwt, pmFrontToken.opts)
      .json(resRudiApi.data)
  } catch (err) {
    handleError(req, res, err, 501, opType, objectType)
  }
}

exports.getObjectById = (req, res, next) => {
  const opType = 'get_object_by_id'
  const { objectType, id } = req.params
  if (!checkObjectType(req, res, opType, objectType)) return

  const url = getAdminApi(`${objectType}/${id}`)
  const token = createRudiApiToken(url, req)
  return axios
    .get(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((resRudiApi) => {
      const rudiObj = resRudiApi.data
      res.status(200).json(rudiObj)
    })
    .catch((err) => {
      handleError(req, res, err, 501, opType, objectType, id)
    })
}

exports.postObject = async (req, res, next) => {
  const opType = 'post_object'
  const { objectType } = req.params
  try {
    if (!checkObjectType(req, res, opType, objectType)) return
    let data
    try {
      const url = getAdminApi(objectType)
      const token = createRudiApiToken(url, req)
      const resRudiApi = await axios.post(getRudiApi(url), req.body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      data = resRudiApi.data
    } catch (e) {
      sysWarn(mod, opType, `ERR ${e.statusCode} Contacting RUDI API failed:`, e.message)
      throw e
    }

    const { consoleToken, pmFrontToken } = refreshTokens(req)
    res
      .status(200)
      .cookie(CONSOLE_TOKEN_NAME, consoleToken.jwt, consoleToken.opts)
      .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken.jwt, pmFrontToken.opts)
      .json(data)
  } catch (err) {
    const id = req.body[OBJECT_TYPES[objectType].id]
    handleError(req, res, err, 501, opType, objectType, id)
  }
}

exports.putObject = async (req, res, next) => {
  const opType = 'put_object'
  const { objectType } = req.params
  try {
    if (!checkObjectType(req, res, opType, objectType)) return
    let data
    try {
      const url = getAdminApi(objectType)
      const token = createRudiApiToken(url, req)
      const resRudiApi = await axios.put(getRudiApi(url), req.body, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      data = resRudiApi.data
    } catch (e) {
      sysWarn(mod, opType, `ERR ${e.statusCode} Contacting RUDI API failed:`, e.message)
      throw e
    }

    const { consoleToken, pmFrontToken } = refreshTokens(req)
    res
      .status(200)
      .cookie(CONSOLE_TOKEN_NAME, consoleToken.jwt, consoleToken.opts)
      .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken.jwt, pmFrontToken.opts)
      .json(data)
  } catch (error) {
    const id = req.body[OBJECT_TYPES[objectType].id]
    handleError(req, res, error, error.statusCode || 501, opType, objectType, id)
  }
}

exports.deleteObject = (req, res, next) => {
  const fun = 'del_object'
  const { objectType, id } = req.params
  if (!checkObjectType(req, res, fun, objectType)) return

  const url = getAdminApi(`${objectType}/${id}`)
  const token = createRudiApiToken(url, req)
  return axios
    .delete(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((resRudiApi) => {
      const rudiObj = resRudiApi.data
      res.status(200).json(rudiObj)
    })
    .catch((error) => handleError(req, res, error, 501, fun, objectType, id))
}

exports.deleteObjects = (req, res, next) => {
  const fun = 'del_objects'
  const { objectType } = req.params
  if (!checkObjectType(req, res, fun, objectType)) return

  const url = getAdminApi(`${objectType}`)
  const token = createRudiApiToken(url, req)
  return axios
    .delete(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((resRudiApi) => {
      const rudiObj = resRudiApi.data
      res.status(200).json(rudiObj)
    })
    .catch((error) => handleError(req, res, error, 501, fun, objectType))
}
