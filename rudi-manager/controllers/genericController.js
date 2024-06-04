const mod = 'genCtrl'

const axios = require('axios')
const { getRudiApi, getAdminApi } = require('../config/config')
const {
  CONSOLE_TOKEN_NAME,
  getRudiApiToken,
  PM_FRONT_TOKEN_NAME,
  refreshTokens,
} = require('../utils/secu')
const { sysWarn } = require('../utils/logger')
const { handleError } = require('./errorHandler')

const OBJECT_TYPES = {
  resources: { url: 'resources', id: 'global_id' },
  organizations: { url: 'organizations', id: 'organization_id' },
  contacts: { url: 'contacts', id: 'contact_id' },
  media: { url: 'media', id: 'media_id' },
  pub_keys: { url: 'pub_keys', id: 'name' },
  reports: { url: 'reports', id: 'report_id' },
}

const checkObjectType = (req, reply, fun, objectType) => {
  if (!OBJECT_TYPES[objectType]) {
    handleError(req, reply, new Error('Object type unknown: ' + objectType), 400, fun, objectType)
    return false
  }
  return true
}

const callApiModule = (req, url) => {
  // const fun = `${mod}.callApiModule`
  const completeUrl = new URL(url, getRudiApi())
  if (req.query) completeUrl.search = new URLSearchParams(req.query)

  return axios
    .get(`${completeUrl}`, { headers: { Authorization: `Bearer ${getRudiApiToken()}` } })
    .then((res) => res.data)
    .catch((err) => {
      if (err.code == 'ECONNREFUSED') {
        throw new Error(
          'Connection from “RUDI Prod Manager” to “RUDI API” module failed: ' +
            '“RUDI API” module is apparently down, contact the RUDI node admin'
        )
      } else throw err
    })
}

exports.getObjectList = (req, reply) => {
  const opType = 'get_objects'
  const { objectType } = req.params
  if (!checkObjectType(req, reply, opType, objectType) || objectType === 'media') return

  callApiModule(req, getAdminApi(objectType))
    .then((res) => {
      const { consoleToken, pmFrontToken } = refreshTokens(req)
      return reply
        .status(200)
        .cookie(CONSOLE_TOKEN_NAME, consoleToken.jwt, consoleToken.opts)
        .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken.jwt, pmFrontToken.opts)
        .json(res)
    })
    .catch((err) => handleError(req, reply, err, 501, opType, objectType))
}

exports.getObjectById = (req, reply, next) => {
  const opType = 'get_object_by_id'
  const { objectType, id } = req.params
  if (!checkObjectType(req, reply, opType, objectType)) return

  return callApiModule(req, getAdminApi(objectType, id))
    .then((rudiObj) => reply.status(200).json(rudiObj))
    .catch((err) => handleError(req, reply, err, 501, opType, objectType, id))
}

exports.postObject = async (req, reply, next) => {
  const opType = 'post_object'
  const { objectType } = req.params
  try {
    if (!checkObjectType(req, reply, opType, objectType)) return
    let data
    try {
      const url = getAdminApi(objectType)
      const resRudiApi = await axios.post(getRudiApi(url), req.body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getRudiApiToken()}`,
        },
      })
      data = resRudiApi.data
    } catch (e) {
      sysWarn(mod, opType, `ERR ${e.statusCode || ''} Contacting RUDI API failed:`, e.message)
      throw e
    }

    const { consoleToken, pmFrontToken } = refreshTokens(req)
    reply
      .status(200)
      .cookie(CONSOLE_TOKEN_NAME, consoleToken.jwt, consoleToken.opts)
      .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken.jwt, pmFrontToken.opts)
      .json(data)
  } catch (err) {
    const id = req.body[OBJECT_TYPES[objectType].id]
    handleError(req, reply, err, 501, opType, objectType, id)
  }
}

exports.putObject = async (req, reply) => {
  const opType = 'put_object'
  const { objectType } = req.params
  try {
    if (!checkObjectType(req, reply, opType, objectType)) return
    let data
    try {
      const url = getAdminApi(objectType)
      const resRudiApi = await axios.put(getRudiApi(url), req.body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getRudiApiToken()}`,
        },
      })
      data = resRudiApi.data
    } catch (e) {
      sysWarn(mod, opType, `ERR ${e.statusCode} Contacting RUDI API failed:`, e.message)
      throw e
    }

    const { consoleToken, pmFrontToken } = refreshTokens(req)
    reply
      .status(200)
      .cookie(CONSOLE_TOKEN_NAME, consoleToken.jwt, consoleToken.opts)
      .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken.jwt, pmFrontToken.opts)
      .json(data)
  } catch (error) {
    const id = req.body[OBJECT_TYPES[objectType].id]
    handleError(req, reply, error, error.statusCode || 501, opType, objectType, id)
  }
}

exports.deleteObject = (req, reply, next) => {
  const fun = 'del_object'
  const { objectType, id } = req.params
  if (!checkObjectType(req, reply, fun, objectType)) return

  const url = getAdminApi(objectType, id)
  return axios
    .delete(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${getRudiApiToken()}` },
    })
    .then((resRudiApi) => {
      const rudiObj = resRudiApi.data
      reply.status(200).json(rudiObj)
    })
    .catch((error) => handleError(req, reply, error, 501, fun, objectType, id))
}

exports.deleteObjects = (req, reply) => {
  const fun = 'del_objects'
  const { objectType } = req.params
  if (!checkObjectType(req, reply, fun, objectType)) return

  const url = getAdminApi(objectType)
  return axios
    .delete(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${getRudiApiToken()}` },
    })
    .then((resRudiApi) => {
      const rudiObj = resRudiApi.data
      reply.status(200).json(rudiObj)
    })
    .catch((error) => handleError(req, reply, error, 501, fun, objectType))
}

const COUNT_BY_LABELS = ['metadata_status', 'theme', 'keywords', 'producer']
exports.getCounts = async (req, reply) => {
  const fun = `${mod}.getCounts`
  const res = await Promise.all(
    COUNT_BY_LABELS.map((label) =>
      axios
        .get(getRudiApi(getAdminApi(`resources?count_by=${label}`)), {
          headers: { Authorization: `Bearer ${getRudiApiToken()}` },
        })
        .then((res) => res.data)
        .catch((error) => handleError(req, reply, error, 501, fun, 'resources'))
    )
  )

  const counts = {}
  COUNT_BY_LABELS.forEach((label, i) => {
    counts[label] = res[i]
  })
  reply.status(200).json(counts)
}
