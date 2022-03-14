const express = require('express');
const router = new express.Router();
const mediaController = require('../controllers/mediaController');

router.get('/:id', mediaController.getMediaById);
router.get('/download/:id', mediaController.getDownloadById);

module.exports = router;
