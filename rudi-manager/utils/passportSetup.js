const mod = 'passSetup'

// External dependencies
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const { Strategy: JWTstrategy, ExtractJwt } = require('passport-jwt')

// Internal dependencies
const { getConf } = require('../config/config')
const log = require('./logger')
const { ForbiddenError, statusOK, UnauthorizedError } = require('./errors')
const {
  dbGetUserById,
  dbHashAndUpdatePassword,
  dbGetHashedPassword,
  dbGetUserRolesByUsername,
  dbClose,
  dbOpen,
} = require('../database/database')
const { extractCookieFromReq, CONSOLE_TOKEN_NAME } = require('./secu')
const { matchPassword } = require('@aqmo.org/jwt-lib')

// Passport configuration
passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser((id, done) => {
  dbGetUserById(null, id)
    .then((user) => done(null, user))
    .catch((err) => done(err, false, new UnauthorizedError('User not found')))
})

// Local Strategy
passport.use(
  new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
    // Match User
    checkPassport(username, password)
      .then(() => done(null, { username }))
      .catch((err) => {
        log.sysWarn(mod, 'LocalStrategy', `Error login: ${err}`)
        return done(null, false, err)
      })
  })
)

const checkPassport = async (username, password) => {
  const fun = 'checkPassport'
  const db = dbOpen()
  try {
    const dbUserInfo = await dbGetHashedPassword(db, username)
    const dbUserHash = dbUserInfo.password
    if (!dbUserHash) {
      throw new UnauthorizedError('No user found')
    }

    if (!matchPassword(password, dbUserHash)) {
      log.e(mod, fun, `Password mismatch`)
      throw new UnauthorizedError('Wrong password')
    }

    // Password is OK... But if it was bcrypt-generated, so let's change
    // the hash stored in the DB with a crypto.scryptSync hashed password
    try {
      if (dbUserHash.startsWith('$2b$10$')) {
        await dbHashAndUpdatePassword(db, username, password)
        log.i(mod, fun, `Password updated for user '${username}'`)
      }
    } catch (err) {
      log.e(mod, fun, `Error while updating 2b10 password: ${err}`)
    }
    try {
      const roles = await dbGetUserRolesByUsername(db, username)
      // console.log('T (checkPassport) user roles:', roles)
      if (!roles?.length)
        throw new ForbiddenError(`Admin validation required for user: '${username}'`)
      // console.log('T (checkPassport)', 'User may login')
      dbClose(db)
      return statusOK('User may login')
    } catch (err) {
      throw new ForbiddenError(`Admin validation required for user: '${username}'`)
    }
  } catch (err) {
    dbClose(db)
    throw err
  }
}

const SECRET_KEY_JWT = getConf('auth', 'secret_key_jwt')
passport.use(
  new JWTstrategy(
    {
      secretOrKey: SECRET_KEY_JWT,
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Take jwt from cookie
        (req) => extractCookieFromReq(req, CONSOLE_TOKEN_NAME),
        // Take jwt from http header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
    },
    async (token, done) => {
      try {
        return done(null, token.user)
      } catch (error) {
        log.sysWarn(mod, 'JWTstrategy', error)
        done(error)
      }
    }
  )
)
module.exports = passport
