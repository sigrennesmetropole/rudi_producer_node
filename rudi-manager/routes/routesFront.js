const express = require('express')
const router = new express.Router()

const passport = require('../utils/passportSetup')
const { getFormUrl, getUserInfo } = require('../controllers/consoleController')
const { getApiExternalUrl } = require('../controllers/dataController')
const {
  logout,
  postLogin,
  postRegister,
  putPassword,
} = require('../controllers/authControllerPassport')

router.get('/form-url', passport.authenticate('jwt', { session: false }), getFormUrl)
router.get('/ext-api-url', passport.authenticate('jwt', { session: false }), getApiExternalUrl)
router.get('/user-info', passport.authenticate('jwt', { session: false }), getUserInfo)

router.post('/register', postRegister)
router.put('/change-password', putPassword) // Delayed auth
router.post('/login', postLogin)
router.get('/logout', logout)

module.exports = router
