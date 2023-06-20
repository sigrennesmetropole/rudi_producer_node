'use strict'

const mod = 'main'

// -----------------------------------------------------------------------------
// Internal dependancies
// -----------------------------------------------------------------------------
const utils = require('./utils/jsUtils')
const sys = require('./config/confSystem')
const logConf = require('./config/confLogs')

const log = require('./utils/logging')

const { URL_PREFIX, URL_JWT } = require('./config/confApi')
const { privateRoutes } = require('./routes/routes')
const { createRudiHttpError } = require('./utils/errors')
const { getAppHash, getGitHash } = require('./handlers/sysController')

// -----------------------------------------------------------------------------
// External dependancies / init
// -----------------------------------------------------------------------------

// Require the fastify framework and instantiate it
const fastify = require('fastify')({
  logger: {
    level: 'warn',
    logger: logConf.initFFLogger(sys.APP_NAME),
    // file: sys.OUT_LOG
  },
  ignoreTrailingSlash: true,
})

fastify.setErrorHandler((error, request, reply) => {
  const fun = 'finalErrorHandler'
  try {
    log.e(mod, fun, error)
    const rudiHttpError = createRudiHttpError(error.statusCode, error.message)
    reply.code(rudiHttpError.statusCode).send(rudiHttpError)
  } catch (uncaughtErr) {
    log.w(mod, fun, uncaughtErr)
    const rudiHttpError = createRudiHttpError(0, uncaughtErr.message)
    reply.code(rudiHttpError.statusCode).send(rudiHttpError)
  }
  log.d(mod, fun, 'done')
})

fastify.addHook('onRequest', (req, res, next) => {
  log.logRequest(req)
  next()
})
fastify.addHook('onRequest', (req, res, next) => {
  log.logRequest(req)
  next()
})

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// Declare a default route
fastify.get('/', async (request, reply) => {
  log.i(mod, 'routes', 'GET /')
  return {
    server: 'RUDI',
  }
})

// Declare a default route
fastify.get(URL_PREFIX, async (request, reply) => {
  // request.log.info(`GET /api`)
  log.i(mod, 'routes', `GET ${URL_PREFIX}`)
  return {
    RUDI: 'crypto',
  }
})

// Declare a default route
fastify.get(URL_JWT, async (request, reply) => {
  log.i(mod, 'routes', `GET ${URL_JWT}`)
  return {
    RUDI: 'JWT',
  }
})

// Loop over each public route
privateRoutes.forEach((pubRoute, index) => {
  fastify.route(pubRoute)
  // log.i(mod, 'routes', `Public route #${index} = ${pubRoute.method} ${pubRoute.url}`)
})

// -----------------------------------------------------------------------------
// SERVER
// -----------------------------------------------------------------------------
const start = async () => {
  try {
    await fastify
      .listen({ port: sys.LISTENING_PORT, host: sys.LISTENING_ADDR })
      .catch((err) => log.e(mod, 'Fastify listen', `${err}`))
  } catch (err) {
    // fastify.log.error(err)
    log.e(mod, 'exitServer', err)
    process.exit(1)
  }
}

try {
  start()
    .then(() => {
      log.i(mod, 'server', 'Ready')
      const appHash = getAppHash()
      const gitHash = getGitHash()
      const hashMsg =
        appHash === gitHash
          ? `Application version '${appHash}'`
          : `App version '${appHash}' | Git version: '${gitHash}''`
      log.i(mod, 'app', hashMsg)
      utils.separateLogs('Init OK')
    })
    .catch((err) => log.e(mod, 'server', `Crashed: ${err}`))
} catch (uncaught) {
  log.e(mod, 'server', `Uncaught error: ${uncaught}`)
}

process.on('uncaughtException', (err) => {
  log.e(mod, 'process', `Uncaught error: ${err}`)
  // console.error('There was an uncaught error', err)
  // process.exit(1) //mandatory (as per the Node.js docs)
})

process.on('unhandledRejection', (error, promise) => {
  const fun = 'catching promise rejection'
  log.e(mod, fun, 'DAMN!!! Promise rejection not handled here: ' + utils.beautify(promise))
  log.e(mod, fun, 'The error was: ' + error)
})
