/* eslint-disable quote-props */
'use strict'

const mod = 'portalCtrl'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
const { parseKey } = require('sshpk')
const axios = require('axios')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const { extractJwt, JWT_EXP, REQ_MTD } = require('../utils/crypto')
const {
  API_METAINFO_VERSION_PROPERTY,
  API_METAINFO_PROPERTY,
  API_COLLECTION_TAG,
  getUpdatedDate,
  API_MEDIA_PROPERTY,
  API_MEDIA_TYPE,
  API_FILE_TYPE,
} = require('../db/dbFields')

const { MediaTypes } = require('../definitions/models/Media')
const { MIME_YAML } = require('../definitions/thesaurus/FileTypes')

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const db = require('../db/dbQueries')
const log = require('../utils/logging')
const api = require('../config/confApi')
const utils = require('../utils/jsUtils')
const json = require('../utils/jsonAccess')

const {
  httpGet,
  httpPost,
  httpDelete,
  directPost,
  directGet,
  httpPut,
} = require('../utils/httpReq')

const portal = require('../config/confPortal')

const validate = require('../definitions/schemaValidators')

const {
  NotFoundError,
  InternalServerError,
  NotImplementedError,
  BadRequestError,
  ForbiddenError,
  NotAcceptableError,
  RudiError,
  UnauthorizedError,
} = require('../utils/errors')

// ------------------------------------------------------------------------------------------------
// Token manager
// ------------------------------------------------------------------------------------------------
// const { RMTokenManager } = require('../definitions/constructors/RMTokenManager')
// const portalInfo = {
//   host: portal.API_GET_HOST,
//   port: portal.API_GET_PORT,
//   path_request: portal.API_GET_PATH,
//   path_check: portal.API_SEND_PATH,
//   login: portal.LOGIN,
//   passw: portal.PASSW,
// }
// const agent = `RUDI/${api.VERSION}`

// const tokenManager = new RMTokenManager(portalInfo, agent)

// ------------------------------------------------------------------------------------------------
// REST access
// ------------------------------------------------------------------------------------------------
exports.exposedGetPortalToken = async (req, reply) => {
  const fun = 'exposedGetPortalToken'
  log.t(mod, fun, `< GET new portal token`)
  try {
    // log.d(mod, fun, portal.getAuthUrl())
    return await this.getNewTokenFromPortal()
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.checkPortalTokenInHeader = async (req, reply) => {
  const fun = 'checkPortalTokenInHeader'
  log.t(mod, fun, ``)
  try {
    const token = extractJwt(req)
    const jwtInfo = await this.verifyPortalToken(token)
    return jwtInfo
    // return await this.getTokenCheckedByPortal(token)
  } catch (err) {
    const error = new UnauthorizedError(err)
    throw RudiError.treatError(mod, fun, error)
  }
}

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------

/**
 * Get a new token from the portal
 */
exports.getPortalToken = async () => {
  const fun = 'getPortalToken'
  log.t(mod, fun, ``)
  let token, rmToken
  try {
    rmToken = await db.getLatestStoredPortalToken()
    if (!rmToken || rmToken.expires_in < utils.nowEpochS()) {
      log.d(mod, fun, 'Need for a new portal token')
      rmToken = await this.getNewTokenFromPortal()
    }

    token = json.accessProperty(rmToken, portal.FIELD_TOKEN)
    // log.d(mod, fun, `token: ${utils.beautify(token)}`)
    await this.verifyPortalToken(token)
    log.d(mod, fun, 'Stored token seems OK')

    await this.getTokenCheckedByPortal(token)
    return token
    // log.d(mod, fun, 'Stored token was validated by the Portal')
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
    //  new InternalServerError(`Failed to get a new token from the portal: ${err}`)
  }
}

/**
 * Ensure a token is valid
 */
exports.checkStoredToken = async (req, reply) => {
  const fun = 'checkStoredToken'
  log.t(mod, fun, ``)
  // log.t(mod, fun, `< GET portal check token`)
  try {
    const token = await db.getLatestStoredPortalToken()
    if (!token) throw new NotFoundError('No Portal token is actually stored')
    return await this.getTokenCheckedByPortal(token[portal.FIELD_TOKEN])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.checkInputToken = async (req, reply) => {
  const fun = 'checkInputToken'
  log.t(mod, fun, ``)
  try {
    const token = json.accessReqParam(req.params, portal.PARAM_TOKEN)
    return await this.getTokenCheckedByPortal(token[portal.FIELD_TOKEN])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getMetadata = async (req, reply) => {
  const fun = 'getMetadata'
  log.t(mod, fun, ``)
  try {
    let metadataId = req.params[api.PARAM_ID]
    log.d(mod, fun, `metadataId: ${metadataId}`)
    if (metadataId && !validate.isUUID(metadataId)) metadataId = null

    return await this.getMetadataFromPortal(metadataId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.sendMetadata = async (req, reply) => {
  const fun = 'sendMetadata'
  log.t(mod, fun, ``)
  try {
    let metadataId = req.params[api.PARAM_ID]
    log.d(mod, fun, `metadataId: ${metadataId}`)
    if (!metadataId || !validate.isUUID(metadataId))
      throw new BadRequestError('Parameter is not a valid UUID v4')

    return await this.sendMetadataToPortal(metadataId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.deleteMetadata = async (req, reply) => {
  const fun = 'deleteMetadata'
  log.t(mod, fun, ``)
  try {
    let metadataId = req.params[api.PARAM_ID]
    log.d(mod, fun, `metadataId: ${metadataId}`)
    if (metadataId && !validate.isUUID(metadataId)) metadataId = null

    return await this.deletePortalMetadata(metadataId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// ------------------------------------------------------------------------------------------------
// Portal calls: GET public key
// ------------------------------------------------------------------------------------------------
let cachedPortalPubKey
// ----- GET Portal public key
exports.getPortalPublicKey = async () => {
  const fun = 'getPortalPublicKey'
  try {
    log.t(mod, fun, ``)
    if (cachedPortalPubKey) return cachedPortalPubKey

    const publicKeyUrl = portal.getPortalPubKeyUrl()
    log.d(mod, fun, 'publicKeyUrl: ' + publicKeyUrl)

    const publicKeyObj = await httpGet(publicKeyUrl)
    // log.d(mod, fun, 'publicKeyObj: ' + publicKeyObj)
    const publicKey = publicKeyObj ? publicKeyObj.value : null
    // log.d(mod, fun, 'publicKey: ' + publicKey)

    cachedPortalPubKey = publicKey
    return cachedPortalPubKey
    log.d(mod, fun, `publicKey: ${publicKey}`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Portal calls: token
// ------------------------------------------------------------------------------------------------
exports.getNewTokenFromPortal = async () => {
  const fun = 'getNewTokenFromPortal'
  log.t(mod, fun, ``)
  try {
    const [usr, pwdb64] = portal.getCredentials()
    const portalAuthUrl = portal.getAuthUrl()
    // LM -- the password is now provided in base64
    const pwd = utils.decodeBase64(pwdb64)
    // log.d(mod, fun, `pwdb64: ${pwdb64}`)
    // log.d(mod, fun, `pwd: ${pwd}`)
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
    // log.d(mod, fun, `body: ${body}`)

    const basicAuth = utils.padWithEqualSignBase4(utils.toBase64(`${usr}:${pwd}`))
    // log.d(mod, fun, `basicAuth: ${basicAuth}`)

    const opts = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': `RudiProd/${api.API_VERSION}`,
        Authorization: `Basic ${basicAuth}`,
      },
    }
    // log.d(mod, fun, utils.beautify(opts))
    let answer
    try {
      answer = await directPost(portalAuthUrl, body, opts)
    } catch (err) {
      if (RudiError.isRudiError(err)) throw RudiError.treatError(mod, fun, err)
      else {
        const error = new InternalServerError(`Post to portal failed: ${utils.beautify(err)}`)
        throw RudiError.treatError(mod, fun, error)
      }
    }
    // log.d(mod, fun, `answer.status: ${answer.status}`)

    if (answer.status === 200) {
      // log.d(mod, fun, `config: ${utils.beautify(answer.config)}`)
      // log.d(mod, fun, `data: ${utils.beautify(answer.data)}`)
      const portalToken = answer.data

      const jwToken = portalToken[portal.FIELD_TOKEN]
      if (typeof portalToken !== 'object' || !portalToken[portal.FIELD_TOKEN])
        throw new NotAcceptableError(`The portal delivered an incorrect reply: ${portalToken}`)

      // log.d(mod, fun, `portalToken: ${utils.beautify(portalToken)}`)

      const jwtBody = (await this.verifyPortalToken(jwToken))[1]
      portalToken[JWT_EXP] = jwtBody[JWT_EXP]
      log.d(
        mod,
        fun,
        `We got a new token, that expires on ${utils.dateEpochSToIso(jwtBody[JWT_EXP])}`
      )
      await this.getTokenCheckedByPortal(portalToken[portal.FIELD_TOKEN])
      await db.storePortalToken(portalToken)

      return portalToken
    } else {
      const errMsg = `${utils.beautify(answer)}`
      // log.w(mod, fun, errMsg)
      throw RudiError.createRudiHttpError(answer.status, errMsg, mod, fun)
    }
  } catch (err) {
    if (RudiError.isRudiError(err)) {
      log.t(mod, fun, 'is a RudiError')
      throw RudiError.treatError(mod, fun, err)
    } else {
      log.t(mod, fun, `is not a RudiError: ${err}`)
      const error = new ForbiddenError(`Failed to get a token from Portal: ${utils.beautify(err)}`)
      throw RudiError.treatError(mod, fun, error)
    }
  }
}

exports.getTokenCheckedByPortal = async (token) => {
  const fun = 'getTokenCheckedByPortal'
  try {
    log.t(mod, fun, ``)
    if (!token) throw new BadRequestError('No token to check!')
    const portalUrl = portal.getCheckAuthUrl()

    const requestUrl = `${portalUrl}?${portal.PARAM_TOKEN}=${token}`
    // log.d(mod, fun, requestUrl)
    const portalResponse = await directGet(requestUrl)

    if (portalResponse.status === 200) {
      log.v(mod, fun, `RUDI Portal validated the token`)
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
  exports.checkSignatureWithSecret = (accessToken) => {
    const fun = 'checkSignatureWithSecret'
    log.t(mod, fun, ``)

    try {
      if (!accessToken) throw new BadRequestError('No token = no signature to verify!')
      const [jwtHeaderBase64, jwtPayloadBase64, jwtSignatureBase64] = accessToken.split('.')

      const hash = createHmac('sha256', portal.getSecret())
        .update(`${jwtHeaderBase64}.${jwtPayloadBase64}`)
        .digest('base64url')

      if (hash !== jwtSignatureBase64) {
        const errMsg = `Forged token? Computed hash: ${hash} != jwt signature: ${jwtSignatureBase64}`
        log.w(mod, fun, errMsg)
      }
      return hash === jwtSignatureBase64

      // if (hash !== jwtSignatureBase64) {
      //   const errMsg = `Forged token? Computed hash: ${hash} != jwt signature: ${jwtSignatureBase64}`
      //   log.w(mod, fun, errMsg)
      //   throw new Error(errMsg)
      // }
      // return true
    } catch (err) {
      const errMsg = `Invalid token: ${err}`
      log.w(mod, fun, errMsg)
      throw err
    }
  }
 */
exports.checkSignatureWithPubKey = async (accessToken) => {
  const fun = 'checkSignatureWithPubKey'
  try {
    log.t(mod, fun, ``)

    if (!accessToken) throw new BadRequestError('No token = no signature to check!')
    const [jwtHeaderBase64url, jwtPayloadBase64url, jwtSignatureBase64url] = accessToken.split('.')

    // Retrieve the public key
    let pubKeyPem
    try {
      pubKeyPem = await this.getPortalPublicKey()
    } catch (err) {
      throw new InternalServerError(`Couldn't retrieve online portal public key: ${err}`)
    }
    let sslKey
    try {
      sslKey = parseKey(pubKeyPem)
    } catch (err) {
      throw new InternalServerError(
        `The Portal public key is incorrect, please check the content: ${err}`
      )
    }

    // log.d(mod, fun, `sslKey: ${utils.beautify(sslKey)}`)
    // const keyName = sslKey.comment && sslKey.comment !== '(unnamed)' ? `'${sslKey.comment}' ` : ''
    // log.d(mod, fun, `${keyName}public key: ${sslKey.type} ${sslKey.size} bits`)
    let signatureIsValid
    try {
      const verifier = sslKey.createVerify('sha256')
      verifier.update(`${jwtHeaderBase64url}.${jwtPayloadBase64url}`)
      signatureIsValid = verifier.verify(jwtSignatureBase64url, 'base64url')
    } catch (err) {
      throw new ForbiddenError(`Error while verifying the Portal token signature: ${err}`)
    }
    if (signatureIsValid) {
      log.i(mod, fun, `signature is valid`)
    } else {
      log.w(mod, fun, `signature is not valid`)
    }
    return signatureIsValid
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.verifyPortalToken = async (accessToken) => {
  const fun = 'verifyPortalToken'
  log.t(mod, fun, ``)

  try {
    if (!accessToken) throw new BadRequestError('No token to verify!')
    const [jwtHeaderBase64, jwtPayloadBase64, _] = accessToken.split('.')

    // Check JWT header
    const jwtHeader = JSON.parse(utils.decodeBase64url(jwtHeaderBase64))

    // Check JWT body
    const jwtPayload = JSON.parse(utils.decodeBase64url(jwtPayloadBase64))

    const jwtPortalUser = jwtPayload[portal.JWT_USER]
    if (!jwtPortalUser && jwtPayload[REQ_MTD])
      throw new ForbiddenError(`Using a RUDI internal JWT to access a Portal route is incorrect.`)
    /*
      // const login = portal.getCredentials()[0]
      // log.d(mod, fun, `JWT Portal payload: ${utils.beautify(jwtPayload)}`)
      // log.d(mod, fun, `JWT Portal user: ${jwtPortalUser}`)
      if (jwtPortalUser !== login) {
        // log.w(mod, fun, `Portal JWT: incorrect user: ${jwtPortalUser}`)
        log.e(`Portal JWT: incorrect user: ${jwtPortalUser}, token=${accessToken}`)
        // throw new ForbiddenError(`Portal JWT: incorrect user`)
      }
      // if (jwtPayload[portal.JWT_CLIENT] !== login)
      //   throw new ForbiddenError('Portal JWT: incorrect client')
    */
    if (jwtPayload[JWT_EXP] < utils.nowEpochS())
      throw new ForbiddenError(
        `Portal JWT expired: ` +
          `expire_date=${utils.dateEpochSToIso(jwtPayload[JWT_EXP])}` +
          ` < now=${utils.dateEpochSToIso(utils.nowEpochS())}`
      )
    // log.d(mod, fun, `jwtHeader: ${utils.beautify(jwtHeader)}`)
    // log.d(mod, fun, `jwtPayload: ${utils.beautify(jwtPayload)}`)

    // Check JWT signature
    if (!(await this.checkSignatureWithPubKey(accessToken)))
      throw new ForbiddenError('Portal JWT signature is not valid')

    // log.d(mod, fun, `jwtHeader: ${utils.beautify(jwtHeader)}`)
    // log.d(mod, fun, `jwtPayload: ${utils.beautify(jwtPayload)}`)
    return [jwtHeader, jwtPayload]
  } catch (err) {
    const errMsg = `Invalid token: ${err}`
    log.w(mod, fun, errMsg)
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Portal calls: metadata
// ------------------------------------------------------------------------------------------------
exports.sendMetadataToPortal = async (metadataId) => {
  const fun = 'sendMetadataToPortal'
  try {
    log.t(mod, fun, ``)
    if (portal.isPortalConnectionDisabled()) return

    //--- Check input param
    if (!metadataId) throw new NotImplementedError('Not yet implemented')
    if (!validate.isUUID(metadataId)) throw new BadRequestError('Bad formatted UUID')

    //--- Get local metadata from ID
    const metadata = await db.getEnsuredObjectWithRudiId(api.OBJ_METADATA, metadataId)
    if (!metadata) {
      const errMsg = `No data found locally for id '${metadataId}'`
      log.w(mod, fun, errMsg)
      throw new NotFoundError(errMsg)
    }

    //--- If 'collection_tag' is set (ie for tests), metadata is not sent
    const collectionTag = metadata[API_COLLECTION_TAG]
    if (collectionTag) {
      log.d(mod, fun, `Not sending to portal: ${metadataId} (${collectionTag})`)
      return
    }

    //--- Ensuring compatibility with portal
    const metadataClean = utils.deepClone(metadata)
    // API version
    metadataClean[API_METAINFO_PROPERTY][API_METAINFO_VERSION_PROPERTY] = api.API_VERSION
    // MIME type: YAML
    metadataClean[API_MEDIA_PROPERTY].map((media) => {
      if (media[API_MEDIA_TYPE] === MediaTypes.File && media[API_FILE_TYPE] === MIME_YAML) {
        media[API_FILE_TYPE] = 'text/plain'
      }
    })

    // log.d(mod, fun, utils.beautify(metadataClean))

    //--- Sending to portal
    const sendPortalUrl = portal.postPortalMetaUrl()
    const portalToken = await this.getPortalToken()
    const reqOpts = {
      headers: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${portalToken}`,
      },
    }
    try {
      log.d(mod, fun, `Checking if the metadata is on the portal`)
      const answer = await axios.get(portal.getPortalMetaUrl(metadataId), reqOpts)
      const portalMetadata = answer.data

      if (getUpdatedDate(portalMetadata) < getUpdatedDate(metadataClean)) {
        log.d(mod, fun, `Metadata is on the portal and older: updating '${metadataId}'`)
        return httpPut(sendPortalUrl, metadataClean, portalToken)
      } else {
        log.d(mod, fun, `Metadata is on the portal and same: not updating '${metadataId}'`)
      }
    } catch (err) {
      log.e(mod, fun, err)
      log.d(mod, fun, `Metadata is not on the portal: sending '${metadataId}'`)
      return httpPost(sendPortalUrl, metadataClean, portalToken)
    }
    // log.d(mod, fun, `reply: ${utils.beautify(reply)}`)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getMetadataFromPortal = async (metadataId) => {
  const fun = 'getMetadataFromPortal'
  log.t(mod, fun, ``)
  try {
    const token = await this.getPortalToken()

    if (!metadataId) return httpGet(portal.getPortalMetaUrl(), token)
    else return httpGet(portal.getPortalMetaUrl(metadataId), token)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.deletePortalMetadata = async (metadataId) => {
  const fun = 'deletePortalMetadata'
  log.t(mod, fun, ``)
  try {
    if (!metadataId) throw new BadRequestError('Metadata id required') // Can't get the resouces list yet.

    const token = await this.getPortalToken()
    const reply = await httpDelete(portal.postPortalMetaUrl(metadataId), token)

    return reply
  } catch (err) {
    const error = new Error(`Couldn't delete on Portal side: ${err}`)
    throw RudiError.treatError(mod, fun, error)
  }
}
