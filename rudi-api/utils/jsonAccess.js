const mod = 'json'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------

import { BadRequestError } from './errors.js'
import { beautify, isNothing } from './jsUtils.js'
import { logD } from './logging.js'
import {
  missingObjectProperty,
  missingRequestParameter,
  subPropNeededWhenPropSet,
  subPropNeededWhenPropSetToEnum,
} from './msg.js'

// -------------------------------------------------------------------------------------------------
// Functions
// -------------------------------------------------------------------------------------------------

/**
 * Safe access to a property of a request: ensures the parameter is defined
 * @param {JSON} req: the HTTP request
 * @param {String} param: a parameter in the HTTP request that should be defined
 * @returns {String} The value for the parameter
 * @throws request parameter is missing
 */
export const accessReqParam = (req, param) => {
  if (!req) throw new BadRequestError('Input parameter "req" should be an incoming http request')
  const value = req.params[param]
  if (!value) throw new BadRequestError(`${missingRequestParameter(req, param)}`)
  return value
}

/**
 * Safe access to a property of a JSON object: ensures the property is defined
 * @param {JSON} jsonObject
 * @param {String} jsonProperty
 * @returns {String} The property value
 * @throws object property is missing
 */
export const accessProperty = (jsonObject, jsonProperty) => {
  let value
  try {
    value = jsonObject[jsonProperty]
  } catch (e) {
    throw new BadRequestError(`This should be an object: ${beautify(jsonObject)}`)
  }
  if (!value) throw new BadRequestError(`${missingObjectProperty(jsonObject, jsonProperty)}`)
  return value
}

/**
 * Ensures the sub-property is defined when the parent property is defined
 * If parameter 'enumVal' is set, checks that subProperty is defined if enum property is set to enumVal
 * @param {JSON} jsonObject
 * @param {String} jsonProperty
 * @param {String} jsonProperty
 * @param {String} jsonProperty supporting the enum value
 * @param {String} enum value
 * @returns {String} The property value, or false if the parent property is not defined
 * @throws object property is missing
 */
export const requireSubProperty = (obj, prop, subProp, enumProp, enumVal) => {
  const fun = 'requireSubProperty'

  // logD(mod, fun, `prop: ${prop} | subProp: ${subProp} | enumVal: ${enumVal}`)
  if (isNothing(obj[prop])) {
    // logD(mod, fun, `empty obj[${prop}]: ${beautify(obj[prop])}`)
    return false
  }
  const objProp = obj[prop]

  // logD(mod, fun, `${prop}: ${beautify(propObj)}`)
  // logD(mod, fun, `${prop}.${subProp}: ${beautify(propObj[subProp])}`)
  if (!enumVal) {
    // Regular check: if prop is defined, subProp must be defined !
    // logD(mod, fun, `obj.${prop} / ${enumVal}`)
    if (isNothing(objProp[subProp])) {
      const errMsg = subPropNeededWhenPropSet(prop, subProp)
      // logE(mod, fun, errMsg)
      throw new BadRequestError(errMsg)
    }
    // logD(mod, fun, `${objProp[subProp]}`)
    return objProp[subProp]
  } else {
    // Enum conditional check: if prop is defined and enumProp is set to enumVal, subProp must be defined !
    if (objProp[enumProp] === enumVal) {
      // logD(mod, fun, `obj.${prop}.${enumProp} === ${enumVal}`)
      if (isNothing(objProp[subProp])) {
        const errMsg = subPropNeededWhenPropSetToEnum(prop, subProp, enumProp, enumVal)
        // logE(mod, fun, errMsg)
        throw new BadRequestError(errMsg)
      } else {
        return objProp[subProp]
      }
    } else {
      logD(mod, fun, `obj.${prop}.${enumProp} === ${beautify(objProp[enumProp])} != ${enumVal}`)
    }
  }
}
