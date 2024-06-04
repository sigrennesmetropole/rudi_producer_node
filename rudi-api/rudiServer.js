const mod = 'main'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { API_VERSION } from './config/constApi.js'

// 1. Utils
import { beautify, consoleErr, consoleLog, separateLogs } from './utils/jsUtils.js'

// 2. Sys conf
import { getAppName, getDbUrl, getServerAddress, getServerPort } from './config/confSystem.js'

// 3. Log conf
import './config/confLogs.js'

// 4. Anything, now
import mongoose from 'mongoose'
import { getLicenceCodes } from './controllers/licenceController.js'
import { getAppHash, getEnvironment } from './controllers/sysController.js'
import { Contact } from './definitions/models/Contact.js'
import { LogEntry } from './definitions/models/LogEntry.js'
import { Media } from './definitions/models/Media.js'
import { Metadata } from './definitions/models/Metadata.js'
import { Organization } from './definitions/models/Organization.js'
import Keywords from './definitions/thesaurus/Keywords.js'
import Themes from './definitions/thesaurus/Themes.js'
import { declareRoutes, fastifyConf } from './routes/fastify.js'
import { addLogEntry, logE, logI, logT, sysAlert, sysCrit, sysInfo } from './utils/logging.js'

// -------------------------------------------------------------------------------------------------
// Prerequisites
// -------------------------------------------------------------------------------------------------
// Fixing Regexp display as a string
// eslint-disable-next-line no-extend-native
RegExp.prototype.toJSON = RegExp.prototype.toString

// -------------------------------------------------------------------------------------------------
// External dependencies / init
// -------------------------------------------------------------------------------------------------
// Require external modules
separateLogs('Connecting to DB', true) ///////////////////////////////////////////////////////

// Import Swagger Options
// import swagger from './config/swagger'

// Register Swagger
// fastify.register(require('fastify-swagger'), swagger.options)

// -------------------------------------------------------------------------------------------------
// DB connection
// -------------------------------------------------------------------------------------------------

// Setting flags to avoid deprecation warnings
mongoose.set('strictQuery', false)

consoleLog(mod, 'mongo', `Connecting to [${getDbUrl()}]`)

mongoose
  .connect(getDbUrl())
  .then(() => {
    logI(mod, 'mongo', `MongoDB connected`)

    start().catch((err) => {
      logE(mod, 'server', `Crashed: ${err}`)
      sysCrit(`Server crashed: ${err}`, 'rudiServer.running', {}, { error: err })
    })
  })
  .catch((err) => {
    logE(mod, 'mongoConnection', err)
    sysCrit(`Mongo connection: ${err}`, 'rudiServer.dbConnect', {}, { error: err })
    process.exit(1)
    // throw RudiError.treatError(mod, 'mongoConnection', err)
  })

// -------------------------------------------------------------------------------------------------
// SERVER
// -------------------------------------------------------------------------------------------------
const start = async () => {
  const fun = 'start'
  try {
    separateLogs('Handling rejections', true) ////////////////////////////////////////////////

    process.title = getAppName()

    process.on('uncaughtException', (err) => {
      logE(mod, 'process', `Uncaught exception: ${err}`)
      sysCrit(`Uncaught exception: ${err}`, 'rudiServer.uncaughtException', {}, { error: err })
      // console.error('There was an uncaught error', err)
      // process.exit(1) //mandatory (as per the Node.js docs)
    })

    process.on('unhandledRejection', (err, promise) => {
      const fun = 'catching promise rejection'
      logE(mod, fun, 'DAMN!!! Promise rejection not handled here: ' + beautify(promise))
      logE(mod, fun, 'The error was: ' + beautify(err))
      sysCrit(
        `Promise rejection not handled: ${beautify(promise)})`,
        'rudiServer.promiseUnhandled',
        {},
        {
          promise: beautify(promise),
        }
      )
      sysCrit(`Promise rejection error: ${beautify(err)}`, 'rudiServer.on', {}, { error: err })
    })

    import('./config/confPortal.js')

    fastifyConf
      .listen({ port: getServerPort(), host: getServerAddress() })
      .catch((err) => logE(mod, 'Fastify listen', `${err}`))
    // fastify.swagger()
    // fastify.info(`Listening on ${fastify.server.address().address}:${fastify.server.address().port}`)
    declareRoutes()

    separateLogs('Models', true) /////////////////////////////////////////////////////////////
    try {
      await Promise.all(
        [LogEntry, Contact, Organization, Media, Metadata].map(
          (model) =>
            new Promise((resolve, reject) => {
              model
                .initialize()
                .then((res) => {
                  logT(mod, `Init model ${model?.collection?.name}`, res)
                  resolve(res)
                })
                .catch((err) => {
                  logE(mod, `Init model ${model?.collection?.name}`, err)
                  reject(err)
                })
            })
        )
      )
    } catch (e) {
      throw new Error(`Model index initialization failed: ${e}`)
    }
    await Keywords.initialize()
    await Themes.initialize()
    await getLicenceCodes()

    const appVer = getAppHash()
    const curEnv = getEnvironment()
    separateLogs('Start', true) //////////////////////////////////////////////////////////////
    const startMsg = `API v${API_VERSION} | App version: '${appVer}' | '${curEnv}' env`
    logI(mod, fun, startMsg)
    sysInfo(startMsg, '', '', ' ')
    logI(mod, 'server', 'Ready')

    const logSeparatorEnd = separateLogs('Init OK', true) //////////////////////////////////////////

    addLogEntry('info', 'app', 'logSeparatorEnd', logSeparatorEnd).catch((err) =>
      consoleErr('info', 'app', 'logSeparatorEnd: ' + err)
    )
  } catch (err) {
    // fastify.error(err)
    logE(mod, 'exitServer', err)
    sysAlert(`Server exited anormally: ${err}`, 'rudiServer.starting', {}, { error: err })
    process.exit(1)
  }
}
