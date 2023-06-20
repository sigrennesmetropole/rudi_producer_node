const mod = 'callCtxt'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import { nanoid } from 'nanoid'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { isNotEmptyArray, beautify, dateEpochMsToIso } from '../../utils/jsUtils.js'
import { logD, logI, logT, logV, logW, sysInfo, sysOnError } from '../../utils/logging.js'
import { RudiError } from '../../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// External constants
// -------------------------------------------------------------------------------------------------
import {
  ROUTE_NAME,
  OBJ_METADATA,
  OBJ_ORGANIZATIONS,
  OBJ_CONTACTS,
  OBJ_MEDIA,
  OBJ_REPORTS,
  TRACE_MOD,
  TRACE_FUN,
} from '../../config/confApi.js'
import { protectHeaderAuth, protectHeaderUrl, protectHeaderMethod } from '../../utils/protection.js'
// -------------------------------------------------------------------------------------------------
// Internal constants
// -------------------------------------------------------------------------------------------------
const ACTIVATE_LOG = true
/**
 * This class makes it possible to add to the request received by node a context that will be
 * helpful to create syslog lines.
 * Technically, it adds a new property to the request [CALL_CONTEXT] that is structured along
 * the RudiLogger structure (see https://gitlab.aqmo.org/rudidev/rudilogger)
 * and more specifically like this:
 * {
 *    [AUTH]: {JS object} identification informations
 *    {
 *        [REQ_IPS]: {array} list of IP redirections, in inverse chronological order
 *        [REQ_APP]: {string} identifier of the app/module that sends the request
 *        [REQ_USR]: {string} identified user that launches the request
 *    },
 *    [OP]: {JS object} operations informations
 *    {
 *        [OP_TYPE]: {string} identifies the operation corresponding to the request
 *        [STATUS_CODE]: {int} HTTP status code of the reply
 *        [OP_ID]: {array} list of the objects affected by the operation in the shape "op_type:id"
 *    },
 *    [DETAILS]: {JS object} additional details (this is )
 *    {
 *        [ERROR]: {JS object} error details
 *        [TIME]: {JS object} timestamp and request duration
 *        [REQ]: {string} an identifier for this request
 *    }
 * }
 */
const CALL_CONTEXT = 'callContext'

const AUTH = 'auth'
const REQ_IPS = 'reqIp'
const REQ_APP = 'clientApp'
const REQ_USR = 'userId'

const OP = 'operation'
const OP_TYPE = 'opType'
const STATUS_CODE = 'statusCode'
const OP_ID = 'id'

const DETAILS = 'raw'
const ERROR = 'error'
const ERR_PLACE = 'errPlace'
const ERR_ON_REQ = 'errOnReq'

const REQ = 'req'
const REQ_ID = 'id'
const REQ_MTD = 'mtd'
const REQ_URL = 'url'
const REQ_TIMESTAMP = 'tsMs'
const REQ_DURATION = 'durMs'

// -------------------------------------------------------------------------------------------------
// Class CallContext
// -------------------------------------------------------------------------------------------------
/**
 * This class is used to gather contextual information from the incoming request
 */
export const CallContext = class CallContext {
  constructor(authDetails, opDetails, rawDetails) {
    const fun = 'CallContext()'
    try {
      const msg = `${authDetails ? beautify(authDetails) : ''}, ${
        opDetails ? beautify(opDetails) : ''
      }, ${rawDetails ? beautify(rawDetails) : ''}`
      if (ACTIVATE_LOG) logT(mod, fun, msg)

      this[AUTH] = !authDetails ? {} : authDetails
      this[OP] = !opDetails ? {} : opDetails
      this[DETAILS] = !rawDetails ? {} : rawDetails
      this.setId()
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  // -------------------------------------------------------------------------------------------------
  // Field access
  // -------------------------------------------------------------------------------------------------

  set ips(ipArray) {
    if (ACTIVATE_LOG) logT(mod, 'setIps', ``)
    if (!Array.isArray(ipArray))
      throw new RudiError(`Context IPs can only be set as an array`, mod, 'setIps')
    this[AUTH][REQ_IPS] = ipArray
  }
  get ips() {
    return this[AUTH][REQ_IPS]
  }

  setIpsFromRequest(req) {
    if (ACTIVATE_LOG) logT(mod, 'setIpsFromRequest', ``)
    this.ips = CallContext.extractIpAndRedirections(req)
  }

  set clientApp(clientApp) {
    if (ACTIVATE_LOG) logT(mod, 'setClientApp', ``)
    this[AUTH][REQ_APP] = clientApp
  }
  get clientApp() {
    return this[AUTH][REQ_APP] || ''
  }

  set reqUser(userId) {
    if (ACTIVATE_LOG) logT(mod, 'setUser', ``)
    this[AUTH][REQ_USR] = userId
  }
  get reqUser() {
    return this[AUTH][REQ_USR] || ''
  }

  setAuth(ips, clientApp, userId) {
    if (ACTIVATE_LOG) logT(mod, 'setAuth', ``)
    this.ips = Array.isArray(ips) ? ips : [ips]
    if (clientApp) this.clientApp = clientApp
    if (userId) this.reqUser = userId
  }

  addObjId(type, id) {
    if (!this[OP] || !this[OP][OP_ID]) this[OP][OP_ID] = []
    this[OP][OP_ID].push(`${type}:${id}`)
  }

  addMetaId = (id) => this.addObjId(`${OBJ_METADATA}:${id}`)
  addProducerId = (id) => this.addObjId(`${OBJ_ORGANIZATIONS}:${id}`)
  addContactId = (id) => this.addObjId(`${OBJ_CONTACTS}:${id}`)
  addMediaId = (id) => this.addObjId(`${OBJ_MEDIA}:${id}`)
  addReportId = (id) => this.addObjId(`${OBJ_REPORTS}:${id}`)

  setReqDescription(reqMethod, reqUrl, routeName) {
    if (ACTIVATE_LOG) logT(mod, 'setReqDescription', ``)
    if (!this[DETAILS][REQ]) this[DETAILS][REQ] = {}
    this[DETAILS][REQ][REQ_MTD] = reqMethod
    this[DETAILS][REQ][REQ_URL] = reqUrl
    this[OP][OP_TYPE] = routeName
  }
  get routeName() {
    return this[OP][OP_TYPE]
  }
  set routeName(route) {
    return (this[OP][OP_TYPE] = route)
  }
  get reqMethod() {
    return this[DETAILS][REQ][REQ_MTD]
  }
  get reqUrl() {
    return this[DETAILS][REQ][REQ_URL]
  }

  addDetails(key, val) {
    this[DETAILS][key] = val
  }
  getDetails = () => this[DETAILS]
  get details() {
    return this.getDetails()
  }

  getDetailsStr = () => JSON.stringify(this[DETAILS])
  get detailsStr() {
    return this.getDetailsStr()
  }

  getReqDetails() {
    if (!this[DETAILS][REQ]) this[DETAILS][REQ] = {}
    return this[DETAILS][REQ]
  }

  formatReqDetails = () => {
    // const reqDetails = this.getReqDetails()
    return `${dateEpochMsToIso(this.timestamp)} [${this.id}] ${this.reqMethod} ${this.reqUrl}`
  }

  get apiCallMsg() {
    const fun = 'apiCallMsg'
    if (ACTIVATE_LOG) logT(mod, fun, ``)
    try {
      return (
        this.reqDetailsMsg +
        ` <- ${this.clientApp}${this.reqUser}${
          this.clientApp || this.reqUser ? ' @ ' : ''
        }${this.ips.join(' <- ')}`
      )
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  get reqDetailsMsg() {
    const fun = 'reqDetailsMsg'
    if (ACTIVATE_LOG) logT(mod, fun, ``)
    try {
      return `${this.reqMethod} ${this.reqUrl} (${this.routeName})`
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  setId() {
    const reqDetails = this.getReqDetails()
    if (!reqDetails[REQ_ID]) reqDetails[REQ_ID] = nanoid(8)
  }
  get id() {
    const reqDetails = this.getReqDetails()
    if (!reqDetails[REQ_ID]) this.setId()
    return reqDetails[REQ_ID]
  }

  set timestamp(epochTimeMs) {
    const reqDetails = this.getReqDetails()
    if (!reqDetails[REQ_TIMESTAMP]) reqDetails[REQ_TIMESTAMP] = epochTimeMs
  }
  get timestamp() {
    return this.getReqDetails()[REQ_TIMESTAMP]
  }
  set duration(durationMs) {
    const reqDetails = this.getReqDetails()
    if (!reqDetails[REQ_DURATION]) reqDetails[REQ_DURATION] = durationMs
  }
  get duration() {
    return this.getReqDetails()[REQ_DURATION]
  }

  getError = () => this[DETAILS][ERROR]
  addError = (ctxMod, ctxFun, error) => {
    const fun = 'addError'
    try {
      logT(mod, fun, ``)
      if (RudiError.isRudiError(error)) {
        if (ACTIVATE_LOG) logT(mod, fun, `rudi error`)
        if (ACTIVATE_LOG) logT(mod, fun, `this[DETAILS]: ${beautify(this[DETAILS])}`)
        if (!this[DETAILS][ERROR]) this[DETAILS][ERROR] = error
        else {
          logW(mod, fun, `Error already added: ${beautify(this[DETAILS][ERROR])}`)
          logW(mod, fun, `Trying to add error: ${beautify(error)}`)
        }
        if (ACTIVATE_LOG) logT(mod, fun, `this[DETAILS]: ${beautify(this[DETAILS])}`)
      } else {
        if (ACTIVATE_LOG) logT(mod, fun, `not rudi error`)
        const rudiError = RudiError.treatError(ctxMod, ctxFun, error)
        this.addError(ctxMod, ctxFun, rudiError)
      }
    } catch (err) {
      logW(mod, fun, err)
      throw err
    }
  }

  logInfo = (ctxMod, ctxFun, msg) => {
    logI(ctxMod, ctxFun, `${msg}: ${this.apiCallMsg}`)
    sysInfo(`${msg}: ${this.reqDetailsMsg}`, '', this, ' ') //, `reqDetails: '${this.formatReqDetails()}'`
  }

  logErr = (ctxMod, ctxFun, err) => {
    const fun = 'logErr'
    logT(mod, fun, ``)
    try {
      if (!err && !this.getError()) throw new RudiError('No error found in current context')

      if (!this.getError()) this.addError(ctxMod, ctxFun, err)
      const rudiErr = this.getError()
      logV(mod, fun, 'rudiErr: ' + beautify(rudiErr))
      const primeError = rudiErr.primeError || rudiErr

      const errMsg = `Error ${rudiErr.statusCode} (${rudiErr.name}): ${rudiErr.message}`
      const errDetails =
        `${ERR_PLACE}: '${primeError[TRACE_MOD]}.${primeError[TRACE_FUN]}', ` +
        `${ERR_ON_REQ}: '${this.formatReqDetails()}'`
      // logD(mod, fun, errDetails)
      sysOnError(rudiErr.statusCode, errMsg, this, errDetails)
    } catch (error) {
      // logE(mod, fun, error)
      throw RudiError.treatError(mod, fun, error)
    }
  }

  get errorLocation() {
    const fun = 'getErrorLocation'
    logT(mod, fun, ``)
    const err = this.getError()
    logD(mod, fun, `${beautify(err)}`)
    if (err) {
      if (err.primeError) return `${err.primeError.mod}.${err.primeError.fun}`
      else logW(mod, fun, beautify(err))
    }
    return undefined
  }
  set statusCode(code) {
    this[OP][STATUS_CODE] = code
  }
  get statusCode() {
    return this[OP][STATUS_CODE]
  }

  get context() {
    if (ACTIVATE_LOG) logT(mod, 'getContext', ``)
    return { [AUTH]: this[AUTH], [OP]: this[OP], [DETAILS]: this[DETAILS] }
  }

  // -------------------------------------------------------------------------------------------------
  // Setting to and extracting from request our custom context
  // -------------------------------------------------------------------------------------------------

  /**
   * Fetch the custom context and returns it as a CallContext object
   * @param {object} req The incoming request
   * @returns The attached custom context object
   */
  static getCallContextFromReq(req) {
    const fun = 'getCallContextFromReq'
    try {
      if (ACTIVATE_LOG) logT(mod, fun, ``)
      const reqContext = CallContext.getReqContext(req)
      if (!reqContext) return undefined

      const callContext = new CallContext(reqContext[AUTH], reqContext[OP], reqContext[DETAILS])
      // logV(mod, fun, `${beautify(callContext)}`)

      return callContext
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  /**
   * Attach to the request the information of the custom context (e.g. caller auth details)
   * @param {object} req The incoming request, mutable through this operation
   * @param {*} callContext The context object the info of which we will attach to the request
   * @returns The mutated request
   */
  static setAsReqContext(req, callContext) {
    const fun = 'setAsReqContext'

    try {
      if (ACTIVATE_LOG) logT(mod, fun, ``)
      if (req[CALL_CONTEXT]) throw new Error('Call context already set')
      req[CALL_CONTEXT] = callContext
      // {[AUTH]: callContext[AUTH],[OP]: callContext[OP],[DETAILS]: callContext[DETAILS],}
      return req
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  static preventCodeInjection(req) {
    const fun = 'preventCodeInjection'
    try {
      if (ACTIVATE_LOG) logT(mod, fun, ``)
      protectHeaderMethod(req)
      protectHeaderUrl(req)
      protectHeaderAuth(req)
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  /**
   * Fetch the custom context and returns it as a JS object
   * @param {object} req The incoming request
   * @returns The attached custom context object
   */
  static getReqContext(req) {
    const fun = 'getReqContext'

    try {
      if (ACTIVATE_LOG) logT(mod, fun, ``)
      const context = req[CALL_CONTEXT]
      if (!context) return undefined
      return context
      // { [AUTH]: context[AUTH], [OP]: context[OP], [DETAILS]: context[DETAILS] }
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  // -------------------------------------------------------------------------------------------------
  // IP Redirections display
  // -------------------------------------------------------------------------------------------------

  static extractIpRedirections(req) {
    const headers = req.headers
    const redirections = headers['x-forwarded-for'] || headers['X-Forwarded-For']
    if (!redirections) return
    if (Array.isArray(redirections)) return redirections
    if (typeof redirections === 'string') return redirections.split(',')
    logD(mod, 'extractIpRedirections', `redirections: ${beautify(redirections)}`)
  }

  static extractIpAndRedirections(req) {
    const ip = req.ip
    const redirections = CallContext.extractIpRedirections(req)
    return redirections && isNotEmptyArray(redirections) ? [ip, ...redirections] : [ip]
  }

  static createIpRedirectionsMsg(req) {
    const headers = req.headers
    if (!headers) return ''
    const redirections = CallContext.extractIpRedirections(req)
    return redirections && isNotEmptyArray(redirections) ? ` <- ${redirections.join(' <- ')} ` : ''
  }

  static createIpsMsg(req) {
    const ip = req.ip
    return `${ip}${CallContext.createIpRedirectionsMsg(req)}`
  }

  static createApiCallMsg(req) {
    const fun = 'createApiCallMsg'
    try {
      if (ACTIVATE_LOG) logT(mod, fun, ``)
      const context = CallContext.getCallContextFromReq(req)
      if (!context) {
        if (ACTIVATE_LOG) logT(mod, fun, 'No context set yet')
        return (
          `${req.method} ${req.url} (${req.routeConfig[ROUTE_NAME]})` +
          ` <- ${CallContext.createIpsMsg(req)}`
        )
      } else {
        if (ACTIVATE_LOG) logT(mod, fun, 'A context was found')
        return context.apiCallMsg
      }
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }
}
