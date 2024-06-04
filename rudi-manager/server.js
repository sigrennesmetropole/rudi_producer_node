const mod = 'server'

// Import dependencies
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const path = require('path')
const helmet = require('helmet')

// Require Config
const { getConf } = require('./config/config')
const log = require('./utils/logger')

// Require Route
const apiOpen = require('./routes/routesOpen')
const apiFront = require('./routes/routesFront')
const apiData = require('./routes/routesData')
const apiMedia = require('./routes/routesMedia')
const apiSecu = require('./routes/routesSecu')

const passport = require('./utils/passportSetup')
const { ROLE_ADMIN, dbInitialize, ROLE_ALL } = require('./database/scripts/initDatabase')
const { isDevEnv } = require('./config/backOptions')
const { checkRolePerm } = require('./utils/roleCheck')

// Create a new express application named 'app'
const app = express()
// Set our backend port to be either an environment variable or port 5000
const port = getConf('server', 'listening_port') || 5000

// This application level middleware prints incoming requests to the servers console, useful to see incoming requests
app.use((req, reply, next) => {
  log.sysInfo(mod, '', `Request <= ${req.method} ${req.url}`, log.getContext(req, {}))
  next()

  reply.on('finish', () => {
    if (reply.statusCode < 400) {
      log.sysInfo(
        mod,
        '',
        `=> OK ${reply.statusCode}: ${req.method} ${req.originalUrl}`,
        log.getContext(req, {})
      )
      // console.debug(res)
    } else {
      // console.error(res)
      log.sysWarn(
        mod,
        '',
        `ERR ${reply.statusCode} ${reply.statusMessage} > ${req.method} ${req.originalUrl}`,
        log.getContext(req, {})
      )
    }
  })
})

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        scriptSrc: ["'self'"],
        'connect-src': ["'self'", ...getConf('security', 'trusted_domain')],
      },
    },
  })
)

// Configure the bodyParser middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

// Configure the CORs middleware
app.use(cors())

// Passport middleware
app.use(passport.initialize())

const authenticate = passport.authenticate('jwt', { session: false })

// Configure app to use routes
app.use(`/api/open`, apiOpen)
app.use('/api/front', apiFront)
app.use('/api/data', authenticate, checkRolePerm([ROLE_ALL]), apiData)
app.use('/api/media', authenticate, checkRolePerm([ROLE_ALL]), apiMedia)
app.use('/api/secu', authenticate, checkRolePerm([ROLE_ADMIN]), apiSecu)

// This middleware informs the express application to serve our compiled React files
// if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
if (!isDevEnv()) {
  app.use(express.static(path.join(__dirname, 'front/build')))
  app.get('/*', (req, reply) => reply.sendFile(path.join(__dirname, 'front/build', 'index.html')))
}

// Init database on startup

dbInitialize()
  .then((res) => log.d(mod, 'initDatabase', 'SQL DB init OK'))
  .catch((err) => log.e(mod, 'initDatabase', `SQL DB init ERR: ${err}`))

// Catch any bad requests
app.get('*', (req, reply) => reply.status(404).send(`Route '${req.method} ${req.url}' not found`))

// Configure our server to listen on the port defiend by our port variable
app.listen(port, () => log.i(mod, '', `BACK_END_SERVICE_PORT: ${port}`, {}))

app.use((err, req, reply, next) => _errorHandler(err, req, reply, next))

const _errorHandler = (err, req, reply, next) => {
  const now = new Date()
  // console.error(now, `[Express default error handler]`, err)
  log.sysError(`An error happened on ${req.method} ${req.url}: ${err}`)
  console.error('[Local dump]', err)

  if (reply.headersSent) return

  // res.status(500)
  // res.render('error', { time: now.getTime(), error: err })
  reply.status(500).json({
    error: `An error was thrown, please contact the Admin with the information bellow`,
    message: err.message,
    time: now.getTime(),
  })
}
