'use strict'

const mod = 'main'

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const utils = require('./utils/jsUtils')
const sys = require('./config/confSystem')
require('./config/confLogs')
const log = require('./utils/logging')

const api = require('./config/confApi')
const sysController = require('./controllers/sysController')

// ------------------------------------------------------------------------------------------------
// Prerequisites
// ------------------------------------------------------------------------------------------------
// Fixing Regexp display as a string
RegExp.prototype.toJSON = RegExp.prototype.toString

// ------------------------------------------------------------------------------------------------
// External dependancies / init
// ------------------------------------------------------------------------------------------------
// Require external modules
const mongoose = require('mongoose')
const fastify = require('./routes/fastify')
const { RudiError } = require('./utils/errors')
// Import Swagger Options
// const swagger = require('./config/swagger')

// Register Swagger
// fastify.register(require('fastify-swagger'), swagger.options)

// ------------------------------------------------------------------------------------------------
// DB connection
// ------------------------------------------------------------------------------------------------

// Setting flags to avoid deprecation warnings
// mongoose.set('useFindAndModify', false)

// const mongoConnectOptions = {
// useUnifiedTopology: true,
// useCreateIndex: true,
// useNewUrlParser: true,
// }

const logSeparatorConf =
  '---------------------------------------------------------------[Conf OK]--'
// eslint-disable-next-line no-console
console.log(utils.nowLocaleFormatted(), logSeparatorConf)
log
  .addLogEntry('info', 'app', 'logSeparatorConf', logSeparatorConf)
  .catch((err) => utils.consoleErr('info', 'app', 'logSeparatorConf: ' + err))

log.i(mod, 'mongo', `Connecting to [${sys.getDbUrl()}]`)
mongoose
  .connect(sys.getDbUrl())
  .then(() => {
    log.i(mod, 'mongo', `MongoDB connected`)
    const appVer = sysController.getAppHash()
    const curEnv = sysController.getEnvironment()
    const startMsg =
      `API v${api.API_VERSION} ` + `| App version: '${appVer}' ` + `| '${curEnv}' env`
    log.i(mod, 'app', startMsg)
    log.sysInfo(startMsg, '', '', ' ')
    const logSeparatorEnd = utils.separateLogs('Init OK')
    log
      .addLogEntry('info', 'app', 'logSeparatorEnd', logSeparatorEnd)
      .catch((err) => utils.consoleErr('info', 'app', 'logSeparatorEnd: ' + err))
  })
  .catch((err) => {
    log.e(mod, 'mongoConnection', err)
    log.sysAlert(`Mongo connection: ${err}`, 'rudiServer.dbConnect', {}, { error: err })
    throw RudiError.treatError(mod, 'mongoConnection', err)
  })

// ------------------------------------------------------------------------------------------------
// SERVER
// ------------------------------------------------------------------------------------------------
const start = async () => {
  try {
    process.title = sys.getAppName()
    await fastify
      .listen(sys.getServerPort(), sys.getServerAddress())
      .catch((err) => log.e(mod, 'Fastify listen', `${err}`))
    // fastify.swagger()
    // fastify.log.info(`Listening on ${fastify.server.address().address}:${fastify.server.address().port}`)
  } catch (err) {
    // fastify.log.error(err)
    log.e(mod, 'exitServer', err)
    log.sysAlert(`Server exited anormally: ${err}`, 'rudiServer.starting', {}, { error: err })
    process.exit(1)
  }
}

try {
  start()
    .then(() => {
      log.i(mod, 'server', 'Ready')
    })
    .catch((err) => {
      log.e(mod, 'server', `Crashed: ${err}`)
      log.sysCrit(`Server crashed: ${err}`, 'rudiServer.running', {}, { error: err })
    })
} catch (err) {
  log.e(mod, 'server', `Uncaught error: ${err}`)
  log.sysCrit(`Uncaught error: ${err}`, 'rudiServer.uncaughtError', {}, { error: err })
}

process.on('uncaughtException', (err) => {
  log.e(mod, 'process', `Uncaught exception: ${err}`)
  log.sysCrit(`Uncaught exception: ${err}`, 'rudiServer.uncaughtException', {}, { error: err })
  // console.error('There was an uncaught error', err)
  // process.exit(1) //mandatory (as per the Node.js docs)
})

process.on('unhandledRejection', (err, promise) => {
  const fun = 'catching promise rejection'
  log.e(mod, fun, 'DAMN!!! Promise rejection not handled here: ' + utils.beautify(promise))
  log.e(mod, fun, 'The error was: ' + err)
  log.sysCrit(
    `Promise rejection not handled: ${utils.beautify(promise)})`,
    'rudiServer.promiseUnhandled',
    {},
    {
      promise: utils.beautify(promise),
    }
  )
  log.sysCrit(`Promise rejection error: ${err}`, 'rudiServer.on', {}, { error: err })
})
