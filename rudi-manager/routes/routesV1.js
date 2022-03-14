const express = require('express');
const router = new express.Router();
const sysController = require('../controllers/sysController');
const authControllerPassport = require('./../controllers/authControllerPassport');
const usersController = require('../controllers/usersControllers');
const roleController = require('../controllers/roleController');
const adminController = require('../controllers/adminController');
const passport = require('../utils/passportSetup');
const { checkRolePerm } = require('../utils/roleCheck');

router.get('/hash', sysController.getHash);
router.get('/formUrl', sysController.getFormUrl);
router.get('/test', sysController.getTest);

router.get(
  '/users',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  usersController.usersList,
);
router.get(
  '/users/:username',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  usersController.getUserByUsername,
);
// TODO protect superAdmin
router.delete(
  '/users/:username',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  usersController.deleteUser,
);

router.post('/register', authControllerPassport.postRegister);
router.post('/login', authControllerPassport.postLogin);
router.get(
  '/token',
  passport.authenticate('jwt', { session: false }),
  authControllerPassport.getToken,
);
router.get(
  '/logout',
  passport.authenticate('jwt', { session: false }),
  authControllerPassport.logout,
);
router.post('/forgot-password', authControllerPassport.postForgot);
router.post('/reset-password', authControllerPassport.postReset);

router.get(
  '/roles',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  roleController.roleList,
);
router.get(
  '/roles/:role',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  roleController.getRoleById,
);
router.get(
  '/user-roles/:username',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  roleController.getUserRolesByUsername,
);
router.delete(
  '/user-roles/:userId/:role',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  roleController.deleteUserRole,
);
router.post(
  '/user-roles',
  passport.authenticate('jwt', { session: false }),
  checkRolePerm('Admin'),
  roleController.postUserRole,
);

router.get(
  '/default-form',
  passport.authenticate('jwt', { session: false }),
  adminController.getDefaultForm,
);
router.delete(
  '/default-form/:name',
  passport.authenticate('jwt', { session: false }),
  adminController.deleteDefaultForm,
);
router.put(
  '/default-form',
  passport.authenticate('jwt', { session: false }),
  adminController.putDefaultForm,
);

module.exports = router;
