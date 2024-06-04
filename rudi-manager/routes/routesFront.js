const express = require('express')
const router = new express.Router()

const passport = require('../utils/passportSetup')
const { getFormUrl, getUserInfo, getNodeUrls } = require('../controllers/consoleController')
const { getApiExternalUrl, getPortalUrl, getInitData } = require('../controllers/dataController')
const {
  logout,
  postLogin,
  postRegister,
  putPassword,
} = require('../controllers/authControllerPassport')
const { makeRequestable } = require('../utils/utils')

const authenticate = passport.authenticate('jwt', { session: false })

router.get('/node-urls', authenticate, getNodeUrls)
router.get('/init-data', authenticate, getInitData)

router.get('/form-url', authenticate, getFormUrl)
router.get('/ext-api-url', authenticate, makeRequestable(getApiExternalUrl))
router.get('/portal-url', authenticate, makeRequestable(getPortalUrl))
router.get('/user-info', authenticate, getUserInfo)

router.post('/register', postRegister)
router.put('/change-password', putPassword) // Delayed auth
router.post('/login', postLogin)
router.get('/logout', logout)

module.exports = router
