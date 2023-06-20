/* eslint-disable quote-props */

const mod = 'portalCtrl'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import axios from 'axios'
import https from 'node:https'
import { extractJwt, readPublicKeyPem, verifyToken } from '@aqmo.org/jwt_lib'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { PORTAL_API_VERSION, OBJ_METADATA, PARAM_ID, USER_AGENT } from '../config/confApi.js'
import {
  API_METAINFO_VERSION_PROPERTY,
  API_METAINFO_PROPERTY,
  API_COLLECTION_TAG,
  getUpdatedDate,
  API_STORAGE_STATUS,
  API_METADATA_ID,
  DB_UPDATED_AT,
  API_REPORT_ID,
  API_MEDIA_PROPERTY,
  API_FILE_STORAGE_STATUS,
  API_FILE_STATUS_UPDATE,
  API_INTEGRATION_ERROR_ID,
  API_METAINFO_SOURCE_PROPERTY,
} from '../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { JWT_EXP, REQ_MTD } from '../utils/crypto.js'
import { logD, logE, logT, logV, logW } from '../utils/logging.js'
import {
  beautify,
  dateEpochSToIso,
  decodeBase64,
  deepClone,
  nowEpochS,
  padWithEqualSignBase4,
  toBase64,
} from '../utils/jsUtils.js'
import { accessProperty, accessReqParam } from '../utils/jsonAccess.js'

import { httpGet, httpPost, httpDelete, directPost, directGet, httpPut } from '../utils/httpReq.js'
import {
  FIELD_TOKEN,
  getAuthUrl,
  getCheckAuthUrl,
  getCredentials,
  getPortalMetaUrl,
  getPortalJwtPubKeyUrl,
  isPortalConnectionDisabled,
  JWT_USER,
  PARAM_TOKEN,
  postPortalMetaUrl,
  getPortalCryptPubUrl,
} from '../config/confPortal.js'

import { isUUID } from '../definitions/schemaValidators.js'
import { StorageStatus } from '../definitions/thesaurus/StorageStatus.js'

import {
  getLatestStoredPortalToken,
  getObjectWithRudiId,
  storePortalToken,
} from '../db/dbQueries.js'

import {
  NotFoundError,
  InternalServerError,
  BadRequestError,
  ForbiddenError,
  NotAcceptableError,
  RudiError,
  UnauthorizedError,
} from '../utils/errors.js'
import { isEveryMediaAvailable } from '../definitions/models/Metadata.js'

// -------------------------------------------------------------------------------------------------
// Portal auth header
// -------------------------------------------------------------------------------------------------
const portalHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

export const getPortalAuthHeaderBasic = () => {
  const fun = 'getPortalAuthHeaderBasic'
  try {
    logT(mod, fun, ``)
    const [usr, pwdb64] = getCredentials()
    const pwd = decodeBase64(pwdb64)
    const basicAuth = padWithEqualSignBase4(toBase64(`${usr}:${pwd}`))
    return {
      headers: {
        'User-Agent': USER_AGENT,
        Authorization: `Basic ${basicAuth}`,
      },
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
export const getPortalAuthHeaderBearer = async () => {
  const fun = 'getPortalAuthHeaderBearer'
  try {
    logT(mod, fun, ``)
    return {
      headers: {
        'User-Agent': USER_AGENT,
        Authorization: `Bearer ${await getPortalToken()}`,
      },
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Token manager
// -------------------------------------------------------------------------------------------------
// import { RMTokenManager } from '../definitions/constructors/RMTokenManager'
// const portalInfo = {
//   host: API_GET_HOST,
//   port: API_GET_PORT,
//   path_request: API_GET_PATH,
//   path_check: API_SEND_PATH,
//   login: LOGIN,
//   passw: PASSW,
// }
// const agent = `RUDI/${VERSION}`

// const tokenManager = new RMTokenManager(portalInfo, agent)

// -------------------------------------------------------------------------------------------------
// REST access
// -------------------------------------------------------------------------------------------------
export const exposedGetPortalToken = async (req, reply) => {
  const fun = 'exposedGetPortalToken'
  logT(mod, fun, `< GET new portal token`)
  try {
    // logD(mod, fun, getAuthUrl())
    return await getNewTokenFromPortal()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const checkPortalTokenInHeader = async (req, isCheckOptional) => {
  const fun = 'checkPortalTokenInHeader'
  logT(mod, fun, ``)
  try {
    const token = extractJwt(req)
    const jwtInfo = await verifyPortalToken(token)
    return jwtInfo
    // return await getTokenCheckedByPortal(token)
  } catch (err) {
    if (isCheckOptional) throw err
    const error = new UnauthorizedError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

// -------------------------------------------------------------------------------------------------
// Controllers
// -------------------------------------------------------------------------------------------------

/**
 * Get a new token from the portal
 */
export const getPortalToken = async () => {
  const fun = 'getPortalToken'
  logT(mod, fun, ``)
  let token, rmToken
  try {
    rmToken = await getLatestStoredPortalToken()
    // logD(mod, fun, beautify(rmToken))
    if (!rmToken || rmToken.exp < nowEpochS()) {
      logD(mod, fun, 'Need for a new portal token')
      rmToken = await getNewTokenFromPortal()
    }

    token = accessProperty(rmToken, FIELD_TOKEN)
    // logD(mod, fun, `token: ${ beautify(token)}`)
    await verifyPortalToken(token)
    logD(mod, fun, 'Stored token seems OK')

    // await getTokenCheckedByPortal(token)
    return token
    // logD(mod, fun, 'Stored token was validated by the Portal')
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
    //  new InternalServerError(`Failed to get a new token from the portal: ${err}`)
  }
}

/**
 * Ensure a token is valid
 */
export const checkStoredToken = async (req, reply) => {
  const fun = 'checkStoredToken'
  logT(mod, fun, ``)
  // logT(mod, fun, `< GET portal check token`)
  try {
    const token = await getLatestStoredPortalToken()
    if (!token) throw new NotFoundError('No Portal token is actually stored')
    return await getTokenCheckedByPortal(token[FIELD_TOKEN])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const checkInputToken = async (req, reply) => {
  const fun = 'checkInputToken'
  logT(mod, fun, ``)
  try {
    const token = accessReqParam(req.params, PARAM_TOKEN)
    return await getTokenCheckedByPortal(token[FIELD_TOKEN])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getMetadata = async (req, reply) => {
  const fun = 'getMetadata'
  logT(mod, fun, ``)
  try {
    let metadataId = req.params[PARAM_ID]
    if (metadataId && !isUUID(metadataId)) metadataId = undefined
    if (metadataId) logD(mod, fun, `metadataId: ${metadataId}`)

    const additionalParameters = req.url?.split('?')[1]

    return await getMetadataFromPortal(metadataId, additionalParameters)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const sendMetadata = async (req, reply) => {
  const fun = 'sendMetadata'
  logT(mod, fun, ``)
  try {
    let metadataId = req.params[PARAM_ID]
    logD(mod, fun, `metadataId: ${metadataId}`)
    if (!metadataId || !isUUID(metadataId))
      throw new BadRequestError('Parameter is not a valid UUID v4')

    return await sendMetadataToPortal(metadataId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deleteMetadata = async (req, reply) => {
  const fun = 'deleteMetadata'
  logT(mod, fun, ``)
  try {
    let metadataId = req.params[PARAM_ID]
    logD(mod, fun, `metadataId: ${metadataId}`)
    if (metadataId && !isUUID(metadataId)) metadataId = null

    return await deletePortalMetadata(metadataId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// -------------------------------------------------------------------------------------------------
// Portal calls: GET public key
// -------------------------------------------------------------------------------------------------
// ----- GET Portal public key
let CACHED_PORTAL_PUB
export const getPortalJwtPubKey = async () => {
  const fun = 'getPortalJwtPubKey'
  try {
    logT(mod, fun, ``)
    if (CACHED_PORTAL_PUB) return CACHED_PORTAL_PUB

    const publicKeyUrl = getPortalJwtPubKeyUrl()
    // logD(mod, fun, 'publicKeyUrl: ' + publicKeyUrl)

    const publicKeyObj = await axios.get(publicKeyUrl, getPortalAuthHeaderBasic())
    // logD(mod, fun, 'publicKeyObj: ' + beautify(publicKeyObj))
    const cachedPortalJwtPubKeyPem = publicKeyObj?.data?.value
    // logD(mod, fun, `portalJwtPubKey: ${cachedPortalJwtPubKey}`)
    CACHED_PORTAL_PUB = readPublicKeyPem(cachedPortalJwtPubKeyPem)
    return CACHED_PORTAL_PUB
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

let cachedPortalEncryptPubKey
export const getPortalEncryptPubKey = async () => {
  const fun = 'getPortalEncryptPubKey'
  try {
    logT(mod, fun, ``)
    // if (cachedPortalEncryptPubKey) return cachedPortalEncryptPubKey

    // cachedPortalEncryptPubKey = await axiosInstanceForPortal.get(getPortalCryptPubUrl())
    const portalCryptPubData = await axios.get(getPortalCryptPubUrl(), {
      headers: {
        'User-Agent': USER_AGENT,
        Authorization: `Bearer ${await getPortalToken()}`,
      },
      httpsAgent: portalHttpsAgent,
    })
    cachedPortalEncryptPubKey = portalCryptPubData?.data
    // logD(mod, fun, `portalEncryptPubKey: ${beautify(cachedPortalEncryptPubKey)}`)
    return cachedPortalEncryptPubKey
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// -------------------------------------------------------------------------------------------------
// Portal calls: token
// -------------------------------------------------------------------------------------------------
export const getNewTokenFromPortal = async () => {
  const fun = 'getNewTokenFromPortal'
  try {
    logT(mod, fun, ``)
    const [usr, pwdb64] = getCredentials()
    const pwd = decodeBase64(pwdb64)
    // consoleLog(mod, fun, pwdb64)
    // consoleLog(mod, fun, pwd)
    const portalAuthUrl = getAuthUrl()
    // LM -- the password is now provided in base64
    // logD(mod, fun, `pwdb64: ${pwdb64}`)
    // logD(mod, fun, `pwd: ${pwd}`)
    // const body = {
    //   grant_type: 'password',
    //   scope: 'read',
    //   username: usr,
    //   password: pwd,
    // }
    // const body = `grant_type=password&scope=read&username=${usr}&password=${pwd}`
    const body =
      `grant_type=password&scope=read&username=${encodeURIComponent(usr)}&` +
      `password=${encodeURIComponent(pwd)}`
    let answer
    try {
      answer = await directPost(portalAuthUrl, body, getPortalAuthHeaderBasic())
    } catch (err) {
      if (RudiError.isRudiError(err)) throw RudiError.treatError(mod, fun, err)
      else {
        const error = new InternalServerError(`Post to portal failed: ${beautify(err)}`)
        throw RudiError.treatError(mod, fun, error)
      }
    }
    // logD(mod, fun, `answer.status: ${answer.status}`)

    if (answer?.status === 200) {
      // logD(mod, fun, `config: ${ beautify(answer.config)}`)
      // logD(mod, fun, `data: ${ beautify(answer.data)}`)
      const portalToken = answer.data

      const jwToken = portalToken[FIELD_TOKEN]
      if (typeof portalToken !== 'object' || !portalToken[FIELD_TOKEN])
        throw new NotAcceptableError(`The portal delivered an incorrect reply: ${portalToken}`)

      // logD(mod, fun, `portalToken: ${ beautify(portalToken)}`)

      const jwtBody = (await verifyPortalToken(jwToken))[1]
      portalToken[JWT_EXP] = jwtBody[JWT_EXP]
      logD(mod, fun, `We got a new token, that expires on ${dateEpochSToIso(jwtBody[JWT_EXP])}`)
      await getTokenCheckedByPortal(portalToken[FIELD_TOKEN])
      await storePortalToken(portalToken)

      return portalToken
    } else {
      const errMsg = `${beautify(answer)}`
      // logW(mod, fun, errMsg)
      throw RudiError.createRudiHttpError(answer.status, errMsg, mod, fun)
    }
  } catch (err) {
    if (RudiError.isRudiError(err)) {
      logT(mod, fun, 'is a RudiError')
      throw RudiError.treatError(mod, fun, err)
    } else {
      logT(mod, fun, `is not a RudiError: ${err}`)
      const error = new ForbiddenError(`Failed to get a token from Portal: ${beautify(err)}`)
      throw RudiError.treatError(mod, fun, error)
    }
  }
}

export const getTokenCheckedByPortal = async (token) => {
  const fun = 'getTokenCheckedByPortal'
  try {
    logT(mod, fun, ``)
    if (!token) throw new BadRequestError('No token to check!')
    const portalUrl = getCheckAuthUrl()
    // logD(mod, fun, portalUrl)

    const requestUrl = `${portalUrl}?${PARAM_TOKEN}=${token}`
    // logD(mod, fun, requestUrl)
    const portalResponse = await directGet(requestUrl)

    if (portalResponse?.status === 200) {
      logV(mod, fun, `RUDI Portal validated the token`)
      return portalResponse.data
    } else throw new ForbiddenError(`Portal invalidated the token: ${portalResponse.data}`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/* jwtHeader = {
  alg: 'RS512',                     // RSA 512
  typ: 'JWT'
}
jwtBody = {
  jti: '<uuid>',                    // ID du JWT
  authorities: ['rudi-prod-admin'], // ID de ton module
  exp: 1622063934,                  // Date d'expiration (absolue, Epoch, secondes)
  user_id: '<uuid>',                // Utilisateur qui effectue l'action
  org_id: '<uuid>',                 // Entreprise/organisation de l'utilisateur
  roles: ['admin', 'editor']         // Autorisations de l'utilisateur
} */
/*
jwtHeader = {
      alg: 'HS256',
      typ: 'JWT'
}
jwtBody = {
  exp: 1622063934,
  user_name: '<uuid>',
  authorities: ['PROVIDER'],
  jti: '<uuid>',
  client_id: '<uuid>',
  scope: ['read']
}
*/
/*
  export const checkSignatureWithSecret = (accessToken) => {
    const fun = 'checkSignatureWithSecret'
    logT(mod, fun, ``)

    try {
      if (!accessToken) throw new BadRequestError('No token = no signature to verify!')
      const [jwtHeaderBase64, jwtPayloadBase64, jwtSignatureBase64] = accessToken.split('.')

      const hash = createHmac('sha256', getSecret())
        .update(`${jwtHeaderBase64}.${jwtPayloadBase64}`)
        .digest('base64url')

      if (hash !== jwtSignatureBase64) {
        const errMsg = `Forged token? Computed hash: ${hash} != jwt signature: ${jwtSignatureBase64}`
        logW(mod, fun, errMsg)
      }
      return hash === jwtSignatureBase64

      // if (hash !== jwtSignatureBase64) {
      //   const errMsg = `Forged token? Computed hash: ${hash} != jwt signature: ${jwtSignatureBase64}`
      //   logW(mod, fun, errMsg)
      //   throw new Error(errMsg)
      // }
      // return true
    } catch (err) {
      const errMsg = `Invalid token: ${err}`
      logW(mod, fun, errMsg)
      throw err
    }
  }
 */

export const verifyPortalToken = async (accessToken) => {
  const fun = 'verifyPortalToken'
  logT(mod, fun, ``)

  try {
    if (!accessToken) throw new ForbiddenError('No token to verify!')

    const portalPubKey = await getPortalJwtPubKey()
    const { header, payload } = verifyToken(portalPubKey, accessToken)

    if (!payload[JWT_USER] && payload[REQ_MTD])
      throw new ForbiddenError(`Using a RUDI internal JWT to access a Portal route is incorrect.`)

    return [header, payload]
  } catch (err) {
    // const errMsg = `Invalid token: ${err}`
    // logV(mod, fun, errMsg)
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Portal calls: metadata
// -------------------------------------------------------------------------------------------------
const metadatasWaitingForPortalFeedback = []

export const removeMetadataFromWaitingList = (metadataId, reportId) => {
  const fun = 'removeMetadataFromWaitingList'
  try {
    const waitIndex = metadatasWaitingForPortalFeedback.findIndex(
      (sentMetadata) => sentMetadata[API_METADATA_ID] === metadataId
    )
    if (waitIndex === -1) {
      const warnMsg = `Metadata ${metadataId} (report ${reportId}) not found in the from waiting room`
      logW(mod, fun, warnMsg)
      return
    }
    if (metadatasWaitingForPortalFeedback[waitIndex][API_REPORT_ID] !== reportId) {
      const warnMsg = `Removing metadata ${metadataId} from the waiting room with mismatching reportId ${reportId}`
      logW(mod, fun, warnMsg)
    } else {
      const msg = `Removing metadata ${metadataId} from the waiting room with reportId ${reportId}`
      logD(mod, fun, msg)
    }
    metadatasWaitingForPortalFeedback.splice(waitIndex, 1)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const WAITING_ROOM_TIMEOUT_S = 3600
const WAIT_DATE = 'wait_date'
/**
 * Check a metadata
 * @param {String} metadataId UUID v4 (global_id) that identifies a metadata in this system
 * @return {Object} The metadata
 */
const isMetadataSendableToPortal = async (metadataId) => {
  const fun = 'isMetadataAcceptableByPortal'
  try {
    if (isPortalConnectionDisabled()) return false

    //--- Check input param
    if (!metadataId) throw new BadRequestError('Input metadata id is requested', mod, fun)
    if (!isUUID(metadataId)) throw new BadRequestError(`Badly formatted UUID: ${metadataId}`)

    //--- Get local metadata from ID
    const metadata = await getObjectWithRudiId(OBJ_METADATA, metadataId)
    if (!metadata) {
      const errMsg = `No data found locally for id '${metadataId}'`
      logW(mod, fun, errMsg)
      throw new NotFoundError(errMsg)
    }

    //--- If 'collection_tag' is set (ie for tests), metadata is not sent to the Portal
    const collectionTag = metadata[API_COLLECTION_TAG]
    if (collectionTag) {
      logD(mod, fun, `Not sending to portal: ${metadataId} (${collectionTag})`)
      return false
    }

    //--- If media still need to be uploaded, metadata is not sent to the Portal
    if (
      metadata[API_STORAGE_STATUS] === StorageStatus.Pending ||
      !isEveryMediaAvailable(metadata)
    ) {
      logD(mod, fun, `Waiting for other media to get uploaded: ${metadataId}`)
      return false
    }

    //--- Purging the waiting room / buffer of metadatas waiting for an integration report
    try {
      for (let i = metadatasWaitingForPortalFeedback.length - 1; i >= 0; i--)
        if (
          metadatasWaitingForPortalFeedback[i] &&
          metadatasWaitingForPortalFeedback[i][WAIT_DATE] < nowEpochS() + WAITING_ROOM_TIMEOUT_S
        )
          metadatasWaitingForPortalFeedback.splice(i, 1)
    } catch (e) {
      logE(mod, fun + '.purgeWaitBuffer', e)
    }

    //--- Check if the metadata has already been sent to portal
    let isMetadataAlreadyWaitingToBeSent = false
    for (const sentMetadata of metadatasWaitingForPortalFeedback) {
      if (
        sentMetadata[API_METADATA_ID] === metadata[API_METADATA_ID] &&
        sentMetadata[DB_UPDATED_AT] >= metadata[DB_UPDATED_AT]
      ) {
        isMetadataAlreadyWaitingToBeSent = true
        break
      }
    }
    if (isMetadataAlreadyWaitingToBeSent) {
      logD(mod, fun, `Metadata is already waiting to be sent: ${metadataId}`)
      return false
    }
    const waitingMetadata = {
      [API_METADATA_ID]: metadata[API_METADATA_ID],
      [DB_UPDATED_AT]: metadata[DB_UPDATED_AT],
      [WAIT_DATE]: nowEpochS(),
    }
    // console.log(
    //   `T (isMetadataSendableToPortal) waitingMetadata ${metadatasWaitingForPortalFeedback.length}`,
    //   waitingMetadata
    // )
    metadatasWaitingForPortalFeedback.push(waitingMetadata)
    //--- If a media is restricted, metadata is not sent to the Portal
    // if( metadata[API_RESTRICTED_ACCESS]&&metadata[API_MEDIA_PROPERTY][0][API_MEDIA_CONNECTOR]

    return { metadata, waitIndex: metadatasWaitingForPortalFeedback.length - 1 }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const PORTAL_POST_URL = postPortalMetaUrl()
export const sendMetadataToPortal = async (metadataId) => {
  const fun = 'sendMetadataToPortal'
  try {
    logT(mod, fun, ``)

    const sendableData = await isMetadataSendableToPortal(metadataId)
    if (!sendableData) return
    // console.log(`T (sendMetadataToPortal) sendableData`, sendableData)
    const { metadata, waitIndex } = sendableData
    const waitingMetadata = metadatasWaitingForPortalFeedback[waitIndex]
    // console.log(`T (sendMetadataToPortal) waitingMetadata [${waitIndex}]`, waitingMetadata)
    //--- Ensuring compatibility with portal
    const metadataClean = deepClone(metadata)
    // API version
    metadataClean[API_METAINFO_PROPERTY][API_METAINFO_VERSION_PROPERTY] = PORTAL_API_VERSION

    metadataClean[API_MEDIA_PROPERTY].map((media) => {
      delete media[API_FILE_STORAGE_STATUS]
      delete media[API_FILE_STATUS_UPDATE]

      // delete media[API_MEDIA_THUMBNAIL]
      // delete media[API_MEDIA_SATELLITES]
    })
    delete metadataClean[API_INTEGRATION_ERROR_ID]
    delete metadataClean[API_METAINFO_PROPERTY][API_METAINFO_SOURCE_PROPERTY]

    logV(mod, fun, `Metadata sent to portal: ${beautify(metadataClean)}`)
    // console.debug('T (sendMetadataToPortal) metadata', metadataClean[API_MEDIA_PROPERTY][0])
    //--- Sending to portal
    const portalToken = await getPortalToken()
    const reqOpts = {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${portalToken}`,
      },
    }
    let portalAnswer
    try {
      logD(mod, fun, `Checking if the metadata is on the portal`)
      portalAnswer = await axios.get(getPortalMetaUrl(metadataId), reqOpts)
    } catch (err) {
      // logV(mod, fun, err)
      logD(mod, fun, `Metadata is not on the portal: sending '${metadataId}'`)
      const postAnswer = await httpPost(PORTAL_POST_URL, metadataClean, portalToken)
      waitingMetadata[API_REPORT_ID] = isUUID(postAnswer) ? postAnswer : postAnswer.data
      // console.log('T (sendMetadataToPortal.post) waiting room', metadatasWaitingForPortalFeedback)
      return postAnswer
    }
    const portalMetadata = portalAnswer.data

    if (getUpdatedDate(portalMetadata) < getUpdatedDate(metadataClean)) {
      logD(mod, fun, `Metadata is on the portal and older: updating '${metadataId}'`)
      const putAnswer = await httpPut(PORTAL_POST_URL, metadataClean, portalToken)
      waitingMetadata[API_REPORT_ID] = isUUID(putAnswer) ? putAnswer : putAnswer.data
      // console.log('T (sendMetadataToPortal.put) putAnswer', putAnswer)
      // console.log('T (sendMetadataToPortal.put) waiting room', metadatasWaitingForPortalFeedback)
      return putAnswer
    } else {
      metadatasWaitingForPortalFeedback.splice(waitIndex, 1)
      logD(mod, fun, `Metadata is on the portal and same: not updating '${metadataId}'`)
      // console.log('T (sendMetadataToPortal.none) waiting room', metadatasWaitingForPortalFeedback)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getPortalMetadataListWithToken = (token, additionalParameters) =>
  httpGet(getPortalMetaUrl(null, additionalParameters), token)

export const getMetadataFromPortal = async (metadataId, additionalParameters) => {
  const fun = 'getMetadataFromPortal'
  logT(mod, fun, ``)
  try {
    const token = await getPortalToken()

    if (!metadataId) return httpGet(getPortalMetaUrl(null, additionalParameters), token)
    else return httpGet(getPortalMetaUrl(metadataId, additionalParameters), token)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deletePortalMetadata = async (metadataId) => {
  const fun = 'deletePortalMetadata'
  logT(mod, fun, ``)
  try {
    if (!metadataId) throw new BadRequestError('Metadata id required') // Can't get the resouces list yet.

    const token = await getPortalToken()
    const reply = await httpDelete(postPortalMetaUrl(metadataId), token)

    return reply
  } catch (err) {
    const error = new Error(`Couldn't delete on Portal side: ${err}`)
    throw RudiError.treatError(mod, fun, error)
  }
}
