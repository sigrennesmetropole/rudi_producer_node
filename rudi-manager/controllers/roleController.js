const errorHandler = require('./errorHandler')
const {
  dbGetRoles,
  dbGetRoleById,
  dbGetUserRolesByUsername,
  dbDeleteUserRole,
  dbCreateUserRole,
  dbGetUserById,
  dbOpen,
  dbClose,
} = require('../database/database')
const { BadRequestError } = require('../utils/errors')

exports.getRoleList = async (req, res, next) => {
  try {
    const roles = await dbGetRoles()
    // console.log('T (getRoleList) roles:', roles)
    const visibleRoles = roles.filter((role) => !role.hide)
    // console.log('T (getRoleList) unhiddenRoles:', visibleRoles)
    res.status(200).json(
      visibleRoles.map((roleInfo) => {
        return { role: roleInfo.role, desc: roleInfo.desc }
      })
    )
  } catch (err) {
    const error = errorHandler.error(err, req, { opType: 'get_roles' })
    try {
      res.status(error.statusCode).json(error)
    } catch (e) {
      console.error(e)
    }
  }
}

exports.getRoleById = (req, res, next) => {
  const { role } = req.params
  return dbGetRoleById(null, role)
    .then((row) => res.status(200).json(row))
    .catch((err) => {
      const error = errorHandler.error(err, req, { opType: 'get_role' })
      try {
        res.status(error.statusCode).json(error)
      } catch (e) {
        console.error(e)
      }
    })
}

// User_Roles
exports.getUserRolesByUsername = async (req, res, next) => {
  const { username } = req.params
  if (!username)
    return res.status(400).json(new BadRequestError('Request should provide a username'))

  try {
    const roles = await dbGetUserRolesByUsername(null, username)
    return res.status(200).json(roles)
  } catch (err) {
    const error = errorHandler.error(err, req, { opType: 'get_userRole' })
    try {
      res.status(error.statusCode).json(error)
    } catch (e) {
      console.error(e)
    }
  }
}

exports.deleteUserRole = async (req, res, next) => {
  try {
    const db = dbOpen()
    const { userId, role } = req.params
    const { userId: id } = await dbDeleteUserRole(null, userId, role)
    const user = await dbGetUserById(db, id)
    res.status(200).json(user)
  } catch (err) {
    const error = errorHandler.error(err, req, { opType: 'delete_userRole' })
    try {
      res.status(error.statusCode).json(error)
    } catch (e) {
      console.error(e)
    }
  }
}
exports.postUserRole = async (req, res, next) => {
  try {
    const db = dbOpen()
    const { userId, username, role } = req.body
    if (userId !== 0 && !userId)
      return res.status(400).json(new BadRequestError('A userId should be provided'))
    if (!role) return res.status(400).json(new BadRequestError('A role should be provided'))
    const { userId: id } = await dbCreateUserRole(db, { userId, username, role })
    const user = await dbGetUserById(db, id)
    dbClose(db)
    res.status(200).json(user)
  } catch (err) {
    console.error(err)
    const error = errorHandler.error(err, req, { opType: 'post_userRole' })
    try {
      res.status(error?.statusCode).json(error)
    } catch (e) {
      console.error(e)
    }
  }
}
