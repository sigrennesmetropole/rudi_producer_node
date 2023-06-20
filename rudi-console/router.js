const express = require('express');
const path = require('path');
let root = process.cwd();

// Helper functions

const staticFile = (filePath) => (req, res) => res.sendFile(filePath);
const relative = (...path_) => path.join(root, ...path_);

// Front Dependencies
const dependenciesRouter = express.Router();

// Package dependencies
dependenciesRouter.use('/leaflet', express.static(relative('/node_modules/leaflet/dist')));
dependenciesRouter.use(
  '/leaflet.draw',
  express.static(relative('/node_modules/leaflet-draw/dist'))
);

// Ressources
const router = express.Router();
router.use(express.static(path.join(root, '/public')));
router.use('/dependencies', dependenciesRouter);

// Main routes
router.get('/', staticFile(relative('/public/metadata.html')));
router.get('/contacts', staticFile(relative('/public/contact.html')));
router.get('/organizations', staticFile(relative('/public/organization.html')));
router.get('/pub_keys', staticFile(relative('/public/publicKey.html')));
router.get('/pub_keys_gen', staticFile(relative('/public/publicKeyGen.html')));

router.get('/getTemplate/:filename', function (req, res) {
  var x = req.params;
  console.log('getTemplate', x.filename);
  let template;
  try {
    template = require(path.join(root, '/templates/', x.filename));
  } catch {
    res.send('Not found');
  }
  res.send(JSON.stringify(template));
});

module.exports = router;
