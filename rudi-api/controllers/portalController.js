const mod = 'portalCtrl'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { extractJwt, readPublicKeyPem, verifyToken } from '@aqmo.org/jwt-lib'
import axios from 'axios'
import https from 'node:https'

import _ from 'lodash'
const { pick } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { HTTP_METHODS, OBJ_METADATA, PARAM_ID, USER_AGENT } from '../config/constApi.js'
import {
  API_COLLECTION_TAG,
  API_DATA_NAME_PROPERTY,
  API_DATES_PUBLISHED,
  API_METADATA_ID,
  API_METAINFO_DATES,
  API_METAINFO_PROPERTY,
  API_REPORT_ID,
  API_STORAGE_STATUS,
  DB_UPDATED_AT,
  getUpdatedDate,
} from '../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { JWT_EXP, REQ_MTD } from '../config/constJwt.js'
import {
  beautify,
  dateEpochSToIso,
  decodeBase64,
  nowISO,
  padWithEqualSignBase4,
  timeEpochS,
  toBase64,
} from '../utils/jsUtils.js'
import { accessProperty, accessReqParam } from '../utils/jsonAccess.js'
import { logD, logE, logT, logV, logW } from '../utils/logging.js'

import {
  FIELD_TOKEN,
  JWT_USER,
  NO_PORTAL_MSG,
  PARAM_TOKEN,
  getAuthUrl,
  getCheckAuthUrl,
  getCredentials,
  getPortalCryptPubUrl,
  getPortalJwtPubKeyUrl,
  getPortalMetaUrl,
  isPortalConnectionDisabled,
  postPortalMetaUrl,
} from '../config/confPortal.js'
import { directPost, httpDelete, httpGet, httpPost, httpPut } from '../utils/httpReq.js'

import { isUUID } from '../definitions/schemaValidators.js'
import { StorageStatus } from '../definitions/thesaurus/StorageStatus.js'

import {
  getLatestStoredPortalToken,
  getMetadataWithRudiId,
  getObjectWithRudiId,
  storePortalToken,
} from '../db/dbQueries.js'

import { isEveryMediaAvailable, setMetadataStatusToSent } from '../definitions/models/Metadata.js'
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotAcceptableError,
  NotFoundError,
  RudiError,
  UnauthorizedError,
} from '../utils/errors.js'
import { createErrorReport } from './reportController.js'

// -------------------------------------------------------------------------------------------------
// Portal auth header
// -------------------------------------------------------------------------------------------------
const portalHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

export const getPortalAuthHeaderBasic = () => {
  const fun = 'getPortalAuthHeaderBasic'
  try {
    logT(mod, fun)
    if (isPortalConnectionDisabled()) return
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
    logT(mod, fun)
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
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    // logD(mod, fun, getAuthUrl())
    return await getNewTokenFromPortal()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const checkPortalTokenInHeader = async (req, isCheckOptional) => {
  const fun = 'checkPortalTokenInHeader'
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
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
  logT(mod, fun)
  let token, rmToken
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    rmToken = await getLatestStoredPortalToken()
    // logD(mod, fun, beautify(rmToken))
    if (!rmToken || rmToken.exp < timeEpochS()) {
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
  logT(mod, fun)
  // logT(mod, fun, `< GET portal check token`)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    const token = await getLatestStoredPortalToken()
    if (!token) throw new NotFoundError('No Portal token is actually stored')
    return await getTokenCheckedByPortal(token[FIELD_TOKEN])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const checkInputToken = async (req, reply) => {
  const fun = 'checkInputToken'
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    const token = accessReqParam(req.params, PARAM_TOKEN)
    return await getTokenCheckedByPortal(token[FIELD_TOKEN])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getMetadata = async (req, reply) => {
  const fun = 'getMetadata'
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
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
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
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
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
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
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
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

export const getPortalEncryptPubKey = async () => {
  const fun = 'getPortalEncryptPubKey'
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    const portalCryptPubData = await axios.get(getPortalCryptPubUrl(), {
      headers: {
        'User-Agent': USER_AGENT,
        Authorization: `Bearer ${await getPortalToken()}`,
      },
      httpsAgent: portalHttpsAgent,
    })
    const portalEncryptPubKey = portalCryptPubData?.data
    return portalEncryptPubKey
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// -------------------------------------------------------------------------------------------------
// Portal calls: token
// -------------------------------------------------------------------------------------------------
export const getNewTokenFromPortal = async () => {
  const fun = 'getNewTokenFromPortal'
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
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
      await createErrorReport(err, {
        step: 'posting the node credentials to Portal',
        description: 'An error occurred while getting a new token from the Portal',
        method: HTTP_METHODS.POST,
        url: portalAuthUrl,
      })
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
  logT(mod, fun)
  if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
  if (!token) throw new BadRequestError('No token to check!', mod, fun)
  let portalResponse
  try {
    portalResponse = await directPost(getCheckAuthUrl(), `${PARAM_TOKEN}=${token}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  } catch (err) {
    await createErrorReport(err, {
      step: 'submitting the token to Portal checks',
      description: 'An error occurred while having the token checked by the Portal',
      method: HTTP_METHODS.POST,
      url: getCheckAuthUrl(),
    })
    throw RudiError.treatError(mod, fun, err)
  }
  if (portalResponse?.status === 200) {
    logV(mod, fun, `RUDI Portal validated the token`)
    return portalResponse.data
  } else throw new ForbiddenError(`Portal invalidated the token: ${portalResponse.data}`, mod, fun)
}

export const verifyPortalToken = async (accessToken) => {
  const fun = 'verifyPortalToken'
  logT(mod, fun)

  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    if (!accessToken) throw new ForbiddenError('No token to verify!', mod, fun)

    const portalPubKey = await getPortalJwtPubKey()
    const { header, payload } = verifyToken(portalPubKey, accessToken)

    if (!payload[JWT_USER] && payload[REQ_MTD])
      throw new ForbiddenError(
        `Using a RUDI internal JWT to access a Portal route is incorrect.`,
        mod,
        fun
      )

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
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG

    //--- Check input param
    if (!metadataId) throw new BadRequestError('Input metadata id is requested', mod, fun)
    if (!isUUID(metadataId)) throw new BadRequestError(`Badly formatted UUID: ${metadataId}`)

    //--- Get local metadata from ID
    const dbMetadata = await getObjectWithRudiId(OBJ_METADATA, metadataId)
    if (!dbMetadata) {
      const errMsg = `No data found locally for id '${metadataId}'`
      logW(mod, fun, errMsg)
      throw new NotFoundError(errMsg)
    }

    //--- If 'collection_tag' is set (ie for tests), metadata is not sent to the Portal
    const collectionTag = dbMetadata[API_COLLECTION_TAG]
    if (collectionTag) {
      logD(mod, fun, `Not sending to portal: ${metadataId} (${collectionTag})`)
      return false
    }

    //--- If media still need to be uploaded, metadata is not sent to the Portal
    if (
      dbMetadata[API_STORAGE_STATUS] === StorageStatus.Pending ||
      !isEveryMediaAvailable(dbMetadata)
    ) {
      logD(mod, fun, `Waiting for other media to get uploaded: ${metadataId}`)
      return false
    }

    //--- Checking the waiting room for
    //      - metadatas waiting for an integration report for too long to get purged from the list
    //      - the same metadata if it has already been sent to portal
    let isMetadataAlreadyWaitingToBeSent = false
    try {
      for (let i = metadatasWaitingForPortalFeedback.length - 1; i >= 0; i--) {
        const waitingMeta = metadatasWaitingForPortalFeedback[i]
        if (waitingMeta?.[WAIT_DATE] < timeEpochS() + WAITING_ROOM_TIMEOUT_S) {
          metadatasWaitingForPortalFeedback.splice(i, 1)
        } else if (
          !isMetadataAlreadyWaitingToBeSent &&
          waitingMeta[API_METADATA_ID] === dbMetadata[API_METADATA_ID] &&
          waitingMeta[DB_UPDATED_AT] >= dbMetadata[DB_UPDATED_AT]
        ) {
          isMetadataAlreadyWaitingToBeSent = true
        }
      }
    } catch (e) {
      logE(mod, `${fun}.purgeWaitBuffer`, e)
    }
    if (isMetadataAlreadyWaitingToBeSent) {
      logD(mod, fun, `Metadata is already waiting to be sent: ${metadataId}`)
      return false
    }

    //--- Puting the metadata in the waiting list
    const waitingMetadata = {
      [API_METADATA_ID]: dbMetadata[API_METADATA_ID],
      [DB_UPDATED_AT]: dbMetadata[DB_UPDATED_AT],
      [WAIT_DATE]: timeEpochS(),
    }
    const waitIndex = metadatasWaitingForPortalFeedback.push(waitingMetadata) - 1

    //--- If a media is restricted, metadata is not sent to the Portal
    // if( metadata[API_RESTRICTED_ACCESS]&&metadata[API_MEDIA_PROPERTY][0][API_MEDIA_CONNECTOR]

    //--- Ensuring we respect the format the Portal accepts
    const portalReadyMetadata = dbMetadata.toRudiPortalJSON()

    //--- Updating the DB metadata status
    setMetadataStatusToSent(dbMetadata)
    await dbMetadata.save()
    logV(mod, `${fun}.metadata_status saved`, dbMetadata.metadata_status)
    portalReadyMetadata[API_METAINFO_PROPERTY][API_METAINFO_DATES][API_DATES_PUBLISHED] = nowISO()
    return { portalReadyMetadata, waitIndex }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const PORTAL_POST_URL = postPortalMetaUrl()
export const sendMetadataToPortal = async (metadataId) => {
  const fun = 'sendMetadataToPortal'
  const report = { step: 'initializing' }

  try {
    logT(mod, fun)
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG

    // Checking if the metadata is ok to be sent
    // If so, a portal ready metadata JSON is retrieved
    const sendableData = await isMetadataSendableToPortal(metadataId)
    if (!sendableData) return
    const { portalReadyMetadata, waitIndex } = sendableData

    const waitingMetadata = metadatasWaitingForPortalFeedback[waitIndex]

    //--- Just a test
    const dbMetadata = await getMetadataWithRudiId(metadataId)
    // logI(mod, `${fun}.dbMetadata`, dbMetadata)

    //--- Sending to portal
    logV(mod, fun, `Initiating the metadata sending to portal: ${beautify(portalReadyMetadata)}`)

    report.metadata = pick(portalReadyMetadata, [API_METADATA_ID, API_DATA_NAME_PROPERTY])
    report.step = 'retrieving Portal token'

    const portalToken = await getPortalToken()

    let portalAnswer
    try {
      report.step = 'checking if the metadata is on the portal'
      report.requestDetails = { method: HTTP_METHODS.GET, url: getPortalMetaUrl(metadataId) }
      logD(mod, fun, report.step)

      portalAnswer = await httpGet(getPortalMetaUrl(metadataId), portalToken)
    } catch (err) {
      report.step = `sending a metadata that is not on the portal: '${metadataId}'`
      report.requestDetails = { method: HTTP_METHODS.POST, url: PORTAL_POST_URL }
      logD(mod, fun, report.step)

      const postAnswer = await httpPost(PORTAL_POST_URL, portalReadyMetadata, portalToken)
      waitingMetadata[API_REPORT_ID] = isUUID(postAnswer) ? postAnswer : postAnswer.data
      return postAnswer
    }
    const portalMetadata = portalAnswer

    if (getUpdatedDate(portalMetadata) < getUpdatedDate(portalReadyMetadata)) {
      report.step = `updating a metadata that is on the portal and older: '${metadataId}'`
      report.requestDetails = { method: HTTP_METHODS.PUT, url: PORTAL_POST_URL }
      logD(mod, fun, report.step)

      const putAnswer = await httpPut(PORTAL_POST_URL, portalReadyMetadata, portalToken)
      waitingMetadata[API_REPORT_ID] = isUUID(putAnswer) ? putAnswer : putAnswer.data
      return putAnswer
    } else {
      metadatasWaitingForPortalFeedback.splice(waitIndex, 1)
      logD(mod, fun, `Metadata is on the portal and same: not updating '${metadataId}'`)
    }
  } catch (err) {
    report.description = 'An error occurred while sending the metadata to the Portal'
    await createErrorReport(err, report, 'update metadata status')
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getPortalMetadataListWithToken = (token, additionalParameters) =>
  httpGet(getPortalMetaUrl(null, additionalParameters), token)

export const getMetadataFromPortal = async (metadataId, additionalParameters) => {
  const fun = 'getMetadataFromPortal'
  logT(mod, fun)
  const report = {}
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG

    report.step = 'retrieving Portal token'
    const token = await getPortalToken()

    report.step = 'getting the metadata'
    report.method = HTTP_METHODS.GET
    report.url = getPortalMetaUrl(metadataId, additionalParameters)
    report.metadata = { [API_METADATA_ID]: metadataId }
    report.description = 'An error occurred while getting a metadata from the Portal'

    if (!metadataId) return httpGet(getPortalMetaUrl(null, additionalParameters), token)
    else return httpGet(getPortalMetaUrl(metadataId, additionalParameters), token)
  } catch (err) {
    await createErrorReport(err, report)
    throw RudiError.treatError(mod, fun, err)
  }
}

export const deletePortalMetadata = async (metadataId) => {
  const fun = 'deletePortalMetadata'
  logT(mod, fun)
  try {
    if (isPortalConnectionDisabled()) return NO_PORTAL_MSG
    if (!metadataId) throw new BadRequestError('Metadata id required') // Can't get the resources list yet.

    const token = await getPortalToken()
    const reply = await httpDelete(postPortalMetaUrl(metadataId), token)

    return reply
  } catch (err) {
    const error = new Error(`Couldn't delete on Portal side: ${err}`)
    throw RudiError.treatError(mod, fun, error)
  }
}
