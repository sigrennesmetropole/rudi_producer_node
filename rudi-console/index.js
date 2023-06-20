/**
 * Code for the node server
 * Load config, serve dependencies and static content
 *
 * args :
 *  --config        path to config file
 *  --dev           mode dev
 *  --revision      expose git hash (for production purposes)
 *
 * Listen on the port 3038
 * @author Forian Desmortreux
 */

/* ----- INITALIZE VARIABLES AND CONSTANTS ----- */
const express = require('express');

const config = require('./default_config.json');
const router = require('./router.js');

// Build config from default config and parse cli args
const loadConfig = () => {
  let myArgs = process.argv;
  let index = 0;
  while (index < myArgs.length) {
    if (index < myArgs.length) {
      if (myArgs[index] == '--dev') {
        config.dev = true;
      } else if (index + 1 < myArgs.length) {
        if (myArgs[index] == '--revision') {
          console.log('revision'); // === hashId
          index++;
          config.revision = myArgs[index];
        } else if (myArgs[index] == '--config') {
          console.log('config');
          index++;
          try {
            var localConfig = require(myArgs[index]);
          } catch (e) {
            console.warn('WARN : --config Not Found');
            continue;
          }
          try {
            Object.assign(config, localConfig);
          } catch (e) {
            throw 'Error with config file';
          }
        }
      }
    }
    index++;
  }
  if (!config.revision) {
    try {
      config.revision = `${require('child_process').execSync('git rev-parse --short HEAD')}`.trim();
    } catch (e) {
      console.e(e);
      /* Ignore.*/
    }
  }
  if (config.pm_url.endsWith('/'))
    config.pm_url = config.pm_url.substring(0, config.pm_url.length - 1);
  if (!config.pm_url.endsWith('api')) config.pm_url = `${config.pm_url}/api`;
  return config;
};

const launchServer = async () => {
  /* ----- CONF ----- */

  loadConfig();

  console.log(new Date().toISOString());
  console.log('Config :\n', config);

  /* ----- EXPRESS ----- */

  // Routing

  const app = express();
  app.use('/', router);

  // Serve config
  app.get('/config.json', (req, res) => {
    console.log('Serving config...');
    res.json(config);
  });

  // Get commit id;
  app.get('/hashId', (req, res) => {
    console.log('Asking the hash for a friend, here it is: ' + config.revision);
    res.send(config.revision);
  });
  app.get('/hash', (req, res) => res.send(config.revision));

  // Start node serveur
  const server = app.listen(config.port, config.host, () => {
    const host = server.address().address;
    const port = server.address().port;
    console.log('App listening at %s:%s', host, port);
  });
};

launchServer()
  .then(console.log('--- Server launched ---'))
  .catch((e) => console.error(e));
