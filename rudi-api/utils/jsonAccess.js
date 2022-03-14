'use strict'
const mod = 'json'

const { BadRequestError } = require('./errors')
// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const utils = require('./jsUtils')
const log = require('./logging')
const msg = require('./msg')

// ------------------------------------------------------------------------------------------------
// Functions
// ------------------------------------------------------------------------------------------------

/**
 * Safe access to a property of a request: ensures the parameter is defined
 * @param {JSON} req: the HTTP request
 * @param {String} param: a parameter in the HTTP request that should be defined
 * @returns {String} The value for the parameter
 * @throws request parameter is missing
 */
exports.accessReqParam = (req, param) => {
  const value = req.params[param]
  if (!value) throw new BadRequestError(`${msg.missingRequestParameter(req, param)}`)
  return value
}

/**
 * Safe access to a property of a JSON object: ensures the property is defined
 * @param {JSON} jsonObject
 * @param {String} jsonProperty
 * @returns {String} The property value
 * @throws object property is missing
 */
exports.accessProperty = (jsonObject, jsonProperty) => {
  // log.d(mod, fun, `Accessing property '${jsonProperty}' from object '${utils.beautify(jsonObject)}'`)
  const value = jsonObject[jsonProperty]
  // log.d(mod, fun, `=> value = ${utils.beautify(value)}`)
  if (!value) throw new BadRequestError(`${msg.missingObjectProperty(jsonObject, jsonProperty)}`)
  // log.d(mod, fun, `=> ${jsonProperty} = ${utils.beautify(value)}`)
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
exports.requireSubProperty = (obj, prop, subProp, enumProp, enumVal) => {
  const fun = 'requireSubProperty'

  // log.d(mod, fun, `prop: ${prop} | subProp: ${subProp} | enumVal: ${enumVal}`)
  if (utils.isNothing(obj[prop])) {
    // log.d(mod, fun, `empty obj[${prop}]: ${this.beautify(obj[prop])}`)
    return false
  }
  const objProp = obj[prop]

  // log.d(mod, fun, `${prop}: ${this.beautify(propObj)}`)
  // log.d(mod, fun, `${prop}.${subProp}: ${this.beautify(propObj[subProp])}`)
  if (!enumVal) {
    // Regular check: if prop is defined, subProp must be defined !
    // log.d(mod, fun, `obj.${prop} / ${enumVal}`)
    if (utils.isNothing(objProp[subProp])) {
      const errMsg = msg.subPropNeededWhenPropSet(prop, subProp)
      // log.e(mod, fun, errMsg)
      throw new BadRequestError(errMsg)
    }
    // log.d(mod, fun, `${objProp[subProp]}`)
    return objProp[subProp]
  } else {
    // Enum conditional check: if prop is defined and enumProp is set to enumVal, subProp must be defined !
    if (objProp[enumProp] === enumVal) {
      // log.d(mod, fun, `obj.${prop}.${enumProp} === ${enumVal}`)
      if (utils.isNothing(objProp[subProp])) {
        const errMsg = msg.subPropNeededWhenPropSetToEnum(prop, subProp, enumProp, enumVal)
        // log.e(mod, fun, errMsg)
        throw new BadRequestError(errMsg)
      } else {
        return objProp[subProp]
      }
    } else {
      log.d(
        mod,
        fun,
        `obj.${prop}.${enumProp} === ${this.beautify(objProp[enumProp])} != ${enumVal}`
      )
    }
  }
}
