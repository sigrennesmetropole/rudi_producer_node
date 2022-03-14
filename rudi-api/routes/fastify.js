'use strict'

const mod = 'fastify'

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const { padA1, nowEpochMs, beautify } = require('../utils/jsUtils')
const {
  shouldControlPrivateRequests,
  shouldControlPublicRequests,
} = require('../config/confSystem')
const { initFFLogger, shouldShowErrorPile, shouldShowRoutes } = require('../config/confLogs')
const { JWT_USER } = require('../config/confPortal')
const log = require('../utils/logging')

const { STATUS_CODE, ROUTE_NAME } = require('../config/confApi')
const { JWT_SUB, JWT_CLIENT } = require('../utils/crypto')

const { RudiError } = require('../utils/errors')
const { CallContext } = require('../definitions/constructors/callContext')

const {
  publicRoutes,
  portalRoutes,
  backOfficeRoutes,
  devRoutes,
  unrestrictedPrivateRoutes,
} = require('./routes')

const { checkRudiProdPermission } = require('../controllers/tokenController')
const { checkPortalTokenInHeader } = require('../controllers/portalController')
const { getUrlMaxLength } = require('../utils/protection')

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------
// Require the fastify framework and instantiate it
const fastifyConf = require('fastify')({
  logger: {
    level: 'warn',
    logger: initFFLogger(),
    // file: sys.OUT_LOG
  },
  ignoreTrailingSlash: true,
})

// ------------------------------------------------------------------------------------------------
// Cosntants
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Fastify hooks: errors
// ------------------------------------------------------------------------------------------------
fastifyConf.addHook('onError', (request, reply, error, done) => {
  const fun = 'onError'
  try {
    log.t(mod, fun, ``)
    // log.d(mod, fun, `isRudiError: ${RudiError.isRudiError(error)}`)
    // log.d(mod, fun, `showErrorPile: ${shouldShowErrorPile()}`)

    const reqContext = CallContext.getCallContextFromReq(request)
    // if (reqContext) log.d(mod, fun, `request: ${beautify(reqContext)}`)

    if (RudiError.isRudiError(error) && shouldShowErrorPile()) RudiError.logErrorPile(error)

    if (!!reqContext) {
      reqContext.logErr(mod, fun, error)
    } else {
      log.sysOnError(error.statusCode, '[onError] ' + beautify(error))
    }
    reply.isError = true
  } catch (err) {
    log.e(mod, fun, err)
    // const context = CallContext.getCallContextFromReq(request)
    // context.logErr(mod, fun, err)
    // throw context.getError()
    throw err
  }
  done()
})

fastifyConf.setErrorHandler((error, request, reply) => {
  const fun = 'finalErrorHandler'
  try {
    log.t(mod, fun, ``)
    // log.d(mod, fun, RudiError.isRudiError(error))
    let rudiHttpError
    if (RudiError.isRudiError(error)) rudiHttpError = error
    else {
      rudiHttpError = RudiError.createRudiHttpError(
        error.statusCode,
        error.message || error,
        mod,
        fun
      )
    }
    reply.isError = true
    reply.code(rudiHttpError[STATUS_CODE]).send(rudiHttpError)
    // log.sysError(`Error ${rudiHttpError.statusCode}: ${rudiHttpError.message}`)
  } catch (uncaughtErr) {
    log.e(mod, fun, `Uncaught! ${uncaughtErr}`)
    log.sysCrit(
      `Uncaught error: ${uncaughtErr}`,
      'ff.errorHandler',
      CallContext.getReqContext(request),
      {
        error: uncaughtErr,
      }
    )
  }
  log.t(mod, fun, 'done')
})

fastifyConf.decorate('notFound', (req, reply) => {
  const fun = 'notFound'
  // const ip = req.ip

  const response = {
    message: `Route '${req.method} ${req.url}' not found`,
    error: 'Not Found',
    statusCode: 404,
  }
  const context = CallContext.getCallContextFromReq(req)
  log.w(mod, fun, `${response.message} <- ${context.apiCallMsg}`)
  log.sysNotice(`Error 404: ${response.message}`, '', CallContext.getReqContext(req))
  // log.d(mod, fun, beautify(req))
  reply.isError = true
  reply.code(404).send(response)
})

fastifyConf.setNotFoundHandler(fastifyConf.notFound)

// ------------------------------------------------------------------------------------------------
// Fastify hooks: request receive / send
// ------------------------------------------------------------------------------------------------
fastifyConf.addHook('onRequest', (req, res, next) => {
  const fun = 'onRequest'
  try {
    const context = new CallContext()
    log.t(mod, fun, `----- Rcv req #${context.id} -----vvv---`)
    const now = nowEpochMs()
    context.setIpsFromRequest(req)
    context.timestamp = now
    try {
      CallContext.preventCodeInjection(req)
    } catch (err) {
      context.setReqDescription(
        req.method,
        req.url.substring(0, getUrlMaxLength()),
        req.context.config[ROUTE_NAME]
      )
      CallContext.setAsReqContext(req, context)
      throw err
    }

    context.setReqDescription(req.method, req.url, req.context.config[ROUTE_NAME])
    CallContext.setAsReqContext(req, context)

    log.t('http', fun, CallContext.createApiCallMsg(req))
    next()
  } catch (err) {
    // log.e(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
})

fastifyConf.addHook('onSend', (request, reply, payload, next) => {
  const fun = 'onSend'
  try {
    log.t(mod, fun, ``)
    const now = nowEpochMs()
    const context = CallContext.getCallContextFromReq(request)
    if (!!context) {
      context.duration = now - context.timestamp
      context.statusCode = reply.statusCode
      if (!reply.isError) context.logInfo(mod, fun, 'API reply')
      log.t(mod, fun, `----- Send reply #${context.id} (${context.duration} ms) -----^^^--`)
    }
    next()
  } catch (err) {
    log.e(mod, fun, err)
  }
})

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Pre-handler functions
// ------------------------------------------------------------------------------------------------
/**
 * Pre-handler for requests that need no authentification ("free routes")
 * @param {object} req incoming request
 * @param {object} reply reply
 */
async function onPublicRoute(req, reply) {
  const fun = 'onPublicRoute'
  try {
    log.t(mod, fun, `${req.method} ${req.url} `)
    const context = CallContext.getCallContextFromReq(req)

    try {
      // Checking the token, if it exists, to retrieve the user info
      const portalJwt = await checkPortalTokenInHeader(req, reply)
      const jwtPayload = portalJwt[1]
      // log.d(mod, fun, `Payload: ${beautify(jwtPayload)}`)
      context.clientApp = jwtPayload[JWT_SUB] || 'RUDI Portal'
      context.reqUser = jwtPayload[JWT_USER] || jwtPayload[JWT_CLIENT]
    } catch (er) {
      try {
        const { subject, clientId } = await checkRudiProdPermission(req, reply)
        context.clientApp = subject
        context.reqUser = clientId
      } catch {
        // It's OK to have no token
        log.t(mod, fun, `Token-less call to ${req.method} ${req.url} `)
      }
    } finally {
      context.logInfo('route', fun, 'API call')
      return true
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Pre-handler for requests that need a "public" (aka portal) authentification
 * ("public routes")
 * @param {object} req incoming request
 * @param {object} reply reply
 */
async function onPortalRoute(req, reply) {
  const fun = 'onPortalRoute'
  try {
    log.t(mod, fun, `${req.method} ${req.url} `)
    if (!shouldControlPublicRequests()) return true

    // If incoming request has no token, raise an error
    const portalJwt = await checkPortalTokenInHeader(req, reply)
    const jwtPayload = portalJwt[1]
    // log.d(mod, fun, `Payload: ${beautify(jwtPayload)}`)

    const context = CallContext.getCallContextFromReq(req)
    context.clientApp = jwtPayload[JWT_SUB] || 'RUDI Portal'
    context.reqUser = jwtPayload[JWT_USER] || jwtPayload[JWT_CLIENT]

    context.logInfo('route', fun, 'API call')
    return true
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Pre-handler for requests that need a "private" (aka rudi producer node)
 * authentification ("private/backoffice routes")
 * These requests should normally bear a user identification
 * @param {object} req incoming request
 * @param {object} reply reply
 */
async function onPrivateRoute(req, reply) {
  const fun = 'onPrivateRoute'
  try {
    log.t(mod, fun, `${req.method} ${req.url} `)
    if (!shouldControlPrivateRequests()) return true

    const { subject, clientId } = await checkRudiProdPermission(req, reply)

    const context = CallContext.getCallContextFromReq(req)
    context.clientApp = subject
    context.reqUser = clientId

    context.logInfo('route', fun, 'API call')
    return
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 * Pre-handler for private requests that don't need an
 * authentification ("unrestricted private routes")
 * These requests are normally not user driven actions, but sent by an app
 * such as the prodmanager
 * @param {object} req incoming request
 * @param {object} reply reply
 */
async function onUnrestrictedPrivateRoute(req, reply) {
  const fun = 'onUnrestrictedPrivateRoute'
  try {
    log.t(mod, fun, `${req.method} ${req.url} `)
    const context = CallContext.getCallContextFromReq(req)

    try {
      const { subject, clientId } = await checkRudiProdPermission(req, reply)

      context.clientApp = subject
      context.reqUser = clientId
    } catch (er) {
      // It's OK to have no token
      log.t(mod, fun, `Token-less call to ${req.method} ${req.url} `)
    } finally {
      context.logInfo('route', fun, 'API call')
      return true
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------------------------------------
function declareRouteGroup(routeGroup, preHandler, routeGroupName, logLevel) {
  try {
    routeGroup.map((route, index) => {
      route.preHandler = preHandler
      fastifyConf.route(route)
      if (shouldShowRoutes())
        log[logLevel](routeGroupName, 'routes', `${padA1(index)}: ${route.method} ${route.url}`)
    })
  } catch (err) {
    RudiError.treatError(mod, 'declareRouteGroup', err)
  }
}

/**
 * Pre-handler fonction assignments
 */

// declareRouteGroup(redirectRoutes, onPortalRoute, 'Redirect', 'd')
declareRouteGroup(publicRoutes, onPublicRoute, 'Public', 'i')
declareRouteGroup(portalRoutes, onPortalRoute, 'Portal', 'v')
declareRouteGroup(unrestrictedPrivateRoutes, onUnrestrictedPrivateRoute, 'Unrestricted', 'i')
declareRouteGroup(backOfficeRoutes, onPrivateRoute, 'Private', 'd')
declareRouteGroup(devRoutes, onPrivateRoute, 'Dev', 'v')

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------

module.exports = fastifyConf
