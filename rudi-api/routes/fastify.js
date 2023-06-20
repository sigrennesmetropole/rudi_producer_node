const mod = 'fastify'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { STATUS_CODE, ROUTE_NAME } from '../config/confApi.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { padA1, nowEpochMs, beautify, separateLogs, consoleLog } from '../utils/jsUtils.js'
import { shouldControlPrivateRequests, shouldControlPublicRequests } from '../config/confSystem.js'
import { shouldShowErrorPile, shouldShowRoutes } from '../config/confLogs.js'
import { JWT_USER } from '../config/confPortal.js'

import {
  logLine,
  logE,
  logT,
  logV,
  logW,
  sysCrit,
  sysNotice,
  sysOnError,
  logI,
  fastifyLogger,
} from '../utils/logging.js'

import { JWT_SUB, JWT_CLIENT } from '../utils/crypto.js'

import { RudiError } from '../utils/errors.js'
import { CallContext } from '../definitions/constructors/callContext.js'

import {
  publicRoutes,
  portalRoutes,
  backOfficeRoutes,
  devRoutes,
  unrestrictedPrivateRoutes,
} from './routes.js'

import { checkRudiProdPermission } from '../controllers/tokenController.js'
import { checkPortalTokenInHeader } from '../controllers/portalController.js'
import { getUrlMaxLength } from '../utils/protection.js'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
// Require the fastify framework and instantiate it
consoleLog(mod, 'ff', beautify(fastifyLogger.log))
import fastify from 'fastify'
export const fastifyConf = fastify({
  logger: fastifyLogger({ leve: 'warn' }),
  // logger: initFFLogger(),
  // logger: {
  //    level: 'warn',
  //    file: sys.OUT_LOG,
  // },
  ignoreTrailingSlash: true,
})

// -------------------------------------------------------------------------------------------------
// Cosntants
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Fastify hooks: errors
// -------------------------------------------------------------------------------------------------
fastifyConf.addHook('onError', (request, reply, error, done) => {
  const fun = 'onError'
  try {
    logV(mod, fun, ``)
    // logD(mod, fun, `isRudiError: ${RudiError.isRudiError(error)}`)
    // logD(mod, fun, `showErrorPile: ${shouldShowErrorPile()}`)

    const reqContext = CallContext.getCallContextFromReq(request)
    // if (reqContext) logD(mod, fun, `request: ${beautify(reqContext)}`)

    if (RudiError.isRudiError(error) && shouldShowErrorPile()) RudiError.logErrorPile(error)

    if (!!reqContext) {
      reqContext.logErr(mod, fun, error)
    } else {
      sysOnError(error.statusCode, '[onError] ' + beautify(error))
    }
    if (reply) reply.isError = true
  } catch (err) {
    logE(mod, fun, err)
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
    logT(mod, fun, ``)
    // logD(mod, fun, RudiError.isRudiError(error))
    let rudiHttpError
    if (RudiError.isRudiError(error)) {
      logV(mod, fun, beautify(error))
      rudiHttpError = error
    } else {
      logI(mod, fun, beautify(error))
      rudiHttpError = RudiError.createRudiHttpError(
        error.statusCode,
        error.message || error,
        mod,
        fun,
        error.path
      )
    }

    if (shouldShowErrorPile()) RudiError.logErrorPile(rudiHttpError)

    const errorResponse = {
      [STATUS_CODE]: rudiHttpError[STATUS_CODE] || 500,
      error: rudiHttpError.name,
      message: rudiHttpError.message,
      path: rudiHttpError.path,
    }

    reply.isError = true
    logI(mod, fun, beautify(errorResponse))
    // reply.code(rudiHttpError[STATUS_CODE]).send(rudiHttpError)
    reply.code(errorResponse[STATUS_CODE]).send(errorResponse)

    // sysError(`Error ${rudiHttpError.statusCode}: ${rudiHttpError.message}`)
  } catch (uncaughtErr) {
    logE(mod, fun, `Uncaught! ${uncaughtErr}`)
    sysCrit(
      `Uncaught error: ${uncaughtErr}`,
      'ff.errorHandler',
      CallContext.getReqContext(request),
      { error: uncaughtErr }
    )
  }
  logT(mod, fun, 'done')
})

fastifyConf.decorate('notFound', (req, reply) => {
  const fun = 'route404'
  // const ip = req.ip

  const response = {
    message: `Route '${req.method} ${req.url}' not found`,
    error: 'Not Found',
    statusCode: 404,
  }
  const context = CallContext.getCallContextFromReq(req)
  logW(mod, fun, `${response.message} <- ${context.apiCallMsg}`)
  sysNotice(`Error 404: ${response.message}`, '', CallContext.getReqContext(req))
  // logD(mod, fun, beautify(req))
  reply.isError = true
  reply.code(404).send(response)
})

fastifyConf.setNotFoundHandler(fastifyConf.notFound)

// -------------------------------------------------------------------------------------------------
// Fastify hooks: request receive / send
// -------------------------------------------------------------------------------------------------
fastifyConf.addHook('onRequest', (req, res, next) => {
  const fun = 'onRequest'
  try {
    const context = new CallContext()
    logV(mod, fun, `----- Rcv req #${context.id} -----vvv---`)
    // logV(mod, fun, req.url)
    const now = nowEpochMs()
    context.setIpsFromRequest(req)
    context.timestamp = now
    try {
      CallContext.preventCodeInjection(req)
    } catch (err) {
      context.setReqDescription(
        req.method,
        req.url.substring(0, getUrlMaxLength()),
        req.routeConfig[ROUTE_NAME]
      )
      CallContext.setAsReqContext(req, context)
      throw err
    }
    context.setReqDescription(req.method, req.url, req.routeConfig[ROUTE_NAME])
    CallContext.setAsReqContext(req, context)

    logT('http', fun, CallContext.createApiCallMsg(req))
    next()
  } catch (err) {
    // logE(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
})

fastifyConf.addHook('onSend', (request, reply, payload, next) => {
  const fun = 'onSend'
  try {
    // logT(mod, fun, ``)
    const now = nowEpochMs()
    const context = CallContext.getCallContextFromReq(request)
    if (!!context) {
      context.duration = now - context.timestamp
      context.statusCode = reply.statusCode
      if (!reply.isError) context.logInfo(mod, fun, 'API reply')
      logV(mod, fun, `----- Send reply #${context.id} (${context.duration} ms) -----^^^--`)
    }
    next()
  } catch (err) {
    logE(mod, fun, err)
  }
})

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Pre-handler functions
// -------------------------------------------------------------------------------------------------
/**
 * Pre-handler for requests that need no authentification ("free routes")
 * @param {object} req incoming request
 * @param {object} reply reply
 */
async function onPublicRoute(req, reply) {
  const fun = 'onPublicRoute'
  try {
    logT(mod, fun, `${req.method} ${req.url} `)
    const context = CallContext.getCallContextFromReq(req)

    try {
      // Checking the token, if it exists, to retrieve the user info
      const portalJwt = await checkPortalTokenInHeader(req, true)
      const jwtPayload = portalJwt[1]
      // logD(mod, fun, `Payload: ${beautify(jwtPayload)}`)
      context.clientApp = jwtPayload[JWT_SUB] || 'RUDI Portal'
      context.reqUser = jwtPayload[JWT_USER] || jwtPayload[JWT_CLIENT]
    } catch (er) {
      try {
        const { subject, clientId } = await checkRudiProdPermission(req, true)
        context.clientApp = subject
        context.reqUser = clientId
      } catch {
        // It's OK to have no token
        logT(mod, fun, `Token-less call to ${req.method} ${req.url} `)
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
    logT(mod, fun, `${req.method} ${req.url} `)
    if (!shouldControlPublicRequests()) return true

    // If incoming request has no token, raise an error
    const portalJwt = await checkPortalTokenInHeader(req, false)
    const jwtPayload = portalJwt[1]
    // logD(mod, fun, `Payload: ${beautify(jwtPayload)}`)

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
    logT(mod, fun, `${req.method} ${req.url} `)
    if (!shouldControlPrivateRequests()) return true

    const { subject, clientId } = await checkRudiProdPermission(req, false)

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
    logT(mod, fun, `${req.method} ${req.url} `)
    const context = CallContext.getCallContextFromReq(req)

    try {
      const { subject, clientId } = await checkRudiProdPermission(req, true)

      context.clientApp = subject
      context.reqUser = clientId
    } catch (er) {
      // It's OK to have no token
      logT(mod, fun, `Token-less call to ${req.method} ${req.url} `)
    } finally {
      context.logInfo('route', fun, 'API call')
      return true
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------------------------------------------
function declareRouteGroup(routeGroup, preHandler, routeGroupName, logLevel) {
  try {
    routeGroup.map((route, index) => {
      route.preHandler = preHandler
      fastifyConf.route(route)
      if (shouldShowRoutes())
        logLine(logLevel, routeGroupName, 'routes', `${padA1(index)}: ${route.method} ${route.url}`)
    })
  } catch (err) {
    RudiError.treatError(mod, 'declareRouteGroup', err)
  }
}

/**
 * Pre-handler fonction assignments
 */
export const declareRoutes = () => {
  // declareRouteGroup(redirectRoutes, onPortalRoute, 'Redirect', 'd')
  separateLogs('Routes', true) /////////////////////////////////////////////////////////////
  declareRouteGroup(publicRoutes, onPublicRoute, 'Public', 'info')
  declareRouteGroup(portalRoutes, onPortalRoute, 'Portal', 'verbose')
  declareRouteGroup(unrestrictedPrivateRoutes, onUnrestrictedPrivateRoute, 'Unrestricted', 'info')
  declareRouteGroup(backOfficeRoutes, onPrivateRoute, 'Private', 'debug')
  declareRouteGroup(devRoutes, onPrivateRoute, 'Dev', 'verbose')
}
