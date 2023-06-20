const mod = 'mediactrl'

// External dependencies
const axios = require('axios')

// Internal dependencies
const { getMediaDwnlUrl, getRudiApi, getRudiMediaUrl, getAdminApi } = require('../config/config')
const { dbGetUserByUsername } = require('../database/database')
const { ForbiddenError, UnauthorizedError, NotFoundError } = require('../utils/errors')
const log = require('../utils/logger')
const {
  createRudiApiToken,
  createPmHeadersForMedia,
  extractCookieFromReq,
  CONSOLE_TOKEN_NAME,
  extractJwtFromReq,
  readJwtBody,
  getTokenFromMediaForUser,
} = require('../utils/secu')
const errorHandler = require('./errorHandler')
const { handleError } = require('./genericController')

// Controllers
exports.getMediaToken = async (req, res, next) => {
  const fun = 'getMediaToken'
  try {
    // console.log('T (getMediaToken)');
    // We extract
    const jwt = extractCookieFromReq(req, CONSOLE_TOKEN_NAME) || extractJwtFromReq(req)
    if (!jwt) {
      console.error('T (getMediaToken) req:', req)
      throw new UnauthorizedError('No JWT was found in the request')
    }
    // console.error('T (getMediaToken) jwt:', jwt);

    const jwtPayload = readJwtBody(jwt)
    const payloadUser = jwtPayload.user
    const exp = jwtPayload.exp
    if (!payloadUser)
      throw new UnauthorizedError(`JWT body token should contain an identified user: ${jwtPayload}`)
    if (exp * 1000 < new Date().getTime())
      throw new ForbiddenError(`JWT expired: ${new Date(exp * 1000)} < ${new Date()}`)

    const user = await dbGetUserByUsername(null, payloadUser.username)
    if (!user)
      return res.status(404).json(new NotFoundError(`User not found: ${payloadUser.username}`))

    const mediaToken = await getTokenFromMediaForUser(user, exp)
    // T (The following is just for debugging)
    /*
    try {
      const parsedBody = readJwtBody(token);
      parsedBody.exp = new Date(parsedBody.exp).toISOString();
      // console.log('T (getMediaToken) token:', parsedBody);
    } catch (parsingErr) {
      // console.log('T (getMediaToken) token:', token);
    }
    */
    return res.status(200).send({ token: mediaToken })
  } catch (err) {
    log.e(
      mod,
      fun,
      '!! Liaison avec le module “Media” incomplète, création de JWT impossible: ' + err
    )
    // throw new Error(errMsg);
    res.status(err.statusCode || 500).json(err)
  }
}

exports.getMediaInfoById = async (req, res, next) => {
  const opType = 'get_media_info_by_id'
  const { id } = req.params
  try {
    // console.log('T (getMediaInfoById) url', getAdminApi(`media/${id}`))
    const url = getAdminApi(`media/${id}`)
    const token = createRudiApiToken(url, req)

    const resRudiApi = await axios.get(getRudiApi(url), {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    const mediaInfo = resRudiApi.data
    res.status(200).json(mediaInfo)
  } catch (err) {
    handleError(req, res, err, 500, opType, 'media')
    // const error = errorHandler.error(err, req, { opType: 'get_media', id: `media+${id}` })
    // res.status(error.statusCode || err.statusCode || 500).json(error)
  }
}

// Deprecated ? now use direct access
exports.getDownloadById = (req, res, next) => {
  const { id } = req.params
  return axios
    .get(getMediaDwnlUrl(id), {
      headers: { 'media-access-method': 'Direct', 'media-access-compression': true },
    })
    .then((resRUDI) => {
      const results = resRUDI.data
      res.status(200).contentType(resRUDI.headers['content-type']).json(results)
    })
    .catch((err) => {
      const error = errorHandler.error(err, req, { opType: 'get_download', id: `media+${id}` })
      try {
        res.status(error.statusCode || err.statusCode || 500).json(error)
      } catch (e) {
        console.error(e)
      }
    })
}

exports.commitMedia = async (req, res, next) => {
  // const fun = 'commitMedia';
  // console.log('T (commitMedia) req.body', req.body);
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
      getRudiMediaUrl(`commit/?zone_name=${zoneName}&commit_uuid=${commitId}`),
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
    return res
      .status(err.response?.status || 500)
      .send('ERR Media commit: ' + err.response?.data || err.response?.statusText)
  }
  const url = getAdminApi(`media/${mediaId}/commit`)
  const token = createRudiApiToken(url, { method: 'POST' })
  const apiHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
  try {
    const mediaInfo = await axios.post(getRudiApi(url), { metadataId, commitId }, apiHeaders)
    console.log('T (commitMedia) commit API OK:', mediaInfo.data)
    return res.status(200).send({ status: 'OK' })
  } catch (err) {
    console.error(
      `T (commitMedia) ERR${err.response?.status} Api commit:`,
      err.response?.data || err.response?.statusText || err.response
    )
    return res
      .status(err.response?.status || 500)
      .send('ERR Api commit: ' + err.response?.data || err.response?.statusText || err.response)
  }
}
