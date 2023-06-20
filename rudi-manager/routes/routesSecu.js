const express = require('express')
const router = new express.Router()
const {
  createUser,
  deleteUserWithId,
  editUser,
  getUserByUsername,
  getUsersList,
} = require('../controllers/usersControllers')
const {
  getRoleById,
  getRoleList,
} = require('../controllers/roleController')
const { resetPassword } = require('../controllers/authControllerPassport')

router.get('/roles', getRoleList)
router.get('/roles/:role', getRoleById)

// router.get('/user-roles/:username', getUserRolesByUsername)
// router.post('/user-roles', postUserRole)
// router.delete('/user-roles/:userId/:role', deleteUserRole)

router.get('/users', getUsersList)
router.get('/users/:username', getUserByUsername)
router.post('/users', createUser)
router.put('/users', editUser)
router.put('/users/:id/reset-password', resetPassword) // Admin action that resets a user pwd
router.delete('/users/:id', deleteUserWithId)

module.exports = router
