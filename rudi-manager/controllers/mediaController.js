const mod = 'mediaCtrl'

// External dependencies
const axios = require('axios')

// Internal dependencies
const { getMediaDwnlUrl, getRudiApi, getRudiMediaUrl, getAdminApi } = require('../config/config')
const { dbGetUserByUsername } = require('../database/database')
const { ForbiddenError, UnauthorizedError, NotFoundError } = require('../utils/errors')
const log = require('../utils/logger')
const {
  getRudiApiToken,
  createPmHeadersForMedia,
  extractCookieFromReq,
  CONSOLE_TOKEN_NAME,
  readJwtBody,
  getTokenFromMediaForUser,
} = require('../utils/secu')
const { handleError } = require('./errorHandler')
const { extractJwt } = require('@aqmo.org/jwt-lib')
const { beautify } = require('../utils/utils.js')

// Controllers
exports.getMediaToken = async (req, reply, next) => {
  const fun = 'getMediaToken'
  try {
    // We extract
    const jwt = extractCookieFromReq(req, CONSOLE_TOKEN_NAME) || extractJwt(req)
    if (!jwt) {
      console.error('T (getMediaToken) req:', req)
      throw new UnauthorizedError('No JWT was found in the request')
    }

    const jwtPayload = readJwtBody(jwt)
    const payloadUser = jwtPayload.user
    const exp = jwtPayload.exp
    if (!payloadUser)
      throw new UnauthorizedError(
        `JWT body token should contain an identified user: ${beautify(jwtPayload)}`
      )
    if (exp * 1000 < new Date().getTime())
      throw new ForbiddenError(`JWT expired: ${new Date(exp * 1000)} < ${new Date()}`)

    const user = await dbGetUserByUsername(null, payloadUser.username)
    if (!user)
      return reply.status(404).json(new NotFoundError(`User not found: ${payloadUser.username}`))

    const mediaToken = await getTokenFromMediaForUser(user, exp)

    return reply.status(200).send({ token: mediaToken })
  } catch (err) {
    log.e(
      mod,
      fun,
      '!! Liaison avec le module “Media” incomplète, création de JWT impossible: ' + err
    )
    if (err.code == 'ECONNREFUSED')
      return reply.status(500).json({
        statusCode: 500,
        message: '“RUDI Media” module is apparently down, contact the RUDI node admin',
        error: 'Connection from “RUDI Prod Manager” to “RUDI Media” module failed',
      })

    reply.status(err.statusCode || 500).json(err)
  }
}

exports.getMediaInfoById = async (req, reply, next) => {
  const opType = 'get_media_info_by_id'
  const { id } = req.params
  try {
    const url = getAdminApi('media', id)
    const token = getRudiApiToken(url, req)

    const resRudiApi = await axios.get(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    const mediaInfo = resRudiApi.data
    reply.status(200).json(mediaInfo)
  } catch (err) {
    handleError(req, reply, err, 500, opType, 'media')
  }
}

// Deprecated ? now use direct access
exports.getDownloadById = (req, reply, next) => {
  const { id } = req.params
  return axios
    .get(getMediaDwnlUrl(id), {
      headers: { 'media-access-method': 'Direct', 'media-access-compression': true },
    })
    .then((resRUDI) => {
      const results = resRUDI.data
      reply.status(200).contentType(resRUDI.headers['content-type']).json(results)
    })
    .catch((err) => {
      handleError(req, reply, err, 500, 'get_download', 'media', `media+${id}`)
    })
}

exports.commitMedia = async (req, reply, next) => {
  const {
    media_id: mediaId,
    global_id: metadataId,
    commit_uuid: commitId,
    zone_name: zoneName,
  } = req.body

  // Let's commit the media on Media module
  const pmMediaHeaders = createPmHeadersForMedia()

  try {
    const commitMediaRes = await axios.post(
      getRudiMediaUrl('commit/'),
      JSON.stringify({ commit_uuid: commitId, zone_name: zoneName }),
      pmMediaHeaders
    )
    console.log(
      'T (commitMedia) commitMediaRes',
      commitMediaRes?.statusText || commitMediaRes?.data || commitMediaRes
    )
  } catch (err) {
    console.error(
      `T (commitMedia) ERR${err.response?.status} Media commit:`,
      err.response?.data || err.response?.statusText
    )
    return reply
      .status(err.response?.status || 500)
      .send(`ERR Media commit: ${beautify(err.response?.data || err.response?.statusText)}`)
  }
  const url = getAdminApi('media', mediaId, 'commit')
  const token = getRudiApiToken(url, { method: 'POST' })
  const apiHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
  try {
    const mediaInfo = await axios.post(getRudiApi(url), { metadataId, commitId }, apiHeaders)
    console.log('T (commitMedia) commit API OK:', mediaInfo.data)
    return reply.status(200).send({ status: 'OK' })
  } catch (err) {
    console.error(
      `T (commitMedia) ERR${err.response?.status} Api commit:`,
      err.response?.data || err.response?.statusText || err.response
    )

    return reply
      .status(err.response?.status || 500)
      .send(
        `ERR API metadata commit: ${beautify(err.response?.data || err.response?.statusText || err.response)}`
      )
  }
}
