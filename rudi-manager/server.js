// Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
// Require Route
const apiV1 = require('./routes/routesV1');
const apiAdmin = require('./routes/routesAdmin');
const apiMedia = require('./routes/routesMedia');
// Require Config
const config = require('./config/config');
const log = require('./utils/logger');

const mod = 'server';

const passport = require('./utils/passportSetup');
const initDatabase = require('./database/scripts/initDatabase');

// Create a new express application named 'app'
const app = express();
// Set our backend port to be either an environment variable or port 5000
const port = config.server.listening_port || 5000;

// This application level middleware prints incoming requests to the servers console, useful to see incoming requests
app.use((req, res, next) => {
  log.sysInfo(mod, '', `Request_Endpoint: ${req.method} ${req.url}`, log.getContext(req, {}));
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        scriptSrc: ["'self'"],
        'connect-src': ["'self'", ...config.security.trusted_domain],
      },
    },
  }),
);

// Configure the bodyParser middleware
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(cookieParser());

// Configure the CORs middleware
app.use(cors());

// Passport middleware
app.use(passport.initialize());

// Configure app to use route
app.use('/api/v1/', apiV1);
app.use('/api/admin/', apiAdmin);
app.use('/api/secure/', passport.authenticate('jwt', { session: false }), apiAdmin);
app.use('/api/media/', apiMedia);

// This middleware informs the express application to serve our compiled React files
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  app.use(express.static(path.join(__dirname, 'front/build')));

  app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, 'front/build', 'index.html'));
  });
}

// Init database on startup
initDatabase.initDatabase();

// Catch any bad requests
app.get('*', (req, res) => {
  res.status(200).json({
    msg: 'Catch All',
  });
});

// Configure our server to listen on the port defiend by our port variable
app.listen(port, () => log.i(mod, '', `BACK_END_SERVICE_PORT: ${port}`, {}));
