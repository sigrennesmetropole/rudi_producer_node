const express = require('express')
const { v4: uuidv4 } = require('uuid')

const router = new express.Router()
const {
  getEnum,
  getThemeByLang,
  getLicences,
  getVersion,
} = require('../controllers/dataController')
const {
  getObjectList,
  postObject,
  putObject,
  getObjectById,
  deleteObject,
  deleteObjects,
} = require('../controllers/genericController')
const { ROLE_ADMIN, ROLE_EDIT } = require('../database/scripts/initDatabase')
const { checkRolePerm } = require('../utils/roleCheck')
// const passport = require('../utils/passportSetup');

router.get('/uuid', (req, res) => res.status(200).send(uuidv4()))
router.get('/version', getVersion)
router.get('/enum', getEnum)
router.get('/enum/themes/:lang', getThemeByLang)
router.get('/licences', getLicences)

// TODO : propage res.status
router.get(`/:objectType`, getObjectList)
router.post(`/:objectType`, checkRolePerm([ROLE_EDIT, ROLE_ADMIN]), postObject)
router.put(`/:objectType`, checkRolePerm([ROLE_EDIT, ROLE_ADMIN]), putObject)
router.get(`/:objectType/:id`, getObjectById)
router.delete(`/:objectType/:id`, checkRolePerm([ROLE_EDIT, ROLE_ADMIN]), deleteObject)
router.delete(`/:objectType`, checkRolePerm([ROLE_EDIT, ROLE_ADMIN]), deleteObjects)

module.exports = router
