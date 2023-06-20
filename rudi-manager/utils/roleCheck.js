const mod = 'roleCheck'

const log = require('./logger')
const { ForbiddenError, BadRequestError } = require('./errors')
const { ROLE_SU, ROLE_ALL } = require('../database/scripts/initDatabase')
const { dbGetUserRolesByUsername } = require('../database/database')
const { logout } = require('../controllers/authControllerPassport')

exports.checkRolePerm = (expectedRoles) => (req, res, next) => {
  // TODO: retrieve user (in JWT ? passportSetup ?)
  const fun = 'checkRolePerm'
  if (!req?.user) return res.status(400).json(new BadRequestError('User info required'))
  const { username } = req.user
  // console.log('T (checkRolePerm) user', req.user)
  if (!username) return res.status(400).json(new BadRequestError('Username required'))
  dbGetUserRolesByUsername(null, username)
    .then((userRoles) => {
      // log.d(mod, fun, 'THEN')
      if (expectedRoles[0] === ROLE_ALL) return next()
      if (
        userRoles?.length &&
        userRoles.findIndex(
          (userRole) =>
            userRole === ROLE_SU || expectedRoles.findIndex((role) => userRole === role) > -1
        ) > -1
      ) {
        next()
      } else {
        log.sysWarn(
          mod,
          fun,
          `Forbidden access by ${username} at ${req.method} ${req.url}`,
          log.getContext(req, { opType: 'get_hash', statusCode: 403 })
        )
        try {
          return res.status(403).json(new ForbiddenError('Insufficient credentials'))
        } catch (e) {
          log.e(mod, fun, e)
          return
        }
      }
    })
    .catch((err) => {
      // log.d(mod, fun, 'CATCH')
      if (err?.statusCode === 401 && err?.message?.startsWith('User not found')) {
        log.e(mod, fun, 'Deleted user?')
        return logout(req, res)
      }
      log.e(mod, fun, err)
      return res
        .status(403)
        .json(new ForbiddenError(`Admin validation required for user '${username}'`))
    })
}
