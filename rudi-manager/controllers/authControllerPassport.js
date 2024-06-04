const mod = 'authController'

// ---- External dependencies -----
const passport = require('passport')
const { hashPassword, matchPassword } = require('@aqmo.org/jwt-lib')

// ---- Internal dependencies -----
const { decodeBase64 } = require('../utils/utils')
const log = require('../utils/logger')
const { BadRequestError, RudiError, UnauthorizedError } = require('../utils/errors')
const { getDbConf } = require('../config/config')

const errorHandler = require('./errorHandler')
const {
  CONSOLE_TOKEN_NAME,
  createFrontUserTokens,
  PM_FRONT_TOKEN_NAME,
  consoleCookieOpts,
  pmFrontCookieOpts,
} = require('../utils/secu')
const {
  dbGetHashedPassword,
  dbGetUserRolesByUsername,
  dbHashAndUpdatePassword,
  dbOpen,
  dbRegisterUser,
  dbUpdatePasswordWithField,
} = require('../database/database')

// ---- Controllers ----
/**
 * Used for a user to login
 * @param {*} req
 * @param {*} reply
 * @param {*} next
 * @returns {Object} user info
 */
exports.postLogin = async (req, reply, next) => {
  const fun = 'postLogin'
  // log.d(mod, 'postLogin', '<--')
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      log.sysWarn(mod, fun, err)
      return reply.status(400).send(err)
    }
    if (!user)
      return reply
        .status(401)
        .send(info?.message || `User not found or incorrect password: '${req?.body?.username}'`)
    try {
      const username = user.username
      const roles = await dbGetUserRolesByUsername(null, username)

      if (!roles?.length)
        return reply
          .status(401)
          .cookie(CONSOLE_TOKEN_NAME, '', consoleCookieOpts(0))
          .cookie(PM_FRONT_TOKEN_NAME, '', pmFrontCookieOpts(0))
          .json({ [CONSOLE_TOKEN_NAME]: '', [PM_FRONT_TOKEN_NAME]: '' })
          .send(`Admin validation is required for this user: '${user.username}'`)

      req.login(user, { session: false }, async (err) => {
        if (err) return reply.status(400).json({ errors: err })
        user.roles = roles
        const { consoleToken, pmFrontToken, exp } = createFrontUserTokens(user)

        // sameSite: 'Lax' ?
        return reply
          .status(200)
          .cookie(CONSOLE_TOKEN_NAME, consoleToken, consoleCookieOpts(exp))
          .cookie(PM_FRONT_TOKEN_NAME, pmFrontToken, pmFrontCookieOpts(exp))
          .json({ username, roles })
      })
    } catch (er) {
      log.e(mod, fun, er)
      this.logout()
      return reply.status(er?.statusCode || 501).send(er)
    }
    // TODO : remove .json() for cookie only? or give refresh token instead
  })(req, reply, next)
}

exports.postRegister = async (req, reply) => {
  const fun = 'postRegister'
  try {
    const { username, email, password, confirmPassword } = req.body
    if (!password || password !== confirmPassword)
      throw new BadRequestError('Password and its confirmation should not be null and be the same.')

    const user = await dbRegisterUser(null, { username, email, password })
    reply.status(200).send(user)
  } catch (err) {
    log.e(mod, fun, err)
    try {
      reply.status(err.code || 400).send(err.message)
    } catch (e) {
      log.e(mod, fun, e)
      return
    }
  }
}
exports.postForgot = (req, reply, next) => {
  const fun = 'postForgot'
  try {
    // TODO
  } catch (err) {
    log.e(mod, fun, err)
    throw err
  }
}

const INIT_PWD = decodeBase64(getDbConf('db_no_pwd'))

exports.putPassword = async (req, reply, next) => {
  const fun = 'changePwd'
  try {
    const { username, password, newPassword, confirmNewPassword } = req.body
    if (
      !username ||
      !password ||
      !newPassword ||
      newPassword === password ||
      newPassword !== confirmNewPassword
    )
      reply.status(401).send('Prerequisites not met')

    const db = dbOpen()
    const dbUserInfo = await dbGetHashedPassword(db, username)
    const dbUserHash = dbUserInfo?.password

    passport.authenticate('local', (err, user, info) => {
      if (err) return reply.status(400).send(err)
      if (!user && !matchPassword(INIT_PWD, dbUserHash))
        return reply.status(401).send(info.message || 'User not found')

      return dbHashAndUpdatePassword(db, username, newPassword)
        .then((userInfo) => reply.json(userInfo))
        .catch((err) => {
          log.e(mod, fun, err)
          reply.status(400).send(err.message)
        })
    })(req, reply, next)
  } catch (err) {
    log.e(mod, fun, err)
    reply.status(400).send(err)
  }
}

exports.resetPassword = async (req, reply, next) => {
  try {
    // ONLY ADMIN !
    const { id } = req.params
    if (id === 0)
      throw new UnauthorizedError(`Le mot de passe du SU ne peut être modifié via l'API`)
    await dbUpdatePasswordWithField(null, 'id', id, hashPassword(INIT_PWD))
    reply.status(200).send(`Password reinitialized for user ${id}`)
  } catch (err) {
    const error = errorHandler.error(err, req, { opType: 'reset_pwd' })
    try {
      return reply.status(err.statusCode).json(new RudiError(error.message))
    } catch (e) {
      log.e(mod, 'resetPassword', e)
    }
  }
}

exports.logout = (req, reply, next) =>
  reply
    .status(200)
    .cookie(CONSOLE_TOKEN_NAME, '', consoleCookieOpts(0))
    .cookie(PM_FRONT_TOKEN_NAME, '', pmFrontCookieOpts(0))
    .json({ [CONSOLE_TOKEN_NAME]: '', [PM_FRONT_TOKEN_NAME]: '', message: 'logout' })
