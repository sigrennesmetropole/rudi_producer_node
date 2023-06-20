const mod = 'keyCtrl'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { parseKey } from 'sshpk'

import _ from 'lodash'
const { pick } = _

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  API_PUB_PEM,
  API_PUB_URL,
  API_PUB_NAME,
  API_PUB_TYPE,
  API_PUB_PROP,
  API_PUB_KEY,
  API_PUB_ID,
} from '../db/dbFields.js'
// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logT } from '../utils/logging.js'
// import { beautify } from '../utils/jsUtils.js'
import { httpGet } from '../utils/httpReq.js'

import { RudiError, BadRequestError, NotFoundError } from '../utils/errors.js'
import PublicKey from '../definitions/models/PublicKey.js'
import { getApiUrl } from '../config/confSystem.js'
import { OBJ_PUB_KEYS, URL_PREFIX_PUBLIC, PARAM_ID, PARAM_PROP } from '../config/confApi.js'
import { accessReqParam } from '../utils/jsonAccess.js'
import { CallContext } from '../definitions/constructors/callContext.js'
import {
  doesObjectExistWithRudiId,
  getEnsuredObjectWithRudiId,
  overwriteDbObject,
} from '../db/dbQueries.js'
import { REGEX_WORD } from '../definitions/schemaValidators.js'
import { getPortalEncryptPubKey } from './portalController.js'
import { latiniseString } from '../utils/lang.js'

// -------------------------------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------------------------------
export const checkKeyName = (pubKeyName) => {
  const fun = 'checkKeyName'
  // Check if the name (== id) of the public key is provided
  if (!pubKeyName)
    throw new BadRequestError(
      `The 'name' property of the public key should be provided`,
      mod,
      fun,
      [API_PUB_NAME]
    )

  // Check that there are only permitted characters
  if (!pubKeyName.match(REGEX_WORD))
    throw new BadRequestError(
      `The 'name' property of the public key should only contain letters, numbers as well as` +
        ` minus and underscore signs`,
      mod,
      fun,
      [API_PUB_NAME]
    )
}

const checkKeyPem = (keyPem) => {
  const fun = 'checkKeyPem'
  try {
    logT(mod, fun, ``)
    // logV(mod, fun, keyPem)
    const key = parseKey(keyPem)
    // logV(mod, fun, key)
    return key
  } catch (err) {
    throw new BadRequestError(
      `The key PEM cannot be parsed: '${keyPem}' ${err ? `. Error: ${err}` : ''}`,
      mod,
      fun,
      [API_PUB_PEM]
    )
  }
}

/**
 *
 * @param {*} pubKeyJson (mutated)
 * @returns
 */
const normalizeKeyData = async (pubKeyJson) => {
  const fun = 'normalizeKeyData'

  try {
    logT(mod, fun, ``)
    // Latinize pubKey name
    pubKeyJson[API_PUB_NAME] = latiniseString(pubKeyJson[API_PUB_NAME])
      .replace(/[\s]/g, '_')
      .replace(/[^\w-]/g, '')

    // Check if either the URL or the PEM are provided
    if (!pubKeyJson[API_PUB_PEM] && !pubKeyJson[API_PUB_URL])
      throw new BadRequestError(
        'Either the URL should be provided for the public key to get fetched, or the PEM' +
          ' of the public key should be directly given',
        mod,
        fun,
        [API_PUB_URL]
      )

    // URL was not provided
    if (!pubKeyJson[API_PUB_URL]) {
      const key = checkKeyPem(pubKeyJson[API_PUB_PEM]) // throws an error if the key can't be parsed
      pubKeyJson[API_PUB_TYPE] = key.type
      pubKeyJson[API_PUB_KEY] = `${key}`
      // As the URL was not provided, we provide the URL at which the public key will be available
      // on the producer node
      pubKeyJson[API_PUB_URL] = getApiUrl(
        `${URL_PREFIX_PUBLIC}/${OBJ_PUB_KEYS}/${pubKeyJson[API_PUB_NAME]}/${API_PUB_PEM}`
      )
    } else {
      // We have an URL
      let response
      try {
        // Special case: portal key
        if (pubKeyJson[API_PUB_URL].endsWith('/konsult/v1/encryption-key')) {
          response = await getPortalEncryptPubKey()
        } else {
          // Get the key at the (public) URL
          response = await httpGet(pubKeyJson[API_PUB_URL])
        }
      } catch (err) {
        throw new NotFoundError(
          `Couldn't reach the public key URL: ${pubKeyJson[API_PUB_URL]}: ${err.message}`
        )
      }
      // logI(mod, fun, `response: ${beautify(response)}`)

      const keyPem = pubKeyJson[API_PUB_PROP] ? response[pubKeyJson[API_PUB_PROP]] : response
      const key = checkKeyPem(keyPem)

      if (!pubKeyJson[API_PUB_PEM]) pubKeyJson[API_PUB_PEM] = keyPem
      else if (keyPem.replace(/[\n\s\r]/g, '') !== pubKeyJson[API_PUB_PEM].replace(/[\n\s\r]/g, ''))
        throw new BadRequestError(
          `Provided PEM doesn't match the one found at the provided URL: ${pubKeyJson[API_PUB_URL]}` +
            `\n${pubKeyJson[API_PUB_PEM]}\n !==\n ${keyPem}`,
          mod,
          fun,
          [API_PUB_PEM]
        )

      pubKeyJson[API_PUB_KEY] = `${key}`.replace(' (unnamed)', ` (${pubKeyJson[API_PUB_NAME]})`)

      if (key.type) pubKeyJson[API_PUB_TYPE] = key.type
    }
    return pubKeyJson
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
// -------------------------------------------------------------------------------------------------
// Functions
// -------------------------------------------------------------------------------------------------
export const getSinglePubKey = async (req, reply) => {
  const fun = 'getSinglePubKey'
  try {
    logT(mod, fun, ``)
    const objectId = accessReqParam(req, PARAM_ID)
    const objectProp = req.params[PARAM_PROP] // Could be null
    const dbObject = await getEnsuredObjectWithRudiId(OBJ_PUB_KEYS, objectId)

    const context = CallContext.getCallContextFromReq(req)
    if (context) context.addObjId(OBJ_PUB_KEYS, objectId)

    return objectProp
      ? dbObject[objectProp]
      : pick(dbObject, [API_PUB_URL, API_PUB_PEM, API_PUB_KEY, API_PUB_TYPE])
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Insert a new PublicKey object in the database
 * The `name` should be unique and is required
 * If provided, the `url` should be accessible
 * The PEM should be valid
 * Either the PEM or the URL are required
 * @param {Object} pubKeyJson Input data
 * @returns The PublicKey object as a JSON once it has been inserted in the db
 */
export const newPublicKey = async (pubKeyJson) => {
  const fun = 'newPublicKey'
  try {
    logT(mod, fun, ``)
    await normalizeKeyData(pubKeyJson)
    const pubKeyId = pubKeyJson[API_PUB_ID]
    const existsPubKey = await doesObjectExistWithRudiId(OBJ_PUB_KEYS, pubKeyId)
    if (existsPubKey)
      throw new BadRequestError(`A public key already exists with the name '${pubKeyId}'`)
    const dbPubKey = new PublicKey(pubKeyJson)
    await dbPubKey.save()

    return dbPubKey
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const overwritePubKey = async (pubKeyJson) => {
  const fun = 'overwritePubKey'
  try {
    logT(mod, fun, ``)
    await normalizeKeyData(pubKeyJson)

    const dbPubKey = await overwriteDbObject(OBJ_PUB_KEYS, pubKeyJson)
    return dbPubKey
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
