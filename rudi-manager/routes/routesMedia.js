const express = require('express')
const router = new express.Router()

const {
  getMediaToken,
  commitMedia,
  getDownloadById,
  getMediaInfoById,
} = require('../controllers/mediaController')
const { ROLE_EDIT, ROLE_ADMIN } = require('../database/scripts/initDatabase')
const { checkRolePerm } = require('../utils/roleCheck')

router.get('/jwt', checkRolePerm([ROLE_EDIT, ROLE_ADMIN]), getMediaToken)
router.post('/commit', checkRolePerm([ROLE_EDIT, ROLE_ADMIN]), commitMedia)

router.get('/:id', getMediaInfoById)
router.get('/download/:id', getDownloadById)

module.exports = router
